'use strict';

const { z } = require('zod');
const { NOTE_FORMATS, LEARNING_LEVELS, ANSWER_LENGTHS } = require('../config/constants');

const NOTE_FORMAT_KEYS = NOTE_FORMATS.map((format) => format.key);

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');
const optionalId = objectId.optional().nullable();

const generateNoteSchema = z
  .object({
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    format: z.enum(NOTE_FORMAT_KEYS).default('quick_revision'),
    learningLevel: z.enum(LEARNING_LEVELS).default('beginner'),
    answerLength: z.enum(ANSWER_LENGTHS).default('medium'),
    examStyle: z.string().trim().max(200).optional(),
    title: z.string().trim().max(240).optional(),
    extraInstructions: z.string().trim().max(1000).optional(),
    syllabusText: z.string().trim().max(8000).optional(),
  })
  .refine((value) => Boolean(value.subject || value.topic || value.syllabusText), {
    message: 'Provide a subject, a topic, or the syllabus text to generate from.',
    path: ['topic'],
  });

module.exports = { generateNoteSchema, NOTE_FORMAT_KEYS };
