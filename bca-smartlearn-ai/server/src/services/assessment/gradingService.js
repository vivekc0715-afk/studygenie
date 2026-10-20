'use strict';

/**
 * Deterministic answer grading for every auto-gradable question type.
 * Coding questions are graded by the code execution service, not here.
 */

const { QUESTION_TYPES } = require('../../config/constants');

/** Normalises free text so "  Hello, World. " and "hello world" compare equal. */
function normaliseText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asKeyArray(response) {
  if (Array.isArray(response)) return response.map((entry) => String(entry).trim()).filter(Boolean);
  if (response === null || response === undefined || response === '') return [];
  return [String(response).trim()];
}

function isAnswerEmpty(response) {
  if (response === null || response === undefined) return true;
  if (typeof response === 'string') return response.trim() === '';
  if (Array.isArray(response)) return response.length === 0;
  if (typeof response === 'object') {
    if ('key' in response) return !response.key;
    if ('text' in response) return String(response.text).trim() === '';
    if ('keys' in response) return !response.keys?.length;
    return Object.keys(response).length === 0;
  }
  return false;
}

/**
 * Grades a single response.
 * @returns {{ isCorrect: boolean|null, awardedMarks: number, reason: string }}
 *          `isCorrect` is null when the type cannot be auto-graded.
 */
function gradeResponse(question, response) {
  const marks = Number(question.marks || 1);
  const negative = Number(question.negativeMarks || 0);

  if (isAnswerEmpty(response)) {
    return { isCorrect: false, awardedMarks: 0, reason: 'unanswered' };
  }

  const correctKeys = (question.correctOptionKeys || []).map((key) => String(key).trim());
  const accepted = [question.correctAnswerText, ...(question.acceptedAnswers || [])]
    .filter(Boolean)
    .map((entry) => normaliseText(entry));

  switch (question.type) {
    case 'mcq': {
      const [given] = asKeyArray(response);
      const isCorrect = correctKeys.length > 0 && given === correctKeys[0];
      return { isCorrect, awardedMarks: isCorrect ? marks : -negative, reason: isCorrect ? 'correct' : 'incorrect' };
    }

    case 'multi_select':
    case 'true_false': {
      const given = asKeyArray(response).map((entry) => entry.trim().toLowerCase()).sort();
      const expected = correctKeys.map((entry) => entry.trim().toLowerCase()).sort();
      const isCorrect = expected.length > 0 && given.length === expected.length && given.every((key, index) => key === expected[index]);
      return { isCorrect, awardedMarks: isCorrect ? marks : -negative, reason: isCorrect ? 'correct' : 'incorrect' };
    }

    case 'fill_blank':
    case 'output_prediction':
    case 'short_answer': {
      const given = normaliseText(typeof response === 'object' ? response.text ?? response.answer : response);
      const isCorrect = given !== '' && accepted.includes(given);
      return { isCorrect, awardedMarks: isCorrect ? marks : -negative, reason: isCorrect ? 'correct' : 'incorrect' };
    }

    case 'coding':
      return { isCorrect: null, awardedMarks: 0, reason: 'awaiting_judge' };

    default:
      return { isCorrect: null, awardedMarks: 0, reason: `unsupported_type:${question.type}` };
  }
}

/** True when the question type can be graded without a human or a judge. */
function isAutoGradable(type) {
  return QUESTION_TYPES.includes(type) && type !== 'coding';
}

/**
 * Grades a whole attempt.
 * @returns {{ answers: Array, score: number, totalMarks: number, percentage: number,
 *             correctCount: number, incorrectCount: number, unansweredCount: number }}
 */
function gradeAttempt(questions, submittedAnswers) {
  const byId = new Map(submittedAnswers.map((entry) => [String(entry.question), entry]));

  const answers = questions.map((question) => {
    const submitted = byId.get(String(question._id));
    const response = submitted?.response ?? null;
    const { isCorrect, awardedMarks } = gradeResponse(question, response);

    return {
      question: question._id,
      response,
      isCorrect,
      awardedMarks,
      timeSpentSeconds: submitted?.timeSpentSeconds || 0,
      flagged: Boolean(submitted?.flagged),
    };
  });

  const score = Math.max(0, answers.reduce((sum, answer) => sum + (answer.awardedMarks || 0), 0));
  const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);

  return {
    answers,
    score,
    totalMarks,
    percentage: totalMarks ? Math.round((score / totalMarks) * 1000) / 10 : 0,
    correctCount: answers.filter((answer) => answer.isCorrect === true).length,
    incorrectCount: answers.filter((answer) => answer.isCorrect === false).length,
    unansweredCount: answers.filter((answer) => isAnswerEmpty(answer.response)).length,
  };
}

/** Builds the per-topic / per-difficulty / per-type breakdown stored on the attempt. */
function buildAnalytics(questions, answers) {
  const questionById = new Map(questions.map((question) => [String(question._id), question]));

  const bucket = (key) => {
    const map = new Map();
    for (const answer of answers) {
      const question = questionById.get(String(answer.question));
      if (!question) continue;
      const label = key(question);
      if (!label) continue;
      const current = map.get(label) || { key: label, attempted: 0, correct: 0, marks: 0, awarded: 0 };
      current.attempted += 1;
      if (answer.isCorrect === true) current.correct += 1;
      current.marks += Number(question.marks || 0);
      current.awarded += Math.max(0, answer.awardedMarks || 0);
      map.set(label, current);
    }
    return [...map.values()].map((entry) => ({ ...entry, accuracy: Math.round((entry.correct / entry.attempted) * 100) }));
  };

  const byTopic = bucket((question) => (question.topic ? String(question.topic) : null));
  const byDifficulty = bucket((question) => question.difficulty || 'medium');
  const byType = bucket((question) => question.type);

  const weakConcepts = byTopic
    .filter((entry) => entry.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 8)
    .map((entry) => entry.key);

  return { byTopic, byDifficulty, byType, weakConcepts };
}

module.exports = { gradeResponse, gradeAttempt, buildAnalytics, normaliseText, isAnswerEmpty, isAutoGradable };
