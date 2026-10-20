'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { serializePlugin } = require('./plugins');
const { ROLES, ACCOUNT_STATUS, LEARNING_LEVELS, EXAM_SYSTEMS } = require('../config/constants');

const { Schema } = mongoose;

/* ------------------------------------------------------------------ User --- */

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT, index: true },
    status: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.PENDING, index: true },

    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },

    avatarUrl: { type: String, default: '' },
    lastLoginAt: { type: Date, default: null },
    suspendedReason: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

userSchema.plugin(serializePlugin);

userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text' });

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isActiveAccount = function isActiveAccount() {
  return this.status === ACCOUNT_STATUS.ACTIVE && !this.deletedAt;
};

/* --------------------------------------------------------- StudentProfile --- */

const studentProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    // Academic identity
    university: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    college: { type: Schema.Types.ObjectId, ref: 'College', default: null },
    program: { type: Schema.Types.ObjectId, ref: 'AcademicProgram', default: null },
    regulation: { type: Schema.Types.ObjectId, ref: 'AcademicRegulation', default: null },
    currentSemesterNumber: { type: Number, min: 1, max: 12, default: 1 },
    academicYear: { type: String, default: '' },
    examSystem: { type: String, enum: EXAM_SYSTEMS, default: 'semester' },
    gradingScheme: { type: Schema.Types.ObjectId, ref: 'GradingScheme', default: null },
    institutionName: { type: String, default: '' },

    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 1, min: 1, max: 4 },

    studyPreferences: {
      knowledgeLevel: { type: String, enum: LEARNING_LEVELS, default: 'beginner' },
      dailyStudyMinutes: { type: Number, min: 15, max: 720, default: 120 },
      preferredFormats: { type: [String], default: ['quick_revision', 'detailed_conceptual'] },
      preferredStudyDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      preferredStudyStartTime: { type: String, default: '18:00' },
      targetGrade: { type: String, default: '' },
      targetPercentage: { type: Number, min: 0, max: 100, default: 75 },
      preferredLanguage: { type: String, default: 'English' },
    },

    stats: {
      studyStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastStudyDate: { type: Date, default: null },
      totalStudyMinutes: { type: Number, default: 0 },
      notesGenerated: { type: Number, default: 0 },
      testsAttempted: { type: Number, default: 0 },
      codeSubmissions: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

studentProfileSchema.plugin(serializePlugin);
studentProfileSchema.index({ university: 1, currentSemesterNumber: 1 });

module.exports = {
  User: mongoose.models.User || mongoose.model('User', userSchema),
  StudentProfile: mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema),
};
