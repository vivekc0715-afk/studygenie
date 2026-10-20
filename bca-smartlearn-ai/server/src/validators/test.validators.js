'use strict';

/**
 * Zod schemas for the student assessment API (practice tests + attempts).
 */

const { z } = require('zod');
const { QUESTION_TYPES, DIFFICULTY_LEVELS, TEST_SCOPES } = require('../config/constants');

/** Practice tests are fully auto-graded, so coding questions are excluded here. */
const AUTO_GRADABLE_TYPES = QUESTION_TYPES.filter((type) => type !== 'coding');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');
const optionalId = objectId.optional().nullable();

const generateTestSchema = z
  .object({
    title: z.string().trim().max(240).optional(),
    description: z.string().trim().max(2000).optional(),
    scope: z.enum(TEST_SCOPES).optional(),
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    semester: optionalId,
    questionCount: z.coerce.number().int().min(1).max(50).default(10),
    durationMinutes: z.coerce.number().int().min(1).max(300).default(20),
    difficulty: z.enum(['mixed', ...DIFFICULTY_LEVELS]).default('mixed'),
    types: z.array(z.enum(AUTO_GRADABLE_TYPES)).min(1).max(AUTO_GRADABLE_TYPES.length).default(AUTO_GRADABLE_TYPES),
    source: z.enum(['bank', 'ai', 'mixed']).default('bank'),
    marksPerQuestion: z.coerce.number().min(1).max(100).default(1),
    adaptive: z.boolean().default(false),
  })
  .refine((value) => Boolean(value.subject || value.unit || value.topic), {
    message: 'Choose a subject, unit or topic to build the test from.',
    path: ['subject'],
  });

const attemptAnswerSchema = z.object({
  question: objectId,
  response: z.unknown().optional().nullable(),
  timeSpentSeconds: z.coerce.number().min(0).max(21600).default(0),
  flagged: z.boolean().default(false),
});

const autosaveAttemptSchema = z.object({
  currentIndex: z.coerce.number().int().min(0).max(200).optional(),
  answers: z.array(attemptAnswerSchema).max(100).default([]),
});

const submitAttemptSchema = z.object({
  answers: z.array(attemptAnswerSchema).max(100).default([]),
});

module.exports = {
  generateTestSchema,
  autosaveAttemptSchema,
  submitAttemptSchema,
  AUTO_GRADABLE_TYPES,
};
