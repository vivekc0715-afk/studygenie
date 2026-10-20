'use strict';

/**
 * Assessment engine.
 *
 * Owns the full lifecycle of a practice test: question selection (question bank
 * and/or AI drafted), test creation, attempt start/resume/autosave/submit,
 * deterministic grading, analytics enrichment and mastery refresh.
 *
 * Correct answers never leave this layer until an attempt has been finalised.
 */

const {
  Test,
  TestAttempt,
  Question,
  Subject,
  Unit,
  Topic,
  StudentProfile,
  StudentEnrollment,
  TopicPerformance,
  Notification,
} = require('../../models');
const ApiError = require('../../utils/ApiError');
const { getSetting } = require('../settingsService');
const { features } = require('../../config/env');
const { MASTERY_BANDS } = require('../../config/constants');
const questionService = require('./questionService');
const { gradeAttempt, buildAnalytics } = require('./gradingService');
const { refreshAfterAttempt } = require('../analytics/masteryService');
const logger = require('../../config/logger');

const MAX_QUESTIONS = 50;
const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_DURATION_MINUTES = 20;

/* ------------------------------------------------------------- helpers --- */

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Maps a 0-100 mastery score onto the difficulty the student should practise. */
function difficultyForScore(score) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const band = MASTERY_BANDS.find((entry) => value >= entry.min && value <= entry.max);
  if (!band) return 'easy';
  if (band.key === 'critical' || band.key === 'weak') return 'easy';
  if (band.key === 'developing') return 'medium';
  return 'hard';
}

function uniqueIds(ids) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (id === null || id === undefined) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }
  return result;
}

/* --------------------------------------------------- adaptive difficulty --- */

/**
 * Picks a practice difficulty from the student's measured performance in the
 * scope. Falls back to `easy` when nothing has been measured yet.
 */
async function resolveAdaptiveDifficulty(studentId, { subjectId = null, topicIds = [] } = {}) {
  const filter = { student: studentId };
  if (topicIds.length) filter.topic = { $in: topicIds };
  else if (subjectId) filter.subject = subjectId;
  filter.attempts = { $gt: 0 };

  const rows = await TopicPerformance.find(filter).select('masteryScore attempts').lean();
  if (!rows.length) return { difficulty: 'easy', basis: 'no_measurements', masteryScore: 0 };

  const totalAttempts = rows.reduce((sum, row) => sum + (row.attempts || 0), 0);
  const masteryScore = totalAttempts
    ? Math.round(rows.reduce((sum, row) => sum + (row.masteryScore || 0) * (row.attempts || 1), 0) / totalAttempts)
    : 0;

  return { difficulty: difficultyForScore(masteryScore), basis: 'mastery', masteryScore };
}

/* ------------------------------------------------- question acquisition --- */

/** Randomly samples question ids from the bank, balancing difficulty when asked. */
async function sampleBankQuestions({ filter, count, difficulty }) {
  const baseMatch = { ...filter, isActive: true, isApproved: true, isDeleted: { $ne: true } };

  const sample = async (difficultyBand, size) => {
    if (size <= 0) return [];
    const match = difficultyBand ? { ...baseMatch, difficulty: difficultyBand } : baseMatch;
    return Question.aggregate([{ $match: match }, { $sample: { size } }, { $project: { _id: 1 } }]);
  };

  let ids = [];

  if (difficulty && difficulty !== 'mixed') {
    ids = (await sample(difficulty, count)).map((row) => row._id);
  } else {
    const perBand = Math.max(1, Math.ceil(count / 3));
    const bands = await Promise.all(['easy', 'medium', 'hard'].map((band) => sample(band, perBand)));
    ids = shuffle(bands.flat().map((row) => row._id));
  }

  ids = uniqueIds(ids).slice(0, count);

  if (ids.length < count) {
    const extras = await sample(null, count * 3);
    for (const row of extras) {
      if (ids.length >= count) break;
      if (!ids.some((id) => String(id) === String(row._id))) ids.push(row._id);
    }
  }

  return ids.slice(0, count);
}

async function resolveScope({ subjectId, unitId, topicId }) {
  const [subject, unit, topic] = await Promise.all([
    subjectId ? Subject.findById(subjectId).lean() : null,
    unitId ? Unit.findById(unitId).lean() : null,
    topicId ? Topic.findById(topicId).lean() : null,
  ]);

  if (subjectId && !subject) throw ApiError.badRequest('The selected subject does not exist.');
  if (unitId && !unit) throw ApiError.badRequest('The selected unit does not exist.');
  if (topicId && !topic) throw ApiError.badRequest('The selected topic does not exist.');

  return { subject, unit, topic };
}

