'use strict';

const express = require('express');
const controller = require('../controllers/predictionController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireStudent);

router.get('/meta', controller.meta);
router.get('/', controller.list);
router.post('/recompute', controller.computeAll);
router.post('/:subjectId', controller.computeOne);
router.get('/:subjectId', controller.computeOne);

module.exports = router;
