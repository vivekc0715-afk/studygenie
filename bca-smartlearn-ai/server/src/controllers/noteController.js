'use strict';

const { Note, NoteTemplate, Bookmark, Subject, Topic } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');
const { NOTE_FORMATS, LEARNING_LEVELS, ANSWER_LENGTHS } = require('../config/constants');
const noteService = require('../services/notes/noteService');
const gfgNotesService = require('../services/notes/gfgNotesService');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function assertObjectId(id, label = 'note') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label} identifier.`);
}

/** Format catalogue so the client never hardcodes the list. */
const meta = asyncHandler(async (_req, res) =>
  ok(res, {
    formats: NOTE_FORMATS,
    learningLevels: LEARNING_LEVELS,
    answerLengths: ANSWER_LENGTHS,
    aiConfigured: features.ai,
    aiHint: features.ai
      ? ''
      : 'The AI notes generator is not configured yet. Add GEMINI_API_KEY to server/.env to enable it.',
  })
);

const generate = asyncHandler(async (req, res) => {
  const result = await noteService.generateNote(req.user, req.body);
  return created(res, result);
});

const list = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { student: req.user._id };
  if (query.subject) filter.subject = query.subject;
  if (query.topic) filter.topic = query.topic;
  if (query.unit) filter.unit = query.unit;
  if (query.format) filter.format = query.format;
  if (query.source) filter.source = query.source;
  if (query.bookmarked === 'true') filter.isBookmarked = true;
  if (query.archived === 'true') filter.isArchived = true;
  else filter.isArchived = { $ne: true };
  if (query.tag) filter.tags = query.tag;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: regex }, { content: regex }, { tags: regex }];
  }

  const [items, total] = await Promise.all([
    Note.find(filter)
      .select('-content')
      .populate('subject', 'name code color icon')
      .sort({ [query.sortBy === 'title' ? 'title' : 'createdAt']: query.sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Note.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const note = await Note.findOne({ _id: req.params.id, student: req.user._id })
    .populate('subject', 'name code color icon')
    .populate('topic', 'title difficulty');
  if (!note) throw ApiError.notFound('Note not found.');

  note.lastViewedAt = new Date();
  await note.save();

  return ok(res, note.toJSON());
});

const create = asyncHandler(async (req, res) => {
  const note = await Note.create({ ...req.body, student: req.user._id, source: 'manual', provider: 'student' });
  return created(res, note.toJSON());
});

const update = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const note = await Note.findOne({ _id: req.params.id, student: req.user._id });
  if (!note) throw ApiError.notFound('Note not found.');

  const editable = ['title', 'content', 'tags', 'isBookmarked', 'isArchived'];
  let contentChanged = false;

  for (const [key, value] of Object.entries(req.body)) {
    if (value === undefined || !editable.includes(key)) continue;
    if (key === 'content' && value !== note.content) contentChanged = true;
    note[key] = value;
  }

  if (contentChanged) {
    note.isEdited = true;
    note.version += 1;
  }

  await note.save();
  return ok(res, note.toJSON());
});

const remove = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const note = await Note.findOneAndDelete({ _id: req.params.id, student: req.user._id });
  if (!note) throw ApiError.notFound('Note not found.');
  return noContent(res);
});

/** Toggles the bookmark flag and keeps the Bookmark collection in sync. */
const toggleBookmark = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const note = await Note.findOne({ _id: req.params.id, student: req.user._id });
  if (!note) throw ApiError.notFound('Note not found.');

  note.isBookmarked = !note.isBookmarked;
  await note.save();

  if (note.isBookmarked) {
    await Bookmark.updateOne(
      { student: req.user._id, entityType: 'note', entityId: note._id },
      { $setOnInsert: { label: note.title, meta: { format: note.format } } },
      { upsert: true }
    );
  } else {
    await Bookmark.deleteOne({ student: req.user._id, entityType: 'note', entityId: note._id });
  }

  return ok(res, { id: String(note._id), isBookmarked: note.isBookmarked });
});

const EXPORT_EXTENSIONS = { md: 'md', markdown: 'md', txt: 'txt', json: 'json' };

/** Streams a note as a downloadable file so students can study offline. */
const exportNote = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const format = String(queryOf(req).format || 'md').toLowerCase();
  if (!EXPORT_EXTENSIONS[format]) throw ApiError.badRequest('Supported export formats: md, txt, json.');

  const note = await Note.findOne({ _id: req.params.id, student: req.user._id })
    .populate('subject', 'name code')
    .populate('topic', 'title');
  if (!note) throw ApiError.notFound('Note not found.');

  const safeName = note.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'note';

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(note.toJSON(), null, 2));
  }

  let body = note.content;
  if (format === 'md') {
    const header = [
      `# ${note.title}`,
      '',
      note.subject?.name ? `**Subject:** ${note.subject.name}${note.subject.code ? ` (${note.subject.code})` : ''}` : null,
      note.topic?.title ? `**Topic:** ${note.topic.title}` : null,
      `**Format:** ${note.format} · **Level:** ${note.learningLevel} · **Generated:** ${note.createdAt.toISOString().slice(0, 10)}`,
      '',
      '---',
      '',
    ]
      .filter((line) => line !== null)
      .join('\n');
    body = header + body;
  } else {
    body = note.content
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/g, '\n'))
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^\s*\|/gm, ' ')
      .replace(/---+/g, '');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${EXPORT_EXTENSIONS[format]}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(body);
});