/**
 * Assembles the question pool for a test: prefers the curated bank and falls
 * back to AI drafting (when configured) to fill the requested count.
 */
async function buildQuestionPool(user, payload) {
  const { subject, unit, topic } = await resolveScope(payload);
  const count = Math.min(Math.max(1, payload.questionCount || DEFAULT_QUESTION_COUNT), MAX_QUESTIONS);

  const filter = {};
  if (subject) filter.subject = subject._id;
  if (unit) filter.unit = unit._id;
  if (topic) filter.topic = topic._id;
  if (Array.isArray(payload.types) && payload.types.length) filter.type = { $in: payload.types };

  const usesBank = payload.source === 'bank' || payload.source === 'mixed';
  const usesAi = payload.source === 'ai' || payload.source === 'mixed';

  let questionIds = [];
  if (usesBank) {
    questionIds = await sampleBankQuestions({ filter, count, difficulty: payload.difficulty });
  }

  let aiGenerated = 0;
  const shortfall = count - questionIds.length;

  if (shortfall > 0 && usesAi) {
    if (!features.ai) {
      if (payload.source === 'ai') throw ApiError.notConfigured('AI test generation', 'GEMINI_API_KEY');
    } else {
      const aiQuestions = await questionService.generateQuestionsWithAI({
        user,
        subject,
        unit,
        topic,
        count: shortfall,
        types: payload.types?.length ? payload.types.filter((type) => questionService.VALID_TYPES.includes(type)) : ['mcq'],
        difficulty: payload.difficulty === 'mixed' ? 'medium' : payload.difficulty,
        marks: payload.marksPerQuestion || 1,
      });
      aiGenerated = aiQuestions.length;
      questionIds = uniqueIds([...questionIds, ...aiQuestions.map((question) => question._id)]);
    }
  }

  if (questionIds.length === 0) {
    questionIds = await sampleBankQuestions({ filter: {}, count, difficulty: payload.difficulty });
  }

  return {
    scope: { subject, unit, topic },
    questionIds: questionIds.slice(0, count),
    aiGenerated,
    bankCount: questionIds.length - aiGenerated,
  };
}

/* ------------------------------------------------------------ test CRUD --- */

function buildTestTitle(scope, payload) {
  if (payload.title) return payload.title;
  if (scope.topic) return `${scope.topic.title} - practice test`;
  if (scope.unit) return `${scope.unit.title} - practice test`;
  if (scope.subject) return `${scope.subject.name} - practice test`;
  return 'Custom practice test';
}

/**
 * Creates a practice test owned by the requesting student.
 * Uses adaptive difficulty when `adaptive` is requested.
 */
async function createTest(user, payload) {
  const scope = await resolveScope(payload);

  let difficulty = payload.difficulty || 'mixed';
  let adaptiveBasis = null;

  if (payload.adaptive) {
    const resolved = await resolveAdaptiveDifficulty(user._id, {
      subjectId: scope.subject?._id || null,
      topicIds: scope.topic ? [scope.topic._id] : [],
    });
    difficulty = resolved.difficulty;
    adaptiveBasis = resolved.basis;
  }

  const pool = await buildQuestionPool(user, { ...payload, difficulty });

  if (!pool.questionIds.length) {
    throw ApiError.badRequest(
      features.ai
        ? 'No questions are available for this scope yet. Try widening the scope or generating with AI.'
        : 'No questions are available for this scope yet. Ask an administrator to publish questions, or add a GEMINI_API_KEY to enable AI drafting.'
    );
  }

  const questions = await Question.find({ _id: { $in: pool.questionIds } }).select('marks type difficulty').lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  const ordered = pool.questionIds.map((id) => byId.get(String(id))).filter(Boolean);
  const totalMarks = ordered.reduce((sum, question) => sum + Number(question.marks || 1), 0);

  const questionCount = ordered.length;
  const sourceType = pool.aiGenerated && pool.bankCount ? 'mixed' : pool.aiGenerated ? 'ai' : 'bank';

  const test = await Test.create({
    title: buildTestTitle(scope, payload),
    description: payload.description || '',
    scope: payload.scope || (scope.topic ? 'unit' : scope.subject ? 'subject' : 'custom'),
    subject: scope.subject?._id || null,
    unit: scope.unit?._id || null,
    semester: payload.semester || scope.subject?.semester || null,
    student: user._id,
    createdBy: user._id,
    sourceType,
    configuration: {
      questionCount,
      durationMinutes: payload.durationMinutes || DEFAULT_DURATION_MINUTES,
      difficulty,
      types: payload.types?.length ? payload.types : ['mcq'],
      totalMarks,
      adaptive: Boolean(payload.adaptive),
    },
    questions: ordered.map((question) => question._id),
    totalMarks,
    difficultyMix: ordered.reduce((mix, question) => {
      mix[question.difficulty] = (mix[question.difficulty] || 0) + 1;
      return mix;
    }, {}),
    adaptiveLevel: adaptiveBasis ? difficulty : '',
    isTemplate: false,
    isPublished: true,
  });

  return test;
}

