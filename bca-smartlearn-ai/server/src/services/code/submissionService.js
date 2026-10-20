'use strict';

/**
 * Coding practice orchestration: ad-hoc runs and full exercise judging.
 *
 * Results always come from the real execution provider - nothing is simulated.
 */

const { CodingExercise, CodingSubmission, SubjectPerformance } = require('../../models');
const judge0 = require('./judge0');
const { getSetting } = require('../settingsService');
const { SUBMISSION_STATUS, SUPPORTED_LANGUAGES } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

const TERMINAL_STATUSES = [
  SUBMISSION_STATUS.ACCEPTED,
  SUBMISSION_STATUS.WRONG_ANSWER,
  SUBMISSION_STATUS.COMPILATION_ERROR,
  SUBMISSION_STATUS.RUNTIME_ERROR,
  SUBMISSION_STATUS.TIME_LIMIT_EXCEEDED,
  SUBMISSION_STATUS.MEMORY_LIMIT_EXCEEDED,
];

const MAX_JUDGE_CASES = 12;

function languageLabel(key) {
  return SUPPORTED_LANGUAGES.find((language) => language.key === key)?.label || key;
}

async function compilerLimits() {
  const limits = await getSetting('compiler_limits', {
    defaultTimeLimitSeconds: 5,
    maxTimeLimitSeconds: 10,
    maxSourceLength: 40000,
    maxOutputBytes: 65536,
  });
  return {
    defaultTimeLimitSeconds: Number(limits?.defaultTimeLimitSeconds) || 5,
    maxTimeLimitSeconds: Number(limits?.maxTimeLimitSeconds) || 10,
    maxSourceLength: Number(limits?.maxSourceLength) || 40000,
    maxOutputBytes: Number(limits?.maxOutputBytes) || 65536,
  };
}

function assertSourceLength(sourceCode, limits) {
  if (!String(sourceCode || '').trim()) throw ApiError.badRequest('The source code is empty.');
  if (String(sourceCode).length > limits.maxSourceLength) {
    throw ApiError.badRequest(`The source code exceeds the ${limits.maxSourceLength} character limit.`);
  }
}

function truncate(value) {
  const text = String(value ?? '');
  return text.length > 4000 ? `${text.slice(0, 4000)}\n...[truncated]` : text;
}

