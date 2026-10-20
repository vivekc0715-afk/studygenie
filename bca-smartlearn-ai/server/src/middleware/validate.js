'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Validates and replaces `req.body` / `req.query` / `req.params` using Zod schemas.
 * Usage: router.post('/', validate({ body: createSchema }), handler)
 */
function validate(schemas) {
  return function validationMiddleware(req, _res, next) {
    try {
      for (const source of ['params', 'query', 'body']) {
        const schema = schemas[source];
        if (!schema) continue;
        const result = schema.safeParse(req[source]);
        if (!result.success) {
          return next(ApiError.badRequest('Validation failed.', result.error.flatten().fieldErrors));
        }
        // `req.query` is a getter on Express 5; assign onto a local copy instead.
        if (source === 'query') {
          req.validatedQuery = result.data;
        } else {
          req[source] = result.data;
        }
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/** Reads the validated query when present, falling back to the raw query. */
function queryOf(req) {
  return req.validatedQuery || req.query;
}

module.exports = { validate, queryOf };
