'use strict';

const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/plannerController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireStudent);

const generateSchema = z.object({
  replace: z.boolean().default(false),
  days: z.coerce.number().int().min(3).max(60).default(14),
});

const taskUpdateSchema = z.object({
  status: z.enum(['pending', 'completed', 'skipped', 'rescheduled']).optional(),
  actualMinutes: z.coerce.number().min(0).max(600).optional(),
});

const rescheduleSchema = z.object({ date: z.coerce.date() });

router.get('/stats', controller.stats);
router.get('/today', controller.today);
router.get('/', controller.current);
router.post('/generate', validate({ body: generateSchema }), controller.generate);
router.patch('/tasks/:id', validate({ body: taskUpdateSchema }), controller.updateTask);
router.patch('/tasks/:id/date', validate({ body: rescheduleSchema }), controller.rescheduleTask);

module.exports = router;
