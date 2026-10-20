'use strict';

const mongoose = require('mongoose');
const { serializePlugin, softDeletePlugin } = require('./plugins');
const { DIFFICULTY_LEVELS } = require('../config/constants');

const { Schema } = mongoose;

/* ------------------------------------------------------------ University --- */

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 24 },
    shortName: { type: String, default: '', trim: true },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    website: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
universitySchema.plugin(serializePlugin);
universitySchema.plugin(softDeletePlugin);
universitySchema.index({ name: 'text', code: 'text' });

/* --------------------------------------------------------------- College --- */

const collegeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 24 },
    university: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    website: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
collegeSchema.plugin(serializePlugin);
collegeSchema.plugin(softDeletePlugin);
collegeSchema.index({ university: 1, name: 1 });

/* ------------------------------------------------------- AcademicProgram --- */

const academicProgramSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 24 },
    degree: { type: String, default: 'BCA' },
    university: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    durationSemesters: { type: Number, min: 1, max: 12, default: 6 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
academicProgramSchema.plugin(serializePlugin);
academicProgramSchema.plugin(softDeletePlugin);
academicProgramSchema.index({ university: 1, code: 1 }, { unique: true });

/* --------------------------------------------------- AcademicRegulation --- */

const academicRegulationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    code: { type: String, required: true, trim: true, maxlength: 32 },
    program: { type: Schema.Types.ObjectId, ref: 'AcademicProgram', required: true, index: true },
    university: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    year: { type: Number, min: 1990, max: 2100, required: true },
    effectiveFrom: { type: Date, default: null },
    totalSemesters: { type: Number, min: 1, max: 12, default: 6 },
    gradingScheme: { type: Schema.Types.ObjectId, ref: 'GradingScheme', default: null },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
academicRegulationSchema.plugin(serializePlugin);
academicRegulationSchema.plugin(softDeletePlugin);
academicRegulationSchema.index({ program: 1, code: 1, year: 1 }, { unique: true });

/* ------------------------------------------------------------- Semester --- */

const semesterSchema = new Schema(
  {
    regulation: { type: Schema.Types.ObjectId, ref: 'AcademicRegulation', required: true, index: true },
    number: { type: Number, required: true, min: 1, max: 12 },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
semesterSchema.plugin(serializePlugin);
semesterSchema.plugin(softDeletePlugin);
semesterSchema.index({ regulation: 1, number: 1 }, { unique: true });

/* -------------------------------------------------------------- Subject --- */

const markingSchemeSchema = new Schema(
  {
    theory: { type: Number, default: 70 },
    internal: { type: Number, default: 30 },
    practical: { type: Number, default: 0 },
    total: { type: Number, default: 100 },
  },
  { _id: false }
);

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, default: '', uppercase: true, trim: true, maxlength: 32 },
    shortName: { type: String, default: '' },
    description: { type: String, default: '' },

    regulation: { type: Schema.Types.ObjectId, ref: 'AcademicRegulation', default: null, index: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', default: null, index: true },
    semesterNumber: { type: Number, min: 1, max: 12, default: 1, index: true },
    university: { type: Schema.Types.ObjectId, ref: 'University', default: null, index: true },

    credits: { type: Number, min: 0, max: 20, default: 4 },
    type: { type: String, enum: ['theory', 'practical', 'both'], default: 'theory' },
    recommendedStudyHours: { type: Number, min: 0, default: 40 },
    learningObjectives: { type: [String], default: [] },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    markingScheme: { type: markingSchemeSchema, default: () => ({}) },
    examDate: { type: Date, default: null },
    color: { type: String, default: '' },
    icon: { type: String, default: '' },
    tags: { type: [String], default: [] },

    /** Custom subjects created by a student are owned by that student and hidden from others. */
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isTemplate: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
subjectSchema.plugin(serializePlugin);
subjectSchema.plugin(softDeletePlugin);
subjectSchema.index({ semester: 1, owner: 1, isActive: 1 });
subjectSchema.index({ name: 'text', code: 'text', description: 'text' });

/* ----------------------------------------------------------------- Unit --- */

const unitSchema = new Schema(
  {
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    number: { type: Number, required: true, min: 1, max: 30 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    recommendedHours: { type: Number, min: 0, default: 8 },
    weightage: { type: Number, min: 0, max: 100, default: 0 },
    learningObjectives: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
unitSchema.plugin(serializePlugin);
unitSchema.plugin(softDeletePlugin);
unitSchema.index({ subject: 1, number: 1 }, { unique: true });

/* ---------------------------------------------------------------- Topic --- */

const topicSchema = new Schema(
  {
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    number: { type: Number, default: 1 },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: 'medium', index: true },
    learningObjectives: { type: [String], default: [] },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    recommendedMinutes: { type: Number, min: 5, default: 45 },
    keywords: { type: [String], default: [] },
    resources: [
      {
        title: String,
        url: String,
        kind: { type: String, enum: ['article', 'video', 'pdf', 'link'], default: 'link' },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
topicSchema.plugin(serializePlugin);
topicSchema.plugin(softDeletePlugin);
topicSchema.index({ subject: 1, unit: 1, number: 1 });
topicSchema.index({ title: 'text', description: 'text', keywords: 'text' });

/* -------------------------------------------------------------- Syllabus --- */

const syllabusSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    regulation: { type: Schema.Types.ObjectId, ref: 'AcademicRegulation', default: null, index: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', default: null, index: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    version: { type: String, default: '1.0' },
    source: { type: String, enum: ['admin', 'student'], default: 'admin' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isTemplate: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
syllabusSchema.plugin(serializePlugin);
syllabusSchema.plugin(softDeletePlugin);

/* ----------------------------------------------------- StudentEnrollment --- */

const studentEnrollmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', default: null },
    regulation: { type: Schema.Types.ObjectId, ref: 'AcademicRegulation', default: null },
    academicYear: { type: String, default: '' },
    status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active', index: true },
    isCustom: { type: Boolean, default: false },
    credits: { type: Number, min: 0, max: 20, default: 4 },
    examDate: { type: Date, default: null },
    targetGrade: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);
studentEnrollmentSchema.plugin(serializePlugin);
studentEnrollmentSchema.index({ student: 1, subject: 1, academicYear: 1 }, { unique: true });

module.exports = {
  University: mongoose.models.University || mongoose.model('University', universitySchema),
  College: mongoose.models.College || mongoose.model('College', collegeSchema),
  AcademicProgram: mongoose.models.AcademicProgram || mongoose.model('AcademicProgram', academicProgramSchema),
  AcademicRegulation:
    mongoose.models.AcademicRegulation || mongoose.model('AcademicRegulation', academicRegulationSchema),
  Semester: mongoose.models.Semester || mongoose.model('Semester', semesterSchema),
  Subject: mongoose.models.Subject || mongoose.model('Subject', subjectSchema),
  Unit: mongoose.models.Unit || mongoose.model('Unit', unitSchema),
  Topic: mongoose.models.Topic || mongoose.model('Topic', topicSchema),
  Syllabus: mongoose.models.Syllabus || mongoose.model('Syllabus', syllabusSchema),
  StudentEnrollment:
    mongoose.models.StudentEnrollment || mongoose.model('StudentEnrollment', studentEnrollmentSchema),
};
