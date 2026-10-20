'use strict';

const crypto = require('crypto');
const { User, StudentProfile, StudentEnrollment, Subject } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');
const {
  signAuthToken,
  generateOpaqueToken,
  hashToken,
  randomCsrfToken,
  AUTH_COOKIE,
  CSRF_COOKIE,
  authCookieOptions,
  csrfCookieOptions,
} = require('../utils/token');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { recordAudit } = require('../services/auditService');
const logger = require('../config/logger');
const { isProduction } = require('../config/env');

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function clientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

function issueSession(res, user) {
  const token = signAuthToken(user);
  const csrfToken = randomCsrfToken();
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());
  return { csrfToken, token };
}

function clearSession(res) {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(0), maxAge: undefined });
  res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(0), maxAge: undefined });
}

/** Public shape of a user returned to the client. */
function presentUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/* -------------------------------------------------------------- register --- */

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Try signing in instead.');
  }

  const user = new User({
    name,
    email,
    role: ROLES.STUDENT,
    status: ACCOUNT_STATUS.ACTIVE,
    emailVerified: true,
  });
  await user.setPassword(password);
  await user.save();

  const profile = await StudentProfile.create({
    user: user._id,
    onboardingCompleted: true,
    onboardingStep: 4,
  });

  const { csrfToken, token } = issueSession(res, user);
  logger.info('New student registered and activated', { email: user.email });

  return created(res, {
    user: presentUser(user),
    profile,
    csrfToken,
    token,
    requiresEmailVerification: false,
  });
});

/* ----------------------------------------------------------- verifyEmail --- */

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const hashed = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpiresAt');

  if (!user) {
    throw ApiError.badRequest('This verification link is invalid or has expired. Request a new one.');
  }

  user.emailVerified = true;
  user.status = user.status === ACCOUNT_STATUS.PENDING ? ACCOUNT_STATUS.ACTIVE : user.status;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  await recordAudit({ actor: user, action: 'auth.email_verified', entityType: 'User', entityId: user._id, req });

  const { csrfToken, token: sessionToken } = issueSession(res, user);
  const profile = await StudentProfile.findOne({ user: user._id });

  return ok(res, { user: presentUser(user), profile, csrfToken, token: sessionToken });
});

/* ------------------------------------------------------ resendVerification --- */

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond success to avoid leaking which emails are registered.
  if (!user || user.emailVerified) {
    return ok(res, { sent: true, message: 'If the account needs verification, a new link has been sent.' });
  }

  const { raw, hash } = generateOpaqueToken();
  user.emailVerificationToken = hash;
  user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  await user.save();

  const verifyLink = `${clientUrl()}/verify-email?token=${raw}`;
  await sendVerificationEmail(user, verifyLink);

  return ok(res, {
    sent: true,
    message: 'If the account needs verification, a new link has been sent.',
    ...(isProduction ? {} : { devVerification: { link: verifyLink } }),
  });
});

