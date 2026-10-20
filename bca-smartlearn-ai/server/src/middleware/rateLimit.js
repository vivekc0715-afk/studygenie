'use strict';

const rateLimit = require('express-rate-limit');
const { isTest } = require('../config/env');

function jsonHandler(message) {
  return (_req, res) => {
    res.status(429).json({ success: false, error: { code: 'rate_limited', message } });
  };
}

function buildLimiter({ windowMs, limit, message, keyByUser = true }) {
  return rateLimit({
    windowMs,
    limit: isTest ? 100000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: jsonHandler(message),
    // Limit authenticated students per-account so shared campus IPs stay usable.
    keyGenerator: keyByUser ? (req) => (req.user ? `user:${req.user._id}` : `ip:${req.ip}`) : undefined,
    // The custom key generator intentionally returns non-IP keys when authenticated.
    validate: { ip: false, xForwardedForHeader: false },
  });
}

/** Broad protection applied to the whole API surface. */
const generalLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  message: 'Too many requests. Please slow down and try again shortly.',
  keyByUser: false,
});

/** Stricter limits for credential endpoints to slow down brute-force attempts. */
const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many authentication attempts. Please wait a few minutes before retrying.',
  keyByUser: false,
});

/** Protects the LLM budget from runaway generation loops. */
const aiLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: 8,
  message: 'You are generating content very quickly. Please wait a moment before trying again.',
});

/** Protects the sandboxed execution provider quota. */
const compilerLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  message: 'Too many code executions in a short period. Please wait before running again.',
});

module.exports = { generalLimiter, authLimiter, aiLimiter, compilerLimiter };
