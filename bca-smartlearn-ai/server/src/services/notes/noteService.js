'use strict';

/**
 * AI note generation orchestration.
 *
 * Every generated note is grounded in the real Subject/Unit/Topic documents,
 * persisted as a Note plus a NoteGeneration audit record, and metered in the
 * AI usage log for the admin cost dashboard.
 */

const crypto = require('crypto');
const { Subject, Unit, Topic, Note, NoteGeneration, StudentProfile, NoteTemplate } = require('../../models');
const gemini = require('../ai/geminiClient');
const { buildNotePrompt, NOTE_FORMAT_INSTRUCTIONS } = require('../ai/prompts');
const { logAIUsage } = require('../ai/usageLogger');
const { getSetting } = require('../settingsService');
const { NOTE_FORMATS } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const gfgNotesService = require('./gfgNotesService');

const VALID_FORMATS = NOTE_FORMATS.map((format) => format.key);

function dedupeKeyFor({ userId, format, learningLevel, answerLength, examStyle, topicId, subjectId, extraInstructions }) {
  return crypto
    .createHash('sha1')
    .update(
      [userId, format, learningLevel, answerLength, examStyle, topicId || subjectId || '', extraInstructions || ''].join('|')
    )
    .digest('hex');
}

/** Resolves the syllabus context the prompt needs from real documents. */
async function resolveContext({ subjectId, unitId, topicId }) {
  const [subject, unit, topic] = await Promise.all([
    subjectId ? Subject.findById(subjectId).lean() : null,
    unitId ? Unit.findById(unitId).lean() : null,
    topicId ? Topic.findById(topicId).lean() : null,
  ]);

  if (subjectId && !subject) throw ApiError.notFound('Subject not found.');
  if (unitId && !unit) throw ApiError.notFound('Unit not found.');
  if (topicId && !topic) throw ApiError.notFound('Topic not found.');

  return { subject, unit, topic };
}

/** Enforces the admin-configurable daily AI quota for a student. */
async function assertDailyQuota(user) {
  const limits = await getSetting('ai_rate_limit', { perMinute: 6, perDay: 120 });
  const perDay = Number(limits?.perDay) || 120;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const usedToday = await NoteGeneration.countDocuments({
    student: user._id,
    createdAt: { $gte: startOfDay },
  });

  if (usedToday >= perDay) {
    throw ApiError.tooMany(
      `You have reached today's AI generation limit of ${perDay}. It resets at midnight, or an administrator can raise the limit.`
    );
  }

  return { usedToday, perDay };
}

/**
 * Generates a note with Gemini and stores it.
 * @returns {Promise<{ note: object, generation: object, cached: boolean }>}
 */
