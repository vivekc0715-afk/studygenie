'use strict';

const express = require('express');
const controller = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/prebuilt', controller.getPrebuiltAnswers);
router.post('/message', controller.sendMessage);

module.exports = router;
