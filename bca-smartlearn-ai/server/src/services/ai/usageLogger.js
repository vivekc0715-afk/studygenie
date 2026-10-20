'use strict';

const { AIUsageLog } = require('../../models');
const logger = require('../../config/logger');

/**
 * Indicative pricing (USD per 1M tokens) used only for the admin cost estimate.
 * Adjust via the `ai_pricing` application setting if your plan differs.
 */
const DEFAULT_PRICING = {
  input: 0.1,
  output: 0.4,
};

function estimateCost(promptTokens, completionTokens, pricing = DEFAULT_PRICING) {
  return Number(
    (((promptTokens || 0) / 1_000_000) * pricing.input + ((completionTokens || 0) / 1_000_000) * pricing.output).toFixed(6)
  );
}

/** Persists an AI call for usage dashboards. Never throws. */
async function logAIUsage({
  user = null,
  feature = 'notes',
  provider = 'gemini',
  model = '',
  promptTokens = 0,
  completionTokens = 0,
  latencyMs = 0,
  status = 'success',
  errorCode = '',
  requestSummary = '',
  pricing,
}) {
  try {
    await AIUsageLog.create({
      user: user ? user._id || user : null,
      feature,
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens: (promptTokens || 0) + (completionTokens || 0),
      estimatedCostUsd: estimateCost(promptTokens, completionTokens, pricing),
      latencyMs,
      status,
      errorCode,
      requestSummary: String(requestSummary).slice(0, 300),
    });
  } catch (error) {
    logger.warn('Unable to persist AI usage log', { message: error.message });
  }
}

module.exports = { logAIUsage, estimateCost, DEFAULT_PRICING };
