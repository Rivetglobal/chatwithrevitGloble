const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional. When set, this conversation belongs to a Project chat instead of
  // the main Compliance House chat. The main-chat list filters this out.
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, projectId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
