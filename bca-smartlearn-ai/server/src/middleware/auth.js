'use strict';

const { AUTH_COOKIE, verifyAuthToken } = require('../utils/token');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');

/**
 * Reads the session token from the httpOnly cookie (browser flows)
 * or the Authorization header (programmatic/test flows).
 */
function extractToken(req) {
  const cookieToken = req.cookies ? req.cookies[AUTH_COOKIE] : null;
  if (cookieToken) return { token: cookieToken, via: 'cookie' };

  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return { token: header.slice(7).trim(), via: 'bearer' };

  return null;
}

async function resolveUser(req) {
  const found = extractToken(req);
  if (!found) return null;

  let payload;
  try {
    payload = verifyAuthToken(found.token);
  } catch (_error) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.deletedAt) throw ApiError.unauthorized('Account no longer exists.');

  req.authVia = found.via;
  return user;
}

/** Blocks the request unless a valid, non-suspended session is present. */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw ApiError.unauthorized();

  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    throw new ApiError(403, 'Your account has been suspended. Please contact the platform administrator.');
  }

  req.user = user;
  next();
});

/** Attaches `req.user` when a session exists but never blocks the request. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    const user = await resolveUser(req);
    if (user && user.status !== ACCOUNT_STATUS.SUSPENDED) req.user = user;
  } catch (_error) {
    // Ignore invalid/expired tokens on public routes.
  }
  next();
});

/** Restricts a route to one or more roles. Works both standalone and after `requireAuth`. */
function requireRole(...roles) {
  const allowed = roles.flat();
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      const user = await resolveUser(req);
      if (!user) throw ApiError.unauthorized();
      if (user.status === ACCOUNT_STATUS.SUSPENDED) {
        throw new ApiError(403, 'Your account has been suspended. Please contact the platform administrator.');
      }
      req.user = user;
    }
    if (!allowed.includes(req.user.role)) {
      throw ApiError.forbidden('This area is restricted to authorised administrators.');
    }
    next();
  });
}

const requireAdmin = requireRole(ROLES.SUPER_ADMIN);
const requireStudent = requireRole(ROLES.STUDENT);

module.exports = { requireAuth, optionalAuth, requireRole, requireAdmin, requireStudent, extractToken };
