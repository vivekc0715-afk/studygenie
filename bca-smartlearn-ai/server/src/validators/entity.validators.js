'use strict';

/**
 * Zod schemas for admin-managed entities.
 * `create` schemas are strict; `update` schemas are partial versions of the same shape.
 * Unknown keys are stripped automatically, preventing mass-assignment.
 */

const { z } = require('zod');
const {
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
  TEST_SCOPES,
  NOTE_FORMATS,
  LEARNING_LEVELS,
  ANSWER_LENGTHS,
  EXAM_SYSTEMS,
} = require('../config/constants');

const NOTE_FORMAT_KEYS = NOTE_FORMATS.map((format) => format.key);
const LANGUAGE_KEYS = ['c', 'java', 'python'];

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');
const optionalId = objectId.optional().nullable();
const str = (max = 500) => z.string().trim().max(max);
const optStr = (max = 500) => str(max).optional();
const num = (min, max, fallback) => {
  let inner = z.number();
  if (min !== undefined) inner = inner.min(min);
  if (max !== undefined) inner = inner.max(max);
  if (fallback !== undefined) inner = inner.default(fallback);

  return z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) {
      return fallback !== undefined ? fallback : undefined;
    }
    const n = Number(val);
    return isNaN(n) ? (fallback !== undefined ? fallback : undefined) : n;
  }, inner);
};
const bool = (fallback) => z.coerce.boolean().default(fallback);
const idArray = z.array(objectId).default([]);

function entity(shape) {
  const create = z.object(shape);
  return { create, update: create.partial() };
}

const markingScheme = z
  .object({
    theory: num(0, 100),
    internal: num(0, 100),
    practical: num(0, 100),
    total: num(0, 100),
  })
  .partial();

const testCase = z.object({
  input: z.string().default(''),
  expectedOutput: z.string().default(''),
  explanation: z.string().default(''),
  isHidden: z.boolean().default(false),
});