function outputsMatch(actual, expected) {
  const normalise = (value) => String(value ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
  return normalise(actual) === normalise(expected);
}

/** Free-form run with student-supplied input. */
async function runCode(user, { language, sourceCode, stdin = '' }) {
  const limits = await compilerLimits();
  assertSourceLength(sourceCode, limits);

  const result = await judge0.execute({
    languageKey: language,
    sourceCode,
    stdin,
    timeLimitSeconds: limits.defaultTimeLimitSeconds,
    memoryLimitKb: 256000,
  });

  const submission = await CodingSubmission.create({
    student: user._id,
    exercise: null,
    language,
    sourceCode,
    stdin,
    isRunOnly: true,
    status: result.status,
    stdout: truncate(result.stdout),
    stderr: truncate(result.stderr),
    compileOutput: truncate(result.compileOutput),
    message: truncate(result.message),
    timeSeconds: result.timeSeconds,
    memoryKb: result.memoryKb,
    providerToken: result.token,
  });

  return submission.toJSON();
}

/** Judges a submission against every visible and hidden test case of an exercise. */
async function submitToExercise(user, exerciseId, { language, sourceCode }) {
  const limits = await compilerLimits();
  assertSourceLength(sourceCode, limits);

  const exercise = await CodingExercise.findOne({ _id: exerciseId, isPublished: true }).select('+hiddenTestCases');
  if (!exercise) throw ApiError.notFound('Coding exercise not found.');

  if (exercise.languageRestrictions?.length && !exercise.languageRestrictions.includes(language)) {
    throw ApiError.badRequest(
      `This exercise accepts ${exercise.languageRestrictions.map(languageLabel).join(', ')} only.`
    );
  }

  const plain = (entry) => (typeof entry.toObject === 'function' ? entry.toObject() : { ...entry });
  const cases = [
    ...(exercise.sampleTestCases || []).map((entry) => plain(entry)),
    ...(exercise.hiddenTestCases || []).map((entry) => ({ ...plain(entry), isHidden: true })),
  ];

  if (!cases.length) {
    throw new ApiError(422, 'This exercise has no test cases configured yet.', { code: 'exercise_not_judgeable' });
  }

  const timeLimitSeconds = Math.min(exercise.timeLimitSeconds || limits.defaultTimeLimitSeconds, limits.maxTimeLimitSeconds);
  const judgedCases = cases.slice(0, MAX_JUDGE_CASES);

  const results = [];
  let passed = 0;
  let firstFailure = null;

  for (let index = 0; index < judgedCases.length; index += 1) {
    const testCase = judgedCases[index];
    const execution = await judge0.execute({
      languageKey: language,
      sourceCode,
      stdin: testCase.input || '',
      expectedOutput: testCase.expectedOutput || '',
      timeLimitSeconds,
      memoryLimitKb: exercise.memoryLimitKb || 256000,
    });

    const isAcceptedStatus = execution.status === SUBMISSION_STATUS.ACCEPTED;
    const matches = isAcceptedStatus && outputsMatch(execution.stdout, testCase.expectedOutput);
    const passedCase = matches;

    if (passedCase) passed += 1;
    else if (!firstFailure) firstFailure = { execution, testCase, index };

    results.push({
      index,
      passed: passedCase,
      isHidden: Boolean(testCase.isHidden),
      input: testCase.isHidden ? '' : truncate(testCase.input),
      expectedOutput: testCase.isHidden ? '' : truncate(testCase.expectedOutput),
      actualOutput: testCase.isHidden && !passedCase ? '' : truncate(execution.stdout),
      status: execution.status,
      stderr: testCase.isHidden ? '' : truncate(execution.stderr || execution.compileOutput),
    });

    // Stop early on a compilation error - every remaining case would fail identically.
    if (execution.status === SUBMISSION_STATUS.COMPILATION_ERROR) break;
  }

  const totalTests = results.length;
  const accepted = passed === totalTests;
  const score = totalTests ? Math.round((passed / totalTests) * (exercise.points || 10)) : 0;

  const failureExecution = firstFailure?.execution;
  const status = accepted
    ? SUBMISSION_STATUS.ACCEPTED
    : failureExecution?.status && TERMINAL_STATUSES.includes(failureExecution.status)
      ? failureExecution.status
      : SUBMISSION_STATUS.WRONG_ANSWER;

  const submission = await CodingSubmission.create({
    student: user._id,
    exercise: exercise._id,
    language,
    sourceCode,
    stdin: judgedCases[0]?.input || '',
    isRunOnly: false,
    status,
    stdout: truncate(results.find((entry) => entry.actualOutput)?.actualOutput || ''),
    stderr: truncate(failureExecution?.stderr || ''),
    compileOutput: truncate(failureExecution?.compileOutput || ''),
    message: failureExecution?.message ? truncate(failureExecution.message) : '',
    timeSeconds: failureExecution?.timeSeconds || 0,
    memoryKb: failureExecution?.memoryKb || 0,
    passedTests: passed,
    totalTests,
    testResults: results.map(({ stderr, ...rest }) => rest),
    score,
    provider: 'judge0',
    providerToken: failureExecution?.token || '',
  });

  await CodingExercise.updateOne(
    { _id: exercise._id },
    { $inc: { 'stats.attempts': 1, ...(accepted ? { 'stats.accepted': 1 } : {}) } }
  );

  if (exercise.subject) {
    await updateSubjectCodingStats(user._id, exercise.subject, accepted);
  }

  logger.debug('Exercise judged', {
    student: String(user._id),
    exercise: String(exercise._id),
    passed,
    total: totalTests,
  });

  return {
    submission: submission.toJSON(),
    exercise: { id: String(exercise._id), title: exercise.title, points: exercise.points },
    passed,
    totalTests,
    accepted,
    score,
  };
}

async function updateSubjectCodingStats(studentId, subjectId, accepted) {
  try {
    const existing = await SubjectPerformance.findOne({ student: studentId, subject: subjectId });
    const attempts = (existing?.codingAttempts || 0) + 1;
    const acceptedCount = (existing?.codingAccepted || 0) + (accepted ? 1 : 0);

    await SubjectPerformance.findOneAndUpdate(
      { student: studentId, subject: subjectId },
      {
        $set: {
          codingAttempts: attempts,
          codingAccepted: acceptedCount,
          codingSuccessRate: Math.round((acceptedCount / attempts) * 100),
        },
        $setOnInsert: { student: studentId, subject: subjectId },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    logger.warn('Unable to update subject coding statistics', { message: error.message });
  }
}

module.exports = { runCode, submitToExercise, compilerLimits, outputsMatch, MAX_JUDGE_CASES };
