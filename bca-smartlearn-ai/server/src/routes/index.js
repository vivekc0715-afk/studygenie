'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { features, env } = require('../config/env');
const { ok } = require('../utils/apiResponse');

const router = express.Router();

/** Liveness + capability probe. The client uses this to render setup hints. */
router.get('/health', (_req, res) =>
  ok(res, {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    environment: env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    features,
    timestamp: new Date().toISOString(),
  })
);

router.use('/auth', require('./auth.routes'));
router.use('/academic', require('./academic.routes'));
router.use('/student', require('./student.routes'));
router.use('/notes', require('./notes.routes'));
router.use('/code', require('./code.routes'));
router.use('/tests', require('./tests.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/predictions', require('./predictions.routes'));
router.use('/videos', require('./videos.routes'));
router.use('/planner', require('./planner.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/bookmarks', require('./bookmarks.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