/* ----------------------------------------------------------------- login --- */

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Incorrect email or password.');

  const valid = await user.verifyPassword(password);
  if (!valid) throw ApiError.unauthorized('Incorrect email or password.');

  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    throw new ApiError(403, user.suspendedReason || 'This account has been suspended. Contact the administrator.');
  }

  if (!user.emailVerified && user.role !== ROLES.SUPER_ADMIN) {
    const { raw, hash } = generateOpaqueToken();
    user.emailVerificationToken = hash;
    user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await user.save();
    const verifyLink = `${clientUrl()}/verify-email?token=${raw}`;
    await sendVerificationEmail(user, verifyLink);

    throw new ApiError(403, 'Please verify your email address before signing in. We just sent you a new link.', {
      code: 'email_not_verified',
      details: isProduction ? undefined : { verificationLink: verifyLink },
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { csrfToken, token } = issueSession(res, user);
  const profile = await StudentProfile.findOne({ user: user._id });

  await recordAudit({ actor: user, action: 'auth.login', entityType: 'User', entityId: user._id, req });

  return ok(res, { user: presentUser(user), profile, csrfToken, token });
});

/* ------------------------------------------------------------ demoLogin --- */

const demoLogin = asyncHandler(async (req, res) => {
  const targetRole = req.body?.role === 'super_admin' ? ROLES.SUPER_ADMIN : ROLES.STUDENT;

  let user = await User.findOne({ role: targetRole });

  if (!user && targetRole === ROLES.STUDENT) {
    user = new User({
      name: 'Demo Student',
      email: 'student@demo.local',
      role: ROLES.STUDENT,
      status: ACCOUNT_STATUS.ACTIVE,
      emailVerified: true,
    });
    await user.setPassword('StudentDemo123');
    await user.save();
    await StudentProfile.findOneAndUpdate(
      { user: user._id },
      { onboardingCompleted: true, onboardingStep: 4, institutionName: 'BCA SmartLearn Academy' },
      { upsert: true }
    );
  } else if (!user && targetRole === ROLES.SUPER_ADMIN) {
    user = new User({
      name: 'Platform Owner',
      email: 'owner@bcasmartlearn.local',
      role: ROLES.SUPER_ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
      emailVerified: true,
    });
    await user.setPassword('ChangeThisOwner123');
    await user.save();
  }

  if (user) {
    user.emailVerified = true;
    user.status = ACCOUNT_STATUS.ACTIVE;
    user.lastLoginAt = new Date();
    await user.save();
  }

  if (targetRole === ROLES.STUDENT && user) {
    try {
      const existingEnrollments = await StudentEnrollment.countDocuments({ student: user._id });
      if (existingEnrollments === 0) {
        const subjects = await Subject.find({ isPublished: true });
        if (subjects.length > 0) {
          const enrollments = subjects.map((sub) => ({
            student: user._id,
            subject: sub._id,
            semester: sub.semester || null,
            regulation: sub.regulation || null,
            academicYear: '2024-2025',
            status: 'active',
            credits: sub.credits || 4,
            targetGrade: 'A',
          }));
          await StudentEnrollment.insertMany(enrollments, { ordered: false }).catch(() => {});
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }

  const { csrfToken, token } = issueSession(res, user);
  const profile = targetRole === ROLES.STUDENT ? await StudentProfile.findOne({ user: user._id }) : null;

  await recordAudit({ actor: user, action: 'auth.demo_login', entityType: 'User', entityId: user._id, req });

  return ok(res, { user: presentUser(user), profile, csrfToken, token });
});

/* ---------------------------------------------------------------- logout --- */

const logout = asyncHandler(async (req, res) => {
  clearSession(res);
  if (req.user) {
    await recordAudit({ actor: req.user, action: 'auth.logout', entityType: 'User', entityId: req.user._id, req });
  }
  return ok(res, { loggedOut: true });
});

/* -------------------------------------------------------------------- me --- */

const me = asyncHandler(async (req, res) => {
  const profile = req.user.role === ROLES.STUDENT ? await StudentProfile.findOne({ user: req.user._id }) : null;
  const csrfToken = req.cookies?.[CSRF_COOKIE] || randomCsrfToken();
  if (!req.cookies?.[CSRF_COOKIE]) res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());

  return ok(res, { user: presentUser(req.user), profile, csrfToken });
});

/* ------------------------------------------------------- forgotPassword --- */

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user && !user.deletedAt) {
    const { raw, hash } = generateOpaqueToken();
    user.passwordResetToken = hash;
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const resetLink = `${clientUrl()}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user, resetLink);

    await recordAudit({ actor: user, action: 'auth.password_reset_requested', entityType: 'User', entityId: user._id, req });

    return ok(res, {
      sent: true,
      message: 'If that email is registered, a reset link is on its way.',
      ...(isProduction ? {} : { devReset: { link: resetLink } }),
    });
  }

  return ok(res, { sent: true, message: 'If that email is registered, a reset link is on its way.' });
});

/* -------------------------------------------------------- resetPassword --- */

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiresAt');

  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');

  await user.setPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  if (user.status === ACCOUNT_STATUS.PENDING) user.status = ACCOUNT_STATUS.ACTIVE;
  user.emailVerified = true;
  await user.save();

  await recordAudit({ actor: user, action: 'auth.password_reset', entityType: 'User', entityId: user._id, req });

  const { csrfToken, token: sessionToken } = issueSession(res, user);
  return ok(res, { user: presentUser(user), csrfToken, token: sessionToken });
});

/* -------------------------------------------------------- changePassword --- */

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw ApiError.notFound('Account not found.');

  const valid = await user.verifyPassword(currentPassword);
  if (!valid) throw ApiError.badRequest('Your current password is incorrect.');

  await user.setPassword(newPassword);
  await user.save();

  await recordAudit({ actor: user, action: 'auth.password_changed', entityType: 'User', entityId: user._id, req });
  return ok(res, { updated: true });
});

/* -------------------------------------------------------- updateAccount --- */

const updateAccount = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;
  if (name !== undefined) req.user.name = name;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
  await req.user.save();
  return ok(res, { user: presentUser(req.user) });
});

/** Exposed for tests. */
const __test = { hashToken, presentUser, VERIFICATION_TTL_MS, RESET_TTL_MS, crypto };

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  demoLogin,
  logout,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
  updateAccount,
  presentUser,
  __test,
};
