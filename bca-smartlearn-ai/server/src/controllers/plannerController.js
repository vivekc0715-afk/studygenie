'use strict';

const { StudyPlan, StudyTask, TopicPerformance, StudentProfile } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const studyPlanner = require('../services/planner/studyPlanner');

const DAY_MS = 24 * 60 * 60 * 1000;

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Groups tasks by ISO date so the client can render a calendar/agenda view. */
function groupByDate(tasks) {
  const map = new Map();
  for (const task of tasks) {
    const key = new Date(task.date).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, { date: key, minutes: 0, tasks: [] });
    const bucket = map.get(key);
    bucket.tasks.push(task);
    bucket.minutes += task.estimatedMinutes || 0;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Generates (or replaces) the adaptive study plan. */
const generate = asyncHandler(async (req, res) => {
  const plan = await studyPlanner.generateStudyPlan(req.user, {
    replace: Boolean(req.body?.replace),
    days: Math.min(Math.max(Number(req.body?.days) || 14, 3), 60),
  });

  if (!plan) {
    return ok(res, { plan: null, message: 'Enrol in at least one subject to generate a study plan.' });
  }

  const tasks = await StudyTask.find({ student: req.user._id, plan: plan.id }).sort({ date: 1, priority: -1 }).lean({ virtuals: true });
  return created(res, { plan, days: groupByDate(tasks), totalTasks: tasks.length });
});

/** The active plan with its schedule. */
const current = asyncHandler(async (req, res) => {
  const plan = await StudyPlan.findOne({ student: req.user._id, isActive: true })
    .sort({ generatedAt: -1 })
    .lean({ virtuals: true });

  if (!plan) return ok(res, { plan: null, days: [], totalTasks: 0 });

  const tasks = await StudyTask.find({ student: req.user._id, plan: plan.id })
    .populate('subject', 'name code color icon')
    .populate('topic', 'title')
    .sort({ date: 1, priority: -1 })
    .lean({ virtuals: true });

  return ok(res, { plan, days: groupByDate(tasks), totalTasks: tasks.length });
});

/** Today's agenda, including anything overdue that is still pending. */
const today = asyncHandler(async (req, res) => {
  const start = startOfDay(new Date());
  const end = new Date(start.getTime() + DAY_MS);

  const [dueToday, overdue] = await Promise.all([
    StudyTask.find({ student: req.user._id, date: { $gte: start, $lt: end } })
      .populate('subject', 'name code color icon')
      .populate('topic', 'title')
      .sort({ priority: -1 })
      .lean({ virtuals: true }),
    StudyTask.find({ student: req.user._id, date: { $lt: start }, status: 'pending' })
      .populate('subject', 'name code color icon')
      .populate('topic', 'title')
      .sort({ date: 1, priority: -1 })
      .lean({ virtuals: true }),
  ]);

  const minutesToday = dueToday.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0);
  const completedToday = dueToday.filter((task) => task.status === 'completed').length;

  return ok(res, {
    date: start.toISOString().slice(0, 10),
    tasks: dueToday,
    overdue,
    summary: {
      total: dueToday.length,
      completed: completedToday,
      minutes: minutesToday,
      overdueCount: overdue.length,
    },
  });
});

/** Marks a task complete / skipped and folds the effort back into analytics. */
const updateTask = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'task id');

  const task = await StudyTask.findOne({ _id: req.params.id, student: req.user._id });
  if (!task) throw ApiError.notFound('Study task not found.');

  const { status, actualMinutes } = req.body;
  if (status) task.status = status;
  if (Number.isFinite(actualMinutes)) task.actualMinutes = Math.max(0, Math.round(actualMinutes));

  if (status === 'completed') {
    task.completedAt = new Date();
    if (!task.actualMinutes) task.actualMinutes = task.estimatedMinutes;

    if (task.topic) {
      await TopicPerformance.findOneAndUpdate(
        { student: req.user._id, topic: task.topic },
        {
          $inc: {
            revisionCount: task.activity === 'revise' ? 1 : 0,
            timeSpentMinutes: task.actualMinutes || 0,
          },
          $set: { lastRevisedAt: new Date() },
          $setOnInsert: { student: req.user._id, topic: task.topic, subject: task.subject || null },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    await StudentProfile.updateOne(
      { user: req.user._id },
      { $inc: { 'stats.totalStudyMinutes': task.actualMinutes || 0 } }
    ).catch(() => {});
  }

  await task.save();
  return ok(res, task.toJSON());
});

/** Pushes a pending task to a later date. */
const rescheduleTask = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'task id');

  const task = await StudyTask.findOne({ _id: req.params.id, student: req.user._id });
  if (!task) throw ApiError.notFound('Study task not found.');
  if (task.status === 'completed') throw ApiError.conflict('Completed tasks cannot be rescheduled.');

  const date = new Date(req.body.date);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Provide a valid date.');

  task.rescheduledFrom = task.date;
  task.date = date;
  task.status = 'pending';
  await task.save();

  return ok(res, task.toJSON());
});

/** Aggregate planner progress for the dashboard. */
const stats = asyncHandler(async (req, res) => {
  const rows = await StudyTask.aggregate([
    { $match: { student: req.user._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        minutes: { $sum: '$estimatedMinutes' },
        actualMinutes: { $sum: '$actualMinutes' },
      },
    },
  ]);

  const byStatus = rows.reduce((acc, row) => {
    acc[row._id] = { count: row.count, minutes: row.minutes, actualMinutes: row.actualMinutes };
    return acc;
  }, {});

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const completed = byStatus.completed?.count || 0;

  return ok(res, {
    total,
    completed,
    pending: byStatus.pending?.count || 0,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    plannedMinutes: rows.reduce((sum, row) => sum + row.minutes, 0),
    actualMinutes: rows.reduce((sum, row) => sum + row.actualMinutes, 0),
    byStatus,
  });
});

module.exports = { generate, current, today, updateTask, rescheduleTask, stats };
