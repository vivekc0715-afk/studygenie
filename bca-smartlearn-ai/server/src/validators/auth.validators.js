'use strict';

const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
});

const resendVerificationSchema = z.object({ email });

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateAccountSchema,
  passwordSchema: password,
  emailSchema: email,
};