/** Loads a test the given student is allowed to use. */
async function loadAccessibleTest(studentId, testId) {
  const test = await Test.findById(testId);
  if (!test) throw ApiError.notFound('Test not found.');

  const ownedByStudent = test.student && String(test.student) === String(studentId);
  const isSharedTemplate = !test.student && test.isPublished;
  if (!ownedByStudent && !isSharedTemplate) {
    throw ApiError.forbidden('This test does not belong to you.');
  }

  return test;
}

/** Question payload for a live attempt - answers are stripped by the schema. */
async function publicQuestionsFor(test) {
  const questions = await Question.find({ _id: { $in: test.questions } })
    .populate('topic', 'title difficulty')
    .lean({ virtuals: true });

  const byId = new Map(questions.map((question) => [String(question._id), question]));

  return test.questions
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((question, index) => ({
      id: String(question._id),
      number: index + 1,
      type: question.type,
      difficulty: question.difficulty,
      marks: question.marks,
      negativeMarks: question.negativeMarks || 0,
      prompt: question.prompt,
      codeSnippet: question.codeSnippet || '',
      language: question.language || '',
      options: (question.options || []).map((option) => ({ key: option.key, text: option.text })),
      topic: question.topic ? { id: String(question.topic._id), title: question.topic.title } : null,
    }));
}

/* -------------------------------------------------------- attempt flow --- */

function isExpired(attempt) {
  return Boolean(attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now());
}

function remainingSeconds(attempt) {
  if (!attempt.expiresAt) return null;
  return Math.max(0, Math.round((attempt.expiresAt.getTime() - Date.now()) / 1000));
}

/** Grades a live attempt, stores analytics and refreshes mastery. Idempotent. */
async function finalizeAttempt(attempt, status) {
  const testId = attempt.test?._id || attempt.test;
  const test = await Test.findById(testId);
  if (!test) throw ApiError.notFound('The test for this attempt no longer exists.');

  const questions = await Question.find({ _id: { $in: test.questions } }).select(
    '+correctOptionKeys +correctAnswerText +acceptedAnswers'
  );
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  const ordered = test.questions.map((id) => byId.get(String(id))).filter(Boolean);

  const graded = gradeAttempt(ordered, attempt.answers || []);
  const analytics = buildAnalytics(ordered, graded.answers);

  attempt.answers = graded.answers;
  attempt.score = graded.score;
  attempt.totalMarks = graded.totalMarks;
  attempt.percentage = graded.percentage;
  attempt.correctCount = graded.correctCount;
  attempt.incorrectCount = graded.incorrectCount;
  attempt.unansweredCount = graded.unansweredCount;
  attempt.analytics = analytics;
  attempt.status = status;
  attempt.submittedAt = new Date();
  attempt.durationSeconds = Math.max(
    0,
    Math.round(((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000) || 0)
  );

  await attempt.save();

  await StudentProfile.updateOne(
    { user: attempt.student },
    { $inc: { 'stats.testsAttempted': 1 } },
    { upsert: false }
  ).catch(() => {});

  await refreshAfterAttempt(attempt);

  await Notification.create({
    user: attempt.student,
    type: 'test',
    title: `Test ${status === 'expired' ? 'auto-submitted' : 'submitted'}: ${test.title}`,
    body: `You scored ${graded.score}/${graded.totalMarks} (${graded.percentage}%).`,
    severity: graded.percentage >= 60 ? 'success' : 'warning',
    link: `/tests/attempts/${attempt._id}`,
    meta: { attemptId: String(attempt._id), percentage: graded.percentage },
  }).catch((error) => logger.warn('Unable to create test notification', { message: error.message }));

  return attempt;
}

/** Starts a new attempt, or resumes the student's live attempt. */
async function startAttempt(user, testId) {
  const test = await loadAccessibleTest(user._id, testId);

  const existing = await TestAttempt.findOne({
    student: user._id,
    test: test._id,
    status: 'in_progress',
  }).sort({ createdAt: -1 });

  if (existing) {
    if (!isExpired(existing)) {
      return { attempt: existing, questions: await publicQuestionsFor(test), resumed: true, remainingSeconds: remainingSeconds(existing) };
    }
    await finalizeAttempt(existing, 'expired');
  }

  const durationMinutes = test.configuration?.durationMinutes || DEFAULT_DURATION_MINUTES;

  const attempt = await TestAttempt.create({
    student: user._id,
    test: test._id,
    subject: test.subject || null,
    status: 'in_progress',
    answers: [],
    currentIndex: 0,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
    totalMarks: test.totalMarks,
    difficulty: test.configuration?.difficulty || 'mixed',
    adaptiveLevel: test.adaptiveLevel || '',
  });

  return {
    attempt,
    questions: await publicQuestionsFor(test),
    resumed: false,
    remainingSeconds: remainingSeconds(attempt),
  };
}

/** Merges autosaved responses onto an in-progress attempt. */
function mergeAnswers(attempt, incoming = [], questionIds = []) {
  const map = new Map((attempt.answers || []).map((answer) => [String(answer.question), answer]));
  const validIds = new Set(questionIds.map((id) => String(id)));

  for (const entry of incoming) {
    const key = String(entry.question);
    if (validIds.size && !validIds.has(key)) continue;
    const current = map.get(key);
    if (current) {
      current.response = entry.response ?? current.response;
      current.timeSpentSeconds = entry.timeSpentSeconds ?? current.timeSpentSeconds;
      current.flagged = entry.flagged ?? current.flagged;
    } else {
      map.set(key, {
        question: entry.question,
        response: entry.response ?? null,
        timeSpentSeconds: entry.timeSpentSeconds || 0,
        flagged: Boolean(entry.flagged),
      });
    }
  }

  attempt.answers = [...map.values()];
}

async function saveProgress(user, attemptId, { answers = [], currentIndex } = {}) {
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: user._id });
  if (!attempt) throw ApiError.notFound('Test attempt not found.');
  if (attempt.status !== 'in_progress') throw ApiError.conflict('This attempt has already been finalised.');

  const test = await Test.findById(attempt.test).select('questions');
  mergeAnswers(attempt, answers, test?.questions || []);
  if (Number.isInteger(currentIndex) && currentIndex >= 0) attempt.currentIndex = currentIndex;

  await attempt.save();

  return {
    id: String(attempt._id),
    answered: attempt.answers.filter((answer) => answer.response !== null && answer.response !== undefined).length,
    total: test?.questions?.length || attempt.answers.length,
    currentIndex: attempt.currentIndex,
    remainingSeconds: remainingSeconds(attempt),
  };
}

