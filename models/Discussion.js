const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  forum: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forum',
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
  tags: [String],
  attachments: [{
    fileName: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'archived', 'deleted'],
    default: 'active'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  replyCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

discussionSchema.index({ forum: 1, createdAt: -1 });
discussionSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model('Discussion', discussionSchema);