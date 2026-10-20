'use strict';

const express = require('express');
const controller = require('../controllers/testController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireStudent } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const {
  generateTestSchema,
  autosaveAttemptSchema,
  submitAttemptSchema,
} = require('../validators/test.validators');

const router = express.Router();

router.use(requireAuth, requireStudent);

/* Static paths must be declared before the `/:id` routes. */
router.get('/meta', controller.meta);
router.get('/scope', controller.scope);
router.get('/stats', controller.stats);
router.get('/attempts', controller.listAttempts);
router.get('/attempts/:id', controller.getAttempt);
router.patch('/attempts/:id', validate({ body: autosaveAttemptSchema }), controller.autosave);
router.post('/attempts/:id/submit', validate({ body: submitAttemptSchema }), controller.submit);
router.post('/attempts/:id/abandon', controller.abandon);

router.get('/', controller.listTests);
router.post('/', aiLimiter, validate({ body: generateTestSchema }), controller.createTest);

router.get('/:id', controller.getTest);
router.post('/:id/start', controller.startAttempt);

module.exports = router;
