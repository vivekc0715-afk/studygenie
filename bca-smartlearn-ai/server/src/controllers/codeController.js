'use strict';

const { CodingExercise, CodingSubmission } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');
const { SUPPORTED_LANGUAGES, SUBMISSION_STATUS } = require('../config/constants');
const { features } = require('../config/env');
const judge0 = require('../services/code/judge0');
const submissionService = require('../services/code/submissionService');
const aiCodeService = require('../services/ai/aiCodeService');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

/** Editor bootstrap: languages, starter snippets and integration status. */
const meta = asyncHandler(async (_req, res) =>
  ok(res, {
    languages: SUPPORTED_LANGUAGES.map(({ key, label, monacoLanguage, extension, starterCode }) => ({
      key,
      label,
      monacoLanguage,
      extension,
      starterCode,
    })),
    submissionStatuses: Object.values(SUBMISSION_STATUS),
    codeExecutionConfigured: true,
    aiAssistantAvailable: true,
    hint: '',
  })
);

/** Language availability probe - tells the client which runtimes the provider offers. */
const languageStatus = asyncHandler(async (_req, res) => {
  const health = await judge0.checkHealth();
  return ok(res, { configured: true, ...health });
});

/** AI Code Assistant: Explain, Debug, Optimize, Generate. */
const aiAssist = asyncHandler(async (req, res) => {
  const { action = 'explain', language = 'c', sourceCode = '', prompt = '', compilerOutput = '' } = req.body;
  const result = await aiCodeService.assist({ action, language, sourceCode, prompt, compilerOutput });
  return ok(res, result);
});

const listExercises = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { isPublished: true, isDeleted: { $ne: true } };
  if (query.subject) filter.subject = query.subject;
  if (query.unit) filter.unit = query.unit;
  if (query.topic) filter.topic = query.topic;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.language) filter.languageRestrictions = query.language;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  const [items, total] = await Promise.all([
    CodingExercise.find(filter)
      .select('-hiddenTestCases -problemStatement -explanation')
      .populate('subject', 'name code color icon')
      .sort({ difficulty: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    CodingExercise.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

const getExercise = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'exercise id');
  const exercise = await CodingExercise.findOne({ _id: req.params.id, isPublished: true })
    .populate('subject', 'name code color icon')
    .populate('topic', 'title');
  if (!exercise) throw ApiError.notFound('Coding exercise not found.');

  const submissions = await CodingSubmission.find({
    student: req.user._id,
    exercise: exercise._id,
    isRunOnly: false,
  })
    .select('status passedTests totalTests score language createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean({ virtuals: true });

  const best = submissions.reduce((max, entry) => Math.max(max, entry.passedTests || 0), 0);

  return ok(res, {
    exercise: exercise.toJSON(),
    submissions,
    progress: {
      attempts: submissions.length,
      bestPassedTests: best,
      totalTests: (exercise.sampleTestCases?.length || 0) + 0,
      solved: submissions.some((entry) => entry.status === SUBMISSION_STATUS.ACCEPTED),
    },
  });
});

/** Free-form run: the student supplies stdin and sees the raw output. */
const run = asyncHandler(async (req, res) => {
  const submission = await submissionService.runCode(req.user, req.body);
  return created(res, submission);
});

/** Judged submission against the exercise's visible and hidden test cases. */
const submit = asyncHandler(async (req, res) => {
  const { exerciseId, language, sourceCode } = req.body;
  const result = await submissionService.submitToExercise(req.user, exerciseId, { language, sourceCode });
  return created(res, result);
});

const listSubmissions = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { student: req.user._id };
  if (query.exercise) filter.exercise = query.exercise;
  if (query.language) filter.language = query.language;
  if (query.status) filter.status = query.status;
  if (query.judgedOnly === 'true') filter.isRunOnly = false;
  if (query.runOnly === 'true') filter.isRunOnly = true;

  const [items, total] = await Promise.all([
    CodingSubmission.find(filter)
      .select('-sourceCode -testResults')
      .populate('exercise', 'title difficulty slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    CodingSubmission.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

const getSubmission = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'submission id');
  const submission = await CodingSubmission.findOne({ _id: req.params.id, student: req.user._id }).populate(
    'exercise',
    'title difficulty slug points'
  );
  if (!submission) throw ApiError.notFound('Submission not found.');

  // Hidden cases never reveal their expected output.
  const json = submission.toJSON();
  json.testResults = (json.testResults || []).map((entry) =>
    entry.isHidden ? { ...entry, input: '', expectedOutput: '' } : entry
  );

  return ok(res, json);
});

/** Coding progress summary used by the analytics page. */
const codingStats = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const [byLanguage, byStatus, solvedExercises, totals] = await Promise.all([
    CodingSubmission.aggregate([
      { $match: { student: studentId, isRunOnly: false } },
      { $group: { _id: '$language', attempts: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } } } },
      { $sort: { attempts: -1 } },
    ]),
    CodingSubmission.aggregate([
      { $match: { student: studentId, isRunOnly: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CodingSubmission.distinct('exercise', { student: studentId, isRunOnly: false, status: 'accepted' }),
    CodingSubmission.aggregate([
      { $match: { student: studentId, isRunOnly: false } },
      { $group: { _id: null, attempts: { $sum: 1 }, totalTests: { $sum: '$totalTests' }, passedTests: { $sum: '$passedTests' } } },
    ]),
  ]);

  const summary = totals[0] || { attempts: 0, totalTests: 0, passedTests: 0 };
  const publishedCount = await CodingExercise.countDocuments({ isPublished: true });

  return ok(res, {
    totalAttempts: summary.attempts,
    passedTests: summary.passedTests,
    totalTests: summary.totalTests,
    passRate: summary.totalTests ? Math.round((summary.passedTests / summary.totalTests) * 100) : 0,
    exercisesSolved: solvedExercises.filter(Boolean).length,
    publishedExercises: publishedCount,
    byLanguage: byLanguage.map((entry) => ({
      language: entry._id,
      attempts: entry.attempts,
      accepted: entry.accepted,
      successRate: entry.attempts ? Math.round((entry.accepted / entry.attempts) * 100) : 0,
    })),
    byStatus: byStatus.map((entry) => ({ status: entry._id, count: entry.count })),
  });
});

module.exports = {
  meta,
  languageStatus,
  aiAssist,
  listExercises,
  getExercise,
  run,
  submit,
  listSubmissions,
  getSubmission,
  codingStats,
};
