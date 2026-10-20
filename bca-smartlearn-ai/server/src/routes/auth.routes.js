'use strict';

const express = require('express');
const controller = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const v = require('../validators/auth.validators');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: v.registerSchema }), controller.register);
router.post('/verify-email', authLimiter, validate({ body: v.verifyEmailSchema }), controller.verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  validate({ body: v.resendVerificationSchema }),
  controller.resendVerification
);
router.post('/login', authLimiter, validate({ body: v.loginSchema }), controller.login);
router.post('/demo-login', controller.demoLogin);
router.post('/logout', optionalAuth, controller.logout);
router.get('/me', requireAuth, controller.me);
router.post('/forgot-password', authLimiter, validate({ body: v.forgotPasswordSchema }), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: v.resetPasswordSchema }), controller.resetPassword);
router.post('/change-password', requireAuth, validate({ body: v.changePasswordSchema }), controller.changePassword);
router.patch('/account', requireAuth, validate({ body: v.updateAccountSchema }), controller.updateAccount);

module.exports = router;
