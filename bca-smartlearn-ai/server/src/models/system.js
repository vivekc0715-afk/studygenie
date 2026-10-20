'use strict';

const mongoose = require('mongoose');
const { serializePlugin } = require('./plugins');

const { Schema } = mongoose;

/* --------------------------------------------------------- Notification --- */

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['system', 'test', 'study_plan', 'exam', 'grade', 'recommendation', 'account'],
      default: 'system',
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 2000 },
    link: { type: String, default: '' },
    severity: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
notificationSchema.plugin(serializePlugin);
notificationSchema.index({ user: 1, createdAt: -1 });

/* -------------------------------------------------------- GradingScheme --- */

const gradeBandSchema = new Schema(
  {
    grade: { type: String, required: true },
    minPercent: { type: Number, required: true },
    maxPercent: { type: Number, required: true },
    points: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const gradingSchemeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 32 },
    university: { type: Schema.Types.ObjectId, ref: 'University', default: null, index: true },
    maxMarks: { type: Number, default: 100 },
    passMark: { type: Number, default: 40 },
    internalWeight: { type: Number, min: 0, max: 100, default: 30 },
    externalWeight: { type: Number, min: 0, max: 100, default: 70 },
    gradeBands: { type: [gradeBandSchema], default: [] },
    description: { type: String, default: '' },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
gradingSchemeSchema.plugin(serializePlugin);

/* ----------------------------------------------------------- AIUsageLog --- */

const aiUsageLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    feature: {
      type: String,
      enum: ['notes', 'questions', 'explanation', 'recommendation', 'study_plan'],
      default: 'notes',
      index: true,
    },
    provider: { type: String, default: 'gemini' },
    model: { type: String, default: '' },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'error', 'rate_limited'], default: 'success', index: true },
    errorCode: { type: String, default: '' },
    requestSummary: { type: String, default: '' },
  },
  { timestamps: true }
);
aiUsageLogSchema.plugin(serializePlugin);
aiUsageLogSchema.index({ createdAt: -1 });

/* -------------------------------------------------------------- AuditLog --- */

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: '' },
    entityId: { type: String, default: '' },
    description: { type: String, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);
auditLogSchema.plugin(serializePlugin);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

/* ---------------------------------------------------- ApplicationSetting --- */

const applicationSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    category: { type: String, default: 'general', index: true },
    description: { type: String, default: '' },
    value: { type: Schema.Types.Mixed, default: null },
    valueType: { type: String, enum: ['json', 'number', 'string', 'boolean'], default: 'json' },
    isPublic: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
applicationSettingSchema.plugin(serializePlugin);

module.exports = {
  Notification: mongoose.models.Notification || mongoose.model('Notification', notificationSchema),
  GradingScheme: mongoose.models.GradingScheme || mongoose.model('GradingScheme', gradingSchemeSchema),
  AIUsageLog: mongoose.models.AIUsageLog || mongoose.model('AIUsageLog', aiUsageLogSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema),
  ApplicationSetting:
    mongoose.models.ApplicationSetting || mongoose.model('ApplicationSetting', applicationSettingSchema),
};
