'use strict';

/**
 * Minimal structured logger (no external dependency).
 * Emits JSON lines so logs are machine-parseable in production,
 * and colourised single lines during development.
 */

const { env } = require('./env');

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const activeLevel = env.NODE_ENV === 'production' ? LEVELS.info : env.NODE_ENV === 'test' ? LEVELS.warn : LEVELS.debug;

const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  http: '\x1b[35m',
  debug: '\x1b[90m',
};
const RESET = '\x1b[0m';

function write(level, message, meta) {
  if (LEVELS[level] > activeLevel) return;
  const timestamp = new Date().toISOString();

  if (env.NODE_ENV === 'production') {
    const line = JSON.stringify({ timestamp, level, message, ...(meta ? { meta } : {}) });
    level === 'error' ? process.stderr.write(line + '\n') : process.stdout.write(line + '\n');
    return;
  }

  const stream = level === 'error' ? process.stderr : process.stdout;
  const suffix = meta ? ' ' + JSON.stringify(meta) : '';
  stream.write(`${COLORS[level] || ''}[${level}]${RESET} ${timestamp} ${message}${suffix}\n`);
}

const logger = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  http: (message, meta) => write('http', message, meta),
  debug: (message, meta) => write('debug', message, meta),
  child: () => logger,
};

module.exports = logger;
