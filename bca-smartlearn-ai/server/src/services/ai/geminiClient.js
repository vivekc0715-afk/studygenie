'use strict';

const axios = require('axios');
const { env, features } = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Google Gemini REST client.
 *
 * Model identifiers are discovered from the provider at runtime instead of being
 * hardcoded, and the configured model is preferred when it is still available.
 */
let cachedModelIds = null;
let cachedAt = 0;
const MODEL_CACHE_TTL_MS = 30 * 60 * 1000;

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

function requireKey() {
  if (!features.ai) {
    throw ApiError.notConfigured('The AI assistant', 'GEMINI_API_KEY');
  }
}

async function discoverModels() {
  if (cachedModelIds && Date.now() - cachedAt < MODEL_CACHE_TTL_MS) return cachedModelIds;

  const response = await axios.get(`${API_ROOT}/models`, {
    params: { key: env.GEMINI_API_KEY, pageSize: 100 },
    timeout: 15000,
  });

  cachedModelIds = (response.data.models || [])
    .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
    .map((model) => String(model.name || '').replace(/^models\//, ''))
    .filter(Boolean);
  cachedAt = Date.now();
  return cachedModelIds;
}

async function resolveModelCandidates() {
  const candidates = [];
  if (env.GEMINI_MODEL) candidates.push(env.GEMINI_MODEL);

  try {
    const available = await discoverModels();
    if (available.includes(env.GEMINI_MODEL)) candidates.unshift(env.GEMINI_MODEL);
    for (const model of FALLBACK_MODELS) {
      if (available.includes(model)) candidates.push(model);
    }
    for (const model of available) {
      if (/flash/i.test(model) && !candidates.includes(model)) candidates.push(model);
    }
  } catch (error) {
    logger.warn('Could not discover Gemini models; using built-in fallbacks.', { message: error.message });
    candidates.push(...FALLBACK_MODELS);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function extractText(payload) {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('').trim();

  if (!text) {
    const blockReason = payload?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new ApiError(422, `The AI provider blocked this request (${blockReason}). Try rephrasing the topic.`);
    }
    throw ApiError.internal('The AI provider returned an empty response.');
  }
  return text;
}

function extractUsage(payload, model) {
  const usage = payload?.usageMetadata || {};
  return {
    model,
    promptTokens: usage.promptTokenCount || 0,
    completionTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
  };
}

async function callModel(model, body, timeoutMs) {
  const startedAt = Date.now();
  const response = await axios.post(`${API_ROOT}/models/${model}:generateContent`, body, {
    params: { key: env.GEMINI_API_KEY },
    timeout: timeoutMs,
    headers: { 'content-type': 'application/json' },
  });
  return { payload: response.data, latencyMs: Date.now() - startedAt };
}

/**
 * Generates content with automatic model fallback, retry on transient errors,
 * and structured token accounting.
 */
async function generate({
  prompt,
  systemInstruction = '',
  json = false,
  temperature = 0.6,
  maxOutputTokens = 4096,
  timeoutMs = env.GEMINI_TIMEOUT_MS,
}) {
  requireKey();

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    safetySettings: [],
  };

  const candidates = (await resolveModelCandidates()).slice(0, 4);
  let lastError = null;

  for (const model of candidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { payload, latencyMs } = await callModel(model, body, timeoutMs);
        return { text: extractText(payload), ...extractUsage(payload, model), latencyMs };
      } catch (error) {
        lastError = error;
        const status = error.response?.status;

        if (error instanceof ApiError) throw error;

        if (status === 404) break; // model retired -> move to the next candidate
        if (status === 400) {
          const detail = error.response?.data?.error?.message || 'invalid request';
          throw ApiError.badRequest(`The AI provider rejected the request: ${detail}`);
        }
        if (status === 403 || status === 401) {
          throw new ApiError(502, 'The configured Gemini API key was rejected. Check GEMINI_API_KEY in server/.env.', {
            code: 'ai_auth_failed',
          });
        }
        if (status === 429) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          throw ApiError.tooMany('The AI provider quota has been reached. Please try again in a moment.');
        }
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
      }
    }
  }

  logger.error('Gemini generation failed for all candidate models', { message: lastError?.message });
  throw new ApiError(502, 'The AI assistant is temporarily unavailable. Please try again.', {
    code: 'ai_unavailable',
  });
}

/** Generates content and parses it as JSON, tolerating markdown code fences. */
async function generateJson(options) {
  const result = await generate({ ...options, json: true });
  return { ...result, data: parseJsonLoose(result.text) };
}

function parseJsonLoose(text) {
  const cleaned = String(text)
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const firstBrace = cleaned.search(/[[{]/);
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch (_inner) {
        /* fall through */
      }
    }
    throw new ApiError(502, 'The AI returned a response that could not be parsed. Please try again.', {
      code: 'ai_bad_payload',
    });
  }
}

/** Health probe used by the admin dashboard. */
async function checkHealth() {
  if (!features.ai) return { configured: false, ok: false, models: [] };
  try {
    const models = await discoverModels();
    return { configured: true, ok: models.length > 0, configuredModel: env.GEMINI_MODEL, models: models.slice(0, 12) };
  } catch (error) {
    return { configured: true, ok: false, error: error.message, models: [] };
  }
}

module.exports = { generate, generateJson, checkHealth, parseJsonLoose, resolveModelCandidates };
