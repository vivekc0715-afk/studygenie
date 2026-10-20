'use strict';

const ApiError = require('../utils/ApiError');
const { AUTH_COOKIE, CSRF_COOKIE, randomCsrfToken, csrfCookieOptions } = require('../utils/token');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

/** Ensures a readable double-submit CSRF cookie exists for browser clients. */
function ensureCsrfToken(req, res, next) {
  if (!req.cookies || !req.cookies[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, randomCsrfToken(), csrfCookieOptions());
  }
  next();
}

/**
 * Double-submit CSRF protection.
 * Only enforced when the request authenticates through the httpOnly cookie:
 * bearer-token clients (tests, integrations) are exempt by design because
 * browsers never attach those automatically.
 */
function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieAuthenticated = Boolean(req.cookies && req.cookies[AUTH_COOKIE]);
  if (!cookieAuthenticated) return next();

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(403, 'Security check failed. Please refresh the page and try again.', { code: 'csrf_failed' }));
  }
  return next();
}

module.exports = { ensureCsrfToken, csrfProtection, CSRF_HEADER };
