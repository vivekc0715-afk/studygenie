'use strict';

/**
 * Prompt construction for every AI-backed feature.
 *
 * All prompts request Markdown output so the client can render them directly,
 * and every prompt is grounded in real syllabus context passed in by the caller.
 */

const NOTE_FORMAT_INSTRUCTIONS = {
  quick_revision: {
    label: 'Quick revision notes',
    brief:
      'Produce a last-minute revision sheet: bullet points only, no long prose. Group under bold sub-headings. Highlight the 3-5 facts most likely to be asked in an exam.',
  },
  detailed_conceptual: {
    label: 'Detailed conceptual notes',
    brief:
      'Explain each concept from first principles with increasing depth. Use headings, short paragraphs, and a worked example per concept. Explain the "why", not just the "what".',
  },
  short_answer: {
    label: 'Short-answer exam prep',
    brief:
      'For each key point, give a ready-to-write exam answer of 60-100 words. Start each answer with a one-line definition.',
  },
  long_answer: {
    label: 'Long-answer exam prep',
    brief:
      'Provide full-length exam answers (250-400 words) with an introduction, structured body with sub-headings, a diagram description where relevant, and a conclusion.',
  },
  definitions: {
    label: 'Definitions and terminology',
    brief:
      'List every important term as "**Term** - precise definition". One term per bullet. Keep definitions exam-exact and under 40 words.',
  },
  important_questions: {
    label: 'Important questions',
    brief:
      'List the most probable exam questions ordered from most to least likely, grouped by marks (2 marks, 5 marks, 10 marks). Add a one-line hint for each.',
  },
  programming_examples: {
    label: 'Worked programming examples',
    brief:
      'Give 3-5 complete, runnable code examples in fenced code blocks with the language tag. After each block, explain the output line by line and note common mistakes.',
  },
  comparison_tables: {
    label: 'Comparison tables',
    brief:
      'Present the differences as Markdown tables with clear parameter rows. Add a one-line summary after each table stating when each option is preferable.',
  },
  flashcards: {
    label: 'Flashcards',
    brief:
      'Create 10-15 flashcards. Format each strictly as:\n**Q:** question\n**A:** answer\n\nKeep every answer under 30 words so it can be recalled quickly.',
  },
  practice_questions: {
    label: 'Practice questions',
    brief:
      'Write 10 practice questions of mixed types (MCQ with four options and the answer marked, true/false, and short answer). Put the answer and a one-line explanation directly beneath each question.',
  },
  last_minute: {
    label: 'Last-minute revision sheet',
    brief:
      'Compress the whole topic onto one page: key formulas, syntax, definitions and traps. Use tables and bullets exclusively - no paragraphs.',
  },
  viva_questions: {
    label: 'Viva questions and answers',
    brief:
      'List 12-15 viva questions with crisp spoken-style answers of 2-3 sentences. Order them from basic to advanced, the way an examiner would ask.',
  },
};

const LEVEL_GUIDANCE = {
  beginner: 'The student is new to this topic. Define every term, avoid jargon without explanation, and use simple analogies.',
  intermediate: 'The student knows the basics. Focus on application, comparisons, and common exam variations.',
  advanced: 'The student is strong. Go straight to edge cases, optimisations, exceptions, and higher-order insights. Skip basic definitions.',
};

const LENGTH_GUIDANCE = {
  short: 'Target roughly 250 words of body content.',
  medium: 'Target roughly 600 words of body content.',
  long: 'Target roughly 1200 words of body content.',
};

const NOTE_SYSTEM_INSTRUCTION = [
  'You are an expert BCA (Bachelor of Computer Applications) faculty member writing study material for university exams.',
  'You always answer with clean GitHub-flavoured Markdown.',
  'You never invent facts, syllabus topics or exam patterns that were not requested.',
  'You write in plain, exam-ready English and use tables where they make the content clearer.',
  'You never wrap your entire answer in a code fence.',
].join(' ');

