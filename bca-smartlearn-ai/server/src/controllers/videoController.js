'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { features } = require('../config/env');
const videoService = require('../services/recommendations/videoService');

const HINT = 'Lesson recommendations are not configured yet. Add YOUTUBE_API_KEY to server/.env to enable them.';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

const { listSyllabusVideos } = require('../services/recommendations/syllabusVideoChapters');

const meta = asyncHandler(async (_req, res) =>
  ok(res, {
    configured: true,
    hint: '',
    strategies: videoService.DEFAULT_THRESHOLDS,
  })
);

/** Active recommendations. Automatically populated with syllabus video chapters. */
const recommendations = asyncHandler(async (req, res) => {
  const refresh = String(req.query.refresh || '') === 'true';
  const result = await videoService.recommendationsForStudent(req.user, { refresh });
  return ok(res, result);
});

/** Regenerates recommendations from the student's weakest measured topics or syllabus. */
const refresh = asyncHandler(async (req, res) => {
  const result = await videoService.recommendationsForStudent(req.user, { refresh: true });
  return ok(res, result);
});

/** Recommendations for a specific topic, sized to the learner's mastery. */
const forTopic = asyncHandler(async (req, res) => {
  assertObjectId(req.params.topicId, 'topic id');
  const result = await videoService.recommendForTopic(req.user, { topicId: req.params.topicId });
  return ok(res, result);
});

/** Free-text search for syllabus or YouTube videos. */
const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) throw ApiError.badRequest('Enter at least two characters to search.');

  const result = await videoService.search({ query: term, maxResults: Math.min(Number(req.query.limit) || 8, 20) });
  return ok(res, result);
});

/** Syllabus video chapters mapped by semester and subject code. */
const syllabusChapters = asyncHandler(async (req, res) => {
  const { semester, subjectCode, search: q } = req.query;
  const chapters = listSyllabusVideos({ semester, subjectCode, search: q });
  return ok(res, chapters);
});

/** Curated videos - available with syllabus fallbacks. */
const curated = asyncHandler(async (req, res) => {
  const items = await videoService.curated({
    subjectId: req.query.subject || null,
    topicId: req.query.topic || null,
    search: req.query.q ? escapeRegex(req.query.q) : null,
    limit: Math.min(Number(req.query.limit) || 12, 50),
  });
  return ok(res, items);
});

const updateStatus = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'recommendation id');
  const doc = await videoService.updateStatus(req.user, req.params.id, req.body.status);
  return ok(res, doc.toJSON());
});

module.exports = { meta, recommendations, refresh, forTopic, search, syllabusChapters, curated, updateStatus };
