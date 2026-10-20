'use strict';

const express = require('express');
const controller = require('../controllers/noteController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const { generateNoteSchema } = require('../validators/note.validators');
const { noteCreateSchema, noteUpdateSchema } = require('../validators/entity.validators');

const router = express.Router();

router.use(requireAuth);

/* Static paths must be declared before the `/:id` routes. */
router.get('/meta', controller.meta);
router.get('/materials', controller.listMaterials);
router.post('/materials/:id/import', controller.importMaterial);
router.get('/gfg', controller.listGfg);
router.post('/gfg/import', controller.importGfg);
router.get('/topics', controller.suggestTopics);
router.get('/subjects', controller.noteSubjects);
router.get('/library', controller.list);

router.get('/', controller.list);
router.post('/', validate({ body: noteCreateSchema }), controller.create);

router.post('/generate', aiLimiter, validate({ body: generateNoteSchema }), controller.generate);

router.get('/:id', controller.getOne);
router.patch('/:id', validate({ body: noteUpdateSchema }), controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/bookmark', controller.toggleBookmark);
router.get('/:id/export', controller.exportNote);

module.exports = router;
