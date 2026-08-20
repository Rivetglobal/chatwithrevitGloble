const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const voiceController = require('../controllers/voiceController');

router.get('/status', auth, voiceController.getStatus);
router.get('/workflows', auth, requireAdmin, voiceController.listWorkflows);
router.post('/session', auth, voiceController.createSession);
router.get('/turn/:sessionToken', auth, voiceController.getTurn);

module.exports = router;
