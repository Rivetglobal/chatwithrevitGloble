const mongoose = require('mongoose');

// Single-document collection holding admin-controlled global settings.
// Sensitive values are stored in plaintext (the DB is the trust boundary).
// API responses NEVER return raw values — only masked previews and status flags.
const appSettingsSchema = new mongoose.Schema({
  // AI keys
  geminiApiKey: { type: String, default: '' },
  openaiApiKey: { type: String, default: '' },

  // DubCall AI (voice agents) — key stays on the server; never returned raw
  dubcallApiKey: { type: String, default: '' },
  dubcallWorkflowId: { type: String, default: '' },
  dubcallApiBase: { type: String, default: '' },

  // Google Service Account JSON (full JSON string)
  googleServiceAccountJson: { type: String, default: '' },

  // Email / Password-reset settings
  emailProvider: { type: String, default: '' }, // 'zepto' | 'smtp' | ''
  zeptomailToken: { type: String, default: '' },
  smtpHost:       { type: String, default: '' },
  smtpPort:       { type: String, default: '' },
  smtpUser:       { type: String, default: '' },
  smtpPass:       { type: String, default: '' },
  emailFrom:      { type: String, default: '' },
  emailFromName:  { type: String, default: '' },

  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

appSettingsSchema.statics.getOrCreate = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);
