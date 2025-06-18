const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['project_manager', 'researcher', 'collaborator', 'viewer'],
    default: 'collaborator'
  },
  permissions: {
    canEdit: { type: Boolean, default: false },
    canManageMembers: { type: Boolean, default: false },
    canUploadDocuments: { type: Boolean, default: true },
    canViewDocuments: { type: Boolean, default: true }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'on_hold'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  goals: [{
    type: String,
    required: true
  }],
  objectives: [{
    type: String,
    required: true
  }],
  deliverables: [{
    title: String,
    description: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    }
  }],
  timeline: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [projectMemberSchema],
  tasks: [taskSchema],
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  category: {
    type: String,
    enum: ['research', 'development', 'analysis', 'collaboration', 'other'],
    default: 'research'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ createdBy: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);