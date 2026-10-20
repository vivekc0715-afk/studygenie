'use strict';

/** Shared domain constants used across models, services, validators and the UI. */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  STUDENT: 'student',
};

const ACCOUNT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
};

const LEARNING_LEVELS = ['beginner', 'intermediate', 'advanced'];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

/** Difficulty bands used by the adaptive engine and the recommendation engine. */
const MASTERY_BANDS = [
  { key: 'critical', min: 0, max: 39, label: 'Needs foundational rebuild' },
  { key: 'weak', min: 40, max: 59, label: 'Reinforce fundamentals' },
  { key: 'developing', min: 60, max: 79, label: 'Intermediate practice' },
  { key: 'strong', min: 80, max: 89, label: 'Advanced application' },
  { key: 'mastery', min: 90, max: 100, label: 'Mastery challenges' },
];

const QUESTION_TYPES = [
  'mcq',
  'multi_select',
  'true_false',
  'fill_blank',
  'output_prediction',
  'short_answer',
  'coding',
];

const TEST_SCOPES = ['unit', 'subject', 'semester', 'custom'];

const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  EXPIRED: 'expired',
  ABANDONED: 'abandoned',
};

const SUBMISSION_STATUS = {
  QUEUED: 'queued',
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  COMPILATION_ERROR: 'compilation_error',
  RUNTIME_ERROR: 'runtime_error',
  TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
  MEMORY_LIMIT_EXCEEDED: 'memory_limit_exceeded',
  INTERNAL_ERROR: 'internal_error',
};

/** Note formats supported by the AI notes generator (section 8 of the spec). */
const NOTE_FORMATS = [
  { key: 'quick_revision', label: 'Quick revision notes' },
  { key: 'detailed_conceptual', label: 'Detailed conceptual notes' },
  { key: 'short_answer', label: 'Short-answer exam prep' },
  { key: 'long_answer', label: 'Long-answer exam prep' },
  { key: 'definitions', label: 'Definitions & terminology' },
  { key: 'important_questions', label: 'Important questions' },
  { key: 'programming_examples', label: 'Worked programming examples' },
  { key: 'comparison_tables', label: 'Comparison tables' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'practice_questions', label: 'Practice questions' },
  { key: 'last_minute', label: 'Last-minute revision sheet' },
  { key: 'viva_questions', label: 'Viva questions & answers' },
];

const ANSWER_LENGTHS = ['short', 'medium', 'long'];

/**
 * Programming languages offered in the online compiler.
 * Judge0 identifiers are resolved at runtime from the provider's /languages
 * endpoint (see services/code/judge0.js) rather than being hardcoded.
 */
const SUPPORTED_LANGUAGES = [
  {
    key: 'c',
    label: 'C',
    monacoLanguage: 'c',
    extension: 'c',
    judge0Match: [/^C \(GCC/i, /^C \(Clang/i, /^C$/i],
    starterCode:
      '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, BCA SmartLearn!\\n");\n    return 0;\n}\n',
  },
  {
    key: 'java',
    label: 'Java',
    monacoLanguage: 'java',
    extension: 'java',
    judge0Match: [/^Java \(OpenJDK/i, /^Java$/i],
    starterCode:
      'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, BCA SmartLearn!");\n    }\n}\n',
  },
  {
    key: 'python',
    label: 'Python',
    monacoLanguage: 'python',
    extension: 'py',
    judge0Match: [/^Python \(3\./i, /^Python$/i],
    starterCode: 'def main():\n    print("Hello, BCA SmartLearn!")\n\n\nif __name__ == "__main__":\n    main()\n',
  },
];

const EXAM_SYSTEMS = ['semester', 'annual', 'trimester', 'custom'];

const IMPLEMENTATION_LEVELS = [
  { value: 'below_40', min: 0, max: 39, action: 'prerequisite_rebuild', label: 'Rebuild prerequisites' },
  { value: '40_59', min: 40, max: 59, action: 'guided_fundamentals', label: 'Guided fundamentals' },
  { value: '60_79', min: 60, max: 79, action: 'mixed_intermediate', label: 'Mixed intermediate' },
  { value: '80_89', min: 80, max: 89, action: 'advanced_application', label: 'Advanced application' },
  { value: '90_plus', min: 90, max: 100, action: 'mastery', label: 'Mastery challenges' },
];

/** Default admin-configurable settings applied on first boot (see services/settingsService.js). */
const DEFAULT_APPLICATION_SETTINGS = [
  {
    key: 'adaptive_thresholds',
    category: 'assessment',
    description: 'Score bands that drive adaptive difficulty selection.',
    value: MASTERY_BANDS,
  },
  {
    key: 'recommendation_thresholds',
    category: 'recommendations',
    description: 'Score bands that drive YouTube recommendation difficulty.',
    value: [
      { min: 0, max: 39, level: 'beginner', strategy: 'intro_playlists_and_foundations' },
      { min: 40, max: 59, level: 'beginner', strategy: 'worked_example_tutorials' },
      { min: 60, max: 79, level: 'intermediate', strategy: 'guided_problem_solving' },
      { min: 80, max: 89, level: 'advanced', strategy: 'advanced_concepts_applications' },
      { min: 90, max: 100, level: 'advanced', strategy: 'projects_and_deep_dive' },
    ],
  },
  {
    key: 'minimum_sample_size',
    category: 'analytics',
    description: 'Minimum number of graded attempts required before strong mastery claims.',
    value: 3,
  },
  {
    key: 'grade_confidence',
    category: 'analytics',
    description: 'Sample sizes that map to low/medium/high confidence for grade prediction.',
    value: { low: 1, medium: 3, high: 6 },
  },
  {
    key: 'ai_rate_limit',
    category: 'ai',
    description: 'Per-student AI generation limits.',
    value: { perMinute: 6, perDay: 120 },
  },
  {
    key: 'compiler_limits',
    category: 'compiler',
    description: 'Sandbox execution limits forwarded to the code execution provider.',
    value: { defaultTimeLimitSeconds: 5, maxTimeLimitSeconds: 10, maxSourceLength: 40000, maxOutputBytes: 65536 },
  },
  {
    key: 'platform',
    category: 'general',
    description: 'Public platform metadata.',
    value: { name: 'BCA SmartLearn AI', supportEmail: 'support@bcasmartlearn.local', allowSelfRegistration: true },
  },
];

const PAGINATION = { defaultLimit: 20, maxLimit: 100 };

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  LEARNING_LEVELS,
  DIFFICULTY_LEVELS,
  MASTERY_BANDS,
  QUESTION_TYPES,
  TEST_SCOPES,
  ATTEMPT_STATUS,
  SUBMISSION_STATUS,
  NOTE_FORMATS,
  ANSWER_LENGTHS,
  SUPPORTED_LANGUAGES,
  EXAM_SYSTEMS,
  IMPLEMENTATION_LEVELS,
  DEFAULT_APPLICATION_SETTINGS,
  PAGINATION,
};
