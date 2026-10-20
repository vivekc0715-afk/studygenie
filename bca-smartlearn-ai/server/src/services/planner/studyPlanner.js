'use strict';

/**
 * Generates a personalised, deterministic study plan from the student's real
 * academic data: enrolled subjects, syllabus coverage, measured topic mastery
 * and upcoming exam dates.
 *
 * Nothing here is mocked - every task is derived from documents in MongoDB, and
 * the same inputs always produce the same plan.
 */

const {
  StudentProfile,
  StudentEnrollment,
  Unit,
  Topic,
  TopicPerformance,
  StudyPlan,
  StudyTask,
} = require('../../models');
const { getSetting } = require('../settingsService');
const logger = require('../../config/logger');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TASKS = 150;

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** Priority 1 (lowest) to 5 (highest) from exam proximity and measured mastery. */
function computePriority({ daysToExam, masteryScore, isCompleted }) {
  let priority = 3;

  if (daysToExam !== null) {
    if (daysToExam <= 3) priority = 5;
    else if (daysToExam <= 7) priority = 4;
    else if (daysToExam <= 14) priority = 4;
  }

  if (!isCompleted) priority = Math.max(priority, 3);
  else priority = Math.min(priority, 3);

  if (masteryScore !== null) {
    if (masteryScore < 20) priority = 5;
    else if (masteryScore < 40) priority = Math.max(priority, 4);
    else if (masteryScore < 60) priority = Math.max(priority, 3);
  }

  return Math.min(5, Math.max(1, priority));
}

function describeActivity(activity, topicTitle, subjectName) {
  const verbs = {
    learn: `Learn "${topicTitle}"`,
    revise: `Revise "${topicTitle}"`,
    practice: `Practice questions on "${topicTitle}"`,
    test: `Take a self-test on ${subjectName}`,
    read_notes: `Read AI notes for "${topicTitle}"`,
    watch_video: `Watch a lesson on "${topicTitle}"`,
    code: `Solve a coding exercise on "${topicTitle}"`,
  };
  return verbs[activity] || `Study "${topicTitle}"`;
}

function targetOutcome(activity, topicTitle) {
  switch (activity) {
    case 'learn':
      return `Be able to explain the fundamentals of ${topicTitle} in your own words.`;
    case 'revise':
      return `Recall the key points of ${topicTitle} without notes.`;
    case 'practice':
      return `Score at least 70% on ${topicTitle} practice questions.`;
    case 'test':
      return 'Complete the timed test and review every incorrect answer.';
    case 'read_notes':
      return 'Summarise the notes into 5 bullet points.';
    case 'watch_video':
      return 'Take notes while watching and list one open question.';
    case 'code':
      return 'Pass all visible test cases.';
    default:
      return `Complete a focused study session on ${topicTitle}.`;
  }
}

