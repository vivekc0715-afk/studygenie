'use strict';

/**
 * Secure Super Admin bootstrap.
 *
 *   npm run create-admin            # uses SUPER_ADMIN_* from server/.env
 *   node src/scripts/createSuperAdmin.js --email a@b.com --name "Owner"
 *
 * The password must come from the environment (or an interactive prompt);
 * it is never hardcoded and weak/default values are rejected outright.
 */

const readline = require('readline');
const { env, isProduction } = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/db');
const { User } = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');
const logger = require('../config/logger');

const WEAK_PASSWORDS = [
  'password',
  'password123',
  'admin123',
  'admin',
  'administrator',
  '123456',
  '12345678',
  'qwerty',
  'changeme',
  'letmein',
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function validatePassword(password) {
  const problems = [];
  if (!password || password.length < 10) problems.push('must be at least 10 characters');
  if (!/[A-Za-z]/.test(password)) problems.push('must contain a letter');
  if (!/[0-9]/.test(password)) problems.push('must contain a number');
  if (WEAK_PASSWORDS.includes(String(password).toLowerCase())) problems.push('is a well-known weak password');
  return problems;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      if (['\n', '\r', '\u0004'].includes(char.toString())) {
        process.stdin.removeListener('data', onData);
      } else {
        process.stdout.write('\x1b[2K\x1b[200D' + question + '*'.repeat(rl.line.length));
      }
    };
    process.stdin.on('data', onData);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = String(args.email || env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const name = String(args.name || env.SUPER_ADMIN_NAME || 'Platform Owner').trim();
  let password = args.password || env.SUPER_ADMIN_PASSWORD || '';

  if (!email) {
    logger.error('A Super Admin email is required. Set SUPER_ADMIN_EMAIL in server/.env or pass --email.');
    process.exitCode = 1;
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    logger.error('That email address is not valid.', { email });
    process.exitCode = 1;
    return;
  }

  if (!password && process.stdin.isTTY) {
    password = await promptHidden(`Password for ${email}: `);
  }

  const problems = validatePassword(password);
  if (problems.length) {
    logger.error(`Refusing to create an administrator account - the password ${problems.join(', ')}.`);
    logger.info('Provide a strong password via SUPER_ADMIN_PASSWORD in server/.env or the --password flag.');
    process.exitCode = 1;
    return;
  }

  await connectDatabase();

  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    existing.name = name || existing.name;
    existing.role = ROLES.SUPER_ADMIN;
    existing.status = ACCOUNT_STATUS.ACTIVE;
    existing.emailVerified = true;
    existing.deletedAt = null;
    await existing.setPassword(password);
    await existing.save();
    logger.info('Existing account promoted/updated to Super Admin.', { email });
  } else {
    const user = new User({
      name,
      email,
      role: ROLES.SUPER_ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
      emailVerified: true,
    });
    await user.setPassword(password);
    await user.save();
    logger.info('Super Admin account created.', { email });
  }

  logger.info('You can now sign in at the admin portal. Keep this credential out of version control.');
  if (isProduction) logger.warn('Production environment detected - store the password in your secrets manager.');
}

main()
  .catch((error) => {
    logger.error('Super Admin bootstrap failed', { message: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    process.exit(process.exitCode || 0);
  });
