'use strict';

/**
 * Mastery and subject-performance computation.
 *
 * Everything is derived from real submitted attempts and syllabus coverage -
 * no heuristics are seeded with placeholder numbers.
 */

const { Question, TestAttempt, TopicPerformance, SubjectPerformance, Topic, Unit, Subject, StudentEnrollment } = require('../../models');
const { getSetting } = require('../settingsService');
const { MASTERY_BANDS } = require('../../config/constants');
const logger = require('../../config/logger');

/** Maps a 0-100 score onto the configured mastery band. */
function masteryBandFor(score) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return MASTERY_BANDS.find((band) => value >= band.min && value <= band.max) || MASTERY_BANDS[0];
}

function trendFor(series) {
  if (series.length < 4) return 'unknown';
  const midpoint = Math.floor(series.length / 2);
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const earlier = average(series.slice(0, midpoint));
  const later = average(series.slice(midpoint));

  if (later - earlier > 8) return 'improving';
  if (earlier - later > 8) return 'declining';
  return 'stable';
}

function confidenceFor(sampleSize, minimumSampleSize) {
  if (sampleSize < Math.max(1, minimumSampleSize)) return 'insufficient';
  if (sampleSize >= minimumSampleSize * 3) return 'high';
  if (sampleSize >= minimumSampleSize * 2) return 'medium';
  return 'low';
}

/**
 * Recomputes TopicPerformance for the given topics (or every topic the student
 * has been assessed on) from their submitted attempts.
 */
