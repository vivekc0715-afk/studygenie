'use strict';

/**
 * Vercel serverless entry for the BCA SmartLearn AI API.
 *
 * The same Express app that runs locally (`server/src/app.js`) is reused here.
 * Because a serverless instance can serve many requests, the MongoDB connection
 * and the idempotent bootstrap tasks are cached and only established once per
 * cold start, then shared across every invocation on that instance.
 */

const app = require('../bca-smartlearn-ai/server/src/app');
const { connectDatabase } = require('../bca-smartlearn-ai/server/src/config/db');
const { ensureDefaultSettings } = require('../bca-smartlearn-ai/server/src/services/settingsService');
const { ensureAdminUser } = require('../bca-smartlearn-ai/server/src/services/adminSeedService');

let bootstrap = null;

function ensureReady() {
  if (!bootstrap) {
    bootstrap = connectDatabase()
      .then(() => Promise.all([ensureDefaultSettings(), ensureAdminUser()]))
      .catch((error) => {
        // Reset so the next invocation retries instead of caching the failure.
        bootstrap = null;
        throw error;
      });
  }
  return bootstrap;
}

module.exports = async function handler(req, res) {
  try {
    await ensureReady();
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'database_unavailable',
          message: error.message || 'The database is unavailable.',
        },
      })
    );
    return;
  }

  return app(req, res);
};
