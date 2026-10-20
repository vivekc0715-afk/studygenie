'use strict';

const mongoose = require('mongoose');
const { serializePlugin, softDeletePlugin } = require('./plugins');
const { DIFFICULTY_LEVELS } = require('../config/constants');

const { Schema } = mongoose;

/* -------------------------------------------------------- VideoResource --- */

const videoResourceSchema = new Schema(
  {
    youtubeId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: '' },
    channelTitle: { type: String, default: '' },
    channelId: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 },

    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: 'easy', index: true },
    language: { type: String, default: 'English' },
    tags: { type: [String], default: [] },
    learningObjectives: { type: [String], default: [] },

    /** Curated by an admin (playlists / hand-picked resources). */
    isCurated: { type: Boolean, default: false, index: true },
    curatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isAvailable: { type: Boolean, default: true },
    lastCheckedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
videoResourceSchema.plugin(serializePlugin);
videoResourceSchema.plugin(softDeletePlugin);
videoResourceSchema.index({ youtubeId: 1, topic: 1 }, { unique: false });
videoResourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

/* -------------------------------------------------- VideoRecommendation --- */

const videoRecommendationSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    video: { type: Schema.Types.ObjectId, ref: 'VideoResource', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },

    reason: { type: String, default: '' },
    strategy: { type: String, default: '' },
    band: { type: String, default: '' },
    scoreAtRecommendation: { type: Number, default: 0 },
    difficulty: { type: String, default: 'easy' },
    source: { type: String, enum: ['youtube', 'curated'], default: 'youtube' },

    status: { type: String, enum: ['impression', 'clicked', 'completed', 'dismissed'], default: 'impression', index: true },
    impressions: { type: Number, default: 1 },
    clickedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);
videoRecommendationSchema.plugin(serializePlugin);
videoRecommendationSchema.index({ student: 1, createdAt: -1 });
videoRecommendationSchema.index({ student: 1, video: 1, status: 1 });

/* ----------------------------------------------------- VideoSearchCache --- */

const videoSearchCacheSchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    query: { type: String, default: '' },
    results: { type: [Schema.Types.Mixed], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
videoSearchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
  VideoResource: mongoose.models.VideoResource || mongoose.model('VideoResource', videoResourceSchema),
  VideoRecommendation:
    mongoose.models.VideoRecommendation || mongoose.model('VideoRecommendation', videoRecommendationSchema),
  VideoSearchCache: mongoose.models.VideoSearchCache || mongoose.model('VideoSearchCache', videoSearchCacheSchema),
};
