'use strict';

const mongoose = require('mongoose');
const { serializePlugin, softDeletePlugin } = require('./plugins');
const { NOTE_FORMATS, LEARNING_LEVELS, ANSWER_LENGTHS } = require('../config/constants');

const { Schema } = mongoose;
const NOTE_FORMAT_KEYS = NOTE_FORMATS.map((f) => f.key);

/* ----------------------------------------------------------------- Note --- */

const noteSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },

    title: { type: String, required: true, trim: true, maxlength: 240 },
    format: { type: String, enum: NOTE_FORMAT_KEYS, default: 'quick_revision', index: true },
    learningLevel: { type: String, enum: LEARNING_LEVELS, default: 'beginner' },
    answerLength: { type: String, enum: ANSWER_LENGTHS, default: 'medium' },
    examStyle: { type: String, default: '' },
    subjectName: { type: String, default: '' },
    topicName: { type: String, default: '' },

    /** Markdown body rendered by the client. */
    content: { type: String, default: '' },
    /** Provider-independent structured payload (sections, flashcards, tables, code blocks). */
    structured: { type: Schema.Types.Mixed, default: null },
    tags: { type: [String], default: [] },

    source: { type: String, enum: ['ai', 'manual'], default: 'ai', index: true },
    generation: { type: Schema.Types.ObjectId, ref: 'NoteGeneration', default: null },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },

    isBookmarked: { type: Boolean, default: false, index: true },
    isEdited: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    lastViewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
noteSchema.plugin(serializePlugin);
noteSchema.index({ student: 1, createdAt: -1 });
noteSchema.index({ student: 1, isBookmarked: 1 });
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

/* ------------------------------------------------------- NoteGeneration --- */

const noteGenerationSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null },

    format: { type: String, enum: NOTE_FORMAT_KEYS, required: true },
    learningLevel: { type: String, enum: LEARNING_LEVELS, default: 'beginner' },
    answerLength: { type: String, enum: ANSWER_LENGTHS, default: 'medium' },
    examStyle: { type: String, default: '' },
    syllabusText: { type: String, default: '', maxlength: 8000 },
    topicTitle: { type: String, default: '' },

    /** Cache key used to avoid duplicate generations. */
    dedupeKey: { type: String, default: '', index: true },

    status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed'], default: 'queued', index: true },
    provider: { type: String, default: 'gemini' },
    model: { type: String, default: '' },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    errorCode: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    note: { type: Schema.Types.ObjectId, ref: 'Note', default: null },
  },
  { timestamps: true }
);
noteGenerationSchema.plugin(serializePlugin);
noteGenerationSchema.index({ student: 1, createdAt: -1 });

/* ------------------------------------------------------------- Bookmark --- */

const bookmarkSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entityType: {
      type: String,
      enum: ['note', 'question', 'exercise', 'video', 'test', 'topic'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
bookmarkSchema.plugin(serializePlugin);
bookmarkSchema.index({ student: 1, entityType: 1, entityId: 1 }, { unique: true });

/* --------------------------------------------------------- NoteTemplate --- */

/** Admin-authored reusable note structures / approved learning material. */
const noteTemplateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: '' },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    format: { type: String, enum: NOTE_FORMAT_KEYS, default: 'detailed_conceptual' },
    /** Markdown scaffold that seeds the AI prompt or a manual note. */
    content: { type: String, default: '' },
    sourceMaterial: { type: String, default: '', maxlength: 12000 },
    tags: { type: [String], default: [] },
    isApproved: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
noteTemplateSchema.plugin(serializePlugin);
noteTemplateSchema.plugin(softDeletePlugin);
noteTemplateSchema.index({ title: 'text', description: 'text', content: 'text' });

module.exports = {
  Note: mongoose.models.Note || mongoose.model('Note', noteSchema),
  NoteGeneration: mongoose.models.NoteGeneration || mongoose.model('NoteGeneration', noteGenerationSchema),
  NoteTemplate: mongoose.models.NoteTemplate || mongoose.model('NoteTemplate', noteTemplateSchema),
  Bookmark: mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema),
};
