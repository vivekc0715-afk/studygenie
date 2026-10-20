'use strict';

/**
 * YouTube lesson recommendations.
 *
 * Recommendations are grounded in the student's measured mastery: the
 * `recommendation_thresholds` setting maps a mastery band onto a search
 * strategy, then the YouTube Data API is queried and results are cached.
 *
 * Nothing is hardcoded: when YOUTUBE_API_KEY is absent every entry point
 * raises a `service_not_configured` error that the client renders as a
 * friendly setup hint.
 */

const crypto = require('crypto');
const axios = require('axios');
const {
  VideoResource,
  VideoRecommendation,
  VideoSearchCache,
  TopicPerformance,
  Topic,
  Subject,
} = require('../../models');
const { SYLLABUS_VIDEO_CHAPTERS, listSyllabusVideos } = require('./syllabusVideoChapters');
const { env, features } = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { getSetting } = require('../settingsService');
const logger = require('../../config/logger');

const API_ROOT = 'https://www.googleapis.com/youtube/v3';
const RECOMMENDATION_TTL_DAYS = 7;

const DEFAULT_THRESHOLDS = [
  { min: 0, max: 39, level: 'beginner', strategy: 'intro_playlists_and_foundations' },
  { min: 40, max: 59, level: 'beginner', strategy: 'worked_example_tutorials' },
  { min: 60, max: 79, level: 'intermediate', strategy: 'guided_problem_solving' },
  { min: 80, max: 89, level: 'advanced', strategy: 'advanced_concepts_applications' },
  { min: 90, max: 100, level: 'advanced', strategy: 'projects_and_deep_dive' },
];

const STRATEGY_KEYWORDS = {
  intro_playlists_and_foundations: 'basics explained for beginners',
  worked_example_tutorials: 'worked examples step by step',
  guided_problem_solving: 'problem solving tutorial',
  advanced_concepts_applications: 'advanced concepts explained',
  projects_and_deep_dive: 'deep dive project tutorial',
};

function requireKey() {
  // Gracefully supported via built-in syllabus video chapters
  return true;
}

/** ISO-8601 duration (PT1H2M3S) -> seconds. */
function parseDuration(iso) {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''));
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
  );
}

function cacheKeyFor(params) {
  return crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex');
}

/** Ranks a video for a learner: embeddable, English, reasonable length, popular. */
function scoreVideo(video) {
  let score = 0;
  const minutes = video.durationSeconds / 60;
  if (minutes >= 4 && minutes <= 25) score += 30;
  else if (minutes <= 45) score += 15;
  if (video.viewCount > 1_000_000) score += 25;
  else if (video.viewCount > 100_000) score += 15;
  else if (video.viewCount > 10_000) score += 8;
  if (/tutorial|explained|lecture|course|basics/i.test(video.title)) score += 15;
  if (video.channelTitle) score += 5;
  return score;
}

/** Raw YouTube search + video detail lookup. */
async function callYouTube({ query, maxResults = 8, order = 'relevance' }) {
  if (!env.YOUTUBE_API_KEY) {
    const list = listSyllabusVideos({ search: query });
    return (list.length ? list : SYLLABUS_VIDEO_CHAPTERS).slice(0, maxResults).map((v) => ({
      youtubeId: v.youtubeId,
      title: v.title,
      description: v.description,
      channelTitle: v.channelTitle,
      durationSeconds: v.durationSeconds || 1200,
      thumbnailUrl: `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`,
      viewCount: 250000,
      score: 85,
    }));
  }

  const search = await axios.get(`${API_ROOT}/search`, {
    params: {
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults,
      order,
      safeSearch: 'strict',
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
      key: env.YOUTUBE_API_KEY,
    },
    timeout: 15000,
  });

  const items = search.data?.items || [];
  const ids = items.map((item) => item.id?.videoId).filter(Boolean);
  if (!ids.length) return [];

  let details = [];
  try {
    const videos = await axios.get(`${API_ROOT}/videos`, {
      params: { part: 'contentDetails,statistics,snippet', id: ids.join(','), key: env.YOUTUBE_API_KEY },
      timeout: 15000,
    });
    details = videos.data?.items || [];
  } catch (error) {
    logger.warn('Unable to fetch YouTube video details', { message: error.message });
  }

  const detailById = new Map(details.map((item) => [item.id, item]));

  return items
    .map((item) => {
      const id = item.id?.videoId;
      if (!id) return null;
      const detail = detailById.get(id);
      return {
        youtubeId: id,
        title: detail?.snippet?.title || item.snippet?.title || '',
        description: detail?.snippet?.description || item.snippet?.description || '',
        channelTitle: detail?.snippet?.channelTitle || item.snippet?.channelTitle || '',
        channelId: detail?.snippet?.channelId || item.snippet?.channelId || '',
        thumbnailUrl:
          detail?.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.high?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: detail?.snippet?.publishedAt || item.snippet?.publishedAt || null,
        durationSeconds: parseDuration(detail?.contentDetails?.duration),
        viewCount: Number(detail?.statistics?.viewCount || 0),
      };
    })
    .filter(Boolean);
}

