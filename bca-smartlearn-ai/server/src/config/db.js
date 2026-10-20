'use strict';

/**
 * Database connection.
 *
 * Priority:
 *   1. MONGODB_URI (MongoDB Atlas / local server) when set.
 *   2. In-memory MongoDB fallback for development when ENABLE_DEV_DB_FALLBACK is true.
 *
 * The fallback persists its files to `server/.data/mongo` so development data
 * survives a restart without requiring a local MongoDB installation.
 */

const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');
const { env, isProduction } = require('./env');
const logger = require('./logger');

// On Windows, local ISP DNS often rejects SRV records used by mongodb+srv://
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom DNS cannot be set
}

mongoose.set('strictQuery', true);
if (!isProduction) mongoose.set('debug', false);

let memoryServer = null;

function isPlaceholderUri(uri) {
  if (!uri) return true;
  // Reject the placeholder forms used in .env.example
  return /<[^>]+>/.test(uri) || uri.trim() === '';
}

async function connectToUri(uri) {
  await mongoose.connect(uri, {
    autoIndex: !isProduction,
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });
}

async function startMemoryServer() {
  // Lazily required so production installs never load it.
  const fs = require('fs');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.resolve(__dirname, '../../.data/mongo');
  fs.mkdirSync(dbPath, { recursive: true });
  memoryServer = await MongoMemoryServer.create({
    instance: { dbName: env.MONGODB_DB_NAME, dbPath, storageEngine: 'wiredTiger', launchTimeout: 60000 },
  });
  return memoryServer.getUri();
}

async function connectDatabase() {
  if (!isPlaceholderUri(env.MONGODB_URI)) {
    try {
      await connectToUri(env.MONGODB_URI);
      logger.info('Connected to MongoDB', { database: mongoose.connection.name, mode: 'uri' });
      return { mode: 'uri' };
    } catch (error) {
      logger.error('MongoDB connection failed', { message: error.message });
      if (isProduction || !env.ENABLE_DEV_DB_FALLBACK) throw error;
      logger.warn('Falling back to the in-memory development database.');
    }
  }

  if (!env.ENABLE_DEV_DB_FALLBACK) {
    throw new Error('No MONGODB_URI configured and ENABLE_DEV_DB_FALLBACK is disabled.');
  }

  try {
    const uri = await startMemoryServer();
    await connectToUri(uri);
    logger.warn('Using in-memory MongoDB fallback (development only). Data is persisted to server/.data/mongo.');
    return { mode: 'memory' };
  } catch (error) {
    logger.error('Unable to start the in-memory MongoDB fallback.', { message: error.message });
    throw new Error(
      'Database unavailable. Set MONGODB_URI in server/.env (MongoDB Atlas) or install MongoDB Community Server.'
    );
  }
}

async function disconnectDatabase() {
  await mongoose.connection.close().catch(() => {});
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
    memoryServer = null;
  }
}

module.exports = { connectDatabase, disconnectDatabase, isPlaceholderUri };
