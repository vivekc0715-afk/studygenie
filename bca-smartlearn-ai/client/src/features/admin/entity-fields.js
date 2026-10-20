/**
 * Per-entity field registry powering the generic Super Admin CRUD UI.
 *
 * Derived 1:1 from the server's zod schemas in
 * `server/src/validators/entity.validators.js` so field names, required flags,
 * enum options and numeric bounds stay aligned with the API contract. Reference
 * endpoints point at real admin list routes that can supply options.
 *
 * Pure data + tiny helpers — deliberately contains no React.
 *
 * Field shape:
 *   { name, label, type, required?, options?, ref?, refEndpoint?,
 *     placeholder?, hint?, help?, colSpan?, hideInTable?, hideInForm?,
 *     multiple?, rows?, min?, max?, step? }
 * type ∈ text | textarea | number | boolean | select | multiselect | date |
 *        datetime | reference | tags | code | richtext | json
 */

/* ------------------------------------------------------------ option sets --- */

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const QUESTION_TYPE_OPTIONS = [
  { value: 'mcq', label: 'Single choice (MCQ)' },
  { value: 'multi_select', label: 'Multiple select' },
  { value: 'true_false', label: 'True / false' },
  { value: 'fill_blank', label: 'Fill in the blank' },
  { value: 'output_prediction', label: 'Output prediction' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'coding', label: 'Coding' },
];

const NOTE_FORMAT_OPTIONS = [
  { value: 'quick_revision', label: 'Quick revision notes' },
  { value: 'detailed_conceptual', label: 'Detailed conceptual notes' },
  { value: 'short_answer', label: 'Short-answer exam prep' },
  { value: 'long_answer', label: 'Long-answer exam prep' },
  { value: 'definitions', label: 'Definitions & terminology' },
  { value: 'important_questions', label: 'Important questions' },
  { value: 'programming_examples', label: 'Worked programming examples' },
  { value: 'comparison_tables', label: 'Comparison tables' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'practice_questions', label: 'Practice questions' },
  { value: 'last_minute', label: 'Last-minute revision sheet' },
  { value: 'viva_questions', label: 'Viva questions & answers' },
];

const TEST_SCOPE_OPTIONS = [
  { value: 'unit', label: 'Unit' },
  { value: 'subject', label: 'Subject' },
  { value: 'semester', label: 'Semester' },
  { value: 'custom', label: 'Custom' },
];

const SUBJECT_TYPE_OPTIONS = [
  { value: 'theory', label: 'Theory' },
  { value: 'practical', label: 'Practical' },
  { value: 'both', label: 'Theory & practical' },
];

const LANGUAGE_OPTIONS = [
  { value: 'c', label: 'C' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
];

const QUESTION_SOURCE_OPTIONS = [
  { value: 'bank', label: 'Question bank' },
  { value: 'ai', label: 'AI generated' },
  { value: 'admin', label: 'Admin authored' },
];

const TEST_SOURCE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'ai', label: 'AI generated' },
  { value: 'bank', label: 'Question bank' },
  { value: 'mixed', label: 'Mixed' },
];

const NOTE_FORMAT_FIELDS = [
  { name: 'format', label: 'Format', type: 'select', options: NOTE_FORMAT_OPTIONS },
];

/* ---------------------------------------------------------- shared blocks --- */

