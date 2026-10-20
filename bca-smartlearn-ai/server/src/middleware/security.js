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

/** Rejects state-changing requests coming from unknown browser origins. */
function originGuard(req, _res, next) {
  const origin = req.get('origin');
  if (!origin) return next(); // non-browser client (curl, tests, server-to-server)

  const allowed = env.CLIENT_URL.split(',').map((value) => value.trim().replace(/\/$/, ''));
  const normalised = origin.replace(/\/$/, '');

  if (allowed.includes(normalised)) return next();
  if (!isProduction && /^http:\/\/localhost(:\d+)?$/.test(normalised)) return next();

  return next(ApiError.forbidden('This origin is not allowed to call the API.'));
}

module.exports = { mongoSanitize, originGuard, sanitizeValue };