/** Builds the ordered list of candidate tasks from real progress data. */
function buildCandidates({ enrollments, units, topics, progressByTopic, now, minimumSampleSize }) {
  const candidates = [];

  for (const enrollment of enrollments) {
    const subject = enrollment.subject;
    if (!subject) continue;

    const subjectId = String(subject._id);
    const subjectUnits = units.filter((unit) => String(unit.subject) === subjectId);
    const subjectTopics = topics.filter((topic) => String(topic.subject) === subjectId);
    const examDate = enrollment.examDate || subject.examDate || null;
    const daysToExam = examDate ? daysBetween(now, examDate) : null;

    const completedCount = subjectTopics.filter((topic) => progressByTopic.get(String(topic._id))?.isCompleted).length;
    const completionRatio = subjectTopics.length ? completedCount / subjectTopics.length : 0;

    for (const topic of subjectTopics) {
      const unit = subjectUnits.find((entry) => String(entry._id) === String(topic.unit)) || null;
      const progress = progressByTopic.get(String(topic._id)) || null;
      const isCompleted = Boolean(progress?.isCompleted);
      const masteryScore = progress && progress.attempts > 0 ? progress.masteryScore : null;
      const hasEnoughSamples = progress ? progress.attempts >= minimumSampleSize : false;

      const estimatedMinutes = Math.min(Math.max(topic.recommendedMinutes || 45, 20), 120);

      // Not yet covered -> learn it. Already covered but weak -> revise/practice.
      if (!isCompleted) {
        candidates.push({
          subject: subject._id,
          unit: topic.unit,
          topic: topic._id,
          activity: 'learn',
          estimatedMinutes,
          priority: computePriority({ daysToExam, masteryScore, isCompleted }),
          reason: daysToExam !== null && daysToExam <= 7
            ? `Exam for ${subject.name} is in ${Math.max(daysToExam, 0)} day(s) and this topic is not covered yet.`
            : `Not yet covered (${Math.round(completionRatio * 100)}% of ${subject.name} complete).`,
          targetOutcome: targetOutcome('learn', topic.title),
          title: describeActivity('learn', topic.title, subject.name),
        });
        continue;
      }

      if (masteryScore !== null && hasEnoughSamples && masteryScore < 60) {
        candidates.push({
          subject: subject._id,
          unit: topic.unit,
          topic: topic._id,
          activity: masteryScore < 40 ? 'practice' : 'revise',
          estimatedMinutes: Math.round(estimatedMinutes * 0.75),
          priority: computePriority({ daysToExam, masteryScore, isCompleted: true }),
          reason: `Measured mastery is ${Math.round(masteryScore)}% over ${progress.attempts} attempt(s).`,
          targetOutcome: targetOutcome(masteryScore < 40 ? 'practice' : 'revise', topic.title),
          title: describeActivity(masteryScore < 40 ? 'practice' : 'revise', topic.title, subject.name),
        });
      }
    }

    // Add a rehearsal test when an exam is approaching and there is enough content.
    if (examDate && daysToExam !== null && daysToExam >= 0 && daysToExam <= 14 && subjectTopics.length >= 3) {
      candidates.push({
        subject: subject._id,
        unit: null,
        topic: null,
        activity: 'test',
        estimatedMinutes: 45,
        priority: daysToExam <= 7 ? 5 : 4,
        reason: `Full-subject rehearsal before the ${subject.name} exam on ${examDate.toISOString().slice(0, 10)}.`,
        targetOutcome: targetOutcome('test', null),
        title: describeActivity('test', null, subject.name),
      });
    }
  }

  return candidates;
}

/** Spreads ordered candidates across the student's available study days. */
function scheduleTasks(candidates, { fromDate, days, dailyMinutes, preferredStudyDays, maxTasks }) {
  const scheduled = [];
  const ordered = [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.activity === 'test' && b.activity !== 'test') return -1;
    if (b.activity === 'test' && a.activity !== 'test') return 1;
    return a.estimatedMinutes - b.estimatedMinutes;
  });

  const dayOffsets = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(fromDate.getTime() + offset * DAY_MS);
    if (preferredStudyDays && preferredStudyDays.length && !preferredStudyDays.includes(date.getDay())) continue;
    dayOffsets.push(date);
  }
  if (!dayOffsets.length) dayOffsets.push(fromDate);

  let dayIndex = 0;
  let minutesUsedToday = 0;
  let tasksCreated = 0;

  for (const candidate of ordered) {
    if (tasksCreated >= maxTasks) break;

    // Roll into the next study day once today's budget is spent.
    while (minutesUsedToday + candidate.estimatedMinutes > dailyMinutes && dayIndex < dayOffsets.length - 1) {
      dayIndex += 1;
      minutesUsedToday = 0;
    }

    const date = dayOffsets[Math.min(dayIndex, dayOffsets.length - 1)];
    scheduled.push({ ...candidate, date });
    minutesUsedToday += candidate.estimatedMinutes;
    tasksCreated += 1;
  }

  return scheduled;
}

