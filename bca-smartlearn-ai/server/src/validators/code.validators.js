'use strict';

const { z } = require('zod');

const LANGUAGE_KEYS = ['c', 'java', 'python'];

const runCodeSchema = z.object({
  language: z.enum(LANGUAGE_KEYS),
  sourceCode: z.string().min(1, 'The source code is empty.').max(40000),
  stdin: z.string().max(10000).default(''),
});

const submitCodeSchema = z.object({
  exerciseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Choose a valid exercise.'),
  language: z.enum(LANGUAGE_KEYS),
  sourceCode: z.string().min(1, 'The source code is empty.').max(40000),
});

module.exports = { runCodeSchema, submitCodeSchema, LANGUAGE_KEYS };
