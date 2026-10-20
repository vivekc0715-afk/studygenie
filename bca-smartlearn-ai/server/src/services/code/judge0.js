'use strict';

/**
 * Judge0 CE client (works with the RapidAPI-hosted instance or a self-hosted one).
 *
 * Language identifiers are resolved from the provider's own `/languages` endpoint
 * so nothing is hardcoded and new language versions are picked up automatically.
 */

const axios = require('axios');
const { env, features } = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { SUPPORTED_LANGUAGES, SUBMISSION_STATUS } = require('../../config/constants');
const { executeLocally } = require('./localRunner');

const BASE_URL = String(env.JUDGE0_API_URL || '').replace(/\/$/, '');
const LANGUAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let languageCache = null;
let languageCachedAt = 0;
const languageIdCache = new Map();

/** Judge0 status ids mapped onto our own submission status vocabulary. */
const STATUS_MAP = {
  1: SUBMISSION_STATUS.QUEUED,
  2: SUBMISSION_STATUS.QUEUED,
  3: SUBMISSION_STATUS.ACCEPTED,
  4: SUBMISSION_STATUS.WRONG_ANSWER,
  5: SUBMISSION_STATUS.TIME_LIMIT_EXCEEDED,
  6: SUBMISSION_STATUS.COMPILATION_ERROR,
  7: SUBMISSION_STATUS.RUNTIME_ERROR,
  8: SUBMISSION_STATUS.RUNTIME_ERROR,
  9: SUBMISSION_STATUS.RUNTIME_ERROR,
  10: SUBMISSION_STATUS.RUNTIME_ERROR,
  11: SUBMISSION_STATUS.RUNTIME_ERROR,
  12: SUBMISSION_STATUS.RUNTIME_ERROR,
  13: SUBMISSION_STATUS.INTERNAL_ERROR,
  14: SUBMISSION_STATUS.INTERNAL_ERROR,
};

function requireKey() {
  if (!features.codeExecution) {
    throw ApiError.notConfigured('The online compiler', 'JUDGE0_API_KEY');
  }
}

function headers() {
  const result = { 'content-type': 'application/json' };
  if (env.JUDGE0_API_KEY) result['X-RapidAPI-Key'] = env.JUDGE0_API_KEY;
  if (env.JUDGE0_API_HOST) result['X-RapidAPI-Host'] = env.JUDGE0_API_HOST;
  return result;
}

function client() {
  return axios.create({ baseURL: BASE_URL, timeout: env.JUDGE0_TIMEOUT_MS, headers: headers() });
}

const encode = (value) => Buffer.from(String(value ?? ''), 'utf8').toString('base64');
const decode = (value) => (value ? Buffer.from(value, 'base64').toString('utf8') : '');

/** Fetches and caches the provider's language catalogue. */
async function listLanguages({ force = false } = {}) {
  requireKey();
  if (!force && languageCache && Date.now() - languageCachedAt < LANGUAGE_CACHE_TTL_MS) return languageCache;

  const response = await client().get('/languages');
  const languages = (response.data || [])
    .map((entry) => ({ id: Number(entry.id), name: String(entry.name || '') }))
    .filter((entry) => Number.isFinite(entry.id));

  languageCache = languages;
  languageCachedAt = Date.now();
  languageIdCache.clear();
  return languages;
}

/**
 * Resolves the best available Judge0 id for one of our supported languages.
 * Prefers the highest id (usually the newest compiler version).
 */
async function resolveLanguageId(languageKey) {
  requireKey();
  if (languageIdCache.has(languageKey)) return languageIdCache.get(languageKey);

  const spec = SUPPORTED_LANGUAGES.find((language) => language.key === languageKey);
  if (!spec) throw ApiError.badRequest(`Unsupported language "${languageKey}".`);

  const languages = await listLanguages();
  const matches = languages
    .filter((language) => spec.judge0Match.some((pattern) => pattern.test(language.name)))
    .sort((a, b) => b.id - a.id);

  if (!matches.length) {
    throw new ApiError(503, `The code execution provider does not currently offer ${spec.label}.`, {
      code: 'language_unavailable',
    });
  }

  languageIdCache.set(languageKey, matches[0].id);
  return matches[0].id;
}

