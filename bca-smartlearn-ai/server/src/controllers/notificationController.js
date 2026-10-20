'use strict';

const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, noContent } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');

function assertObjectId(id, label = 'identifier') {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw ApiError.badRequest(`Invalid ${label}.`);
}

const list = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { page, limit, skip } = getPagination(query);

  const filter = { user: req.user._id };
  if (query.type) filter.type = query.type;
  if (query.unread === 'true') filter.isRead = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  return ok(res, items, { ...buildMeta({ page, limit, total }), unread });
});

const unreadCount = asyncHandler(async (req, res) =>
  ok(res, { unread: await Notification.countDocuments({ user: req.user._id, isRead: false }) })
);

const markRead = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'notification id');
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found.');
  return ok(res, notification.toJSON());
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return ok(res, { updated: result.modifiedCount || 0 });
});

const remove = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'notification id');
  const deleted = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw ApiError.notFound('Notification not found.');
  return noContent(res);
});

/** Clears every read notification - keeps the inbox tidy. */
const clearRead = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ user: req.user._id, isRead: true });
  return ok(res, { deleted: result.deletedCount || 0 });
});

module.exports = { list, unreadCount, markRead, markAllRead, remove, clearRead };
