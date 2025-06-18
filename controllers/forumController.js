const Forum = require('../models/Forum');
const Discussion = require('../models/Discussion');
const Reply = require('../models/Reply');
const Project = require('../models/Project');

// Create forum for project
const createForum = async (req, res) => {
  try {

    const { projectId } = req.params;
    const { title, description } = req.body;

    // Validate input
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check if user is project member
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    ) || project.createdBy.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const forum = new Forum({
      title,
      description,
      project: projectId,
      createdBy: req.user._id,
      moderators: [req.user._id]
    });

    await forum.save();
    await forum.populate('createdBy', 'username email');

    res.status(201).json({ success: true, data: forum });
  } catch (error) {
    console.error('Create forum error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get project forums
const getProjectForums = async (req, res) => {
  try {
    const { projectId } = req.params;

    const forums = await Forum.find({ project: projectId, isActive: true })
      .populate('createdBy', 'username email')
      .populate('moderators', 'username email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: forums });
  } catch (error) {
    console.error('Get forums error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create discussion
const createDiscussion = async (req, res) => {
  try {

    const { forumId } = req.params;
    const { title, content, tags } = req.body;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and content are required' 
      });
    }

    const forum = await Forum.findById(forumId).populate('project');
    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    // Check permissions
    const project = forum.project;
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    ) || project.createdBy.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype
        });
      });
    }

    const discussion = new Discussion({
      title,
      content,
      forum: forumId,
      project: forum.project._id,
      createdBy: req.user._id,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      attachments
    });

    await discussion.save();
    await discussion.populate('createdBy', 'username email');

    res.status(201).json({ success: true, data: discussion });
  } catch (error) {
    console.error('Create discussion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get forum discussions
const getForumDiscussions = async (req, res) => {
  try {
    const { forumId } = req.params;
    const { page = 1, limit = 10, status = 'active', search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = { forum: forumId, status };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const [discussions, totalDiscussions] = await Promise.all([
      Discussion.find(query)
        .populate('createdBy', 'username email')
        .sort({ isPinned: -1, lastActivity: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Discussion.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalDiscussions / parseInt(limit));

    res.json({
      success: true,
      data: {
        discussions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDiscussions,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get discussion with replies
const getDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await Discussion.findById(discussionId)
      .populate('createdBy', 'username email')
      .populate('forum', 'title');

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    // Increment view count
    discussion.viewCount += 1;
    await discussion.save();

    // Get replies
    const replies = await Reply.find({ discussion: discussionId, status: 'active' })
      .populate('author', 'username email')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        discussion,
        replies
      }
    });
  } catch (error) {
    console.error('Get discussion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create reply
const createReply = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content, parentReply } = req.body;

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    if (discussion.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Discussion is closed' });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype
        });
      });
    }

    const reply = new Reply({
      content,
      discussion: discussionId,
      author: req.user._id,
      parentReply: parentReply || null,
      attachments
    });

    await reply.save();
    await reply.populate('author', 'username email');

    // Update discussion reply count and last activity
    discussion.replyCount += 1;
    discussion.lastActivity = new Date();
    await discussion.save();

    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    console.error('Create reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDiscussionReplies = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get replies with author info, sorted by creation date
    const replies = await Reply.find({ 
      discussion: discussionId, 
      status: 'active' 
    })
    .populate('author', 'username email profilePicture')
    .populate('parentReply', 'content author createdAt')
    .sort({ createdAt: 1 }) // Oldest first for threaded conversation
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count
    const totalReplies = await Reply.countDocuments({ 
      discussion: discussionId, 
      status: 'active' 
    });

    // Organize replies into threaded structure
    const organizedReplies = organizeRepliesIntoThreads(replies);

    res.json({
      success: true,
      data: {
        replies: organizedReplies,
        totalReplies,
        hasMore: (skip + replies.length) < totalReplies
      }
    });

  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to organize replies into threaded structure
const organizeRepliesIntoThreads = (replies) => {
  const threaded = [];
  const repliesMap = new Map();

  // First pass: create map of all replies
  replies.forEach(reply => {
    repliesMap.set(reply._id.toString(), {
      ...reply.toObject(),
      children: []
    });
  });

  // Second pass: organize into threads
  replies.forEach(reply => {
    const replyObj = repliesMap.get(reply._id.toString());
    
    if (reply.parentReply) {
      // This is a nested reply
      const parentId = reply.parentReply._id.toString();
      const parent = repliesMap.get(parentId);
      if (parent) {
        parent.children.push(replyObj);
      }
    } else {
      // This is a top-level reply
      threaded.push(replyObj);
    }
  });

  return threaded;
};

// Update reply
const updateReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;

    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    // Check if user is the author
    if (reply.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own replies' });
    }

    // Update reply
    reply.content = content;
    reply.isEdited = true;
    reply.editedAt = new Date();
    await reply.save();

    await reply.populate('author', 'username email');

    res.json({ success: true, data: reply });
  } catch (error) {
    console.error('Update reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete reply
const deleteReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }
    if (reply.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own replies' });
    }

    // Soft delete
    reply.status = 'deleted';
    await reply.save();

    // Update discussion reply count
    const discussion = await Discussion.findById(reply.discussion);
    if (discussion) {
      discussion.replyCount = Math.max(0, discussion.replyCount - 1);
      await discussion.save();
    }

    res.json({ success: true, message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createForum,
  getProjectForums,
  createDiscussion,
  getForumDiscussions,
  getDiscussion,
  createReply,
  getDiscussionReplies,
  updateReply,             
  deleteReply
};