/** note-templates and learning-materials share an identical validator shape. */
const NOTE_TEMPLATE_FIELDS = [
  { name: 'title', label: 'Title', type: 'text', required: true, min: 2, max: 240 },
  { name: 'description', label: 'Description', type: 'textarea', max: 2000, colSpan: 2, rows: 3 },
  { name: 'subject', label: 'Subject', type: 'reference', ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
  { name: 'unit', label: 'Unit', type: 'reference', ref: 'Unit', refEndpoint: '/admin/units?limit=100' },
  { name: 'topic', label: 'Topic', type: 'reference', ref: 'Topic', refEndpoint: '/admin/topics?limit=100' },
  ...NOTE_FORMAT_FIELDS,
  {
    name: 'content',
    label: 'Content (Markdown)',
    type: 'richtext',
    max: 60000,
    colSpan: 2,
    rows: 8,
    help: 'Markdown scaffold that seeds the AI prompt or a manual note.',
  },
  { name: 'sourceMaterial', label: 'Source material', type: 'richtext', max: 12000, colSpan: 2, rows: 4 },
  { name: 'tags', label: 'Tags', type: 'tags' },
  { name: 'isApproved', label: 'Approved', type: 'boolean' },
  { name: 'isPublished', label: 'Published', type: 'boolean' },
];

/* --------------------------------------------------------------- registry --- */

export const ENTITY_FIELDS = {
  universities: {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, min: 2, max: 200 },
      { name: 'code', label: 'Code', type: 'text', required: true, min: 2, max: 24, placeholder: 'e.g. MDU' },
      { name: 'shortName', label: 'Short name', type: 'text', max: 60 },
      { name: 'city', label: 'City', type: 'text', max: 80 },
      { name: 'state', label: 'State', type: 'text', max: 80 },
      { name: 'country', label: 'Country', type: 'text', max: 80 },
      { name: 'website', label: 'Website', type: 'text', max: 200, placeholder: 'https://' },
      { name: 'description', label: 'Description', type: 'textarea', max: 2000, colSpan: 2, rows: 3 },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  colleges: {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, min: 2, max: 200 },
      { name: 'code', label: 'Code', type: 'text', required: true, min: 2, max: 24 },
      { name: 'university', label: 'University', type: 'reference', required: true, ref: 'University', refEndpoint: '/admin/universities?limit=100' },
      { name: 'city', label: 'City', type: 'text', max: 80 },
      { name: 'state', label: 'State', type: 'text', max: 80 },
      { name: 'website', label: 'Website', type: 'text', max: 200, placeholder: 'https://' },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  programs: {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, min: 2, max: 160 },
      { name: 'code', label: 'Code', type: 'text', required: true, min: 2, max: 24 },
      { name: 'degree', label: 'Degree', type: 'text', max: 40, placeholder: 'e.g. BCA' },
      { name: 'university', label: 'University', type: 'reference', required: true, ref: 'University', refEndpoint: '/admin/universities?limit=100' },
      { name: 'durationSemesters', label: 'Duration (semesters)', type: 'number', required: true, min: 1, max: 12 },
      { name: 'description', label: 'Description', type: 'textarea', max: 2000, colSpan: 2, rows: 3 },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  regulations: {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, min: 2, max: 160 },
      { name: 'code', label: 'Code', type: 'text', required: true, min: 1, max: 32 },
      { name: 'program', label: 'Program', type: 'reference', required: true, ref: 'AcademicProgram', refEndpoint: '/admin/programs?limit=100' },
      { name: 'university', label: 'University', type: 'reference', required: true, ref: 'University', refEndpoint: '/admin/universities?limit=100' },
      { name: 'year', label: 'Year', type: 'number', required: true, min: 1990, max: 2100 },
      { name: 'effectiveFrom', label: 'Effective from', type: 'date' },
      { name: 'totalSemesters', label: 'Total semesters', type: 'number', required: true, min: 1, max: 12 },
      { name: 'gradingScheme', label: 'Grading scheme', type: 'reference', ref: 'GradingScheme', refEndpoint: '/admin/grading-schemes?limit=100' },
      { name: 'description', label: 'Description', type: 'textarea', max: 2000, colSpan: 2, rows: 3 },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  semesters: {
    fields: [
      { name: 'regulation', label: 'Regulation', type: 'reference', required: true, ref: 'AcademicRegulation', refEndpoint: '/admin/regulations?limit=100' },
      { name: 'number', label: 'Number', type: 'number', required: true, min: 1, max: 12 },
      { name: 'title', label: 'Title', type: 'text', max: 120 },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000, colSpan: 2, rows: 3 },
      { name: 'order', label: 'Order', type: 'number', required: true, min: 0, max: 100 },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  subjects: {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, min: 2, max: 200 },
      { name: 'code', label: 'Code', type: 'text', max: 32 },
      { name: 'shortName', label: 'Short name', type: 'text', max: 60 },
      { name: 'description', label: 'Description', type: 'textarea', max: 3000, colSpan: 2, rows: 3 },
      { name: 'regulation', label: 'Regulation', type: 'reference', ref: 'AcademicRegulation', refEndpoint: '/admin/regulations?limit=100' },
      { name: 'semester', label: 'Semester', type: 'reference', ref: 'Semester', refEndpoint: '/admin/semesters?limit=100' },
      { name: 'semesterNumber', label: 'Semester number', type: 'number', required: true, min: 1, max: 12 },
      { name: 'university', label: 'University', type: 'reference', ref: 'University', refEndpoint: '/admin/universities?limit=100' },
      { name: 'credits', label: 'Credits', type: 'number', required: true, min: 0, max: 20 },
      { name: 'type', label: 'Type', type: 'select', options: SUBJECT_TYPE_OPTIONS },
      { name: 'recommendedStudyHours', label: 'Recommended study hours', type: 'number', required: true, min: 0, max: 1000 },
      { name: 'learningObjectives', label: 'Learning objectives', type: 'tags', colSpan: 2 },
      { name: 'prerequisites', label: 'Prerequisite subjects', type: 'reference', multiple: true, ref: 'Subject', refEndpoint: '/admin/subjects?limit=100', colSpan: 2 },
      { name: 'markingScheme', label: 'Marking scheme', type: 'json', colSpan: 2, help: 'e.g. { "theory": 70, "internal": 30, "total": 100 }' },
      { name: 'examDate', label: 'Exam date', type: 'date' },
      { name: 'color', label: 'Colour', type: 'text', max: 30 },
      { name: 'icon', label: 'Icon', type: 'text', max: 40 },
      { name: 'tags', label: 'Tags', type: 'tags', colSpan: 2 },
      { name: 'isTemplate', label: 'Template', type: 'boolean' },
      { name: 'isPublished', label: 'Published', type: 'boolean' },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  units: {
    fields: [
      { name: 'subject', label: 'Subject', type: 'reference', required: true, ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
      { name: 'number', label: 'Number', type: 'number', required: true, min: 1, max: 30 },
      { name: 'title', label: 'Title', type: 'text', required: true, min: 1, max: 200 },
      { name: 'description', label: 'Description', type: 'textarea', max: 3000, colSpan: 2, rows: 3 },
      { name: 'recommendedHours', label: 'Recommended hours', type: 'number', required: true, min: 0, max: 200 },
      { name: 'weightage', label: 'Weightage (%)', type: 'number', required: true, min: 0, max: 100 },
      { name: 'learningObjectives', label: 'Learning objectives', type: 'tags', colSpan: 2 },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  topics: {
    fields: [
      { name: 'subject', label: 'Subject', type: 'reference', required: true, ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
      { name: 'unit', label: 'Unit', type: 'reference', required: true, ref: 'Unit', refEndpoint: '/admin/units?limit=100' },
      { name: 'number', label: 'Number', type: 'number', required: true, min: 0, max: 500 },
      { name: 'title', label: 'Title', type: 'text', required: true, min: 1, max: 240 },
      { name: 'description', label: 'Description', type: 'textarea', max: 4000, colSpan: 2, rows: 3 },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY_OPTIONS },
      { name: 'recommendedMinutes', label: 'Recommended minutes', type: 'number', required: true, min: 5, max: 600 },
      { name: 'learningObjectives', label: 'Learning objectives', type: 'tags', colSpan: 2 },
      { name: 'prerequisites', label: 'Prerequisite topics', type: 'reference', multiple: true, ref: 'Topic', refEndpoint: '/admin/topics?limit=100', colSpan: 2 },
      { name: 'keywords', label: 'Keywords', type: 'tags', colSpan: 2 },
      { name: 'resources', label: 'Resources', type: 'json', colSpan: 2, help: 'Array of { title, url, kind } where kind ∈ article | video | pdf | link.' },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },

  syllabi: {
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, min: 2, max: 200 },
      { name: 'description', label: 'Description', type: 'textarea', max: 3000, colSpan: 2, rows: 3 },
      { name: 'regulation', label: 'Regulation', type: 'reference', ref: 'AcademicRegulation', refEndpoint: '/admin/regulations?limit=100' },
      { name: 'semester', label: 'Semester', type: 'reference', ref: 'Semester', refEndpoint: '/admin/semesters?limit=100' },
      { name: 'subjects', label: 'Subjects', type: 'reference', multiple: true, ref: 'Subject', refEndpoint: '/admin/subjects?limit=100', colSpan: 2 },
      { name: 'version', label: 'Version', type: 'text', max: 20 },
      { name: 'isTemplate', label: 'Template', type: 'boolean' },
      { name: 'isPublished', label: 'Published', type: 'boolean' },
    ],
  },

  'note-templates': { fields: NOTE_TEMPLATE_FIELDS.map((field) => ({ ...field })) },

  'learning-materials': { fields: NOTE_TEMPLATE_FIELDS.map((field) => ({ ...field })) },

  exercises: {
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, min: 2, max: 240 },
      { name: 'slug', label: 'Slug', type: 'text', max: 160, help: 'Auto-generated from the title when left blank.' },
      { name: 'description', label: 'Description', type: 'textarea', max: 4000, colSpan: 2, rows: 3 },
      { name: 'problemStatement', label: 'Problem statement', type: 'richtext', max: 20000, colSpan: 2, rows: 8 },
      { name: 'subject', label: 'Subject', type: 'reference', ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
      { name: 'unit', label: 'Unit', type: 'reference', ref: 'Unit', refEndpoint: '/admin/units?limit=100' },
      { name: 'topic', label: 'Topic', type: 'reference', ref: 'Topic', refEndpoint: '/admin/topics?limit=100' },
      { name: 'languageRestrictions', label: 'Allowed languages', type: 'multiselect', options: LANGUAGE_OPTIONS },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY_OPTIONS },
      { name: 'starterCode', label: 'Starter code', type: 'json', colSpan: 2, help: 'e.g. { "c": "…", "java": "…", "python": "…" }' },
      { name: 'sampleTestCases', label: 'Sample test cases', type: 'json', colSpan: 2, help: 'Array of { input, expectedOutput, explanation, isHidden }.' },
      {
        name: 'hiddenTestCases',
        label: 'Hidden test cases',
        type: 'json',
        colSpan: 2,
        hideInTable: true,
        help: 'Never shown to students — used only for grading.',
      },
      { name: 'expectedBehavior', label: 'Expected behaviour', type: 'textarea', max: 4000, colSpan: 2, rows: 3 },
      { name: 'hints', label: 'Hints', type: 'tags', colSpan: 2 },
      { name: 'explanation', label: 'Explanation', type: 'richtext', max: 20000, colSpan: 2, rows: 5 },
      { name: 'points', label: 'Points', type: 'number', required: true, min: 0, max: 1000 },
      { name: 'timeLimitSeconds', label: 'Time limit (seconds)', type: 'number', required: true, min: 1, max: 15 },
      { name: 'memoryLimitKb', label: 'Memory limit (KB)', type: 'number', required: true, min: 16000, max: 512000 },
      { name: 'tags', label: 'Tags', type: 'tags', colSpan: 2 },
      { name: 'isPublished', label: 'Published', type: 'boolean' },
    ],
  },

  questions: {
    fields: [
      { name: 'subject', label: 'Subject', type: 'reference', ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
      { name: 'unit', label: 'Unit', type: 'reference', ref: 'Unit', refEndpoint: '/admin/units?limit=100' },
      { name: 'topic', label: 'Topic', type: 'reference', ref: 'Topic', refEndpoint: '/admin/topics?limit=100' },
      { name: 'prerequisiteTopic', label: 'Prerequisite topic', type: 'reference', ref: 'Topic', refEndpoint: '/admin/topics?limit=100' },
      { name: 'type', label: 'Type', type: 'select', required: true, options: QUESTION_TYPE_OPTIONS },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY_OPTIONS },
      { name: 'marks', label: 'Marks', type: 'number', required: true, min: 0, max: 100 },
      { name: 'negativeMarks', label: 'Negative marks', type: 'number', required: true, min: 0, max: 100 },
      { name: 'prompt', label: 'Prompt', type: 'textarea', required: true, min: 3, max: 8000, colSpan: 2, rows: 4 },
      { name: 'codeSnippet', label: 'Code snippet', type: 'code', max: 12000, colSpan: 2, rows: 5 },
      { name: 'language', label: 'Language', type: 'select', options: [{ value: '', label: 'Not applicable' }, ...LANGUAGE_OPTIONS] },
      { name: 'options', label: 'Answer options', type: 'json', colSpan: 2, help: 'Array of { key, text } — e.g. [{ "key": "A", "text": "…" }].' },
      {
        name: 'correctOptionKeys',
        label: 'Correct option keys',
        type: 'tags',
        colSpan: 2,
        hideInTable: true,
        help: 'Stored for grading — never shown to students.',
      },
      {
        name: 'correctAnswerText',
        label: 'Correct answer text',
        type: 'textarea',
        max: 4000,
        colSpan: 2,
        rows: 2,
        hideInTable: true,
        help: 'Stored for grading — never shown to students.',
      },
      {
        name: 'acceptedAnswers',
        label: 'Accepted answers',
        type: 'tags',
        colSpan: 2,
        hideInTable: true,
        help: 'Stored for grading — never shown to students.',
      },
      {
        name: 'testCases',
        label: 'Test cases',
        type: 'json',
        colSpan: 2,
        hideInTable: true,
        help: 'Never shown to students — used only for grading.',
      },
      { name: 'explanation', label: 'Explanation', type: 'richtext', max: 8000, colSpan: 2, rows: 4 },
      { name: 'learningObjective', label: 'Learning objective', type: 'text', max: 500 },
      { name: 'source', label: 'Source', type: 'select', options: QUESTION_SOURCE_OPTIONS },
      { name: 'isApproved', label: 'Approved', type: 'boolean' },
      { name: 'isActive', label: 'Active', type: 'boolean' },
      { name: 'tags', label: 'Tags', type: 'tags', colSpan: 2 },
    ],
  },

  tests: {
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, min: 2, max: 240 },
      { name: 'description', label: 'Description', type: 'textarea', max: 2000, colSpan: 2, rows: 3 },
      { name: 'scope', label: 'Scope', type: 'select', options: TEST_SCOPE_OPTIONS },
      { name: 'subject', label: 'Subject', type: 'reference', ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
      { name: 'unit', label: 'Unit', type: 'reference', ref: 'Unit', refEndpoint: '/admin/units?limit=100' },
      { name: 'semester', label: 'Semester', type: 'reference', ref: 'Semester', refEndpoint: '/admin/semesters?limit=100' },
      { name: 'sourceType', label: 'Source type', type: 'select', options: TEST_SOURCE_TYPE_OPTIONS },
      {
        name: 'configuration',
        label: 'Configuration',
        type: 'json',
        colSpan: 2,
        help: 'Optional. e.g. { "questionCount": 10, "durationMinutes": 20, "difficulty": "mixed" }.',
      },
      { name: 'questions', label: 'Questions', type: 'reference', multiple: true, ref: 'Question', refEndpoint: '/admin/questions?limit=100', colSpan: 2 },
      { name: 'totalMarks', label: 'Total marks', type: 'number', required: true, min: 0, max: 1000 },
      { name: 'isTemplate', label: 'Template', type: 'boolean', help: 'Admin-authored tests are stored as templates.' },
      { name: 'isPublished', label: 'Published', type: 'boolean' },
    ],
  },

  videos: {
    fields: [
      { name: 'youtubeId', label: 'YouTube ID', type: 'text', required: true, min: 5, max: 40 },
      { name: 'title', label: 'Title', type: 'text', required: true, min: 2, max: 300 },
      { name: 'description', label: 'Description', type: 'textarea', max: 4000, colSpan: 2, rows: 3 },
      { name: 'channelTitle', label: 'Channel title', type: 'text', max: 200 },
      { name: 'channelId', label: 'Channel ID', type: 'text', max: 60 },
      { name: 'thumbnailUrl', label: 'Thumbnail URL', type: 'text', max: 500 },
      { name: 'durationSeconds', label: 'Duration (seconds)', type: 'number', required: true, min: 0, max: 86400 },
      { name: 'publishedAt', label: 'Published at', type: 'date' },
      { name: 'viewCount', label: 'View count', type: 'number', required: true, min: 0 },
      { name: 'subject', label: 'Subject', type: 'reference', ref: 'Subject', refEndpoint: '/admin/subjects?limit=100' },
      { name: 'unit', label: 'Unit', type: 'reference', ref: 'Unit', refEndpoint: '/admin/units?limit=100' },
      { name: 'topic', label: 'Topic', type: 'reference', ref: 'Topic', refEndpoint: '/admin/topics?limit=100' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY_OPTIONS },
      { name: 'language', label: 'Language', type: 'text', max: 40 },
      { name: 'tags', label: 'Tags', type: 'tags', colSpan: 2 },
      { name: 'learningObjectives', label: 'Learning objectives', type: 'tags', colSpan: 2 },
      { name: 'isCurated', label: 'Curated', type: 'boolean' },
      { name: 'isAvailable', label: 'Available', type: 'boolean' },
    ],
  },

  'grading-schemes': {
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, min: 2, max: 160 },
      { name: 'code', label: 'Code', type: 'text', required: true, min: 2, max: 32 },
      { name: 'university', label: 'University', type: 'reference', ref: 'University', refEndpoint: '/admin/universities?limit=100' },
      { name: 'maxMarks', label: 'Max marks', type: 'number', required: true, min: 1, max: 1000 },
      { name: 'passMark', label: 'Pass mark', type: 'number', required: true, min: 0, max: 1000 },
      { name: 'internalWeight', label: 'Internal weight', type: 'number', required: true, min: 0, max: 100 },
      { name: 'externalWeight', label: 'External weight', type: 'number', required: true, min: 0, max: 100 },
      {
        name: 'gradeBands',
        label: 'Grade bands',
        type: 'json',
        colSpan: 2,
        help: 'Array of { grade, minPercent, maxPercent, points, description }.',
      },
      { name: 'description', label: 'Description', type: 'textarea', max: 2000, colSpan: 2, rows: 3 },
      { name: 'isDefault', label: 'Default scheme', type: 'boolean' },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
};

/* ---------------------------------------------------- filter + soft delete --- */

/**
 * Filterable query parameters per entity — mirror of `filterFields` in
 * `server/src/routes/admin.routes.js`. Each name maps to a field definition in
 * ENTITY_FIELDS so the toolbar can pick the right control.
 */
export const ENTITY_FILTERS = {
  universities: ['isActive', 'country', 'state'],
  colleges: ['university', 'isActive'],
  programs: ['university', 'isActive', 'degree'],
  regulations: ['program', 'university', 'year', 'isActive'],
  semesters: ['regulation', 'number', 'isActive'],
  subjects: ['semester', 'regulation', 'university', 'semesterNumber', 'type', 'isActive', 'isTemplate'],
  units: ['subject', 'isActive'],
  topics: ['subject', 'unit', 'difficulty', 'isActive'],
  syllabi: ['regulation', 'semester', 'isTemplate', 'isPublished'],
  'note-templates': ['subject', 'topic', 'format', 'isApproved', 'isPublished'],
  'learning-materials': ['subject', 'topic', 'format', 'isApproved', 'isPublished'],
  exercises: ['subject', 'unit', 'topic', 'difficulty', 'isPublished'],
  questions: ['subject', 'unit', 'topic', 'type', 'difficulty', 'isApproved', 'source', 'isActive'],
  tests: ['subject', 'semester', 'scope', 'isTemplate', 'isPublished'],
  videos: ['subject', 'topic', 'difficulty', 'isCurated', 'isAvailable'],
  'grading-schemes': ['university', 'isActive', 'isDefault'],
};

/** Entities that support soft delete + restore (every registry entity except grading-schemes). */
export const SOFT_DELETE_ENTITIES = [
  'universities',
  'colleges',
  'programs',
  'regulations',
  'semesters',
  'subjects',
  'units',
  'topics',
  'syllabi',
  'note-templates',
  'learning-materials',
  'exercises',
  'questions',
  'tests',
  'videos',
];

/** Sort fields the CRUD controller always accepts (see crudFactory `allowedSort`). */
export const SORTABLE_FIELDS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'name', label: 'Name' },
  { value: 'title', label: 'Title' },
  { value: 'number', label: 'Number' },
];

/* ---------------------------------------------------------------- helpers --- */

export function fieldFor(entity, name) {
  return ENTITY_FIELDS[entity]?.fields.find((field) => field.name === name) || null;
}

export function tableColumns(entity) {
  return (ENTITY_FIELDS[entity]?.fields || []).filter((field) => !field.hideInTable);
}

export function formFields(entity) {
  return (ENTITY_FIELDS[entity]?.fields || []).filter((field) => !field.hideInForm);
}

/** Human label for a reference option coming from another admin collection. */
export function referenceLabel(record) {
  if (record === null || record === undefined) return '—';
  if (typeof record !== 'object') return String(record);
  return (
    record.name ||
    record.title ||
    record.code ||
    (record.number !== undefined ? `#${record.number}` : '') ||
    String(record.id || '')
  );
}

export default ENTITY_FIELDS;
