'use strict';

const { Test } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');
const { QUESTION_TYPES, DIFFICULTY_LEVELS, TEST_SCOPES } = require('../config/constants');
const { features } = require('../config/env');
const testService = require('../services/assessment/testService');
const { AUTO_GRADABLE_TYPES } = require('../validators/test.validators');

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

/** Test builder bootstrap: enumerations, limits and integration status. */
const meta = asyncHandler(async (_req, res) =>
  ok(res, {
    scopes: TEST_SCOPES,
    questionTypes: QUESTION_TYPES,
    autoGradableTypes: AUTO_GRADABLE_TYPES,
    difficulties: ['mixed', ...DIFFICULTY_LEVELS],
    sources: ['bank', 'ai', 'mixed'],
    limits: {
      maxQuestions: testService.MAX_QUESTIONS,
      defaultQuestionCount: testService.DEFAULT_QUESTION_COUNT,
      defaultDurationMinutes: 20,
    },
    aiConfigured: features.ai,
    aiHint: features.ai
      ? ''
      : 'AI test generation is not configured yet. Add GEMINI_API_KEY to server/.env to enable it - curated bank questions still work.',
  })
);

/** Subjects the student can build a test from, with bank question counts. */
const scope = asyncHandler(async (req, res) => ok(res, await testService.availableScope(req.user._id)));

const createTest = asyncHandler(async (req, res) => {
  const test = await testService.createTest(req.user, req.body);
  const json = test.toJSON();
  json.questionCount = test.questions.length;
  delete json.questions;
  return created(res, json);
});

const listTests = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const items = await testService.listTests(req.user, query);
  const total = items.length;
  const paged = items.slice(skip, skip + limit).map((test) => ({
    ...test,
    questionCount: test.configuration?.questionCount || 0,
  }));

  return ok(res, paged, buildMeta({ page, limit, total }));
});

const getTest = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'test id');
  const test = await testService.loadAccessibleTest(req.user._id, req.params.id);
  const json = test.toJSON();
  json.questionCount = test.questions.length;
  delete json.questions;

  const attempts = await testService.listAttempts(req.user, { test: test._id });
  return ok(res, { test: json, attempts: attempts.slice(0, 10) });
});

const startAttempt = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'test id');
  const result = await testService.startAttempt(req.user, req.params.id);
  return created(res, {
    attempt: result.attempt.toJSON(),
    questions: result.questions,
    resumed: result.resumed,
    remainingSeconds: result.remainingSeconds,
  });
});

const listAttempts = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const items = await testService.listAttempts(req.user, query);
  const total = items.length;

  return ok(res, items.slice(skip, skip + limit), buildMeta({ page, limit, total }));
});

const getAttempt = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'attempt id');
  const attempt = await testService.getAttempt(req.user, req.params.id);
  const payload = await testService.buildAttemptPayload(attempt);
  return ok(res, payload);
});

const autosave = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'attempt id');
  const result = await testService.saveProgress(req.user, req.params.id, req.body);
  return ok(res, result);
});

const submit = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'attempt id');
  const attempt = await testService.submitAttempt(req.user, req.params.id, req.body);
  const payload = await testService.buildAttemptPayload(attempt);
  return ok(res, payload);
});

const abandon = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'attempt id');
  const attempt = await testService.abandonAttempt(req.user, req.params.id);
  return ok(res, { id: String(attempt._id), status: attempt.status });
});

/** Scoring summary used by the assessment dashboard. */
const stats = asyncHandler(async (req, res) => {
  const [summary, testsCreated] = await Promise.all([
    testService.attemptStats(req.user._id),
    Test.countDocuments({ student: req.user._id }),
  ]);
  return ok(res, { ...summary, testsCreated });
});

module.exports = {
  meta,
  scope,
  createTest,
  listTests,
  getTest,
  startAttempt,
  listAttempts,
  getAttempt,
  autosave,
  submit,
  abandon,
  stats,
};