async function submitAttempt(user, attemptId, { answers = [] } = {}) {
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: user._id });
  if (!attempt) throw ApiError.notFound('Test attempt not found.');

  if (attempt.status !== 'in_progress') {
    return attempt;
  }

  const test = await Test.findById(attempt.test).select('questions');
  mergeAnswers(attempt, answers, test?.questions || []);

  const status = isExpired(attempt) ? 'expired' : 'submitted';
  return finalizeAttempt(attempt, status);
}

async function abandonAttempt(user, attemptId) {
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: user._id });
  if (!attempt) throw ApiError.notFound('Test attempt not found.');
  if (attempt.status !== 'in_progress') return attempt;

  attempt.status = 'abandoned';
  attempt.submittedAt = new Date();
  attempt.durationSeconds = Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000));
  await attempt.save();
  return attempt;
}

/** Loads an attempt, auto-finalising it when its timer has elapsed. */
async function getAttempt(user, attemptId, { autoFinalize = true } = {}) {
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: user._id }).populate(
    'test',
    'title description scope configuration totalMarks questions subject'
  );
  if (!attempt) throw ApiError.notFound('Test attempt not found.');

  if (autoFinalize && attempt.status === 'in_progress' && isExpired(attempt)) {
    return finalizeAttempt(attempt, 'expired');
  }
  return attempt;
}

/**
 * Full attempt payload: live questions while in progress, or the graded
 * breakdown with correct answers and explanations once finalised.
 */
