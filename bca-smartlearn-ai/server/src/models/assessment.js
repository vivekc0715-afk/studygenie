'use strict';

const mongoose = require('mongoose');
const { serializePlugin, softDeletePlugin } = require('./plugins');
const { DIFFICULTY_LEVELS, QUESTION_TYPES, TEST_SCOPES, ATTEMPT_STATUS } = require('../config/constants');

const { Schema } = mongoose;

/* ------------------------------------------------------------- Question --- */

const questionSchema = new Schema(
  {
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null, index: true },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    prerequisiteTopic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null },

    type: { type: String, enum: QUESTION_TYPES, required: true, index: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: 'medium', index: true },
    marks: { type: Number, min: 0, default: 1 },
    negativeMarks: { type: Number, min: 0, default: 0 },

    prompt: { type: String, required: true },
    /** Optional code snippet rendered with the question (output prediction / coding). */
    codeSnippet: { type: String, default: '' },
    language: { type: String, enum: ['', 'c', 'java', 'python'], default: '' },
    options: [
      {
        key: { type: String, required: true },
        text: { type: String, default: '' },
      },
    ],
    /** Never returned to students. */
    correctOptionKeys: { type: [String], default: [], select: false },
    correctAnswerText: { type: String, default: '', select: false },
    acceptedAnswers: { type: [String], default: [], select: false },
    testCases: { type: [Schema.Types.Mixed], default: [], select: false },

    explanation: { type: String, default: '' },
    learningObjective: { type: String, default: '' },

    source: { type: String, enum: ['bank', 'ai', 'admin'], default: 'admin', index: true },
    isApproved: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
questionSchema.plugin(serializePlugin);
questionSchema.plugin(softDeletePlugin);
questionSchema.index({ subject: 1, unit: 1, topic: 1, difficulty: 1, type: 1 });
questionSchema.index({ prompt: 'text', explanation: 'text', tags: 'text' }, { language_override: 'none' });

/* ----------------------------------------------------------------- Test --- */

const testConfigurationSchema = new Schema(
  {
    questionCount: { type: Number, min: 1, max: 100, default: 10 },
    durationMinutes: { type: Number, min: 1, max: 300, default: 20 },
    difficulty: { type: String, enum: ['mixed', ...DIFFICULTY_LEVELS], default: 'mixed' },
    types: { type: [String], enum: QUESTION_TYPES, default: ['mcq'] },
    totalMarks: { type: Number, min: 1, default: 10 },
    adaptive: { type: Boolean, default: false },
  },
  { _id: false }
);

const testSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: '' },
    scope: { type: String, enum: TEST_SCOPES, default: 'unit', index: true },

    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', default: null },
    /** null when the test is an admin-authored template. */
    student: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sourceType: { type: String, enum: ['manual', 'ai', 'bank', 'mixed'], default: 'bank' },
    configuration: { type: testConfigurationSchema, default: () => ({}) },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],

    totalMarks: { type: Number, min: 0, default: 0 },
    difficultyMix: { type: Schema.Types.Mixed, default: null },
    adaptiveLevel: { type: String, default: '' },
    isTemplate: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
testSchema.plugin(serializePlugin);
testSchema.plugin(softDeletePlugin);
testSchema.index({ student: 1, createdAt: -1 });

/* ---------------------------------------------------------- TestAttempt --- */

const attemptAnswerSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    /** Raw student response, shape depends on question type. */
    response: { type: Schema.Types.Mixed, default: null },
    isCorrect: { type: Boolean, default: null },
    awardedMarks: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    flagged: { type: Boolean, default: false },
  },
  { _id: false }
);

const testAttemptSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },

    status: { type: String, enum: Object.values(ATTEMPT_STATUS), default: ATTEMPT_STATUS.IN_PROGRESS, index: true },
    answers: { type: [attemptAnswerSchema], default: [] },
    currentIndex: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },

    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },

    difficulty: { type: String, default: 'mixed' },
    adaptiveLevel: { type: String, default: '' },
    analytics: {
      byTopic: { type: [Schema.Types.Mixed], default: [] },
      byDifficulty: { type: [Schema.Types.Mixed], default: [] },
      byType: { type: [Schema.Types.Mixed], default: [] },
      weakConcepts: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);
testAttemptSchema.plugin(serializePlugin);
testAttemptSchema.index({ student: 1, createdAt: -1 });
testAttemptSchema.index({ student: 1, test: 1, status: 1 });

module.exports = {
  Question: mongoose.models.Question || mongoose.model('Question', questionSchema),
  Test: mongoose.models.Test || mongoose.model('Test', testSchema),
  TestAttempt: mongoose.models.TestAttempt || mongoose.model('TestAttempt', testAttemptSchema),
};
