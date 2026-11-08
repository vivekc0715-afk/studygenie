'use strict';

/**
 * Environment configuration with validation.
 * Fails fast in production when security-critical variables are missing,
 * while remaining usable with safe development defaults.
 */

const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProdEnv = process.env.NODE_ENV === 'production';

const booleanish = (fallback) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return fallback;
      return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
    });

const optionalString = (fallback = '') => z.string().optional().transform((v) => (v === undefined ? fallback : v));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  MONGODB_URI: optionalString(''),
  MONGODB_DB_NAME: z.string().default('bca-smartlearn-ai'),
  // The in-memory database is a development convenience; never default to it
  // in production where it is not available.
  ENABLE_DEV_DB_FALLBACK: booleanish(!isProdEnv),

  JWT_SECRET: optionalString(''),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: optionalString(''),
  COOKIE_DOMAIN: optionalString(''),

  GEMINI_API_KEY: optionalString(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),

  JUDGE0_API_URL: z.string().default('https://judge0-ce.p.rapidapi.com'),
  JUDGE0_API_HOST: z.string().default('judge0-ce.p.rapidapi.com'),
  JUDGE0_API_KEY: optionalString(''),
  JUDGE0_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),

  YOUTUBE_API_KEY: optionalString(''),
  YOUTUBE_CACHE_TTL_MINUTES: z.coerce.number().int().positive().default(720),

  SMTP_HOST: optionalString(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanish(false),
  SMTP_USER: optionalString(''),
  SMTP_PASSWORD: optionalString(''),
  MAIL_FROM: z.string().default('BCA SmartLearn AI <no-reply@bcasmartlearn.local>'),

  SUPER_ADMIN_NAME: z.string().default('Platform Owner'),
  SUPER_ADMIN_EMAIL: optionalString(''),
  SUPER_ADMIN_PASSWORD: optionalString(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[env] Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

if (isProduction) {
  const problems = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
  if (!env.COOKIE_SECRET || env.COOKIE_SECRET.length < 16) problems.push('COOKIE_SECRET must be at least 16 characters');
  if (!env.MONGODB_URI) problems.push('MONGODB_URI is required');
  if (env.ENABLE_DEV_DB_FALLBACK) problems.push('ENABLE_DEV_DB_FALLBACK must be false in production');
  if (problems.length) {
    // eslint-disable-next-line no-console
    console.error('[env] Refusing to start in production:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
}

if (!isProduction && !isTest) {
  if (!env.JWT_SECRET) {
    env.JWT_SECRET = 'dev-only-jwt-secret-change-me-before-deploying-0123456789';
    // eslint-disable-next-line no-console
    console.warn('[env] JWT_SECRET not set - using an insecure development default.');
  }
  if (!env.COOKIE_SECRET) env.COOKIE_SECRET = 'dev-only-cookie-secret-change-me-before-deploying';
}

/** Feature availability derived from configured credentials. */
const features = {
  ai: true,
  codeExecution: true,
  youtube: true,
  email: Boolean(env.SMTP_HOST && env.SMTP_USER),
};

module.exports = {
  env,
  isProduction,
  isTest,
  isDevelopment: env.NODE_ENV === 'development',
  features,
};
