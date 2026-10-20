'use strict';

const { ApplicationSetting } = require('../models');
const { DEFAULT_APPLICATION_SETTINGS } = require('../config/constants');
const logger = require('../config/logger');

/** Small in-process cache; settings change rarely and are read on most requests. */
const cache = new Map();
const CACHE_TTL_MS = 30 * 1000;
let lastLoadedAt = 0;

async function loadAll({ force = false } = {}) {
  if (!force && Date.now() - lastLoadedAt < CACHE_TTL_MS && cache.size) return cache;
  const docs = await ApplicationSetting.find({}).lean();
  cache.clear();
  for (const doc of docs) cache.set(doc.key, doc.value);
  lastLoadedAt = Date.now();
  return cache;
}

/** Returns the value of a setting, falling back to the supplied default. */
async function getSetting(key, fallback = null) {
  await loadAll();
  if (cache.has(key)) return cache.get(key);
  const doc = await ApplicationSetting.findOne({ key }).lean();
  if (!doc) return fallback;
  cache.set(key, doc.value);
  return doc.value;
}

async function setSetting(key, value, { updatedBy = null } = {}) {
  const doc = await ApplicationSetting.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy } },
    { new: true, upsert: false }
  );
  cache.clear();
  lastLoadedAt = 0;
  return doc;
}

function invalidateCache() {
  cache.clear();
  lastLoadedAt = 0;
}

/** Seeds any missing default settings (idempotent, safe on every boot). */
async function ensureDefaultSettings() {
  const operations = DEFAULT_APPLICATION_SETTINGS.map((setting) => ({
    updateOne: {
      filter: { key: setting.key },
      update: {
        $setOnInsert: {
          key: setting.key,
          category: setting.category,
          description: setting.description,
          value: setting.value,
          valueType: 'json',
          isPublic: ['platform', 'recommendation_thresholds'].includes(setting.category) || setting.key === 'platform',
        },
      },
      upsert: true,
    },
  }));

  if (operations.length) {
    await ApplicationSetting.bulkWrite(operations, { ordered: false }).catch((error) => {
      logger.warn('Unable to seed default application settings', { message: error.message });
    });
  }
  invalidateCache();
}

module.exports = { getSetting, setSetting, ensureDefaultSettings, loadAll, invalidateCache };
