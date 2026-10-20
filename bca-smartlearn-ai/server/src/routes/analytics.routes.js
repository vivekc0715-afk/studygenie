'use strict';

const express = require('express');
const controller = require('../controllers/analyticsController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireStudent);

router.get('/overview', controller.overview);
router.get('/subjects', controller.subjects);
router.get('/filter-subjects', controller.filterSubjects);
router.get('/topics', controller.topics);
router.post('/recompute', controller.recompute);

module.exports = router;