async function recomputeTopicPerformance(studentId, topicIds = []) {
  const minimumSampleSize = Number(await getSetting('minimum_sample_size', 3)) || 3;

  const questionFilter = { isActive: true };
  if (topicIds.length) questionFilter.topic = { $in: topicIds };
  else questionFilter.topic = { $ne: null };

  const questions = await Question.find(questionFilter).select('topic subject unit').lean();
  if (!questions.length) return { topicsUpdated: 0 };

  const questionMap = new Map(questions.map((question) => [String(question._id), question]));
  const relevantTopics = [...new Set(questions.map((question) => String(question.topic)))];

  const attempts = await TestAttempt.find({ student: studentId, status: 'submitted' })
    .select('answers submittedAt')
    .sort({ submittedAt: 1 })
    .lean();

  const perTopic = new Map();

  for (const attempt of attempts) {
    for (const answer of attempt.answers || []) {
      const question = questionMap.get(String(answer.question));
      if (!question || answer.isCorrect === null) continue;

      const topicId = String(question.topic);
      const entry = perTopic.get(topicId) || {
        topic: question.topic,
        subject: question.subject,
        unit: question.unit,
        attempts: 0,
        correct: 0,
        results: [],
        lastAssessedAt: null,
      };

      entry.attempts += 1;
      if (answer.isCorrect) entry.correct += 1;
      entry.results.push(answer.isCorrect ? 1 : 0);
      entry.lastAssessedAt = attempt.submittedAt || new Date();
      perTopic.set(topicId, entry);
    }
  }

  let updated = 0;

  for (const topicId of relevantTopics) {
    const entry = perTopic.get(topicId);
    if (!entry) continue;

    const accuracy = (entry.correct / entry.attempts) * 100;
    const recent = entry.results.slice(-5);
    const recentAccuracy = (recent.reduce((sum, value) => sum + value, 0) / recent.length) * 100;
    const masteryScore = Math.round(0.6 * accuracy + 0.4 * recentAccuracy);

    await TopicPerformance.findOneAndUpdate(
      { student: studentId, topic: entry.topic },
      {
        $set: {
          subject: entry.subject || null,
          unit: entry.unit || null,
          attempts: entry.attempts,
          correct: entry.correct,
          accuracy: Math.round(accuracy * 10) / 10,
          masteryScore,
          masteryLevel: masteryBandFor(masteryScore).key,
          confidence: confidenceFor(entry.attempts, minimumSampleSize),
          trend: trendFor(entry.results),
          recentScores: entry.results.slice(-8),
          lastAssessedAt: entry.lastAssessedAt,
        },
        $setOnInsert: { student: studentId, topic: entry.topic },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    updated += 1;
  }

  return { topicsUpdated: updated };
}

/**
 * Recomputes SubjectPerformance for one subject (or all enrolled subjects):
 * blends assessment average, syllabus completion and coding success rate.
 */
async function recomputeSubjectPerformance(studentId, subjectId = null) {
  const enrollmentFilter = { student: studentId, status: { $ne: 'dropped' } };
  if (subjectId) enrollmentFilter.subject = subjectId;

  const enrollments = await StudentEnrollment.find(enrollmentFilter).select('subject').lean();
  const subjectIds = [...new Set(enrollments.map((entry) => String(entry.subject)))];
  if (!subjectIds.length) return { subjectsUpdated: 0 };

  const progress = await TopicPerformance.find({ student: studentId, subject: { $in: subjectIds } }).lean();
  const attempts = await TestAttempt.find({
    student: studentId,
    status: 'submitted',
    subject: { $in: subjectIds },
  })
    .select('subject score totalMarks percentage submittedAt')
    .sort({ submittedAt: 1 })
    .lean();

  let updated = 0;

  for (const id of subjectIds) {
    const [topicTotal, subjectProgress, subjectAttempts, existing] = await Promise.all([
      Topic.countDocuments({ subject: id, isActive: true }),
      Promise.resolve(progress.filter((entry) => String(entry.subject) === id)),
      Promise.resolve(attempts.filter((entry) => String(entry.subject) === id)),
      SubjectPerformance.findOne({ student: studentId, subject: id }).lean(),
    ]);

    const topicsCompleted = subjectProgress.filter((entry) => entry.isCompleted).length;
    const syllabusCompletion = topicTotal ? Math.round((topicsCompleted / topicTotal) * 100) : 0;

    const percentages = subjectAttempts.map((entry) => Number(entry.percentage) || 0);
    const attemptCount = percentages.length;
    const averageScore = attemptCount ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / attemptCount) * 10) / 10 : 0;
    const latestScore = attemptCount ? percentages[percentages.length - 1] : 0;
    const bestScore = attemptCount ? Math.max(...percentages) : 0;

    const codingSuccessRate = Number(existing?.codingSuccessRate) || 0;
    const weightedScore = Math.round(0.5 * averageScore + 0.3 * syllabusCompletion + 0.2 * codingSuccessRate);

    const assessedTopics = subjectProgress.filter((entry) => entry.attempts > 0);
    const masteryScore = assessedTopics.length
      ? Math.round(assessedTopics.reduce((sum, entry) => sum + entry.masteryScore, 0) / assessedTopics.length)
      : 0;

    const minimumSampleSize = Number(await getSetting('minimum_sample_size', 3)) || 3;

    await SubjectPerformance.findOneAndUpdate(
      { student: studentId, subject: id },
      {
        $set: {
          attempts: attemptCount,
          averageScore,
          weightedScore,
          latestScore,
          bestScore,
          syllabusCompletion,
          topicsCompleted,
          topicsTotal: topicTotal,
          trend: trendFor(percentages),
          masteryLevel: masteryBandFor(masteryScore).key,
          confidence: confidenceFor(assessedTopics.length || attemptCount, minimumSampleSize),
          recentScores: subjectAttempts.slice(-10).map((entry) => ({ score: entry.percentage, at: entry.submittedAt })),
          studyMinutes: subjectProgress.reduce((sum, entry) => sum + (entry.timeSpentMinutes || 0), 0),
          revisionCount: subjectProgress.reduce((sum, entry) => sum + (entry.revisionCount || 0), 0),
          lastComputedAt: new Date(),
        },
        $setOnInsert: { student: studentId, subject: id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    updated += 1;
  }

  return { subjectsUpdated: updated };
}

/** Convenience hook used after an attempt is submitted. */
async function refreshAfterAttempt(attempt) {
  try {
    const questionIds = (attempt.answers || []).map((answer) => answer.question);
    const questions = await Question.find({ _id: { $in: questionIds } }).select('topic').lean();
    const topicIds = [...new Set(questions.map((question) => question.topic).filter(Boolean).map(String))];

    await recomputeTopicPerformance(attempt.student, topicIds);
    if (attempt.subject) await recomputeSubjectPerformance(attempt.student, attempt.subject);
    else await recomputeSubjectPerformance(attempt.student);
  } catch (error) {
    logger.warn('Unable to refresh performance metrics after attempt', { message: error.message });
  }
}

module.exports = {
  masteryBandFor,
  trendFor,
  confidenceFor,
  recomputeTopicPerformance,
  recomputeSubjectPerformance,
  refreshAfterAttempt,
};
