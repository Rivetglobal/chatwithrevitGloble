const AppSettings = require('../models/AppSettings');
const aiClients   = require('../utils/aiClients');
const sheetsUtil  = require('../utils/googleSheets');
const mailer      = require('../utils/mailer');
const dubcall     = require('../utils/dubcall');

// ── LLM keys ─────────────────────────────────────────────────────────────────
exports.getLlmKeys = async (req, res) => {
  try {
    const status = await aiClients.getKeyStatus();
    res.json({ keys: status });
  } catch (err) {
    console.error('admin getLlmKeys error:', err);
    res.status(500).json({ error: 'Failed to load key status.' });
  }
};

exports.updateLlmKeys = async (req, res) => {
  try {
    const { geminiApiKey, openaiApiKey, dubcallApiKey, dubcallWorkflowId, dubcallApiBase } = req.body || {};
    const update = { updatedAt: new Date(), updatedBy: req.userId };
    if (typeof geminiApiKey === 'string') update.geminiApiKey = geminiApiKey.trim();
    if (typeof openaiApiKey  === 'string') update.openaiApiKey  = openaiApiKey.trim();
    if (typeof dubcallApiKey === 'string') update.dubcallApiKey = dubcallApiKey.trim();
    if (typeof dubcallWorkflowId === 'string') update.dubcallWorkflowId = dubcallWorkflowId.trim();
    if (typeof dubcallApiBase === 'string') update.dubcallApiBase = dubcallApiBase.trim();
    if (
      update.geminiApiKey === undefined
      && update.openaiApiKey === undefined
      && update.dubcallApiKey === undefined
      && update.dubcallWorkflowId === undefined
      && update.dubcallApiBase === undefined
    ) {
      return res.status(400).json({ error: 'Provide at least one key or DubCall setting to update.' });
    }
    await AppSettings.findOneAndUpdate({}, update, { upsert: true, new: true });
    aiClients.bustCache();
    const status = await aiClients.getKeyStatus();
    res.json({ ok: true, keys: status });
  } catch (err) {
    console.error('admin updateLlmKeys error:', err);
    res.status(500).json({ error: 'Failed to update keys.' });
  }
};

// ── Integrations (Google SA + Email) ─────────────────────────────────────────
exports.getIntegrations = async (req, res) => {
  try {
    const googleStatus = sheetsUtil.getServiceAccountStatus();
    const emailStatus  = mailer.getEmailStatus();
    res.json({ google: googleStatus, email: emailStatus });
  } catch (err) {
    console.error('admin getIntegrations error:', err);
    res.status(500).json({ error: 'Failed to load integrations.' });
  }
};

exports.updateIntegrations = async (req, res) => {
  try {
    const body = req.body || {};
    const update = { updatedAt: new Date(), updatedBy: req.userId };

    const googleFields = ['googleServiceAccountJson'];
    const emailFields  = ['emailProvider','zeptomailToken','smtpHost','smtpPort','smtpUser','smtpPass','emailFrom','emailFromName'];

    for (const f of [...googleFields, ...emailFields]) {
      if (typeof body[f] === 'string') update[f] = body[f].trim();
    }

    const settings = await AppSettings.findOneAndUpdate({}, update, { upsert: true, new: true });

    // Push into in-memory caches so changes apply immediately without restart.
    if (update.googleServiceAccountJson !== undefined) {
      sheetsUtil.setAdminServiceAccountJson(settings.googleServiceAccountJson);
    }
    if (emailFields.some(f => update[f] !== undefined)) {
      mailer.setAdminEmailSettings({
        emailProvider:  settings.emailProvider,
        zeptomailToken: settings.zeptomailToken,
        smtpHost:       settings.smtpHost,
        smtpPort:       settings.smtpPort,
        smtpUser:       settings.smtpUser,
        smtpPass:       settings.smtpPass,
        emailFrom:      settings.emailFrom,
        emailFromName:  settings.emailFromName,
      });
    }

    res.json({
      ok: true,
      google: sheetsUtil.getServiceAccountStatus(),
      email:  mailer.getEmailStatus(),
    });
  } catch (err) {
    console.error('admin updateIntegrations error:', err);
    res.status(500).json({ error: 'Failed to update integrations.' });
  }
};

