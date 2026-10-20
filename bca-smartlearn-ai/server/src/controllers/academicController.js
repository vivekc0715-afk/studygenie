'use strict';

const {
  University,
  College,
  AcademicProgram,
  AcademicRegulation,
  Semester,
  Subject,
  Unit,
  Topic,
  GradingScheme,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Everything the onboarding wizard needs to render its dropdowns in one call. */
const catalogue = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const universityFilter = query.university ? { _id: query.university } : {};

  const [universities, colleges, programs, regulations, gradingSchemes] = await Promise.all([
    University.find({ ...universityFilter, isActive: true }).sort({ name: 1 }).lean({ virtuals: true }),
    query.university
      ? College.find({ university: query.university, isActive: true }).sort({ name: 1 }).lean({ virtuals: true })
      : Promise.resolve([]),
    query.university
      ? AcademicProgram.find({ university: query.university, isActive: true }).sort({ name: 1 }).lean({ virtuals: true })
      : AcademicProgram.find({ isActive: true }).sort({ name: 1 }).lean({ virtuals: true }),
    query.program
      ? AcademicRegulation.find({ program: query.program, isActive: true }).sort({ year: -1 }).lean({ virtuals: true })
      : AcademicRegulation.find({ isActive: true }).sort({ year: -1 }).lean({ virtuals: true }),
    GradingScheme.find({ isActive: true }).sort({ isDefault: -1, name: 1 }).lean({ virtuals: true }),
  ]);

  return ok(res, { universities, colleges, programs, regulations, gradingSchemes });
});

/** Semesters belonging to a regulation, with subject counts. */
const listSemesters = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const filter = {};
  if (query.regulation) filter.regulation = query.regulation;
  if (query.program) {
    const regulationIds = await AcademicRegulation.find({ program: query.program }).distinct('_id');
    filter.regulation = { $in: regulationIds };
  }

  const semesters = await Semester.find({ ...filter, isActive: true })
    .populate('regulation', 'name code year totalSemesters')
    .sort({ number: 1 })
    .lean({ virtuals: true });

  return ok(res, semesters);
});

/**
 * Subject browser. Returns published/template subjects plus the student's own
 * custom subjects so they can build a syllabus that is not in the library.
 */
const listSubjects = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const visibility = [{ isPublished: true, owner: null }];
  if (req.user) visibility.push({ owner: req.user._id });

  const filter = { isActive: true, $or: visibility };
  if (query.semester) filter.semester = query.semester;
  if (query.semesterNumber) filter.semesterNumber = Number(query.semesterNumber);
  if (query.regulation) filter.regulation = query.regulation;
  if (query.university) filter.university = query.university;
  if (query.type) filter.type = query.type;
  if (query.mine === 'true' && req.user) {
    filter.$or = [{ owner: req.user._id }];
  }
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$and = [{ $or: [{ name: regex }, { code: regex }, { description: regex }] }];
  }

  const [items, total] = await Promise.all([
    Subject.find(filter)
      .populate('semester', 'number title')
      .sort({ semesterNumber: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Subject.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

/** Subject detail including the unit/topic tree and prerequisite chain. */
const getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('semester', 'number title')
    .populate('prerequisites', 'name code')
    .populate('regulation', 'name code year');
  if (!subject) throw ApiError.notFound('Subject not found.');
  if (subject.owner && (!req.user || String(subject.owner) !== String(req.user._id))) {
    throw ApiError.forbidden('This subject belongs to another student.');
  }

  const units = await Unit.find({ subject: subject._id, isActive: true }).sort({ number: 1 }).lean({ virtuals: true });
  const topics = await Topic.find({ subject: subject._id, isActive: true })
    .sort({ unit: 1, number: 1 })
    .select('-prerequisites')
    .lean({ virtuals: true });

  const topicGroups = units.map((unit) => ({
    unit,
    topics: topics.filter((topic) => String(topic.unit) === String(unit._id)),
  }));

  return ok(res, {
    subject,
    units,
    topics,
    tree: topicGroups,
    stats: {
      unitCount: units.length,
      topicCount: topics.length,
      recommendedStudyHours: subject.recommendedStudyHours,
    },
  });
});

const listUnits = asyncHandler(async (req, res) => {
  const subjectId = req.params.id || queryOf(req).subject;
  if (!subjectId) throw ApiError.badRequest('A subject id is required.');
  const units = await Unit.find({ subject: subjectId, isActive: true }).sort({ number: 1 }).lean({ virtuals: true });
  return ok(res, units);
});

const listTopics = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const filter = { isActive: true };
  if (query.unit) filter.unit = query.unit;
  if (query.subject) filter.subject = query.subject;
  if (!query.unit && !query.subject) throw ApiError.badRequest('Provide a unit or subject filter.');
  const topics = await Topic.find(filter).sort({ number: 1 }).lean({ virtuals: true });
  return ok(res, topics);
});

/** Universal search across subjects, topics, notes and curated videos. */
const search = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const term = String(query.q || '').trim();
  if (term.length < 2) return ok(res, { results: [], term });

  const regex = new RegExp(escapeRegex(term), 'i');
  const limit = Math.min(Number(query.limit) || 5, 20);

  const { Note, CodingExercise, VideoResource } = require('../models');
  const noteFilter = req.user ? { student: req.user._id } : { _id: null };

  const [subjects, topics, notes, exercises, videos] = await Promise.all([
    Subject.find({ isActive: true, $or: [{ name: regex }, { code: regex }] })
      .limit(limit)
      .select('name code semesterNumber')
      .lean({ virtuals: true }),
    Topic.find({ isActive: true, $or: [{ title: regex }, { keywords: regex }] })
      .limit(limit)
      .populate('subject', 'name')
      .select('title subject unit difficulty')
      .lean({ virtuals: true }),
    Note.find({ ...noteFilter, $or: [{ title: regex }, { tags: regex }] })
      .limit(limit)
      .select('title format subject createdAt')
      .lean({ virtuals: true }),
    CodingExercise.find({ isPublished: true, $or: [{ title: regex }, { tags: regex }] })
      .limit(limit)
      .select('title difficulty languageRestrictions')
      .lean({ virtuals: true }),
    VideoResource.find({ isAvailable: true, $or: [{ title: regex }, { tags: regex }] })
      .limit(limit)
      .select('title youtubeId thumbnailUrl difficulty')
      .lean({ virtuals: true }),
  ]);

  const results = [
    ...subjects.map((item) => ({
      type: 'subject',
      id: item.id,
      title: item.name,
      subtitle: `Semester ${item.semesterNumber}${item.code ? ` · ${item.code}` : ''}`,
      href: `/subjects/${item.id}`,
    })),
    ...topics.map((item) => ({
      type: 'topic',
      id: item.id,
      title: item.title,
      subtitle: item.subject?.name || 'Topic',
      href: item.subject ? `/subjects/${item.subject._id}?topic=${item.id}` : '/subjects',
    })),
    ...notes.map((item) => ({
      type: 'note',
      id: item.id,
      title: item.title,
      subtitle: 'Saved note',
      href: `/notes/${item.id}`,
    })),
    ...exercises.map((item) => ({
      type: 'exercise',
      id: item.id,
      title: item.title,
      subtitle: 'Coding exercise',
      href: `/coding/${item.id}`,
    })),
    ...videos.map((item) => ({
      type: 'video',
      id: item.id,
      title: item.title,
      subtitle: 'Video lesson',
      href: `/recommendations?video=${item.id}`,
    })),
  ];

  return ok(res, { results, term });
});

module.exports = { catalogue, listSemesters, listSubjects, getSubject, listUnits, listTopics, search };