async function buildAttemptPayload(attempt) {
  const test = await Test.findById(attempt.test._id || attempt.test);
  const isFinal = attempt.status !== 'in_progress';

  if (!isFinal) {
    return {
      attempt: attempt.toJSON(),
      questions: await publicQuestionsFor(test),
      remainingSeconds: remainingSeconds(attempt),
      reveal: false,
    };
  }

  const questions = await Question.find({ _id: { $in: test.questions } })
    .select('+correctOptionKeys +correctAnswerText +acceptedAnswers')
    .populate('topic', 'title')
    .lean({ virtuals: true });

  const byId = new Map(questions.map((question) => [String(question._id), question]));
  const answerById = new Map((attempt.answers || []).map((answer) => [String(answer.question), answer]));

  const items = test.questions
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((question, index) => {
      const answer = answerById.get(String(question._id));
      return {
        id: String(question._id),
        number: index + 1,
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        prompt: question.prompt,
        codeSnippet: question.codeSnippet || '',
        options: (question.options || []).map((option) => ({ key: option.key, text: option.text })),
        topic: question.topic ? { id: String(question.topic._id), title: question.topic.title } : null,
        explanation: question.explanation || '',
        correctOptionKeys: question.correctOptionKeys || [],
        correctAnswerText: question.correctAnswerText || '',
        response: answer?.response ?? null,
        isCorrect: answer?.isCorrect ?? null,
        awardedMarks: answer?.awardedMarks ?? 0,
        timeSpentSeconds: answer?.timeSpentSeconds || 0,
        flagged: Boolean(answer?.flagged),
      };
    });

  return { attempt: attempt.toJSON(), questions: items, remainingSeconds: 0, reveal: true };
}

/* ------------------------------------------------------------- listings --- */

async function listTests(user, query = {}) {
  const filter = { student: user._id };
  if (query.subject) filter.subject = query.subject;
  if (query.scope) filter.scope = query.scope;

  return Test.find(filter)
    .select('-questions')
    .populate('subject', 'name code color icon')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });
}

async function listAttempts(user, query = {}) {
  const filter = { student: user._id };
  if (query.test) filter.test = query.test;
  if (query.subject) filter.subject = query.subject;
  if (query.status) filter.status = query.status;

  return TestAttempt.find(filter)
    .select('-answers -analytics')
    .populate('test', 'title scope totalMarks configuration.subject')
    .populate('subject', 'name code color icon')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });
}

/** Aggregate scoring stats used by the analytics dashboard. */
async function attemptStats(studentId) {
  const rows = await TestAttempt.aggregate([
    { $match: { student: studentId, status: { $in: ['submitted', 'expired'] } } },
    {
      $group: {
        _id: null,
        attempts: { $sum: 1 },
        averagePercentage: { $avg: '$percentage' },
        bestPercentage: { $max: '$percentage' },
        totalCorrect: { $sum: '$correctCount' },
        totalIncorrect: { $sum: '$incorrectCount' },
        totalUnanswered: { $sum: '$unansweredCount' },
        studySeconds: { $sum: '$durationSeconds' },
      },
    },
  ]);

  const summary = rows[0] || {
    attempts: 0,
    averagePercentage: 0,
    bestPercentage: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalUnanswered: 0,
    studySeconds: 0,
  };

  const inProgress = await TestAttempt.countDocuments({ student: studentId, status: 'in_progress' });

  return {
    attempts: summary.attempts,
    averagePercentage: Math.round((summary.averagePercentage || 0) * 10) / 10,
    bestPercentage: Math.round((summary.bestPercentage || 0) * 10) / 10,
    totalCorrect: summary.totalCorrect,
    totalIncorrect: summary.totalIncorrect,
    totalUnanswered: summary.totalUnanswered,
    studyMinutes: Math.round((summary.studySeconds || 0) / 60),
    inProgress,
  };
}

/** Scope metadata for the "create practice test" form. */
async function availableScope(studentId) {
  const enrollments = await StudentEnrollment.find({ student: studentId, status: { $ne: 'dropped' } })
    .select('subject')
    .lean();
  const subjectIds = uniqueIds(enrollments.map((entry) => entry.subject));

  const subjects = await Subject.find({ _id: { $in: subjectIds }, isActive: true })
    .select('name code color icon semesterNumber')
    .sort({ semesterNumber: 1, name: 1 })
    .lean({ virtuals: true });

  const counts = await Question.aggregate([
    { $match: { subject: { $in: subjectIds }, isActive: true, isApproved: true, isDeleted: { $ne: true } } },
    { $group: { _id: '$subject', total: { $sum: 1 } } },
  ]);
  const bySubject = new Map(counts.map((row) => [String(row._id), row.total]));

  return subjects.map((subject) => ({
    ...subject,
    questionCount: bySubject.get(String(subject._id)) || 0,
  }));
}

module.exports = {
  createTest,
  loadAccessibleTest,
  publicQuestionsFor,
  startAttempt,
  saveProgress,
  submitAttempt,
  abandonAttempt,
  getAttempt,
  buildAttemptPayload,
  listTests,
  listAttempts,
  attemptStats,
  availableScope,
  resolveAdaptiveDifficulty,
  difficultyForScore,
  MAX_QUESTIONS,
  DEFAULT_QUESTION_COUNT,
};
