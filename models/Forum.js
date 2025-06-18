const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowFileAttachments: { type: Boolean, default: true },
    requireModeration: { type: Boolean, default: false },
    allowAnonymous: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Forum', forumSchema);