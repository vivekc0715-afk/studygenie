'use strict';

const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/bookmarkController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

const toggleSchema = z.object({
  entityType: z.enum(controller.ENTITY_TYPES),
  entityId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier'),
  label: z.string().trim().max(240).default(''),
  meta: z.unknown().optional().nullable(),
});

router.get('/summary', controller.summary);
router.get('/status', controller.status);
router.get('/', controller.list);
router.post('/toggle', validate({ body: toggleSchema }), controller.toggle);
router.delete('/:id', controller.remove);

module.exports = router;
