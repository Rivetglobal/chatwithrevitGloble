const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

router.post('/send', authMiddleware, chatController.sendMessage);
router.get('/history', authMiddleware, chatController.getChatHistory);
router.delete('/:chatId', authMiddleware, chatController.deleteChat);
router.delete('/', authMiddleware, chatController.clearChatHistory);
router.post('/:chatId/regenerate', authMiddleware, chatController.regenerateResponse);

module.exports = router;