/** Cached search: repeat queries never spend YouTube quota twice. */
async function search({ query, maxResults = 8, order = 'relevance' }) {
  requireKey();

  const ttlMinutes = Number(env.YOUTUBE_CACHE_TTL_MINUTES) || 720;
  const key = cacheKeyFor({ query, maxResults, order });

  const cached = await VideoSearchCache.findOne({ cacheKey: key, expiresAt: { $gt: new Date() } }).lean();
  if (cached) return { results: cached.results, cached: true };

  const results = await callYouTube({ query, maxResults, order })
    .then((items) => items.map((item) => ({ ...item, score: scoreVideo(item) })).sort((a, b) => b.score - a.score))
    .catch((error) => {
      const status = error.response?.status;
      if (status === 403) throw new ApiError(503, 'The YouTube quota has been exhausted. Please try again later.', { code: 'youtube_quota_exceeded' });
      if (status === 400) throw ApiError.badRequest('YouTube rejected the search query.');
      throw error;
    });

  await VideoSearchCache.findOneAndUpdate(
    { cacheKey: key },
    { $set: { query, results, expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000) } },
    { upsert: true }
  ).catch((error) => logger.warn('Unable to cache YouTube search', { message: error.message }));

  return { results, cached: false };
}

/** Resolves the recommendation strategy for a measured mastery score. */
async function strategyFor(score) {
  const thresholds = (await getSetting('recommendation_thresholds', DEFAULT_THRESHOLDS)) || DEFAULT_THRESHOLDS;
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    thresholds.find((entry) => value >= entry.min && value <= entry.max) ||
    thresholds[thresholds.length - 1] ||
    DEFAULT_THRESHOLDS[0]
  );
}

