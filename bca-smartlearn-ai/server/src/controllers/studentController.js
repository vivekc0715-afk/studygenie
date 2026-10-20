'use strict';

const {
  StudentProfile,
  StudentEnrollment,
  Subject,
  Unit,
  Topic,
  TopicPerformance,
  Semester,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { ACCOUNT_STATUS } = require('../config/constants');

async function getOrCreateProfile(userId) {
  let profile = await StudentProfile.findOne({ user: userId });
  if (!profile) profile = await StudentProfile.create({ user: userId });
  return profile;
}

const POPULATE = [
  { path: 'university', select: 'name code shortName city state' },
  { path: 'college', select: 'name code city' },
  { path: 'program', select: 'name code degree durationSemesters' },
  { path: 'regulation', select: 'name code year totalSemesters' },
  { path: 'gradingScheme', select: 'name code maxMarks passMark gradeBands internalWeight externalWeight' },
];

const getProfile = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  await profile.populate(POPULATE);
  const enrollmentCount = await StudentEnrollment.countDocuments({ student: req.user._id, status: 'active' });
  return ok(res, { profile, enrollmentCount });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const payload = { ...req.body };

  if (payload.studyPreferences) {
    payload.studyPreferences = { ...profile.studyPreferences.toObject(), ...payload.studyPreferences };
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    profile[key] = value;
  });

  if (payload.university && payload.university !== String(profile.university)) {
    if (payload.college === undefined) profile.college = null;
    if (payload.program === undefined) profile.program = null;
    if (payload.regulation === undefined) profile.regulation = null;
  }

  await profile.save();
  await profile.populate(POPULATE);
  return ok(res, { profile });
});

/** Completes the onboarding wizard and generates the student's first study plan. */
const completeOnboarding = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);

  const enrollmentCount = await StudentEnrollment.countDocuments({ student: req.user._id, status: 'active' });
  if (enrollmentCount === 0) {
    throw ApiError.badRequest('Add at least one subject before finishing onboarding.');
  }

  profile.onboardingCompleted = true;
  profile.onboardingStep = 4;
  await profile.save();

  if (req.user.status === ACCOUNT_STATUS.PENDING) {
    req.user.status = ACCOUNT_STATUS.ACTIVE;
    await req.user.save();
  }

  let studyPlan = null;
  try {
    // Imported lazily so the planner can evolve without affecting onboarding.
    const { generateStudyPlan } = require('../services/planner/studyPlanner');
    studyPlan = await generateStudyPlan(req.user, { replace: true });
  } catch (error) {
    req.log?.warn?.('Study plan generation failed during onboarding');
  }

  await profile.populate(POPULATE);
  return ok(res, { profile, studyPlan, onboardingCompleted: true });
});

/* ------------------------------------------------------------- enrolments --- */

const listEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await StudentEnrollment.find({ student: req.user._id })
    .populate({
      path: 'subject',
      select: 'name code credits type semesterNumber examDate color icon recommendedStudyHours owner',
    })
    .populate('semester', 'number title')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  return ok(res, enrollments);
});

/** Enrol in library subjects and/or create a fully custom subject with units. */
const addEnrollments = asyncHandler(async (req, res) => {
  const { subjectIds = [], subject, semester, regulation, academicYear, credits, examDate, targetGrade, notes, customSubject } =
    req.body;

  const profile = await getOrCreateProfile(req.user._id);
  const createdEnrollments = [];

  const ids = subjectIds.length ? subjectIds : subject ? [subject] : [];

  for (const subjectId of ids) {
    const found = await Subject.findById(subjectId);
    if (!found) continue;
    if (found.owner && String(found.owner) !== String(req.user._id)) continue;

    const enrollment = await StudentEnrollment.findOneAndUpdate(
      { student: req.user._id, subject: subjectId, academicYear: academicYear || '' },
      {
        $setOnInsert: {
          student: req.user._id,
          subject: subjectId,
          semester: semester || found.semester || null,
          regulation: regulation || found.regulation || null,
          academicYear: academicYear || '',
          credits: credits ?? found.credits,
          examDate: examDate || found.examDate || null,
          targetGrade: targetGrade || profile.studyPreferences.targetGrade || '',
          notes: notes || '',
        },
      },
      { new: true, upsert: true }
    );
    createdEnrollments.push(enrollment);
  }

  if (customSubject) {
    const { name, code, credits: customCredits, semesterNumber, description, units = [] } = customSubject;

    const newSubject = await Subject.create({
      name,
      code: code || '',
      description: description || '',
      owner: req.user._id,
      createdBy: req.user._id,
      isTemplate: false,
      isPublished: false,
      credits: customCredits ?? credits ?? 4,
      semesterNumber: semesterNumber ?? profile.currentSemesterNumber,
      semester: semester || null,
      regulation: regulation || profile.regulation || null,
      university: profile.university || null,
    });

    let unitNumber = 1;
    for (const unitPayload of units) {
      const unit = await Unit.create({
        subject: newSubject._id,
        number: unitNumber,
        title: unitPayload.title,
        description: unitPayload.description || '',
      });
      let topicNumber = 1;
      for (const topicPayload of unitPayload.topics || []) {
        await Topic.create({
          subject: newSubject._id,
          unit: unit._id,
          number: topicNumber,
          title: topicPayload.title,
          description: topicPayload.description || '',
        });
        topicNumber += 1;
      }
      unitNumber += 1;
    }

    const enrollment = await StudentEnrollment.create({
      student: req.user._id,
      subject: newSubject._id,
      semester: semester || null,
      regulation: regulation || profile.regulation || null,
      academicYear: academicYear || '',
      isCustom: true,
      credits: newSubject.credits,
      examDate: examDate || null,
      targetGrade: targetGrade || '',
      notes: notes || '',
    });
    createdEnrollments.push(enrollment);
  }

  if (!createdEnrollments.length) {
    throw ApiError.badRequest('Select at least one subject or provide a custom subject to add.');
  }

  const hydrated = await StudentEnrollment.find({ _id: { $in: createdEnrollments.map((e) => e._id) } })
    .populate('subject', 'name code credits type semesterNumber examDate color icon')
    .lean({ virtuals: true });

  return created(res, hydrated);
});

const updateEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await StudentEnrollment.findOne({ _id: req.params.id, student: req.user._id });
  if (!enrollment) throw ApiError.notFound('Enrolment not found.');

  Object.entries(req.body).forEach(([key, value]) => {
    if (value !== undefined) enrollment[key] = value;
  });
  await enrollment.save();

  const hydrated = await StudentEnrollment.findById(enrollment._id)
    .populate('subject', 'name code credits type semesterNumber examDate color icon')
    .lean({ virtuals: true });
  return ok(res, hydrated);
});

const removeEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await StudentEnrollment.findOne({ _id: req.params.id, student: req.user._id });
  if (!enrollment) throw ApiError.notFound('Enrolment not found.');

  // Custom subjects belong to the student, so remove the whole tree with the enrolment.
  const subject = await Subject.findById(enrollment.subject);
  if (subject && subject.owner && String(subject.owner) === String(req.user._id)) {
    await Topic.deleteMany({ subject: subject._id });
    await Unit.deleteMany({ subject: subject._id });
    await Subject.deleteOne({ _id: subject._id });
  }

  await enrollment.deleteOne();
  return ok(res, { id: String(enrollment._id), removed: true });
});

/** Enrolled subjects with their unit/topic tree and completion state. */
const mySubjects = asyncHandler(async (req, res) => {
  const enrollments = await StudentEnrollment.find({ student: req.user._id, status: { $ne: 'dropped' } })
    .populate('subject')
    .sort({ createdAt: 1 });

  const subjectIds = enrollments.map((enrollment) => enrollment.subject?._id).filter(Boolean);
  const [units, topics, progress] = await Promise.all([
    Unit.find({ subject: { $in: subjectIds }, isActive: true }).sort({ number: 1 }).lean({ virtuals: true }),
    Topic.find({ subject: { $in: subjectIds }, isActive: true }).sort({ number: 1 }).lean({ virtuals: true }),
    TopicPerformance.find({ student: req.user._id, subject: { $in: subjectIds } }).lean({ virtuals: true }),
  ]);

  const progressByTopic = new Map(progress.map((entry) => [String(entry.topic), entry]));

  const data = enrollments
    .filter((enrollment) => enrollment.subject)
    .map((enrollment) => {
      const subjectId = String(enrollment.subject._id);
      const subjectUnits = units.filter((unit) => String(unit.subject) === subjectId);
      const subjectTopics = topics.filter((topic) => String(topic.subject) === subjectId);
      const completed = subjectTopics.filter((topic) => progressByTopic.get(String(topic._id))?.isCompleted).length;

      return {
        enrollment: enrollment.toJSON(),
        subject: enrollment.subject.toJSON(),
        units: subjectUnits.map((unit) => ({
          ...unit,
          topics: subjectTopics
            .filter((topic) => String(topic.unit) === String(unit._id))
            .map((topic) => ({
              ...topic,
              progress: progressByTopic.get(String(topic._id)) || null,
            })),
        })),
        stats: {
          topicCount: subjectTopics.length,
          completedTopics: completed,
          completionPercent: subjectTopics.length ? Math.round((completed / subjectTopics.length) * 100) : 0,
        },
      };
    });

  return ok(res, data);
});

/** Marks a topic as covered (drives syllabus completion analytics). */
const setTopicCompletion = asyncHandler(async (req, res) => {
  const { topicId } = req.params;
  const { completed = true, minutes = 0 } = req.body;

  const topic = await Topic.findById(topicId);
  if (!topic) throw ApiError.notFound('Topic not found.');

  const enrolled = await StudentEnrollment.exists({ student: req.user._id, subject: topic.subject });
  if (!enrolled) throw ApiError.forbidden('You are not enrolled in this subject.');

  const update = {
    $set: {
      isCompleted: Boolean(completed),
      completedAt: completed ? new Date() : null,
    },
    $setOnInsert: { student: req.user._id, topic: topic._id, subject: topic.subject, unit: topic.unit },
  };
  if (minutes) update.$inc = { timeSpentMinutes: Number(minutes) };

  const record = await TopicPerformance.findOneAndUpdate(
    { student: req.user._id, topic: topic._id },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return ok(res, record);
});

module.exports = {
  getProfile,
  updateProfile,
  completeOnboarding,
  listEnrollments,
  addEnrollments,
  updateEnrollment,
  removeEnrollment,
  mySubjects,
  setTopicCompletion,
};
