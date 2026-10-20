'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { createCrudController, mountCrud } = require('../services/crudFactory');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { entities } = require('../validators/entity.validators');
const models = require('../models');

const router = express.Router();

// Every admin route requires an authenticated Super Admin.
router.use(requireAuth, requireAdmin);

/* ------------------------------------------------------------- dashboard --- */

router.get('/dashboard', adminController.dashboard);
router.get('/system-health', adminController.systemHealth);

/* -------------------------------------------------------------- students --- */

router.get('/students', adminController.listStudents);
router.get('/students/:id', adminController.getStudent);
router.patch('/students/:id', adminController.updateStudent);
router.patch('/students/:id/status', adminController.setStudentStatus);
router.delete('/students/:id', adminController.deleteStudent);
router.post('/students/:id/restore', adminController.restoreStudent);

/* ------------------------------------------------------- generic entities --- */

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const registry = [
  {
    path: 'universities',
    key: 'universities',
    model: models.University,
    searchFields: ['name', 'code', 'city'],
    filterFields: ['isActive', 'country', 'state'],
    softDelete: true,
  },
  {
    path: 'colleges',
    key: 'colleges',
    model: models.College,
    searchFields: ['name', 'code', 'city'],
    filterFields: ['university', 'isActive'],
    populate: [{ path: 'university', select: 'name code' }],
    softDelete: true,
  },
  {
    path: 'programs',
    key: 'programs',
    model: models.AcademicProgram,
    searchFields: ['name', 'code'],
    filterFields: ['university', 'isActive', 'degree'],
    populate: [{ path: 'university', select: 'name code' }],
    softDelete: true,
  },
  {
    path: 'regulations',
    key: 'regulations',
    model: models.AcademicRegulation,
    searchFields: ['name', 'code'],
    filterFields: ['program', 'university', 'year', 'isActive'],
    populate: [
      { path: 'program', select: 'name code' },
      { path: 'university', select: 'name code' },
    ],
    softDelete: true,
  },
  {
    path: 'semesters',
    key: 'semesters',
    model: models.Semester,
    searchFields: ['title'],
    filterFields: ['regulation', 'number', 'isActive'],
    populate: [{ path: 'regulation', select: 'name code year' }],
    softDelete: true,
    sortable: ['number'],
  },
  {
    path: 'subjects',
    key: 'subjects',
    model: models.Subject,
    searchFields: ['name', 'code', 'description'],
    filterFields: ['semester', 'regulation', 'university', 'semesterNumber', 'type', 'isActive', 'isTemplate'],
    populate: [{ path: 'semester', select: 'number title' }],
    softDelete: true,
  },
  {
    path: 'units',
    key: 'units',
    model: models.Unit,
    searchFields: ['title', 'description'],
    filterFields: ['subject', 'isActive'],
    populate: [{ path: 'subject', select: 'name code' }],
    softDelete: true,
    sortable: ['number'],
  },
  {
    path: 'topics',
    key: 'topics',
    model: models.Topic,
    searchFields: ['title', 'description', 'keywords'],
    filterFields: ['subject', 'unit', 'difficulty', 'isActive'],
    populate: [
      { path: 'subject', select: 'name code' },
      { path: 'unit', select: 'number title' },
    ],
    softDelete: true,
    sortable: ['number'],
  },
  {
    path: 'syllabi',
    key: 'syllabi',
    model: models.Syllabus,
    searchFields: ['title', 'description'],
    filterFields: ['regulation', 'semester', 'isTemplate', 'isPublished'],
    populate: [
      { path: 'semester', select: 'number title' },
      { path: 'subjects', select: 'name code semesterNumber' },
    ],
    softDelete: true,
  },
  {
    path: 'note-templates',
    key: 'note-templates',
    model: models.NoteTemplate,
    searchFields: ['title', 'description', 'content'],
    filterFields: ['subject', 'topic', 'format', 'isApproved', 'isPublished'],
    populate: [{ path: 'subject', select: 'name code' }],
    softDelete: true,
  },
  {
    path: 'learning-materials',
    key: 'learning-materials',
    model: models.NoteTemplate,
    searchFields: ['title', 'description', 'content'],
    filterFields: ['subject', 'topic', 'format', 'isApproved', 'isPublished'],
    populate: [{ path: 'subject', select: 'name code' }],
    softDelete: true,
  },
  {
    path: 'exercises',
    key: 'exercises',
    model: models.CodingExercise,
    searchFields: ['title', 'description', 'problemStatement', 'tags'],
    filterFields: ['subject', 'unit', 'topic', 'difficulty', 'isPublished'],
    populate: [{ path: 'subject', select: 'name code' }],
    softDelete: true,
    omitFields: ['hiddenTestCases'],
    beforeCreate: (req, payload) => ({ createdBy: req.user._id, slug: payload.slug || slugify(payload.title) }),
    beforeUpdate: (_req, doc, payload) => {
      if (payload.title && !payload.slug) payload.slug = slugify(payload.title);
    },
  },
  {
    path: 'questions',
    key: 'questions',
    model: models.Question,
    searchFields: ['prompt', 'explanation', 'tags'],
    filterFields: ['subject', 'unit', 'topic', 'type', 'difficulty', 'isApproved', 'source', 'isActive'],
    populate: [{ path: 'subject', select: 'name code' }],
    softDelete: true,
    omitFields: ['correctOptionKeys', 'correctAnswerText', 'acceptedAnswers'],
    beforeCreate: (req) => ({ createdBy: req.user._id }),
  },
  {
    path: 'tests',
    key: 'tests',
    model: models.Test,
    searchFields: ['title', 'description'],
    filterFields: ['subject', 'semester', 'scope', 'isTemplate', 'isPublished'],
    populate: [
      { path: 'subject', select: 'name code' },
      { path: 'questions', select: 'prompt type difficulty marks' },
    ],
    softDelete: true,
    beforeCreate: (req) => ({ createdBy: req.user._id, isTemplate: true, student: null }),
  },
  {
    path: 'videos',
    key: 'videos',
    model: models.VideoResource,
    searchFields: ['title', 'description', 'channelTitle', 'tags'],
    filterFields: ['subject', 'topic', 'difficulty', 'isCurated', 'isAvailable'],
    populate: [{ path: 'subject', select: 'name code' }],
    softDelete: true,
    beforeCreate: (req) => ({ curatedBy: req.user._id, isCurated: true }),
  },
  {
    path: 'grading-schemes',
    key: 'grading-schemes',
    model: models.GradingScheme,
    searchFields: ['name', 'code', 'description'],
    filterFields: ['university', 'isActive', 'isDefault'],
    populate: [{ path: 'university', select: 'name code' }],
    beforeCreate: (req) => ({ createdBy: req.user._id }),
  },
];

for (const entry of registry) {
  const controller = createCrudController({
    model: entry.model,
    entityName: entry.path,
    label: entry.path.replace(/-/g, ' '),
    searchFields: entry.searchFields,
    filterFields: entry.filterFields,
    populate: entry.populate || [],
    sortableFields: entry.sortable || [],
    softDelete: Boolean(entry.softDelete),
    omitFields: entry.omitFields || [],
    beforeCreate: entry.beforeCreate,
    beforeUpdate: entry.beforeUpdate,
  });

  const sub = express.Router();
  const schema = entities[entry.key];
  sub.get('/', controller.list);
  sub.post('/', validate({ body: schema.create }), controller.create);
  sub.get('/:id', controller.getOne);
  sub.put('/:id', validate({ body: schema.update }), controller.update);
  sub.patch('/:id', validate({ body: schema.update }), controller.update);
  sub.delete('/:id', controller.remove);
  if (entry.softDelete) sub.post('/:id/restore', controller.restore);

  router.use(`/${entry.path}`, sub);
}

/* ----------------------------------------------------- settings & auditing --- */

router.get('/settings', adminController.listSettings);
router.put('/settings/:key', adminController.updateSettings);
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
