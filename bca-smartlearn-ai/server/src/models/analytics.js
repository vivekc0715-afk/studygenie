'use strict';

const mongoose = require('mongoose');
const { serializePlugin } = require('./plugins');

const { Schema } = mongoose;

/* ------------------------------------------------------ TopicPerformance --- */

const topicPerformanceSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },

    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },

    /** 0-100 blended mastery score (see services/analytics/masteryService.js). */
    masteryScore: { type: Number, default: 0 },
    masteryLevel: { type: String, default: 'unknown', index: true },
    confidence: { type: String, enum: ['insufficient', 'low', 'medium', 'high'], default: 'insufficient' },
    trend: { type: String, enum: ['improving', 'stable', 'declining', 'unknown'], default: 'unknown' },

    /** Syllabus coverage for this topic. */
    isCompleted: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    revisionCount: { type: Number, default: 0 },
    lastRevisedAt: { type: Date, default: null },
    nextRevisionDueAt: { type: Date, default: null },
    timeSpentMinutes: { type: Number, default: 0 },
    lastAssessedAt: { type: Date, default: null },
    recentScores: { type: [Number], default: [] },
  },
  { timestamps: true }
);
topicPerformanceSchema.plugin(serializePlugin);
topicPerformanceSchema.index({ student: 1, topic: 1 }, { unique: true });
topicPerformanceSchema.index({ student: 1, subject: 1 });

/* ---------------------------------------------------- SubjectPerformance --- */

const subjectPerformanceSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },

    attempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    weightedScore: { type: Number, default: 0 },
    latestScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },

    syllabusCompletion: { type: Number, default: 0 },
    topicsCompleted: { type: Number, default: 0 },
    topicsTotal: { type: Number, default: 0 },

    codingAttempts: { type: Number, default: 0 },
    codingAccepted: { type: Number, default: 0 },
    codingSuccessRate: { type: Number, default: 0 },

    studyMinutes: { type: Number, default: 0 },
    revisionCount: { type: Number, default: 0 },
    trend: { type: String, enum: ['improving', 'stable', 'declining', 'unknown'], default: 'unknown' },
    masteryLevel: { type: String, default: 'unknown' },
    confidence: { type: String, enum: ['insufficient', 'low', 'medium', 'high'], default: 'insufficient' },
    recentScores: { type: [{ score: Number, at: Date }], default: [] },
    lastComputedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
subjectPerformanceSchema.plugin(serializePlugin);
subjectPerformanceSchema.index({ student: 1, subject: 1 }, { unique: true });

/* ------------------------------------------------------ GradePrediction --- */

const gradePredictionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    gradingScheme: { type: Schema.Types.ObjectId, ref: 'GradingScheme', default: null },

    currentAverage: { type: Number, default: 0 },
    estimatedFinalMarks: { type: Number, default: 0 },
    estimatedGrade: { type: String, default: '' },
    confidence: { type: String, enum: ['insufficient', 'low', 'medium', 'high'], default: 'insufficient' },

    sampleSize: { type: Number, default: 0 },
    insufficientData: { type: Boolean, default: true },
    modelVersion: { type: String, default: 'baseline-v1' },

    targetGrade: { type: String, default: '' },
    targetPercentage: { type: Number, default: 0 },
    gapToTarget: { type: Number, default: 0 },

    inputSnapshot: { type: Schema.Types.Mixed, default: null },
    contributingFactors: [
      {
        label: String,
        detail: String,
        weight: Number,
        value: Number,
      },
    ],
    assumptions: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
gradePredictionSchema.plugin(serializePlugin);
gradePredictionSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = {
  TopicPerformance: mongoose.models.TopicPerformance || mongoose.model('TopicPerformance', topicPerformanceSchema),
  SubjectPerformance:
    mongoose.models.SubjectPerformance || mongoose.model('SubjectPerformance', subjectPerformanceSchema),
  GradePrediction: mongoose.models.GradePrediction || mongoose.model('GradePrediction', gradePredictionSchema),
};
