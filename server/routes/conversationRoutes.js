const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const auth = require('../middleware/auth');

router.post('/', auth, conversationController.createConversation);
router.get('/', auth, conversationController.getConversations);
router.get('/stats/overview', auth, conversationController.getStats);
router.get('/:conversationId', auth, conversationController.getConversation);
router.put('/:conversationId', auth, conversationController.updateConversationTitle);
router.delete('/:conversationId', auth, conversationController.deleteConversation);

module.exports = router;
