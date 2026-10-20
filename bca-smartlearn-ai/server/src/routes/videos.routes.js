'use strict';

const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/videoController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireStudent);

const statusSchema = z.object({ status: z.enum(['impression', 'clicked', 'completed', 'dismissed']) });

router.get('/meta', controller.meta);
router.get('/curated', controller.curated);
router.get('/syllabus', controller.syllabusChapters);
router.get('/search', controller.search);
router.get('/recommendations', controller.recommendations);
router.post('/recommendations/refresh', controller.refresh);
router.get('/topics/:topicId', controller.forTopic);
router.patch('/recommendations/:id', validate({ body: statusSchema }), controller.updateStatus);

module.exports = router;
