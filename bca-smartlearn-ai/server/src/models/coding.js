'use strict';

const mongoose = require('mongoose');
const { serializePlugin, softDeletePlugin } = require('./plugins');
const { DIFFICULTY_LEVELS, SUBMISSION_STATUS } = require('../config/constants');

const { Schema } = mongoose;
const LANGUAGE_KEYS = ['c', 'java', 'python'];

const testCaseSchema = new Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    explanation: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
  },
  { _id: true }
);

/* ------------------------------------------------------ CodingExercise --- */

const codingExerciseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    problemStatement: { type: String, default: '' },

    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },

    languageRestrictions: { type: [String], enum: LANGUAGE_KEYS, default: LANGUAGE_KEYS },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: 'easy', index: true },

    starterCode: {
      c: { type: String, default: '' },
      java: { type: String, default: '' },
      python: { type: String, default: '' },
    },

    sampleTestCases: { type: [testCaseSchema], default: [] },
    /** Hidden cases are never serialised to the client. */
    hiddenTestCases: { type: [testCaseSchema], default: [], select: false },

    expectedBehavior: { type: String, default: '' },
    hints: { type: [String], default: [] },
    explanation: { type: String, default: '' },
    points: { type: Number, min: 0, default: 10 },
    timeLimitSeconds: { type: Number, min: 1, max: 15, default: 5 },
    memoryLimitKb: { type: Number, min: 16000, default: 256000 },

    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    stats: {
      attempts: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
codingExerciseSchema.plugin(serializePlugin);
codingExerciseSchema.plugin(softDeletePlugin);
codingExerciseSchema.index({ title: 'text', description: 'text', problemStatement: 'text', tags: 'text' }, { language_override: 'none' });

/* ---------------------------------------------------- CodingSubmission --- */

const codingSubmissionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exercise: { type: Schema.Types.ObjectId, ref: 'CodingExercise', default: null, index: true },
    language: { type: String, enum: LANGUAGE_KEYS, required: true },
    sourceCode: { type: String, required: true, maxlength: 40000 },
    stdin: { type: String, default: '' },

    isRunOnly: { type: Boolean, default: false, index: true },
    status: { type: String, enum: Object.values(SUBMISSION_STATUS), default: SUBMISSION_STATUS.QUEUED, index: true },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    compileOutput: { type: String, default: '' },
    message: { type: String, default: '' },

    timeSeconds: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    testResults: [
      {
        index: Number,
        passed: Boolean,
        isHidden: Boolean,
        input: String,
        expectedOutput: String,
        actualOutput: String,
        status: String,
      },
    ],
    score: { type: Number, default: 0 },

    provider: { type: String, default: 'judge0' },
    providerToken: { type: String, default: '' },
  },
  { timestamps: true }
);
codingSubmissionSchema.plugin(serializePlugin);
codingSubmissionSchema.index({ student: 1, createdAt: -1 });
codingSubmissionSchema.index({ student: 1, exercise: 1 });

module.exports = {
  CodingExercise: mongoose.models.CodingExercise || mongoose.model('CodingExercise', codingExerciseSchema),
  CodingSubmission: mongoose.models.CodingSubmission || mongoose.model('CodingSubmission', codingSubmissionSchema),
};
