const AppSettings = require('../models/AppSettings');
const aiClients   = require('../utils/aiClients');
const sheetsUtil  = require('../utils/googleSheets');
const mailer      = require('../utils/mailer');

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
    const { geminiApiKey, openaiApiKey } = req.body || {};
    const update = { updatedAt: new Date(), updatedBy: req.userId };
    if (typeof geminiApiKey === 'string') update.geminiApiKey = geminiApiKey.trim();
    if (typeof openaiApiKey  === 'string') update.openaiApiKey  = openaiApiKey.trim();
    if (update.geminiApiKey === undefined && update.openaiApiKey === undefined) {
      return res.status(400).json({ error: 'Provide geminiApiKey and/or openaiApiKey.' });
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