/** Builds the note-generation prompt from real syllabus context. */
function buildNotePrompt({
  format,
  learningLevel = 'beginner',
  answerLength = 'medium',
  examStyle = '',
  subjectName = '',
  unitTitle = '',
  topicTitle = '',
  syllabusText = '',
  learningObjectives = [],
  extraInstructions = '',
}) {
  const formatSpec = NOTE_FORMAT_INSTRUCTIONS[format] || NOTE_FORMAT_INSTRUCTIONS.detailed_conceptual;

  const context = [
    subjectName ? `Subject: ${subjectName}` : null,
    unitTitle ? `Unit: ${unitTitle}` : null,
    topicTitle ? `Topic: ${topicTitle}` : null,
    syllabusText ? `Official syllabus wording:\n${syllabusText}` : null,
    learningObjectives.length
      ? `Learning objectives:\n${learningObjectives.map((objective) => `- ${objective}`).join('\n')}`
      : null,
    examStyle ? `Exam pattern to follow: ${examStyle}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = [
    `Create "${formatSpec.label}" for the topic below.`,
    '',
    '## Context',
    context || 'No additional syllabus context was provided - rely on standard BCA curriculum content for this topic.',
    '',
    '## Requirements',
    `- Content style: ${formatSpec.brief}`,
    `- Audience: ${LEVEL_GUIDANCE[learningLevel] || LEVEL_GUIDANCE.beginner}`,
    `- Depth: ${LENGTH_GUIDANCE[answerLength] || LENGTH_GUIDANCE.medium}`,
    '- Start with a single `# ` title line containing the topic name.',
    '- Use `## ` sub-headings to organise the content.',
    '- Use Markdown tables when comparing items.',
    '- Use fenced code blocks with a language tag for every code sample.',
    '- End with a `## Key takeaways` section containing 3-5 bullets.',
    extraInstructions ? `- Additional instruction from the student: ${extraInstructions}` : null,
    '',
    'Return only the Markdown document. Do not add commentary before or after it.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { systemInstruction: NOTE_SYSTEM_INSTRUCTION, prompt, formatLabel: formatSpec.label };
}

/** Builds the prompt that drafts a batch of questions for the question bank / tests. */
function buildQuestionPrompt({
  subjectName,
  unitTitle,
  topicTitle,
  syllabusText = '',
  count = 5,
  types = ['mcq'],
  difficulty = 'medium',
  marks = 1,
}) {
  const systemInstruction = [
    'You are an exam paper setter for a BCA university course.',
    'You produce objectively gradable questions with exactly one defensible answer each.',
    'You always return strict JSON and nothing else.',
  ].join(' ');

  const prompt = [
    `Write ${count} ${difficulty} questions for the topic below.`,
    '',
    `Subject: ${subjectName || 'BCA'}`,
    unitTitle ? `Unit: ${unitTitle}` : null,
    topicTitle ? `Topic: ${topicTitle}` : null,
    syllabusText ? `Syllabus wording: ${syllabusText}` : null,
    `Question types allowed: ${types.join(', ')}`,
    `Marks per question: ${marks}`,
    '',
    'Return a JSON object with this exact shape:',
    JSON.stringify(
      {
        questions: [
          {
            type: 'mcq',
            difficulty: 'medium',
            marks: 1,
            prompt: 'the question text',
            codeSnippet: 'optional code the student must read, otherwise an empty string',
            options: [
              { key: 'A', text: 'first option' },
              { key: 'B', text: 'second option' },
              { key: 'C', text: 'third option' },
              { key: 'D', text: 'fourth option' },
            ],
            correctOptionKeys: ['A'],
            correctAnswerText: 'only for fill_blank / short_answer / output_prediction, otherwise empty',
            acceptedAnswers: ['alternative acceptable answers'],
            explanation: 'why the answer is correct, 1-3 sentences',
            learningObjective: 'what this question tests',
          },
        ],
      },
      null,
      2
    ),
    '',
    'Rules:',
    '- For multi_select provide 2 or more correctOptionKeys.',
    '- For true_false provide exactly two options with keys "true" and "false".',
    '- For fill_blank and output_prediction leave options empty and use correctAnswerText.',
    '- Never repeat a question.',
  ]
    .filter(Boolean)
    .join('\n');

  return { systemInstruction, prompt };
}

/** Builds the prompt that explains a student's wrong answer in context. */
function buildExplanationPrompt({ prompt, type, options = [], correctAnswer, studentAnswer, subjectName, topicTitle }) {
  const systemInstruction = [
    'You are a patient BCA tutor.',
    'You explain mistakes without being condescending and you always answer in Markdown.',
  ].join(' ');

  const body = [
    `Subject: ${subjectName || 'BCA'}`,
    topicTitle ? `Topic: ${topicTitle}` : null,
    `Question type: ${type}`,
    '',
    `Question:\n${prompt}`,
    options.length ? `Options:\n${options.map((option) => `${option.key}. ${option.text}`).join('\n')}` : null,
    `Correct answer: ${correctAnswer}`,
    `Student answered: ${studentAnswer || '(no answer)'}`,
    '',
    'Write a short explanation with exactly these sections:',
    '## Why the correct answer is right',
    '## Where your answer went wrong',
    '## Remember this for the exam',
  ]
    .filter(Boolean)
    .join('\n');

  return { systemInstruction, prompt: body };
}

/** Builds the prompt that produces per-subject study recommendations. */
function buildStudyAdvicePrompt({ subjectName, currentAverage, syllabusCompletion, weakTopics = [], upcomingExams = [] }) {
  const systemInstruction = 'You are an academic mentor for BCA students. You always answer in Markdown with concrete, actionable steps.';

  const prompt = [
    `Subject: ${subjectName}`,
    `Current average score: ${Math.round(currentAverage)}%`,
    `Syllabus completed: ${Math.round(syllabusCompletion)}%`,
    weakTopics.length ? `Weak topics: ${weakTopics.join(', ')}` : 'No measured weak topics yet.',
    upcomingExams.length ? `Upcoming exams: ${upcomingExams.join(', ')}` : 'No scheduled exam dates.',
    '',
    'Write a prioritised improvement plan with:',
    '1. The three highest-impact actions, each with a concrete time estimate.',
    '2. A 7-day revision schedule as a Markdown table (day, focus, activity, minutes).',
    '3. Two exam-day strategies specific to this subject.',
    'Keep the whole answer under 500 words.',
  ].join('\n');

  return { systemInstruction, prompt };
}

module.exports = {
  NOTE_FORMAT_INSTRUCTIONS,
  LEVEL_GUIDANCE,
  LENGTH_GUIDANCE,
  NOTE_SYSTEM_INSTRUCTION,
  buildNotePrompt,
  buildQuestionPrompt,
  buildExplanationPrompt,
  buildStudyAdvicePrompt,
};
