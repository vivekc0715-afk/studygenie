'use strict';

const ApiError = require('../utils/ApiError');
const { env, isProduction } = require('../config/env');

const DANGEROUS_KEY = /(^\$)|(\.)/;

/**
 * Recursively strips MongoDB operator keys ($gt, $ne, ...) and dotted keys from
 * user-supplied objects, preventing NoSQL operator injection.
 */
function sanitizeValue(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));

  const clean = {};
  for (const [key, nested] of Object.entries(value)) {
    if (DANGEROUS_KEY.test(key)) continue;
    clean[key] = sanitizeValue(nested, depth + 1);
  }
  return clean;
}

function mongoSanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  if (req.params && typeof req.params === 'object') req.params = sanitizeValue(req.params);
  if (req.query && typeof req.query === 'object') {
    try {
      Object.assign(req.query, sanitizeValue({ ...req.query }));
    } catch (_error) {
      // req.query is read-only on some Express versions; ignored.
    }
  }
  next();
}

function normaliseOrigin(origin) {
  return String(origin || '').trim().replace(/\/$/, '');
}

/** Public host serving the current request (Vercel terminates TLS upstream). */
function requestHost(req) {
  const forwarded = req.get('x-forwarded-host');
  return (forwarded || req.get('host') || '').split(',')[0].trim().toLowerCase();
}

/**
 * True when the browser origin is the very host serving the API. The SPA and
 * the API share one domain in deployment, and a cross-site attacker can never
 * forge a matching Origin/Host pair, so this stays CSRF-safe.
 */
function isSameOrigin(origin, req) {
  const host = requestHost(req);
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

/** Single source of truth for which browser origins may call the API. */
function isAllowedOrigin(origin, req) {
  if (!origin) return true; // non-browser client (curl, tests, server-to-server)

  const normalised = normaliseOrigin(origin);
  const allowed = env.CLIENT_URL.split(',').map(normaliseOrigin).filter(Boolean);

  if (allowed.includes(normalised)) return true;
  if (isSameOrigin(normalised, req)) return true;
  if (!isProduction && /^http:\/\/localhost(:\d+)?$/.test(normalised)) return true;

  return false;
}

/** Rejects state-changing requests coming from unknown browser origins. */
function originGuard(req, _res, next) {
  if (isAllowedOrigin(req.get('origin'), req)) return next();
  return next(ApiError.forbidden('This origin is not allowed to call the API.'));
}

module.exports = { mongoSanitize, originGuard, isAllowedOrigin, sanitizeValue };
