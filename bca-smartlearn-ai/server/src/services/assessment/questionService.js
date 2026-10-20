'use strict';

/**
 * AI-assisted question drafting into the shared question bank.
 * Generated questions are grounded in real syllabus documents.
 */

const { Question, Subject, Unit, Topic } = require('../../models');
const gemini = require('../ai/geminiClient');
const { buildQuestionPrompt } = require('../ai/prompts');
const { logAIUsage } = require('../ai/usageLogger');
const logger = require('../../config/logger');

const VALID_TYPES = ['mcq', 'multi_select', 'true_false', 'fill_blank', 'output_prediction', 'short_answer'];

function sanitiseOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .filter((option) => option && option.key !== undefined)
    .map((option) => ({ key: String(option.key).slice(0, 10), text: String(option.text || '').slice(0, 2000) }))
    .slice(0, 6);
}

function toQuestionDocuments(drafts, context) {
  return drafts
    .filter((draft) => draft && draft.prompt && VALID_TYPES.includes(draft.type))
    .map((draft) => {
      const options = sanitiseOptions(draft.options);
      const isClosed = ['mcq', 'multi_select', 'true_false'].includes(draft.type);

      return {
        subject: context.subject?._id || null,
        unit: context.unit?._id || null,
        topic: context.topic?._id || null,
        type: draft.type,
        difficulty: draft.difficulty || context.difficulty || 'medium',
        marks: Number(draft.marks) || context.marks || 1,
        negativeMarks: 0,
        prompt: String(draft.prompt).slice(0, 8000),
        codeSnippet: String(draft.codeSnippet || '').slice(0, 12000),
        language: '',
        options,
        correctOptionKeys: Array.isArray(draft.correctOptionKeys)
          ? draft.correctOptionKeys.map((key) => String(key).slice(0, 10)).slice(0, 6)
          : [],
        correctAnswerText: isClosed ? '' : String(draft.correctAnswerText || '').slice(0, 4000),
        acceptedAnswers: Array.isArray(draft.acceptedAnswers)
          ? draft.acceptedAnswers.map((entry) => String(entry).slice(0, 400)).slice(0, 10)
          : [],
        explanation: String(draft.explanation || '').slice(0, 8000),
        learningObjective: String(draft.learningObjective || '').slice(0, 500),
        source: 'ai',
        isApproved: true,
        isActive: true,
        tags: ['ai-generated'],
        createdBy: context.user?._id || null,
      };
    })
    // Drop questions that would not be auto-gradable.
    .filter((question) => {
      if (question.type === 'multi_select') return question.correctOptionKeys.length >= 2 && question.options.length >= 3;
      if (question.type === 'true_false') return question.options.length >= 2;
      if (question.type === 'mcq') return question.options.length >= 2 && question.correctOptionKeys.length === 1;
      return Boolean(question.correctAnswerText);
    });
}

/**
 * Asks Gemini for `count` questions and persists them in the bank.
 * @returns {Promise<Array>} created question documents
 */
async function generateQuestionsWithAI({ user = null, subject = null, unit = null, topic = null, count = 5, types = ['mcq'], difficulty = 'medium', marks = 1 }) {
  const { systemInstruction, prompt } = buildQuestionPrompt({
    subjectName: subject?.name || '',
    unitTitle: unit?.title || '',
    topicTitle: topic?.title || '',
    syllabusText: topic?.description || unit?.description || subject?.description || '',
    count,
    types,
    difficulty,
    marks,
  });

  const result = await gemini.generateJson({
    prompt,
    systemInstruction,
    temperature: 0.8,
    maxOutputTokens: 4096,
  });

  const drafts = Array.isArray(result.data?.questions) ? result.data.questions : [];
  const documents = toQuestionDocuments(drafts, { subject, unit, topic, difficulty, marks, user });

  if (!documents.length) {
    logger.warn('AI returned no usable questions', { topic: topic?.title });
    await logAIUsage({
      user,
      feature: 'questions',
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
      status: 'error',
      errorCode: 'no_usable_questions',
      requestSummary: `questions for ${topic?.title || subject?.name || 'subject'}`,
    });
    return [];
  }

  const created = await Question.insertMany(documents);

  await logAIUsage({
    user,
    feature: 'questions',
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs: result.latencyMs,
    status: 'success',
    requestSummary: `${created.length} questions for ${topic?.title || subject?.name || 'subject'}`,
  });

  return created;
}

/** Resolves subject/unit/topic documents from ids for prompt context. */
async function resolveContext({ subjectId, unitId, topicId }) {
  const [subject, unit, topic] = await Promise.all([
    subjectId ? Subject.findById(subjectId).lean() : null,
    unitId ? Unit.findById(unitId).lean() : null,
    topicId ? Topic.findById(topicId).lean() : null,
  ]);
  return { subject, unit, topic };
}

module.exports = { generateQuestionsWithAI, resolveContext, toQuestionDocuments, VALID_TYPES };
