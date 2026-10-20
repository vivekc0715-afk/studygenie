'use strict';

/**
 * Consistent JSON envelope used by every endpoint.
 *   success -> { success: true, data, meta? }
 *   failure -> { success: false, error: { code, message, details? } }
 */

function ok(res, data = null, meta = undefined, statusCode = 200) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data = null, meta = undefined) {
  return ok(res, data, meta, 201);
}

function noContent(res) {
  return res.status(204).json();
}

module.exports = { ok, created, noContent };
