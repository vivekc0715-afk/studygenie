'use strict';

const { Bookmark, Note } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, noContent } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');

const ENTITY_TYPES = ['note', 'question', 'exercise', 'video', 'test', 'topic'];

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

const list = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { student: req.user._id };
  if (query.entityType) filter.entityType = query.entityType;

  const [items, total] = await Promise.all([
    Bookmark.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    Bookmark.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

/** Whether a specific entity is bookmarked - used to render the icon state. */
const status = asyncHandler(async (req, res) => {
  const { entityType, entityId } = queryOf(req);
  if (!ENTITY_TYPES.includes(entityType)) throw ApiError.badRequest('Unsupported entity type.');
  assertObjectId(entityId, 'entity id');

  const existing = await Bookmark.findOne({ student: req.user._id, entityType, entityId }).lean();
  return ok(res, { bookmarked: Boolean(existing), id: existing ? String(existing._id) : null });
});

/** Toggles a bookmark on or off (idempotent from the UI's perspective). */
const toggle = asyncHandler(async (req, res) => {
  const { entityType, entityId, label = '', meta = null } = req.body;
  if (!ENTITY_TYPES.includes(entityType)) throw ApiError.badRequest('Unsupported entity type.');

  const existing = await Bookmark.findOne({ student: req.user._id, entityType, entityId });

  if (existing) {
    await existing.deleteOne();
    if (entityType === 'note') await Note.updateOne({ _id: entityId, student: req.user._id }, { $set: { isBookmarked: false } });
    return ok(res, { bookmarked: false, id: null });
  }

  const created = await Bookmark.create({ student: req.user._id, entityType, entityId, label, meta });
  if (entityType === 'note') await Note.updateOne({ _id: entityId, student: req.user._id }, { $set: { isBookmarked: true } });

  return ok(res, { bookmarked: true, id: String(created._id), bookmark: created.toJSON() });
});

const remove = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'bookmark id');
  const deleted = await Bookmark.findOneAndDelete({ _id: req.params.id, student: req.user._id });
  if (!deleted) throw ApiError.notFound('Bookmark not found.');

  if (deleted.entityType === 'note') {
    await Note.updateOne({ _id: deleted.entityId, student: req.user._id }, { $set: { isBookmarked: false } });
  }

  return noContent(res);
});

/** Grouped counts for the bookmarks sidebar. */
const summary = asyncHandler(async (req, res) => {
  const rows = await Bookmark.aggregate([
    { $match: { student: req.user._id } },
    { $group: { _id: '$entityType', count: { $sum: 1 } } },
  ]);

  const byType = ENTITY_TYPES.reduce((acc, type) => {
    acc[type] = rows.find((row) => row._id === type)?.count || 0;
    return acc;
  }, {});

  return ok(res, { total: rows.reduce((sum, row) => sum + row.count, 0), byType });
});

module.exports = { list, status, toggle, remove, summary, ENTITY_TYPES };