const entities = {
  universities: entity({
    name: str(200).min(2),
    code: str(24).min(2),
    shortName: optStr(60),
    city: optStr(80),
    state: optStr(80),
    country: optStr(80),
    website: optStr(200),
    description: optStr(2000),
    isActive: z.boolean().optional(),
  }),

  colleges: entity({
    name: str(200).min(2),
    code: str(24).min(2),
    university: objectId,
    city: optStr(80),
    state: optStr(80),
    website: optStr(200),
    isActive: z.boolean().optional(),
  }),

  programs: entity({
    name: str(160).min(2),
    code: str(24).min(2),
    degree: optStr(40),
    university: objectId,
    durationSemesters: num(1, 12, 6),
    description: optStr(2000),
    isActive: z.boolean().optional(),
  }),

  regulations: entity({
    name: str(160).min(2),
    code: str(32).min(1),
    program: objectId,
    university: objectId,
    year: num(1990, 2100, 2024),
    effectiveFrom: z.coerce.date().optional().nullable(),
    totalSemesters: num(1, 12, 6),
    gradingScheme: optionalId,
    description: optStr(2000),
    isActive: z.boolean().optional(),
  }),

  semesters: entity({
    regulation: objectId,
    number: num(1, 12, 1),
    title: optStr(120),
    description: optStr(1000),
    order: num(0, 100, 1),
    isActive: z.boolean().optional(),
  }),

  subjects: entity({
    name: str(200).min(2),
    code: optStr(32),
    shortName: optStr(60),
    description: optStr(3000),
    regulation: optionalId,
    semester: optionalId,
    semesterNumber: num(1, 12, 1),
    university: optionalId,
    credits: num(0, 20, 4),
    type: z.enum(['theory', 'practical', 'both']).default('theory'),
    recommendedStudyHours: num(0, 1000, 40),
    learningObjectives: z.array(str(400)).default([]),
    prerequisites: idArray,
    markingScheme: markingScheme.optional(),
    examDate: z.coerce.date().optional().nullable(),
    color: optStr(30),
    icon: optStr(40),
    tags: z.array(str(40)).default([]),
    isTemplate: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),

  units: entity({
    subject: objectId,
    number: num(1, 30),
    title: str(200).min(1),
    description: optStr(3000),
    recommendedHours: num(0, 200),
    weightage: num(0, 100),
    learningObjectives: z.array(str(400)).default([]),
    isActive: z.boolean().optional(),
  }),

  topics: entity({
    subject: objectId,
    unit: objectId,
    number: num(0, 500),
    title: str(240).min(1),
    description: optStr(4000),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    learningObjectives: z.array(str(400)).default([]),
    prerequisites: idArray,
    recommendedMinutes: num(5, 600),
    keywords: z.array(str(60)).default([]),
    resources: z
      .array(
        z.object({
          title: str(200),
          url: str(500),
          kind: z.enum(['article', 'video', 'pdf', 'link']).default('link'),
        })
      )
      .default([]),
    isActive: z.boolean().optional(),
  }),

  syllabi: entity({
    title: str(200).min(2),
    description: optStr(3000),
    regulation: optionalId,
    semester: optionalId,
    subjects: idArray,
    version: optStr(20),
    isTemplate: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),

  'note-templates': entity({
    title: str(240).min(2),
    description: optStr(2000),
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    format: z.enum(NOTE_FORMAT_KEYS).optional(),
    content: z.string().max(60000).optional(),
    sourceMaterial: z.string().max(12000).optional(),
    tags: z.array(str(40)).default([]),
    isApproved: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),

  exercises: entity({
    title: str(240).min(2),
    slug: optStr(160),
    description: optStr(4000),
    problemStatement: z.string().max(20000).optional(),
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    languageRestrictions: z.array(z.enum(LANGUAGE_KEYS)).default(LANGUAGE_KEYS),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    starterCode: z.object({ c: z.string(), java: z.string(), python: z.string() }).partial().optional(),
    sampleTestCases: z.array(testCase).default([]),
    hiddenTestCases: z.array(testCase).default([]),
    expectedBehavior: optStr(4000),
    hints: z.array(str(500)).default([]),
    explanation: z.string().max(20000).optional(),
    points: num(0, 1000),
    timeLimitSeconds: num(1, 15),
    memoryLimitKb: num(16000, 512000),
    tags: z.array(str(40)).default([]),
    isPublished: z.boolean().optional(),
  }),

  questions: entity({
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    prerequisiteTopic: optionalId,
    type: z.enum(QUESTION_TYPES),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    marks: num(0, 100),
    negativeMarks: num(0, 100),
    prompt: z.string().min(3).max(8000),
    codeSnippet: z.string().max(12000).optional(),
    language: z.enum(['', 'c', 'java', 'python']).optional(),
    options: z.array(z.object({ key: str(10), text: str(2000) })).default([]),
    correctOptionKeys: z.array(str(10)).default([]),
    correctAnswerText: z.string().max(4000).optional(),
    acceptedAnswers: z.array(str(400)).default([]),
    testCases: z.array(z.any()).default([]),
    explanation: z.string().max(8000).optional(),
    learningObjective: optStr(500),
    source: z.enum(['bank', 'ai', 'admin']).optional(),
    isApproved: z.boolean().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(str(40)).default([]),
  }),

  tests: entity({
    title: str(240).min(2),
    description: optStr(2000),
    scope: z.enum(TEST_SCOPES).optional(),
    subject: optionalId,
    unit: optionalId,
    semester: optionalId,
    sourceType: z.enum(['manual', 'ai', 'bank', 'mixed']).optional(),
    configuration: z
      .object({
        questionCount: num(1, 100),
        durationMinutes: num(1, 300),
        difficulty: z.enum(['mixed', ...DIFFICULTY_LEVELS]).optional(),
        types: z.array(z.enum(QUESTION_TYPES)).optional(),
        totalMarks: num(1, 500),
        adaptive: z.boolean().optional(),
      })
      .partial()
      .optional(),
    questions: idArray,
    totalMarks: num(0, 1000),
    isTemplate: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),

  videos: entity({
    youtubeId: str(40).min(5),
    title: str(300).min(2),
    description: optStr(4000),
    channelTitle: optStr(200),
    channelId: optStr(60),
    thumbnailUrl: optStr(500),
    durationSeconds: num(0, 86400),
    publishedAt: z.coerce.date().optional().nullable(),
    viewCount: num(0),
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    language: optStr(40),
    tags: z.array(str(40)).default([]),
    learningObjectives: z.array(str(400)).default([]),
    isCurated: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  }),

  'grading-schemes': entity({
    name: str(160).min(2),
    code: str(32).min(2),
    university: optionalId,
    maxMarks: num(1, 1000),
    passMark: num(0, 1000),
    internalWeight: num(0, 100),
    externalWeight: num(0, 100),
    gradeBands: z
      .array(
        z.object({
          grade: str(20),
          minPercent: num(0, 100),
          maxPercent: num(0, 100),
          points: num(0, 20),
          description: optStr(200),
        })
      )
      .default([]),
    description: optStr(2000),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),

  'learning-materials': entity({
    title: str(240).min(2),
    description: optStr(2000),
    subject: optionalId,
    unit: optionalId,
    topic: optionalId,
    format: z.enum(NOTE_FORMAT_KEYS).optional(),
    content: z.string().max(60000).optional(),
    sourceMaterial: z.string().max(12000).optional(),
    tags: z.array(str(40)).default([]),
    isApproved: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
};

/* ----------------------------------------------- student-owned schemas --- */

const studentProfileUpdateSchema = z.object({
  university: optionalId,
  college: optionalId,
  program: optionalId,
  regulation: optionalId,
  currentSemesterNumber: num(1, 12).optional(),
  academicYear: optStr(20),
  examSystem: z.enum(EXAM_SYSTEMS).optional(),
  gradingScheme: optionalId,
  institutionName: optStr(200),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: num(1, 4).optional(),
  studyPreferences: z
    .object({
      knowledgeLevel: z.enum(LEARNING_LEVELS).optional(),
      dailyStudyMinutes: num(15, 720).optional(),
      preferredFormats: z.array(z.enum(NOTE_FORMAT_KEYS)).optional(),
      preferredStudyDays: z.array(num(0, 6)).optional(),
      preferredStudyStartTime: optStr(10),
      targetGrade: optStr(20),
      targetPercentage: num(0, 100).optional(),
      preferredLanguage: optStr(40),
    })
    .partial()
    .optional(),
});

const enrollmentCreateSchema = z.object({
  subject: optionalId,
  subjectIds: z.array(objectId).optional(),
  semester: optionalId,
  regulation: optionalId,
  academicYear: optStr(20),
  credits: num(0, 20).optional(),
  examDate: z.coerce.date().optional().nullable(),
  targetGrade: optStr(20),
  notes: optStr(1000),
  customSubject: z
    .object({
      name: str(200).min(2),
      code: optStr(32),
      credits: num(0, 20).optional(),
      semesterNumber: num(1, 12).optional(),
      description: optStr(3000),
      units: z
        .array(
          z.object({
            title: str(200).min(1),
            description: optStr(2000),
            topics: z.array(z.object({ title: str(240).min(1), description: optStr(2000) })).default([]),
          })
        )
        .default([]),
    })
    .optional(),
});

const enrollmentUpdateSchema = z.object({
  status: z.enum(['active', 'completed', 'dropped']).optional(),
  credits: num(0, 20).optional(),
  examDate: z.coerce.date().optional().nullable(),
  targetGrade: optStr(20),
  notes: optStr(1000),
});

const noteUpdateSchema = z.object({
  title: optStr(240),
  content: z.string().max(120000).optional(),
  tags: z.array(str(40)).optional(),
  isBookmarked: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const noteCreateSchema = z.object({
  title: str(240).min(2),
  content: z.string().max(120000),
  subject: optionalId,
  unit: optionalId,
  topic: optionalId,
  format: z.enum(NOTE_FORMAT_KEYS).optional(),
  tags: z.array(str(40)).default([]),
});

const genericUpdateSchema = z.object({}).partial();

module.exports = {
  entities,
  studentProfileUpdateSchema,
  enrollmentCreateSchema,
  enrollmentUpdateSchema,
  noteUpdateSchema,
  noteCreateSchema,
  genericUpdateSchema,
  objectId,
  optStr,
  num,
};
