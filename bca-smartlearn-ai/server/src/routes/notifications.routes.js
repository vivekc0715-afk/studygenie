'use strict';

const express = require('express');
const controller = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/unread-count', controller.unreadCount);
router.get('/', controller.list);
router.post('/read-all', controller.markAllRead);
router.delete('/read', controller.clearRead);
router.patch('/:id/read', controller.markRead);
router.delete('/:id', controller.remove);

module.exports = router;
