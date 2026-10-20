'use strict';

const http = require('http');
const app = require('./app');
const { env, features } = require('./config/env');
const logger = require('./config/logger');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { ensureDefaultSettings } = require('./services/settingsService');
const { ensureAdminUser } = require('./services/adminSeedService');

let server = null;

async function start() {
  try {
    const connection = await connectDatabase();
    if (env.NODE_ENV !== 'test') {
      await ensureDefaultSettings();
      await ensureAdminUser();
    }

    server = http.createServer(app);
    server.listen(env.PORT, () => {
      logger.info(`BCA SmartLearn AI API listening on http://localhost:${env.PORT}`, {
        mode: connection.mode,
        features,
      });
      const missing = Object.entries(features)
        .filter(([, enabled]) => !enabled)
        .map(([name]) => name);
      if (missing.length) {
        logger.warn(`Optional integrations not configured yet: ${missing.join(', ')}. Add keys to server/.env.`);
      }
    });
  } catch (error) {
    logger.error('Failed to start the server', { message: error.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { message: reason instanceof Error ? reason.message : String(reason) });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

start();

module.exports = { start };

/** Used by integration tests. */
function createServer() {
  return http.createServer(app);
}

module.exports = { start, createServer, app };
