'use strict';

const mongoose = require('mongoose');
const {
  User,
  StudentProfile,
  StudentEnrollment,
  University,
  College,
  AcademicProgram,
  AcademicRegulation,
  Semester,
  Subject,
  Unit,
  Topic,
  Syllabus,
  Note,
  CodingExercise,
  CodingSubmission,
  Question,
  Test,
  TestAttempt,
  VideoResource,
  AIUsageLog,
  AuditLog,
  ApplicationSetting,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');
const { recordAudit } = require('../services/auditService');
const { setSetting, ensureDefaultSettings } = require('../services/settingsService');
const gemini = require('../services/ai/geminiClient');
const { features, env } = require('../config/env');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------------------------------------- students --- */

const listStudents = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { role: ROLES.STUDENT };
  if (query.status) filter.status = query.status;
  if (query.includeDeleted === 'true') {
    if (query.onlyDeleted === 'true') filter.deletedAt = { $ne: null };
  } else {
    filter.deletedAt = null;
  }
  if (query.emailVerified === 'true') filter.emailVerified = true;
  if (query.emailVerified === 'false') filter.emailVerified = false;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const sortField = ['name', 'email', 'createdAt', 'lastLoginAt', 'status'].includes(query.sortBy)
    ? query.sortBy
    : 'createdAt';
  const sortDirection = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;

  const [students, total] = await Promise.all([
    User.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    User.countDocuments(filter),
  ]);

  return ok(res, students, buildMeta({ page, limit, total }));
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: ROLES.STUDENT });
  if (!student) throw ApiError.notFound('Student account not found.');

  const [profile, enrollments, attempts, submissions, notes] = await Promise.all([
    StudentProfile.findOne({ user: student._id })
      .populate('university', 'name code')
      .populate('program', 'name code')
      .populate('regulation', 'name code year')
      .lean({ virtuals: true }),
    StudentEnrollment.find({ student: student._id }).populate('subject', 'name code').lean({ virtuals: true }),
    TestAttempt.countDocuments({ student: student._id, status: 'submitted' }),
    CodingSubmission.countDocuments({ student: student._id, isRunOnly: false }),
    Note.countDocuments({ student: student._id }),
  ]);

  return ok(res, {
    student: student.toJSON(),
    profile,
    enrollments,
    activity: { attempts, submissions, notes },
  });
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: ROLES.STUDENT });
  if (!student) throw ApiError.notFound('Student account not found.');

  const before = student.toJSON();
  const { name, status, suspendedReason, emailVerified, role } = req.body;

  if (name !== undefined) student.name = name;
  if (status !== undefined) student.status = status;
  if (suspendedReason !== undefined) student.suspendedReason = suspendedReason;
  if (emailVerified !== undefined) student.emailVerified = Boolean(emailVerified);
  if (role !== undefined && Object.values(ROLES).includes(role)) student.role = role;

  await student.save();

  await recordAudit({
    actor: req.user,
    action: 'students.update',
    entityType: 'User',
    entityId: student._id,
    before,
    after: student.toJSON(),
    req,
  });

  return ok(res, student.toJSON());
});

const setStudentStatus = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: ROLES.STUDENT });
  if (!student) throw ApiError.notFound('Student account not found.');

  const { status, reason = '' } = req.body;
  if (![ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.SUSPENDED, ACCOUNT_STATUS.PENDING].includes(status)) {
    throw ApiError.badRequest('Unsupported account status.');
  }

  student.status = status;
  student.suspendedReason = status === ACCOUNT_STATUS.SUSPENDED ? reason : '';
  await student.save();

  await recordAudit({
    actor: req.user,
    action: status === ACCOUNT_STATUS.SUSPENDED ? 'students.suspend' : 'students.activate',
    entityType: 'User',
    entityId: student._id,
    description: reason,
    severity: 'warning',
    req,
  });

  return ok(res, student.toJSON());
});

/** Soft-deletes an account so assessment history remains auditable. */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: ROLES.STUDENT });
  if (!student) throw ApiError.notFound('Student account not found.');

  student.deletedAt = new Date();
  student.status = ACCOUNT_STATUS.DELETED;
  await student.save();

  await recordAudit({
    actor: req.user,
    action: 'students.delete',
    entityType: 'User',
    entityId: student._id,
    description: 'Soft-deleted. Academic history retained for reporting.',
    severity: 'critical',
    req,
  });

  return ok(res, { id: String(student._id), deleted: true });
});

const restoreStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: ROLES.STUDENT, deletedAt: { $ne: null } });
  if (!student) throw ApiError.notFound('No deleted student account with that id.');

  student.deletedAt = null;
  student.status = ACCOUNT_STATUS.ACTIVE;
  await student.save();

  await recordAudit({
    actor: req.user,
    action: 'students.restore',
    entityType: 'User',
    entityId: student._id,
    req,
  });

  return ok(res, student.toJSON());
});

/* ------------------------------------------------------------ dashboard --- */

