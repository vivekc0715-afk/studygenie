'use strict';

/**
 * Grade prediction.
 *
 * Produces an explainable, data-driven estimate of the final grade per subject
 * from real assessment history. Every factor that moves the estimate is
 * reported so the student can see exactly why the number looks the way it does.
 */

const {
  GradePrediction,
  SubjectPerformance,
  TopicPerformance,
  TestAttempt,
  GradingScheme,
  StudentEnrollment,
  StudentProfile,
  AcademicRegulation,
  Subject,
} = require('../../models');
const { getSetting } = require('../settingsService');
const logger = require('../../config/logger');

const MODEL_VERSION = 'baseline-v1';

/** Used when no grading scheme is configured for the student's regulation. */
const FALLBACK_BANDS = [
  { grade: 'O', minPercent: 90, maxPercent: 100, points: 10, description: 'Outstanding' },
  { grade: 'A+', minPercent: 80, maxPercent: 89.99, points: 9, description: 'Excellent' },
  { grade: 'A', minPercent: 70, maxPercent: 79.99, points: 8, description: 'Very good' },
  { grade: 'B+', minPercent: 60, maxPercent: 69.99, points: 7, description: 'Good' },
  { grade: 'B', minPercent: 50, maxPercent: 59.99, points: 6, description: 'Above average' },
  { grade: 'C', minPercent: 40, maxPercent: 49.99, points: 5, description: 'Average' },
  { grade: 'F', minPercent: 0, maxPercent: 39.99, points: 0, description: 'Needs improvement' },
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

/** Maps a percentage onto the grade band of the supplied scale. */
function gradeFor(percentage, bands) {
  const value = clamp(percentage);
  const match = bands.find((band) => value >= Number(band.minPercent) && value <= Number(band.maxPercent));
  if (match) return match;
  return [...bands].sort((a, b) => a.minPercent - b.minPercent)[0] || FALLBACK_BANDS[FALLBACK_BANDS.length - 1];
}

/** Sample-size based confidence, driven by the admin `grade_confidence` setting. */
function confidenceForSample(sampleSize, thresholds = { low: 1, medium: 3, high: 6 }) {
  if (sampleSize >= (thresholds.high || 6)) return 'high';
  if (sampleSize >= (thresholds.medium || 3)) return 'medium';
  if (sampleSize >= (thresholds.low || 1)) return 'low';
  return 'insufficient';
}

/** Trend adjustment in percentage points - conservative and bounded. */
function trendAdjustment(trend) {
  if (trend === 'improving') return 3;
  if (trend === 'declining') return -3;
  return 0;
}

async function resolveGradeBands(student) {
  let schemeId = student?.gradingScheme || null;

  if (!schemeId && student?._id) {
    const enrollment = await StudentEnrollment.findOne({ student: student._id, regulation: { $ne: null } })
      .select('regulation')
      .lean();
    if (enrollment?.regulation) {
      const regulation = await AcademicRegulation.findById(enrollment.regulation).select('gradingScheme').lean();
      schemeId = regulation?.gradingScheme || null;
    }
  }

  const scheme = await GradingScheme.findOne(schemeId ? { _id: schemeId } : { isDefault: true, isActive: true }).lean();

  const bands = (scheme?.gradeBands || []).filter((band) => band && band.grade);
  return {
    gradingSchemeId: scheme?._id || null,
    bands: bands.length ? bands : FALLBACK_BANDS,
    schemeName: scheme?.name || 'Default grade bands',
  };
}

/** Builds the recommendation list from measured weaknesses in this subject. */
async function recommendationsFor(studentId, subjectId, gapToTarget) {
  const weak = await TopicPerformance.find({
    student: studentId,
    subject: subjectId,
    attempts: { $gt: 0 },
    masteryLevel: { $in: ['critical', 'weak'] },
  })
    .populate('topic', 'title')
    .sort({ masteryScore: 1 })
    .limit(5)
    .lean({ virtuals: true });

  const recommendations = weak.map(
    (entry) =>
      `Revise "${entry.topic?.title || 'a weak topic'}" - measured mastery is ${Math.round(entry.masteryScore)}% from ${entry.attempts} answered question(s).`
  );

  if (gapToTarget > 0) {
    recommendations.push(
      `You are ${round1(gapToTarget)} percentage points below your target. Two focused practice tests per week is the fastest lever.`
    );
  }

  if (!recommendations.length) {
    recommendations.push('Keep going - no measured weak topics in this subject yet. Take a practice test to calibrate.');
  }

  return recommendations;
}

/**
 * Computes and persists the prediction for one subject.
 * @returns {Promise<object>} the persisted GradePrediction document.
 */
async function predictSubject(user, subjectId) {
  const [student, performance, subject, enrollment] = await Promise.all([
    StudentProfile.findOne({ user: user._id }).lean(),
    SubjectPerformance.findOne({ student: user._id, subject: subjectId }).lean(),
    Subject.findById(subjectId).select('name code examDate').lean(),
    StudentEnrollment.findOne({ student: user._id, subject: subjectId }).select('targetGrade examDate').lean(),
  ]);

  if (!subject) throw Object.assign(new Error('Subject not found.'), { statusCode: 404 });

  const attempts = await TestAttempt.find({
    student: user._id,
    subject: subjectId,
    status: { $in: ['submitted', 'expired'] },
  })
    .select('percentage')
    .sort({ submittedAt: 1 })
    .lean();

  const percentages = attempts.map((entry) => Number(entry.percentage) || 0);
  const sampleSize = percentages.length;

  const averageScore = percentages.length
    ? round1(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
    : round1(performance?.averageScore || 0);
  const latestScore = percentages.length ? round1(percentages[percentages.length - 1]) : 0;
  const bestScore = percentages.length ? round1(Math.max(...percentages)) : 0;

  const syllabusCompletion = round1(performance?.syllabusCompletion || 0);
  const codingSuccessRate = round1(performance?.codingSuccessRate || 0);
  const trend = performance?.trend || 'unknown';

  const thresholds = (await getSetting('grade_confidence', { low: 1, medium: 3, high: 6 })) || {
    low: 1,
    medium: 3,
    high: 6,
  };

  // Weighted blend: sustained average dominates, recent and practical work refine it.
  const coverageHeadroom = Math.min(10, ((100 - syllabusCompletion) / 100) * 10);
  const base =
    0.5 * averageScore +
    0.2 * latestScore +
    0.15 * bestScore +
    0.1 * codingSuccessRate +
    0.05 * (syllabusCompletion + coverageHeadroom);

  const estimatedFinalMarks = clamp(round1(base + trendAdjustment(trend)));
  const { gradingSchemeId, bands, schemeName } = await resolveGradeBands(student);
  const band = gradeFor(estimatedFinalMarks, bands);

  const confidence = confidenceForSample(sampleSize, thresholds);
  const insufficientData = sampleSize < (thresholds.low || 1);

  const targetGrade = enrollment?.targetGrade || student?.studyPreferences?.targetGrade || '';
  const targetPercentage = Number(student?.studyPreferences?.targetPercentage) || 0;
  const targetBand = targetGrade ? bands.find((entry) => entry.grade === targetGrade) : null;
  const gapToTarget = targetBand ? round1(targetBand.minPercent - estimatedFinalMarks) : 0;

  const contributingFactors = [
    { label: 'Average test score', detail: `${sampleSize} graded attempt(s)`, weight: 0.5, value: averageScore },
    { label: 'Most recent attempt', detail: 'Recency weighting', weight: 0.2, value: latestScore },
    { label: 'Personal best', detail: 'Demonstrated ceiling', weight: 0.15, value: bestScore },
    { label: 'Coding success rate', detail: 'Practical application', weight: 0.1, value: codingSuccessRate },
    { label: 'Syllabus coverage', detail: `${syllabusCompletion}% of topics covered`, weight: 0.05, value: syllabusCompletion },
    { label: 'Momentum', detail: `Trend: ${trend}`, weight: 0, value: trendAdjustment(trend) },
  ];

  const assumptions = [
    'Future tests are graded with the same difficulty mix as past attempts.',
    `Estimate is based on ${sampleSize} graded attempt(s)${insufficientData ? ' - take more tests to improve confidence.' : '.'}`,
    schemeName ? `Grade bands from: ${schemeName}.` : 'Using default grade bands.',
  ];

  const prediction = await GradePrediction.findOneAndUpdate(
    { student: user._id, subject: subjectId },
    {
      $set: {
        gradingScheme: gradingSchemeId,
        currentAverage: averageScore,
        estimatedFinalMarks: insufficientData ? averageScore : estimatedFinalMarks,
        estimatedGrade: insufficientData ? '' : band.grade,
        confidence,
        sampleSize,
        insufficientData,
        modelVersion: MODEL_VERSION,
        targetGrade,
        targetPercentage,
        gapToTarget,
        inputSnapshot: {
          percentages,
          syllabusCompletion,
          codingSuccessRate,
          trend,
          subjectName: subject.name,
        },
        contributingFactors,
        assumptions,
        recommendations: await recommendationsFor(user._id, subjectId, gapToTarget),
        computedAt: new Date(),
      },
      $setOnInsert: { student: user._id, subject: subjectId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('subject', 'name code color icon');

  return prediction;
}

/** Predicts every subject the student is enrolled in. */
async function predictAll(user) {
  const enrollments = await StudentEnrollment.find({ student: user._id, status: { $ne: 'dropped' } })
    .select('subject')
    .lean();

  const subjectIds = [...new Set(enrollments.map((entry) => String(entry.subject)))];
  const results = [];

  for (const subjectId of subjectIds) {
    try {
      results.push(await predictSubject(user, subjectId));
    } catch (error) {
      logger.warn('Unable to predict grade for subject', { subjectId, message: error.message });
    }
  }

  return results;
}

async function listPredictions(user) {
  return GradePrediction.find({ student: user._id })
    .populate('subject', 'name code color icon semesterNumber')
    .populate('gradingScheme', 'name code maxMarks passMark')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });
}

module.exports = {
  predictSubject,
  predictAll,
  listPredictions,
  gradeFor,
  confidenceForSample,
  FALLBACK_BANDS,
  MODEL_VERSION,
};
