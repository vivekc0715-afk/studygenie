'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getPagination, buildMeta, getSort } = require('../utils/pagination');
const { queryOf } = require('../middleware/validate');
const { recordAudit } = require('./auditService');
const { PAGINATION } = require('../config/constants');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Builds a Mongo filter from whitelisted query parameters. */
function buildFilter(query, filterFields) {
  const filter = {};
  for (const field of filterFields) {
    const value = query[field];
    if (value === undefined || value === '' || value === null) continue;

    if (value === 'true' || value === 'false') {
      filter[field] = value === 'true';
    } else if (Array.isArray(value)) {
      filter[field] = { $in: value };
    } else if (typeof value === 'string' && value.includes(',')) {
      filter[field] = { $in: value.split(',').map((entry) => entry.trim()).filter(Boolean) };
    } else {
      filter[field] = value;
    }
  }
  return filter;
}

function buildSearch(query, searchFields) {
  const term = String(query.search || '').trim();
  if (!term || !searchFields.length) return null;
  const regex = new RegExp(escapeRegex(term), 'i');
  return { $or: searchFields.map((field) => ({ [field]: regex })) };
}

/**
 * Generates a consistent REST controller set (list/get/create/update/remove)
 * for an entity so every admin module behaves and validates identically.
 */
function createCrudController({
  model,
  entityName,
  label = entityName,
  searchFields = [],
  filterFields = [],
  sortableFields = [],
  populate = [],
  defaultSort,
  softDelete = false,
  omitFields = [],
  beforeCreate,
  beforeUpdate,
  afterWrite,
  protectDelete = false,
}) {
  const selectOmit = omitFields.length ? omitFields.map((field) => `-${field}`).join(' ') : '';
  const defaultSortSpec = defaultSort || { createdAt: -1 };
  const allowedSort = [...new Set([...sortableFields, 'createdAt', 'updatedAt', 'name', 'title', 'number'])];

  const applyPopulate = (query) => {
    populate.forEach((entry) => query.populate(entry));
    return query;
  };

  const list = asyncHandler(async (req, res) => {
    const query = queryOf(req);
    const { page, limit, skip } = getPagination(query);

    const filter = buildFilter(query, filterFields);
    if (softDelete) {
      if (query.includeDeleted === 'true') {
        if (query.onlyDeleted === 'true') filter.isDeleted = true;
      } else {
        filter.isDeleted = { $ne: true };
      }
    }

    const search = buildSearch(query, searchFields);
    const finalFilter = search ? { $and: [filter, search] } : filter;

    const [items, total] = await Promise.all([
      applyPopulate(model.find(finalFilter).select(selectOmit))
        .sort(getSort(query, allowedSort, defaultSortSpec))
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      model.countDocuments(finalFilter),
    ]);

    return ok(res, items, buildMeta({ page, limit, total }));
  });

  const getOne = asyncHandler(async (req, res) => {
    if (!model.base.Types.ObjectId.isValid(req.params.id)) {
      throw ApiError.badRequest('Invalid identifier.');
    }
    const doc = await applyPopulate(model.findById(req.params.id).select(selectOmit));
    if (!doc) throw ApiError.notFound(`${label} not found.`);
    return ok(res, doc);
  });

  const create = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    delete payload._id;
    delete payload.id;
    if (beforeCreate) Object.assign(payload, (await beforeCreate(req, payload)) || {});
    const doc = await model.create(payload);
    await recordAudit({
      actor: req.user,
      action: `${entityName}.create`,
      entityType: model.modelName,
      entityId: doc._id,
      after: typeof doc.toJSON === 'function' ? doc.toJSON() : undefined,
      req,
    });
    if (afterWrite) await afterWrite(req, doc);
    return created(res, doc);
  });

  const update = asyncHandler(async (req, res) => {
    if (!model.base.Types.ObjectId.isValid(req.params.id)) {
      throw ApiError.badRequest('Invalid identifier.');
    }
    const doc = await model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${label} not found.`);

    const before = typeof doc.toJSON === 'function' ? doc.toJSON() : null;
    const payload = { ...req.body };
    delete payload._id;
    delete payload.id;
    delete payload.createdAt;
    if (beforeUpdate) await beforeUpdate(req, doc, payload);

    Object.assign(doc, payload);
    await doc.save();

    await recordAudit({
      actor: req.user,
      action: `${entityName}.update`,
      entityType: model.modelName,
      entityId: doc._id,
      before,
      after: typeof doc.toJSON === 'function' ? doc.toJSON() : undefined,
      req,
    });
    if (afterWrite) await afterWrite(req, doc);
    return ok(res, doc);
  });

  const remove = asyncHandler(async (req, res) => {
    if (!model.base.Types.ObjectId.isValid(req.params.id)) {
      throw ApiError.badRequest('Invalid identifier.');
    }
    const doc = await model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${label} not found.`);

    if (softDelete) {
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      await doc.save();
    } else {
      await doc.deleteOne();
    }

    await recordAudit({
      actor: req.user,
      action: `${entityName}.delete`,
      entityType: model.modelName,
      entityId: doc._id,
      before: typeof doc.toJSON === 'function' ? doc.toJSON() : undefined,
      severity: protectDelete ? 'critical' : 'warning',
      req,
    });
    return ok(res, { id: String(doc._id), deleted: true, softDeleted: softDelete });
  });

  const restore = asyncHandler(async (req, res) => {
    if (!softDelete) throw ApiError.badRequest('This resource does not support restore.');
    const doc = await model.findOne({ _id: req.params.id, isDeleted: true });
    if (!doc) throw ApiError.notFound(`${label} is not deleted.`);
    doc.isDeleted = false;
    doc.deletedAt = null;
    await doc.save();
    await recordAudit({
      actor: req.user,
      action: `${entityName}.restore`,
      entityType: model.modelName,
      entityId: doc._id,
      req,
    });
    return ok(res, doc);
  });

  return { list, getOne, create, update, remove, restore, PAGINATION };
}

/** Mounts the standard REST verbs onto an express router. */
function mountCrud(router, controller, { idParam = 'id' } = {}) {
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get(`/:${idParam}`, controller.getOne);
  router.put(`/:${idParam}`, controller.update);
  router.patch(`/:${idParam}`, controller.update);
  router.delete(`/:${idParam}`, controller.remove);
  return router;
}

module.exports = { createCrudController, mountCrud, buildFilter, buildSearch };