const dashboard = asyncHandler(async (_req, res) => {
  const notDeletedStudent = { role: ROLES.STUDENT, deletedAt: null };

  const [
    totalStudents,
    activeStudents,
    suspendedStudents,
    pendingStudents,
    verifiedStudents,
    universityCount,
    collegeCount,
    programCount,
    regulationCount,
    semesterCount,
    subjectCount,
    unitCount,
    topicCount,
    syllabusCount,
    noteCount,
    exerciseCount,
    questionCount,
    testCount,
    attemptCount,
    submissionCount,
    curatedVideoCount,
    aiUsage,
    recentErrors,
    languageUsage,
    popularSubjects,
    averagePerformance,
    newStudentsThisWeek,
  ] = await Promise.all([
    User.countDocuments(notDeletedStudent),
    User.countDocuments({ ...notDeletedStudent, status: ACCOUNT_STATUS.ACTIVE }),
    User.countDocuments({ ...notDeletedStudent, status: ACCOUNT_STATUS.SUSPENDED }),
    User.countDocuments({ ...notDeletedStudent, status: ACCOUNT_STATUS.PENDING }),
    User.countDocuments({ ...notDeletedStudent, emailVerified: true }),
    University.countDocuments({ isActive: true }),
    College.countDocuments({ isActive: true }),
    AcademicProgram.countDocuments({ isActive: true }),
    AcademicRegulation.countDocuments({ isActive: true }),
    Semester.countDocuments({ isActive: true }),
    Subject.countDocuments({ isActive: true }),
    Unit.countDocuments({ isActive: true }),
    Topic.countDocuments({ isActive: true }),
    Syllabus.countDocuments({ isPublished: true }),
    Note.countDocuments({}),
    CodingExercise.countDocuments({ isPublished: true }),
    Question.countDocuments({ isActive: true }),
    Test.countDocuments({}),
    TestAttempt.countDocuments({ status: 'submitted' }),
    CodingSubmission.countDocuments({ isRunOnly: false }),
    VideoResource.countDocuments({ isCurated: true }),
    AIUsageLog.aggregate([
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          promptTokens: { $sum: '$promptTokens' },
          completionTokens: { $sum: '$completionTokens' },
          cost: { $sum: '$estimatedCostUsd' },
          avgLatency: { $avg: '$latencyMs' },
        },
      },
    ]),
    AuditLog.find({ severity: { $in: ['warning', 'critical'] } }).sort({ createdAt: -1 }).limit(8).lean({ virtuals: true }),
    CodingSubmission.aggregate([
      { $match: { isRunOnly: false } },
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    StudentEnrollment.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: { $ifNull: ['$subject.name', 'Unknown subject'] }, count: 1 } },
    ]),
    TestAttempt.aggregate([
      { $match: { status: 'submitted' } },
      { $group: { _id: null, average: { $avg: '$percentage' }, attempts: { $sum: 1 } } },
    ]),
    User.countDocuments({
      ...notDeletedStudent,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const usage = aiUsage[0] || { calls: 0, promptTokens: 0, completionTokens: 0, cost: 0, avgLatency: 0 };
  const performance = averagePerformance[0] || { average: 0, attempts: 0 };

  return ok(res, {
    students: {
      total: totalStudents,
      active: activeStudents,
      suspended: suspendedStudents,
      pending: pendingStudents,
      verified: verifiedStudents,
      newThisWeek: newStudentsThisWeek,
    },
    academics: {
      universities: universityCount,
      colleges: collegeCount,
      programs: programCount,
      regulations: regulationCount,
      semesters: semesterCount,
      subjects: subjectCount,
      units: unitCount,
      topics: topicCount,
      syllabi: syllabusCount,
    },
    content: {
      notes: noteCount,
      exercises: exerciseCount,
      questions: questionCount,
      tests: testCount,
      curatedVideos: curatedVideoCount,
    },
    activity: {
      testsAttempted: attemptCount,
      compilerSubmissions: submissionCount,
      averageTestPercentage: Math.round((performance.average || 0) * 10) / 10,
      languages: languageUsage.map((entry) => ({ language: entry._id, count: entry.count })),
      popularSubjects,
    },
    ai: {
      calls: usage.calls,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      estimatedCostUsd: Math.round((usage.cost || 0) * 10000) / 10000,
      averageLatencyMs: Math.round(usage.avgLatency || 0),
    },
    recentErrors,
    system: {
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      features,
    },
  });
});

/* ------------------------------------------------------------ audit logs --- */

const listAuditLogs = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  if (query.action) filter.action = new RegExp(escapeRegex(query.action), 'i');
  if (query.entityType) filter.entityType = query.entityType;
  if (query.severity) filter.severity = query.severity;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ actorEmail: regex }, { action: regex }, { description: regex }];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    AuditLog.countDocuments(filter),
  ]);

  return ok(res, logs, buildMeta({ page, limit, total }));
});

/* -------------------------------------------------------------- settings --- */

const listSettings = asyncHandler(async (_req, res) => {
  await ensureDefaultSettings();
  const settings = await ApplicationSetting.find({}).sort({ category: 1, key: 1 }).lean({ virtuals: true });
  return ok(res, settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) throw ApiError.badRequest('A value is required.');

  const existing = await ApplicationSetting.findOne({ key });
  if (!existing) throw ApiError.notFound(`Setting "${key}" does not exist.`);

  const before = existing.value;
  const updated = await setSetting(key, value, { updatedBy: req.user._id });

  await recordAudit({
    actor: req.user,
    action: 'settings.update',
    entityType: 'ApplicationSetting',
    entityId: existing._id,
    before,
    after: value,
    severity: 'warning',
    req,
  });

  return ok(res, updated);
});

/* ---------------------------------------------------------- system health --- */

const systemHealth = asyncHandler(async (_req, res) => {
  const ai = await gemini.checkHealth();
  return ok(res, {
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name,
    },
    features,
    integrations: { ai },
  });
});

module.exports = {
  listStudents,
  getStudent,
  updateStudent,
  setStudentStatus,
  deleteStudent,
  restoreStudent,
  dashboard,
  listAuditLogs,
  listSettings,
  updateSettings,
  systemHealth,
  _models: {
    User,
    University,
    College,
    AcademicProgram,
    AcademicRegulation,
    Semester,
    Subject,
    Unit,
    Topic,
    Syllabus,
    Note,
    CodingExercise,
    Question,
    Test,
    VideoResource,
    ApplicationSetting,
  },
};