/** Admin-approved learning material the student can import as a note. */
const listMaterials = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { isApproved: true, isPublished: true, isDeleted: { $ne: true } };
  if (query.subject) filter.subject = query.subject;
  if (query.topic) filter.topic = query.topic;
  if (query.format) filter.format = query.format;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  const [items, total] = await Promise.all([
    NoteTemplate.find(filter)
      .select('-content -sourceMaterial')
      .populate('subject', 'name code color icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    NoteTemplate.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

const importMaterial = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'material');
  const result = await noteService.importTemplate(req.user, req.params.id, { topicId: req.body?.topicId || null });
  return created(res, result);
});

/** Topic suggestions for the "generate notes" form. */
const suggestTopics = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const term = String(query.q || '').trim();
  const filter = { isActive: true };
  if (query.subject) filter.subject = query.subject;
  if (term.length >= 2) filter.title = new RegExp(escapeRegex(term), 'i');

  const topics = await Topic.find(filter)
    .select('title subject unit difficulty')
    .populate('subject', 'name code')
    .limit(15)
    .lean({ virtuals: true });

  return ok(res, topics);
});

/** Distinct subjects that already have notes, for the sidebar filter. */
const noteSubjects = asyncHandler(async (req, res) => {
  const subjectIds = await Note.distinct('subject', { student: req.user._id, subject: { $ne: null } });
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name code color icon').lean({ virtuals: true });
  return ok(res, subjects);
});

/** List pre-curated GeeksforGeeks notes catalogue. */
const listGfg = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const items = gfgNotesService.getGfgCatalogue({
    search: query.search || '',
    subjectCode: query.subjectCode || '',
    limit: Number(query.limit) || 50,
  });
  return ok(res, items);
});

/** Import / Save a GeeksforGeeks note into the student's personal notes library. */
const importGfg = asyncHandler(async (req, res) => {
  const { topicTitle, subjectName, subjectCode, format = 'quick_revision' } = req.body;
  if (!topicTitle) throw ApiError.badRequest('Topic title is required to fetch GeeksforGeeks notes.');

  const gfgData = await gfgNotesService.fetchGfgNote({
    topicTitle,
    subjectName,
    subjectCode,
    format,
  });

  // Find matching subject if available
  let matchedSubject = null;
  if (subjectCode) {
    matchedSubject = await Subject.findOne({ code: new RegExp(`^${escapeRegex(subjectCode)}$`, 'i') });
  }

  const note = await Note.create({
    student: req.user._id,
    subject: matchedSubject?._id || null,
    title: gfgData.title,
    format,
    learningLevel: 'intermediate',
    answerLength: 'medium',
    subjectName: subjectName || matchedSubject?.name || 'BCA Curriculum',
    topicName: topicTitle,
    content: gfgData.content,
    tags: [...(gfgData.tags || []), 'geeksforgeeks', 'imported'],
    source: 'manual',
    provider: 'gfg',
    model: 'gfg-library-v1',
  });

  return created(res, note.toJSON());
});

module.exports = {
  meta,
  generate,
  list,
  getOne,
  create,
  update,
  remove,
  toggleBookmark,
  exportNote,
  listMaterials,
  importMaterial,
  suggestTopics,
  noteSubjects,
  listGfg,
  importGfg,
};
