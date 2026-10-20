'use strict';

const express = require('express');
const controller = require('../controllers/codeController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireStudent } = require('../middleware/auth');
const { compilerLimiter } = require('../middleware/rateLimit');
const { runCodeSchema, submitCodeSchema } = require('../validators/code.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/meta', controller.meta);
router.get('/languages', controller.languageStatus);
router.get('/stats', requireStudent, controller.codingStats);

router.get('/exercises', controller.listExercises);
router.get('/exercises/:id', controller.getExercise);

router.post('/run', compilerLimiter, validate({ body: runCodeSchema }), controller.run);
router.post('/submit', compilerLimiter, validate({ body: submitCodeSchema }), controller.submit);
router.post('/ai-assist', controller.aiAssist);

router.get('/submissions', controller.listSubmissions);
router.get('/submissions/:id', controller.getSubmission);

module.exports = router;