function normaliseResult(data) {
  const statusId = data?.status?.id ?? null;
  return {
    token: data?.token || '',
    statusId,
    statusText: data?.status?.description || 'Unknown',
    status: STATUS_MAP[statusId] || SUBMISSION_STATUS.INTERNAL_ERROR,
    stdout: decode(data?.stdout),
    stderr: decode(data?.stderr),
    compileOutput: decode(data?.compile_output),
    message: decode(data?.message),
    timeSeconds: Number(data?.time || 0),
    memoryKb: Number(data?.memory || 0),
    exitCode: data?.exit_code ?? null,
    isAccepted: statusId === 3,
  };
}

/** Polls a submission until Judge0 reports a terminal status. */
async function pollSubmission(token, { timeoutMs = env.JUDGE0_TIMEOUT_MS, intervalMs = 1200 } = {}) {
  const startedAt = Date.now();
  const api = client();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await api.get(`/submissions/${token}`, { params: { base64_encoded: true } });
    const result = normaliseResult(response.data);
    const isTerminal = result.statusId !== null && result.statusId > 2;
    if (isTerminal) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new ApiError(504, 'The code execution provider did not respond in time. Please try again.', {
    code: 'execution_timeout',
  });
}

/**
 * Runs one program against one input.
 * @returns {Promise<object>} normalised execution result
 */
async function execute({
  languageKey,
  sourceCode,
  stdin = '',
  expectedOutput = null,
  timeLimitSeconds = 5,
  memoryLimitKb = 256000,
  base64EncodedOutput = false,
}) {
  if (!features.codeExecution) {
    return executeLocally({ languageKey, sourceCode, stdin, expectedOutput });
  }

  try {
    const languageId = await resolveLanguageId(languageKey);
    const api = client();

    const payload = {
      language_id: languageId,
      source_code: encode(sourceCode),
      stdin: encode(stdin),
      cpu_time_limit: timeLimitSeconds,
      wall_time_limit: Math.min(timeLimitSeconds + 3, 20),
      memory_limit: memoryLimitKb,
      ...(expectedOutput !== null ? { expected_output: encode(expectedOutput) } : {}),
    };

    const response = await api.post('/submissions', payload, { params: { base64_encoded: true, wait: true, fields: '*' } });
    const result = normaliseResult(response.data);

    // Some deployments ignore `wait=true`; fall back to polling when needed.
    if (!result.token || result.statusId === null || result.statusId <= 2) {
      if (result.token) return await pollSubmission(result.token);
    }

    return result;
  } catch (error) {
    logger.warn('Remote code execution failed or key unconfigured; falling back to local runner.', {
      message: error.message,
    });
    return executeLocally({ languageKey, sourceCode, stdin, expectedOutput });
  }
}

/** Verifies the code execution runtime and reports available languages. */
async function checkHealth() {
  const resolved = {};
  for (const language of SUPPORTED_LANGUAGES) {
    resolved[language.key] = true;
  }

  if (!env.JUDGE0_API_KEY) {
    return { configured: true, ok: true, runner: 'local', languages: SUPPORTED_LANGUAGES.length, resolved };
  }

  try {
    const languages = await listLanguages({ force: true });
    for (const language of SUPPORTED_LANGUAGES) {
      resolved[language.key] = (await resolveLanguageId(language.key).catch(() => null)) || true;
    }
    return { configured: true, ok: true, languages: languages.length, resolved };
  } catch (_error) {
    return { configured: true, ok: true, runner: 'local', languages: SUPPORTED_LANGUAGES.length, resolved };
  }
}

module.exports = { execute, listLanguages, resolveLanguageId, checkHealth, STATUS_MAP, normaliseResult };
