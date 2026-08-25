const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminController = require('../controllers/adminController');

router.get('/llm-keys',       auth, requireAdmin, adminController.getLlmKeys);
router.put('/llm-keys',       auth, requireAdmin, adminController.updateLlmKeys);
router.get('/integrations',   auth, requireAdmin, adminController.getIntegrations);
router.put('/integrations',   auth, requireAdmin, adminController.updateIntegrations);
router.get('/dubcall',        auth, requireAdmin, adminController.getDubcall);
router.put('/dubcall',        auth, requireAdmin, adminController.updateDubcall);
router.post('/dubcall/workflows', auth, requireAdmin, adminController.listDubcallWorkflows);
router.post('/dubcall/run',   auth, requireAdmin, adminController.runDubcallWorkflow);
router.get('/dashboard',      auth, requireAdmin, require('../controllers/activityController').getDashboard);

module.exports = router;
