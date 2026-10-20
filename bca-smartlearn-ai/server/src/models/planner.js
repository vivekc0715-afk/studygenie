'use strict';

const mongoose = require('mongoose');
const { serializePlugin } = require('./plugins');

const { Schema } = mongoose;

/* ------------------------------------------------------------ StudyPlan --- */

const studyPlanSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', default: null },
    title: { type: String, default: 'Study plan' },
    strategy: { type: String, default: 'balanced' },
    weeklyMinutes: { type: Number, default: 0 },
    dailyMinutes: { type: Number, default: 0 },
    focusSubjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    fromDate: { type: Date, default: null },
    toDate: { type: Date, default: null },
    generatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '' },
    summary: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
studyPlanSchema.plugin(serializePlugin);
studyPlanSchema.index({ student: 1, isActive: 1 });

/* ------------------------------------------------------------ StudyTask --- */

const studyTaskSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: 'StudyPlan', default: null, index: true },

    title: { type: String, required: true, trim: true, maxlength: 240 },
    activity: {
      type: String,
      enum: ['learn', 'revise', 'practice', 'test', 'watch_video', 'code', 'read_notes'],
      default: 'learn',
    },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },

    date: { type: Date, required: true, index: true },
    estimatedMinutes: { type: Number, min: 5, max: 480, default: 45 },
    priority: { type: Number, min: 1, max: 5, default: 3, index: true },
    reason: { type: String, default: '' },
    targetOutcome: { type: String, default: '' },

    status: { type: String, enum: ['pending', 'completed', 'skipped', 'rescheduled'], default: 'pending', index: true },
    completedAt: { type: Date, default: null },
    actualMinutes: { type: Number, default: 0 },
    relatedTest: { type: Schema.Types.ObjectId, ref: 'Test', default: null },
    relatedVideo: { type: Schema.Types.ObjectId, ref: 'VideoResource', default: null },
    rescheduledFrom: { type: Date, default: null },
  },
  { timestamps: true }
);
studyTaskSchema.plugin(serializePlugin);
studyTaskSchema.index({ student: 1, date: 1, status: 1 });
studyTaskSchema.index({ student: 1, plan: 1 });

module.exports = {
  StudyPlan: mongoose.models.StudyPlan || mongoose.model('StudyPlan', studyPlanSchema),
  StudyTask: mongoose.models.StudyTask || mongoose.model('StudyTask', studyTaskSchema),
};
