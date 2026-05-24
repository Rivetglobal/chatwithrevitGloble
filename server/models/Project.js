const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String },
  sizeBytes: { type: Number, default: 0 },
  kind: { type: String, enum: ['spreadsheet', 'document'], default: 'spreadsheet' },
  sheets: [{
    name: { type: String, required: true },
    columns: [{ type: String }],
    rowCount: { type: Number, default: 0 },
    rows: { type: mongoose.Schema.Types.Mixed, default: [] },
  }],
  text: { type: String, default: '' },
  charCount: { type: Number, default: 0 },
  sourceUrl: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
});

const bookingSheetSchema = new mongoose.Schema({
  provider: { type: String, enum: ['google'], default: 'google' },
  sheetId: { type: String, required: true },
  sheetUrl: { type: String, default: '' },
  sheetTitle: { type: String, default: '' },
  // Detected booking-tab name + the rest of its schema. The sheet does NOT
  // need a fixed structure; we auto-detect at link time and re-detect on
  // demand if the structure changes.
  tabName: { type: String, default: '' },
  headerCount: { type: Number, default: 0 },
  headers: { type: [String], default: [] },
  // columnMap is { date: 0, time: 1, name: 3, status: 5, ... } with 0-based
  // indices. Missing fields are absent from the map.
  columnMap: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Optional Settings tab (any name containing "setting").
  settingsTabName: { type: String, default: '' },
  // Snapshot of the whole spreadsheet at link-time: every tab's name,
  // headers, and a few sample rows. Powers the dynamic system-prompt for
  // generic sheet-as-AI-backend chats.
  snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  validatedAt: { type: Date, default: Date.now },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, default: 'Untitled project' },
  description: { type: String, default: '' },
  responseMode: { type: String, enum: ['short', 'detailed'], default: 'short' },
  responseSpeed: { type: String, enum: ['fast', 'medium', 'deep'], default: 'fast' },
  instructions: { type: String, default: '', maxlength: 4000 },
  mode: { type: String, enum: ['chat', 'booking'], default: 'chat' },
  bookingSheet: { type: bookingSheetSchema, default: null },
  sources: [sourceSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

projectSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
