'use strict';

/** Shared Mongoose plugins. */

/**
 * Normalises documents for API output: `_id` -> `id`, removes `__v`,
 * and hides credentials / sandbox secrets by default.
 */
function serializePlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id ? String(ret._id) : ret.id;
      delete ret._id;
      delete ret.passwordHash;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    },
  });
  schema.set('toObject', { virtuals: true, versionKey: false });
}

/** Adds `isDeleted` / `deletedAt` and scopes default queries to non-deleted docs. */
function softDeletePlugin(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  for (const method of ['find', 'findOne', 'countDocuments', 'findOneAndUpdate']) {
    schema.pre(method, function excludeDeleted(next) {
      const filter = this.getFilter();
      if (filter && filter.isDeleted === undefined) this.where({ isDeleted: { $ne: true } });
      if (typeof next === 'function') next();
    });
  }
}

module.exports = { serializePlugin, softDeletePlugin };
