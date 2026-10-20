'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const predictionService = require('../services/prediction/gradePredictionService');

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

/** Grade scale + model info so the client can render bands without hardcoding. */
const meta = asyncHandler(async (_req, res) =>
  ok(res, { gradeBands: predictionService.FALLBACK_BANDS, modelVersion: predictionService.MODEL_VERSION })
);

const list = asyncHandler(async (req, res) => ok(res, await predictionService.listPredictions(req.user)));

/** Recomputes predictions for every enrolled subject. */
const computeAll = asyncHandler(async (req, res) => ok(res, await predictionService.predictAll(req.user)));

const computeOne = asyncHandler(async (req, res) => {
  assertObjectId(req.params.subjectId, 'subject id');
  const prediction = await predictionService.predictSubject(req.user, req.params.subjectId);
  return ok(res, prediction);
});

module.exports = { meta, list, computeAll, computeOne };