/**
 * Creates (or replaces) the student's active study plan.
 * @returns {Promise<object|null>} the created plan, or null when there is nothing to plan.
 */
async function generateStudyPlan(user, { replace = false, days = 14 } = {}) {
  const now = startOfDay(new Date());

  const [profile, minimumSampleSize] = await Promise.all([
    StudentProfile.findOne({ user: user._id }),
    getSetting('minimum_sample_size', 3),
  ]);

  const enrollments = await StudentEnrollment.find({ student: user._id, status: 'active' }).populate('subject');
  const subjectIds = enrollments.map((enrollment) => enrollment.subject?._id).filter(Boolean);

  if (!subjectIds.length) {
    if (replace) await StudyTask.deleteMany({ student: user._id, status: 'pending' });
    return null;
  }

  const [units, topics, progress] = await Promise.all([
    Unit.find({ subject: { $in: subjectIds }, isActive: true }).lean(),
    Topic.find({ subject: { $in: subjectIds }, isActive: true }).lean(),
    TopicPerformance.find({ student: user._id, subject: { $in: subjectIds } }).lean(),
  ]);

  const progressByTopic = new Map(progress.map((entry) => [String(entry.topic), entry]));

  const candidates = buildCandidates({
    enrollments,
    units,
    topics,
    progressByTopic,
    now,
    minimumSampleSize: Number(minimumSampleSize) || 3,
  });

  const dailyMinutes = Math.min(Math.max(profile?.studyPreferences?.dailyStudyMinutes || 90, 30), 480);
  const preferredStudyDays = profile?.studyPreferences?.preferredStudyDays?.length
    ? profile.studyPreferences.preferredStudyDays
    : null;

  const scheduled = scheduleTasks(candidates, {
    fromDate: now,
    days,
    dailyMinutes,
    preferredStudyDays,
    maxTasks: MAX_TASKS,
  });

  if (replace) {
    await StudyPlan.updateMany({ student: user._id, isActive: true }, { $set: { isActive: false } });
    await StudyTask.deleteMany({ student: user._id, status: 'pending' });
  }

  const lastDate = scheduled.length ? scheduled[scheduled.length - 1].date : now;

  const plan = await StudyPlan.create({
    student: user._id,
    semester: null,
    title: `Adaptive study plan · ${scheduled.length} sessions`,
    strategy: profile?.studyPreferences?.knowledgeLevel === 'advanced' ? 'exam_focused' : 'balanced',
    weeklyMinutes: dailyMinutes * (preferredStudyDays ? preferredStudyDays.length : 7),
    dailyMinutes,
    focusSubjects: subjectIds,
    fromDate: now,
    toDate: lastDate,
    generatedAt: new Date(),
    isActive: true,
    notes: 'Generated from syllabus coverage, measured mastery and upcoming exam dates.',
    summary: {
      totalTasks: scheduled.length,
      totalMinutes: scheduled.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      subjectsConsidered: subjectIds.length,
      activities: scheduled.reduce((acc, task) => {
        acc[task.activity] = (acc[task.activity] || 0) + 1;
        return acc;
      }, {}),
      horizonDays: days,
    },
  });

  if (scheduled.length) {
    await StudyTask.insertMany(
      scheduled.map((task) => ({
        student: user._id,
        plan: plan._id,
        title: task.title,
        activity: task.activity,
        subject: task.subject,
        unit: task.unit,
        topic: task.topic,
        date: task.date,
        estimatedMinutes: task.estimatedMinutes,
        priority: task.priority,
        reason: task.reason,
        targetOutcome: task.targetOutcome,
        status: 'pending',
      }))
    );
  }

  logger.debug('Study plan generated', { student: String(user._id), tasks: scheduled.length });

  return plan.toJSON();
}

module.exports = { generateStudyPlan, computePriority, buildCandidates, scheduleTasks };
