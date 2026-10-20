'use strict';

/** Application error carrying an HTTP status and optional machine-readable code. */
class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options.code || 'error';
    this.details = options.details || undefined;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Invalid request', details) {
    return new ApiError(400, message, { code: 'bad_request', details });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, { code: 'unauthorized' });
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message, { code: 'forbidden' });
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, { code: 'not_found' });
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message, { code: 'conflict' });
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message, { code: 'rate_limited' });
  }

  static notConfigured(service, envKey) {
    return new ApiError(503, `${service} is not configured yet. Add ${envKey} to server/.env to enable it.`, {
      code: 'service_not_configured',
      details: { envKey },
    });
  }

  static internal(message = 'Something went wrong') {
    return new ApiError(500, message, { code: 'internal_error' });
  }
}

module.exports = ApiError;
