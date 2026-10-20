'use strict';

const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { isProduction } = require('../config/env');

/** 404 handler for unmatched routes. */
function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
}

function mapMongooseError(error) {
  if (error.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(error.errors).map(([field, issue]) => [field, issue.message])
    );
    return ApiError.badRequest('Validation failed.', details);
  }
  if (error.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for "${error.path}".`);
  }
  if (error.code === 11000) {
    const fields = Object.keys(error.keyValue || {}).join(', ') || 'field';
    return ApiError.conflict(`A record with this ${fields} already exists.`);
  }
  return null;
}

/** Terminal error handler. Always returns the standard error envelope. */
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, _next) {
  let apiError = error instanceof ApiError ? error : null;

  if (!apiError && error instanceof ZodError) {
    apiError = ApiError.badRequest('Validation failed.', error.flatten().fieldErrors);
  }
  if (!apiError) apiError = mapMongooseError(error);
  if (!apiError && error.type === 'entity.too.large') {
    apiError = new ApiError(413, 'Request payload is too large.');
  }
  if (!apiError && error.code === 'LIMIT_FILE_SIZE') {
    apiError = new ApiError(413, 'Uploaded file exceeds the allowed size.');
  }
  if (!apiError && error.message === 'Not allowed by CORS') {
    apiError = ApiError.forbidden('This origin is not allowed to call the API.');
  }
  if (!apiError) {
    apiError = ApiError.internal(isProduction ? 'Something went wrong.' : error.message);
  }

  const status = apiError.statusCode || 500;
  if (status >= 500) {
    logger.error('Unhandled request error', {
      method: req.method,
      url: req.originalUrl,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    });
  } else {
    logger.warn('Request rejected', { method: req.method, url: req.originalUrl, status, message: apiError.message });
  }

  res.status(status).json({
    success: false,
    error: {
      code: apiError.code || 'error',
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
