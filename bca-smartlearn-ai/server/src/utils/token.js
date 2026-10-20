'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const AUTH_COOKIE = 'bca_token';
const CSRF_COOKIE = 'bca_csrf';

/** Signs a short-lived access token for a user document. */
function signAuthToken(user) {
  return jwt.sign(
    { sub: String(user._id || user.id), role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/** Generates a random URL-safe token plus the hash stored in the database. */
function generateOpaqueToken(bytes = 32) {
  const raw = crypto.randomBytes(bytes).toString('hex');
  return { raw, hash: hashToken(raw) };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function randomCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
};

/** Auth cookie: not readable by JavaScript, mitigates XSS token theft. */
function authCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  return { ...baseCookieOptions, maxAge: maxAgeMs };
}

/** CSRF cookie: intentionally readable by the client for double-submit checks. */
function csrfCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  return { ...baseCookieOptions, httpOnly: false, maxAge: maxAgeMs };
}

module.exports = {
  AUTH_COOKIE,
  CSRF_COOKIE,
  signAuthToken,
  verifyAuthToken,
  generateOpaqueToken,
  hashToken,
  randomCsrfToken,
  authCookieOptions,
  csrfCookieOptions,
};