// Called once at server startup to pre-load DB settings into module caches.
exports.initIntegrations = async () => {
  try {
    const s = await AppSettings.getOrCreate();
    if (s.googleServiceAccountJson) {
      sheetsUtil.setAdminServiceAccountJson(s.googleServiceAccountJson);
    }
    mailer.setAdminEmailSettings({
      emailProvider:  s.emailProvider,
      zeptomailToken: s.zeptomailToken,
      smtpHost:       s.smtpHost,
      smtpPort:       s.smtpPort,
      smtpUser:       s.smtpUser,
      smtpPass:       s.smtpPass,
      emailFrom:      s.emailFrom,
      emailFromName:  s.emailFromName,
    });
    console.log('[admin] Integrations loaded from DB.');
  } catch (err) {
    console.warn('[admin] Could not load integrations from DB:', err.message);
  }
};

function friendlyDubcallError(err) {
  const status = err.status || 502;
  return { status: status >= 400 && status < 600 ? status : 502, message: err.message || 'DubCall request failed.' };
}

exports.getDubcall = async (req, res) => {
  try {
    const status = await aiClients.getKeyStatus();
    res.json({ dubcall: status.dubcall });
  } catch (err) {
    console.error('admin getDubcall error:', err);
    res.status(500).json({ error: 'Failed to load DubCall settings.' });
  }
};

exports.updateDubcall = async (req, res) => {
  try {
    const { dubcallApiKey, dubcallWorkflowId, dubcallApiBase } = req.body || {};
    const update = { updatedAt: new Date(), updatedBy: req.userId };
    if (typeof dubcallApiKey === 'string') update.dubcallApiKey = dubcallApiKey.trim();
    if (typeof dubcallWorkflowId === 'string') update.dubcallWorkflowId = dubcallWorkflowId.trim();
    if (typeof dubcallApiBase === 'string') update.dubcallApiBase = dubcallApiBase.trim();
    if (
      update.dubcallApiKey === undefined
      && update.dubcallWorkflowId === undefined
      && update.dubcallApiBase === undefined
    ) {
      return res.status(400).json({ error: 'Provide a DubCall API key and/or workflow UID.' });
    }
    await AppSettings.findOneAndUpdate({}, update, { upsert: true, new: true });
    aiClients.bustCache();
    const status = await aiClients.getKeyStatus();
    res.json({ ok: true, dubcall: status.dubcall });
  } catch (err) {
    console.error('admin updateDubcall error:', err);
    res.status(500).json({ error: 'Failed to update DubCall settings.' });
  }
};

exports.listDubcallWorkflows = async (req, res) => {
  try {
    const cfg = await dubcall.loadDubcallConfig();
    const typedKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    if (typedKey) cfg.apiKey = typedKey;
    if (!cfg.apiKey) {
      return res.status(400).json({ error: 'Save or paste a DubCall API key first.' });
    }
    const workflows = await dubcall.listWorkflows(cfg);
    res.json({ workflows });
  } catch (err) {
    console.error('admin listDubcallWorkflows error:', err);
    const { status, message } = friendlyDubcallError(err);
    res.status(status).json({ error: message });
  }
};

exports.runDubcallWorkflow = async (req, res) => {
  try {
    const cfg = await dubcall.loadDubcallConfig();
    if (!cfg.apiKey) {
      return res.status(400).json({ error: 'Save a DubCall API key first.' });
    }
    const uid = (typeof req.body?.workflowId === 'string' && req.body.workflowId.trim())
      || cfg.workflowUid;
    if (!uid) {
      return res.status(400).json({ error: 'Save a workflow UID first.' });
    }
    const workflow = await dubcall.resolveWorkflow(uid, cfg);
    const run = await dubcall.createVoiceRun(
      workflow.id,
      cfg,
      `Rivet AI admin test · ${req.user?.username || 'admin'}`,
    );
    res.json({
      ok: true,
      workflow: { id: workflow.id, name: workflow.name, uuid: workflow.uuid || null },
      run: { id: run?.id, mode: run?.mode, name: run?.name },
    });
  } catch (err) {
    console.error('admin runDubcallWorkflow error:', err);
    const { status, message } = friendlyDubcallError(err);
    res.status(status).json({ error: message });
  }
};
