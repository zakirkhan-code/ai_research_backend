const Project = require('../models/Project');
const User = require('../models/User');

// Create New Project
const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      goals,
      objectives,
      deliverables,
      timeline,
      category,
      isPublic,
      tags
    } = req.body;

    // Clean the data
    const cleanGoals = goals.filter(goal => goal && goal.trim());
    const cleanObjectives = objectives.filter(obj => obj && obj.trim());
    // Create project (validation middleware already checked everything)
    const project = new Project({
      title: title.trim(),
      description: description.trim(),
      goals: cleanGoals.map(goal => goal.trim()),
      objectives: cleanObjectives.map(obj => obj.trim()),
      deliverables: deliverables || [],
      timeline: {
        startDate: new Date(timeline.startDate),
        endDate: new Date(timeline.endDate)
      },
      createdBy: req.user._id,
      category: category || 'research',
      isPublic: isPublic || false,
      tags: tags || []
    });

    // Add creator as project manager
    project.members.push({
      user: req.user._id,
      role: 'project_manager',
      permissions: {
        canEdit: true,
        canManageMembers: true,
        canUploadDocuments: true,
        canViewDocuments: true
      }
    });
    await project.save();

    // Populate user data
    await project.populate('createdBy', 'username email role affiliation');
    await project.populate('members.user', 'username email role affiliation');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });

  } catch (error) {
    console.error('=== PROJECT CREATION ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get User's Projects
const getUserProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    const userId = req.user._id;

    const query = {
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    };

    if (status) query.status = status;
    if (category) query.category = category;

    const projects = await Project.find(query)
      .populate('createdBy', 'username email role affiliation')
      .populate('members.user', 'username email role affiliation')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    const projectsWithRole = projects.map(project => {
      const userMember = project.members.find(
        member => member.user._id.toString() === userId.toString()
      );
      
      return {
        ...project.toObject(),
        userRole: userMember ? userMember.role : null,
        userPermissions: userMember ? userMember.permissions : null
      };
    });

    res.json({
      success: true,
      data: {
        projects: projectsWithRole,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProjects: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get projects'
    });
  }
};

// Get Single Project
const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(projectId)
      .populate('createdBy', 'username email role affiliation')
      .populate('members.user', 'username email role affiliation')
      .populate('tasks.assignedTo', 'username email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = project.createdBy._id.toString() === userId.toString() ||
                     project.members.some(member => member.user._id.toString() === userId.toString()) ||
                     project.isPublic;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get user's role and permissions
    const userMember = project.members.find(
      member => member.user._id.toString() === userId.toString()
    );

    const projectData = {
      ...project.toObject(),
      userRole: userMember ? userMember.role : 'viewer',
      userPermissions: userMember ? userMember.permissions : {
        canEdit: false,
        canManageMembers: false,
        canUploadDocuments: false,
        canViewDocuments: project.isPublic
      }
    };

    res.json({
      success: true,
      data: projectData
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project'
    });
  }
};

// Update Project
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const userMember = project.members.find(
      member => member.user._id.toString() === userId.toString()
    );

    const canEdit = project.createdBy.toString() === userId.toString() ||
                   (userMember && userMember.permissions.canEdit);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'goals', 'objectives', 
      'deliverables', 'timeline', 'status', 'category', 
      'isPublic', 'tags'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email role')
     .populate('members.user', 'username email role');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
};

// Add Project Member
const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, role = 'collaborator', permissions } = req.body;
    const userId = req.user._id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user can manage members
    const userMember = project.members.find(
      member => member.user._id.toString() === userId.toString()
    );

    const canManageMembers = project.createdBy.toString() === userId.toString() ||
                            (userMember && userMember.permissions.canManageMembers);

    if (!canManageMembers) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Find user to add
    const userToAdd = await User.findOne({ email }).select('-password');
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address'
      });
    }
    if (!userToAdd.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add user to project. User email is not verified.',
        details: 'The user must verify their email address before being added to any project.'
      });
    }

    // Check if user is already a member
    const existingMember = project.members.find(
      member => member.user.toString() === userToAdd._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project'
      });
    }

    // Add member
    const newMember = {
      user: userToAdd._id,
      role,
      permissions: permissions || {
        canEdit: role === 'project_manager',
        canManageMembers: role === 'project_manager',
        canUploadDocuments: true,
        canViewDocuments: true
      }
    };

    project.members.push(newMember);
    await project.save();

    await project.populate('members.user', 'username email role affiliation');

    res.json({
      success: true,
      message: 'Member added successfully',
      data: {
        member: {
          user: {
            id: userToAdd._id,
            username: userToAdd.username,
            email: userToAdd.email,
            role: userToAdd.role,
            affiliation: userToAdd.affiliation,
            isEmailVerified: userToAdd.isEmailVerified
          },
          projectRole: role,
          permissions: newMember.permissions,
          joinedAt: newMember.joinedAt
        }
      }
    });

  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member'
    });
  }
};

module.exports = {
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  addProjectMember
};