async function generateNote(user, payload) {
  const {
    subject: subjectId = null,
    unit: unitId = null,
    topic: topicId = null,
    format = 'quick_revision',
    learningLevel = 'beginner',
    answerLength = 'medium',
    examStyle = '',
    title = '',
    extraInstructions = '',
    syllabusText = '',
  } = payload;

  if (!VALID_FORMATS.includes(format)) {
    throw ApiError.badRequest(`Unsupported note format "${format}".`);
  }
  if (!subjectId && !topicId && !syllabusText) {
    throw ApiError.badRequest('Provide a subject, a topic, or the syllabus text to generate from.');
  }

  await assertDailyQuota(user);

  const { subject, unit, topic } = await resolveContext({ subjectId, unitId, topicId });

  const topicTitle = topic?.title || title || subject?.name || 'Study topic';
  const subjectName = subject?.name || topic?.title || 'BCA subject';

  const dedupeKey = dedupeKeyFor({
    userId: String(user._id),
    format,
    learningLevel,
    answerLength,
    examStyle,
    topicId,
    subjectId,
    extraInstructions,
  });

  const generation = await NoteGeneration.create({
    student: user._id,
    subject: subject?._id || null,
    unit: unit?._id || unitId || null,
    topic: topic?._id || null,
    format,
    learningLevel,
    answerLength,
    examStyle,
    syllabusText: String(syllabusText).slice(0, 8000),
    topicTitle,
    dedupeKey,
    status: 'running',
    provider: 'gemini',
  });

  const { systemInstruction, prompt, formatLabel } = buildNotePrompt({
    format,
    learningLevel,
    answerLength,
    examStyle,
    subjectName,
    unitTitle: unit?.title || '',
    topicTitle,
    syllabusText: syllabusText || topic?.description || '',
    learningObjectives: topic?.learningObjectives?.length ? topic.learningObjectives : subject?.learningObjectives || [],
    extraInstructions,
  });

  const startedAt = Date.now();

  try {
    const result = await gemini.generate({
      prompt,
      systemInstruction,
      temperature: 0.55,
      maxOutputTokens: answerLength === 'long' ? 8192 : answerLength === 'medium' ? 4096 : 2048,
    });

    const note = await Note.create({
      student: user._id,
      subject: subject?._id || null,
      unit: unit?._id || unitId || null,
      topic: topic?._id || null,
      title: `${topicTitle} - ${formatLabel}`,
      format,
      learningLevel,
      answerLength,
      examStyle,
      subjectName,
      topicName: topicTitle,
      content: result.text,
      tags: [format, subject?.code || '', ...(topic?.keywords || [])].filter(Boolean).slice(0, 12),
      source: 'ai',
      generation: generation._id,
      provider: 'gemini',
      model: result.model,
    });

    generation.status = 'succeeded';
    generation.model = result.model;
    generation.promptTokens = result.promptTokens;
    generation.completionTokens = result.completionTokens;
    generation.latencyMs = result.latencyMs;
    generation.note = note._id;
    await generation.save();

    await logAIUsage({
      user,
      feature: 'notes',
      provider: 'gemini',
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
      status: 'success',
      requestSummary: `${format} note for "${topicTitle}"`,
    });

    await StudentProfile.updateOne({ user: user._id }, { $inc: { 'stats.notesGenerated': 1 } });

    return { note: note.toJSON(), generation: generation.toJSON(), cached: false };
  } catch (error) {
    logger.warn('AI Note generation unavailable or failed; generating GeeksforGeeks-aligned notes instead.', {
      message: error.message,
      format,
      topicTitle,
    });

    try {
      const gfgData = await gfgNotesService.fetchGfgNote({
        topicTitle,
        subjectName,
        subjectCode: subject?.code || '',
        format,
      });

      const note = await Note.create({
        student: user._id,
        subject: subject?._id || null,
        unit: unit?._id || unitId || null,
        topic: topic?._id || null,
        title: `${topicTitle} - ${formatLabel} (GeeksforGeeks)`,
        format,
        learningLevel,
        answerLength,
        examStyle,
        subjectName,
        topicName: topicTitle,
        content: gfgData.content,
        tags: [format, 'geeksforgeeks', subject?.code || '', ...(topic?.keywords || [])].filter(Boolean).slice(0, 12),
        source: 'manual',
        generation: generation._id,
        provider: 'gfg',
        model: 'gfg-curated-v1',
      });

      generation.status = 'succeeded';
      generation.model = 'gfg-curated-v1';
      generation.latencyMs = Date.now() - startedAt;
      generation.note = note._id;
      await generation.save();

      await StudentProfile.updateOne({ user: user._id }, { $inc: { 'stats.notesGenerated': 1 } });

      return { note: note.toJSON(), generation: generation.toJSON(), cached: false, provider: 'gfg' };
    } catch (fallbackErr) {
      generation.status = 'failed';
      generation.errorCode = error.code || 'ai_error';
      generation.errorMessage = String(error.message || '').slice(0, 500);
      generation.latencyMs = Date.now() - startedAt;
      await generation.save();
      throw error;
    }
  }
}

/** Turns an approved admin note template into a personal note for the student. */
async function importTemplate(user, templateId, { topicId = null } = {}) {
  const template = await NoteTemplate.findOne({ _id: templateId, isApproved: true }).select('+content');
  if (!template) throw ApiError.notFound('Approved learning material not found.');

  const resolvedTopicId = topicId || template.topic;
  const topic = resolvedTopicId ? await Topic.findById(resolvedTopicId).lean() : null;

  const note = await Note.create({
    student: user._id,
    subject: template.subject || null,
    unit: template.unit || null,
    topic: topic?._id || null,
    title: template.title,
    format: template.format,
    subjectName: '',
    topicName: topic?.title || '',
    content: template.content,
    tags: [...(template.tags || []), 'from-template'],
    source: 'manual',
    provider: 'admin',
    model: 'template',
  });

  return { note: note.toJSON(), templateId: String(template._id) };
}

module.exports = { generateNote, importTemplate, VALID_FORMATS, assertDailyQuota, NOTE_FORMAT_INSTRUCTIONS };
