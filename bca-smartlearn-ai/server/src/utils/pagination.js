'use strict';

const { PAGINATION } = require('../config/constants');

/** Parses `page` / `limit` query params into safe skip/limit values. */
function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || PAGINATION.defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), PAGINATION.maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

/** Builds the envelope returned alongside list responses. */
function buildMeta({ page, limit, total }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/** Whitelists sortable fields and returns a Mongoose sort object. */
function getSort(query, allowedFields, fallback = { createdAt: -1 }) {
  const field = typeof query.sortBy === 'string' ? query.sortBy : '';
  if (!field || !allowedFields.includes(field)) return fallback;
  const direction = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  return { [field]: direction };
}

module.exports = { getPagination, buildMeta, getSort };
