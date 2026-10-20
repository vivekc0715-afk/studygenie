'use strict';

const nodemailer = require('nodemailer');
const { env, features } = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!features.email) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * Sends an email when SMTP is configured. In development the message
 * (including actionable links) is written to the server console instead.
 */
async function sendMail({ to, subject, html, text }) {
  const mail = getTransporter();
  if (!mail) {
    logger.info(`[dev-email] To: ${to} | Subject: ${subject}`);
    if (text) logger.info(`[dev-email] Body:\n${text}`);
    return { delivered: false, preview: true, text };
  }
  try {
    await mail.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
    return { delivered: true };
  } catch (error) {
    logger.error('Email delivery failed', { to, subject, message: error.message });
    return { delivered: false, error: error.message };
  }
}

function verificationEmail(name, link) {
  return {
    subject: 'Verify your BCA SmartLearn AI account',
    text: `Hi ${name},\n\nWelcome to BCA SmartLearn AI!\nVerify your email address by opening this link:\n${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${name},</p><p>Welcome to <strong>BCA SmartLearn AI</strong>!</p><p><a href="${link}">Verify your email address</a></p><p>This link expires in 24 hours.</p>`,
  };
}

function passwordResetEmail(name, link) {
  return {
    subject: 'Reset your BCA SmartLearn AI password',
    text: `Hi ${name},\n\nWe received a request to reset your password.\nOpen this link to choose a new password:\n${link}\n\nThis link expires in 1 hour. If you did not request it, you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a></p><p>This link expires in 1 hour.</p>`,
  };
}

async function sendVerificationEmail(user, link) {
  return sendMail({ to: user.email, ...verificationEmail(user.name, link) });
}

async function sendPasswordResetEmail(user, link) {
  return sendMail({ to: user.email, ...passwordResetEmail(user.name, link) });
}

module.exports = { sendMail, sendVerificationEmail, sendPasswordResetEmail };
