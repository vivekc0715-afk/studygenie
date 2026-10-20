'use strict';

const { TopicPerformance, SubjectPerformance, StudentProfile, Topic, Subject } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');
const { getSetting } = require('../services/settingsService');
const { MASTERY_BANDS } = require('../config/constants');
const testService = require('../services/assessment/testService');
const { recomputeTopicPerformance, recomputeSubjectPerformance } = require('../services/analytics/masteryService');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WEAK_BANDS = new Set(['critical', 'weak']);

/** Builds actionable next steps from measured weaknesses - never fabricated. */
function buildRecommendations({ topics, subjects }) {
  const recommendations = [];

  for (const entry of topics) {
    if (recommendations.length >= 6) break;
    if (entry.attempts < 1) continue;

    const title = entry.topic?.title || 'this topic';

    if (WEAK_BANDS.has(entry.masteryLevel)) {
      recommendations.push({
        action: 'revise',
        priority: entry.masteryLevel === 'critical' ? 1 : 2,
        title: `Revise ${title}`,
        detail: `Accuracy is ${entry.accuracy}% across ${entry.attempts} answered question(s). Rebuild the fundamentals, then retest.`,
        topicId: String(entry.topic?._id || entry.topicId),
        subjectId: entry.subject ? String(entry.subject._id || entry.subject) : null,
      });
    } else if (entry.trend === 'declining') {
      recommendations.push({
        action: 'practice_test',
        priority: 3,
        title: `Stabilise ${title}`,
        detail: 'Recent answers are trending down. Take a short focused practice test to confirm the dip.',
        topicId: String(entry.topic?._id || entry.topicId),
        subjectId: entry.subject ? String(entry.subject._id || entry.subject) : null,
      });
    }
  }

  for (const subject of subjects) {
    if (recommendations.length >= 8) break;
    if (subject.attempts === 0 && subject.syllabusCompletion < 40) {
      recommendations.push({
        action: 'study_plan',
        priority: 4,
        title: `Plan ${subject.subject?.name || 'your subject'}`,
        detail: `Only ${subject.syllabusCompletion}% of the syllabus is covered and no tests have been taken yet. Generate a study plan to get started.`,
        subjectId: String(subject.subject?._id || subject.subjectId),
      });
    }
  }

  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

/** Headline analytics for the student dashboard. */
const overview = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const minimumSampleSize = Number(await getSetting('minimum_sample_size', 3)) || 3;

  const [stats, profile, subjects, topics] = await Promise.all([
    testService.attemptStats(studentId),
    StudentProfile.findOne({ user: studentId }).select('stats studyPreferences').lean(),
    SubjectPerformance.find({ student: studentId })
      .populate('subject', 'name code color icon semesterNumber')
      .sort({ weightedScore: -1 })
      .lean({ virtuals: true }),
    TopicPerformance.find({ student: studentId })
      .populate('topic', 'title difficulty')
      .sort({ masteryScore: 1 })
      .lean({ virtuals: true }),
  ]);

  const measuredTopics = topics.filter((entry) => entry.attempts > 0);
  const distribution = MASTERY_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    count: measuredTopics.filter((entry) => entry.masteryLevel === band.key).length,
  }));

  const weakTopics = measuredTopics.filter((entry) => WEAK_BANDS.has(entry.masteryLevel)).slice(0, 8);

  const totalTopics = measuredTopics.length + topics.filter((entry) => entry.attempts === 0).length;
  const overallMastery = measuredTopics.length
    ? Math.round(measuredTopics.reduce((sum, entry) => sum + (entry.masteryScore || 0), 0) / measuredTopics.length)
    : 0;

  return ok(res, {
    stats,
    streak: {
      current: profile?.stats?.studyStreak || 0,
      longest: profile?.stats?.longestStreak || 0,
      notesGenerated: profile?.stats?.notesGenerated || 0,
      codeSubmissions: profile?.stats?.codeSubmissions || 0,
    },
    targets: {
      targetGrade: profile?.studyPreferences?.targetGrade || '',
      targetPercentage: profile?.studyPreferences?.targetPercentage ?? null,
    },
    overallMastery,
    minimumSampleSize,
    masteryDistribution: distribution,
    weakTopics: weakTopics.map((entry) => ({
      topicId: String(entry.topic?._id || entry.topicId),
      title: entry.topic?.title || '',
      subjectId: entry.subject ? String(entry.subject._id || entry.subject) : null,
      masteryScore: entry.masteryScore,
      masteryLevel: entry.masteryLevel,
      accuracy: entry.accuracy,
      attempts: entry.attempts,
      trend: entry.trend,
      confidence: entry.confidence,
    })),
    subjects: subjects.map((entry) => ({
      subjectId: String(entry.subject?._id || entry.subjectId),
      name: entry.subject?.name || '',
      code: entry.subject?.code || '',
      color: entry.subject?.color || '',
      icon: entry.subject?.icon || '',
      attempts: entry.attempts,
      averageScore: entry.averageScore,
      weightedScore: entry.weightedScore,
      latestScore: entry.latestScore,
      syllabusCompletion: entry.syllabusCompletion,
      masteryLevel: entry.masteryLevel,
      trend: entry.trend,
      confidence: entry.confidence,
    })),
    recommendations: buildRecommendations({ topics: measuredTopics, subjects }),
  });
});

/** Per-subject performance rows. */
const subjects = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const filter = { student: req.user._id };
  if (query.subject) filter.subject = query.subject;

  const rows = await SubjectPerformance.find(filter)
    .populate('subject', 'name code color icon semesterNumber credits')
    .sort({ [query.sortBy === 'syllabusCompletion' ? 'syllabusCompletion' : 'weightedScore']: -1 })
    .lean({ virtuals: true });

  return ok(res, rows);
});

/** Per-topic mastery with filtering and pagination. */
const topics = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { student: req.user._id };
  if (query.subject) filter.subject = query.subject;
  if (query.band) filter.masteryLevel = query.band;
  if (query.completed === 'true') filter.isCompleted = true;
  if (query.completed === 'false') filter.isCompleted = false;

  if (query.search) {
    const matched = await Topic.find({ title: new RegExp(escapeRegex(query.search), 'i') }).select('_id').lean();
    filter.topic = { $in: matched.map((topic) => topic._id) };
  }

  const [items, total] = await Promise.all([
    TopicPerformance.find(filter)
      .populate('topic', 'title difficulty number')
      .populate('unit', 'title number')
      .populate('subject', 'name code color icon')
      .sort({ masteryScore: 1, lastAssessedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    TopicPerformance.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

/** Recomputes mastery from stored attempts on demand. */
const recompute = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const [topicResult, subjectResult] = await Promise.all([
    recomputeTopicPerformance(req.user._id, body.topicIds || []),
    recomputeSubjectPerformance(req.user._id, body.subjectId || null),
  ]);
  return ok(res, { ...topicResult, ...subjectResult, recomputedAt: new Date().toISOString() });
});

/** Subject list helper so the analytics filters never hardcode data. */
const filterSubjects = asyncHandler(async (req, res) => {
  const rows = await SubjectPerformance.find({ student: req.user._id }).select('subject').lean();
  const subjectIds = [...new Set(rows.map((row) => String(row.subject)))];
  const subjects = await Subject.find({ _id: { $in: subjectIds } })
    .select('name code color icon')
    .lean({ virtuals: true });
  return ok(res, subjects);
});

module.exports = { overview, subjects, topics, recompute, filterSubjects };