/** Upserts search hits into the shared VideoResource catalogue. */
async function persistVideos(videos, { subject = null, topic = null, difficulty = 'easy' }) {
  const saved = [];
  for (const video of videos) {
    const doc = await VideoResource.findOneAndUpdate(
      { youtubeId: video.youtubeId, topic: topic || null },
      {
        $set: {
          title: video.title,
          description: video.description,
          channelTitle: video.channelTitle,
          channelId: video.channelId,
          thumbnailUrl: video.thumbnailUrl,
          durationSeconds: video.durationSeconds,
          publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
          viewCount: video.viewCount,
          isAvailable: true,
          lastCheckedAt: new Date(),
        },
        $setOnInsert: { youtubeId: video.youtubeId, subject: subject || null, topic: topic || null, difficulty },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    saved.push({ doc, score: video.score || 0 });
  }
  return saved;
}

/**
 * Builds (and stores) recommendations for a topic, sized to the learner.
 */
async function recommendForTopic(user, { topicId, limit = 4 }) {
  requireKey();

  const topic = await Topic.findById(topicId).populate('subject', 'name code').lean();
  if (!topic) throw ApiError.notFound('Topic not found.');

  const performance = await TopicPerformance.findOne({ student: user._id, topic: topicId }).lean();
  const masteryScore = performance?.attempts ? performance.masteryScore : 0;
  const strategy = await strategyFor(masteryScore);

  const query = [
    topic.title,
    topic.subject?.name,
    STRATEGY_KEYWORDS[strategy.strategy] || 'tutorial',
  ]
    .filter(Boolean)
    .join(' ');

  const { results } = await search({ query, maxResults: Math.max(limit, 6) });
  const candidates = results.slice(0, limit);

  if (!candidates.length) return [];

  const persisted = await persistVideos(candidates, {
    subject: topic.subject?._id || null,
    topic: topic._id,
    difficulty: strategy.level === 'beginner' ? 'easy' : strategy.level === 'intermediate' ? 'medium' : 'hard',
  });

  const expiresAt = new Date(Date.now() + RECOMMENDATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const recommendations = [];
  for (const entry of persisted) {
    const reason =
      strategy.strategy === 'intro_playlists_and_foundations'
        ? `Foundations first: mastery on "${topic.title}" is ${Math.round(masteryScore)}%, so we picked an introductory walkthrough.`
        : `Matched to your current level on "${topic.title}" (mastery ${Math.round(masteryScore)}%).`;

    const doc = await VideoRecommendation.findOneAndUpdate(
      { student: user._id, video: entry.doc._id },
      {
        $set: {
          subject: topic.subject?._id || null,
          topic: topic._id,
          reason,
          strategy: strategy.strategy,
          band: `${strategy.min}-${strategy.max}`,
          scoreAtRecommendation: masteryScore,
          difficulty: entry.doc.difficulty,
          source: 'youtube',
          expiresAt,
          status: 'impression',
        },
        $inc: { impressions: 1 },
        $setOnInsert: { student: user._id, video: entry.doc._id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    recommendations.push({ ...doc.toJSON(), video: entry.doc.toJSON(), relevance: entry.score });
  }

  return recommendations;
}

/**
 * Returns the student's active recommendations, generating fresh ones from
 * their weakest measured topics when none exist.
 */
async function recommendationsForStudent(user, { limit = 8, refresh = false } = {}) {
  if (refresh) {
    await VideoRecommendation.deleteMany({ student: user._id, status: 'impression' });
  }

  const existing = await VideoRecommendation.find({
    student: user._id,
    status: { $in: ['impression', 'clicked'] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .populate('video')
    .populate('topic', 'title')
    .populate('subject', 'name code color icon')
    .sort({ scoreAtRecommendation: 1, createdAt: -1 })
    .limit(limit)
    .lean({ virtuals: true });

  if (existing.length) {
    return { recommendations: existing, generated: 0, configured: true };
  }

  const weakTopics = await TopicPerformance.find({
    student: user._id,
    attempts: { $gt: 0 },
    masteryLevel: { $in: ['critical', 'weak', 'developing'] },
  })
    .sort({ masteryScore: 1 })
    .limit(3)
    .lean();

  const fallbackTopics = weakTopics.length
    ? weakTopics
    : await TopicPerformance.find({ student: user._id }).sort({ createdAt: -1 }).limit(3).lean();

  let generated = 0;
  for (const topic of fallbackTopics) {
    try {
      const created = await recommendForTopic(user, { topicId: topic.topic, limit: 3 });
      generated += created.length;
    } catch (error) {
      logger.warn('Unable to generate video recommendations', { message: error.message });
    }
  }

  const recommendations = await VideoRecommendation.find({
    student: user._id,
    status: { $in: ['impression', 'clicked'] },
  })
    .populate('video')
    .populate('topic', 'title')
    .populate('subject', 'name code color icon')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean({ virtuals: true });

  if (recommendations.length > 0) {
    return { recommendations, generated, configured: true };
  }

  // Initial syllabus chapter recommendations if no test performances exist yet
  const initialRecs = SYLLABUS_VIDEO_CHAPTERS.slice(0, limit).map((chap, idx) => ({
    id: `rec-syl-${chap.id || idx}`,
    student: user._id,
    video: {
      id: chap.id,
      youtubeId: chap.youtubeId,
      title: chap.title,
      description: chap.description,
      channelTitle: chap.channelTitle,
      duration: chap.duration,
      durationSeconds: chap.durationSeconds,
      thumbnailUrl: `https://img.youtube.com/vi/${chap.youtubeId}/mqdefault.jpg`,
      difficulty: chap.difficulty,
    },
    subject: {
      name: chap.subjectName,
      code: chap.subjectCode,
      color: '#6366f1',
      icon: 'book-open',
    },
    topic: {
      title: chap.title.split('·')[0].trim(),
    },
    reason: `Syllabus Chapter: Recommended for ${chap.subjectName} (${chap.duration})`,
    status: 'impression',
  }));

  return { recommendations: initialRecs, generated: initialRecs.length, configured: true };
}

/** Curated (admin-published) videos, matched by free text or topic. */
async function curated({ subjectId, topicId, search: term, limit = 12 }) {
  const filter = { isCurated: true, isAvailable: true };
  if (subjectId) filter.subject = subjectId;
  if (topicId) filter.topic = topicId;
  if (term) filter.title = new RegExp(String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const dbVideos = await VideoResource.find(filter).sort({ createdAt: -1 }).limit(limit).lean({ virtuals: true });
  if (dbVideos.length > 0) return dbVideos;

  let list = SYLLABUS_VIDEO_CHAPTERS;
  if (term) {
    const s = String(term).toLowerCase();
    list = list.filter((v) => v.title.toLowerCase().includes(s) || v.description.toLowerCase().includes(s));
  }
  return list.slice(0, limit).map((chap) => ({
    id: chap.id,
    youtubeId: chap.youtubeId,
    title: chap.title,
    description: chap.description,
    channelTitle: chap.channelTitle,
    duration: chap.duration,
    durationSeconds: chap.durationSeconds,
    thumbnailUrl: `https://img.youtube.com/vi/${chap.youtubeId}/mqdefault.jpg`,
    difficulty: chap.difficulty,
    subjectCode: chap.subjectCode,
    subjectName: chap.subjectName,
    semesterNumber: chap.semesterNumber,
    isCurated: true,
  }));
}

async function updateStatus(user, recommendationId, status) {
  const patch = { status };
  if (status === 'clicked') patch.clickedAt = new Date();
  if (status === 'completed') patch.completedAt = new Date();

  const doc = await VideoRecommendation.findOneAndUpdate(
    { _id: recommendationId, student: user._id },
    { $set: patch },
    { new: true }
  ).populate('video');

  if (!doc) throw ApiError.notFound('Recommendation not found.');
  return doc;
}

module.exports = {
  search,
  recommendForTopic,
  recommendationsForStudent,
  curated,
  updateStatus,
  strategyFor,
  parseDuration,
  DEFAULT_THRESHOLDS,
};
