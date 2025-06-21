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
    const { page = 1, limit = 10, status, category, search } = req.query;
    const userId = req.user._id;

    console.log('Getting user projects with params:', { page, limit, status, category, search });

    const query = {
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    };

    // Add status filter
    if (status) query.status = status;
    
    // Add category filter
    if (category) query.category = category;
    
    // Add search filter - ONLY on title field
    if (search && search.trim()) {
      query.title = {
        $regex: search.trim(),
        $options: 'i' // Case insensitive
      };
    }

    console.log('Final database query:', JSON.stringify(query, null, 2));

    const projects = await Project.find(query)
      .populate('createdBy', 'username email role affiliation')
      .populate('members.user', 'username email role affiliation')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    console.log(`Found ${projects.length} projects out of ${total} total matching criteria`);

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
      },
      message: search ? `Found ${total} projects matching title: "${search}"` : `Found ${total} projects`
    });

  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    console.log('Updating project:', projectId, 'with data:', updateData);

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

    // Clean the data before update
    if (updates.goals) {
      updates.goals = updates.goals.filter(goal => goal && goal.trim());
    }
    if (updates.objectives) {
      updates.objectives = updates.objectives.filter(obj => obj && obj.trim());
    }

    console.log('Processing updates:', updates);

    // Update project with validation
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { 
        ...updates,
        updatedAt: new Date() // Force update timestamp
      },
      { 
        new: true, 
        runValidators: true,
        lean: false // Ensure we get a full mongoose document
      }
    ).populate('createdBy', 'username email role affiliation')
     .populate('members.user', 'username email role affiliation');

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found after update'
      });
    }

    // Add user role and permissions to response
    const updatedUserMember = updatedProject.members.find(
      member => member.user._id.toString() === userId.toString()
    );

    const responseData = {
      ...updatedProject.toObject(),
      userRole: updatedUserMember ? updatedUserMember.role : 'viewer',
      userPermissions: updatedUserMember ? updatedUserMember.permissions : {
        canEdit: false,
        canManageMembers: false,
        canUploadDocuments: false,
        canViewDocuments: updatedProject.isPublic
      }
    };

    console.log('Project updated successfully');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Also update the addProjectMember function for better performance
const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, role = 'collaborator', permissions } = req.body;
    const userId = req.user._id;

    console.log('Adding member to project:', projectId, 'Email:', email, 'Role:', role);

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
    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() }).select('-password');
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

    // Add member with role-based permissions
    const rolePermissions = {
      project_manager: {
        canEdit: true,
        canManageMembers: true,
        canUploadDocuments: true,
        canViewDocuments: true
      },
      researcher: {
        canEdit: true,
        canManageMembers: false,
        canUploadDocuments: true,
        canViewDocuments: true
      },
      collaborator: {
        canEdit: false,
        canManageMembers: false,
        canUploadDocuments: true,
        canViewDocuments: true
      },
      viewer: {
        canEdit: false,
        canManageMembers: false,
        canUploadDocuments: false,
        canViewDocuments: true
      }
    };

    const newMember = {
      user: userToAdd._id,
      role,
      permissions: permissions || rolePermissions[role] || rolePermissions.collaborator,
      joinedAt: new Date()
    };

    project.members.push(newMember);
    project.updatedAt = new Date(); // Force update timestamp
    await project.save();

    // Populate the new member data
    await project.populate('members.user', 'username email role affiliation');

    console.log('Member added successfully');

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
        },
        totalMembers: project.members.length
      }
    });

  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getPublicProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;

    console.log('=== PUBLIC PROJECTS REQUEST ===');
    console.log('User authenticated:', !!req.user);
    console.log('Request params:', { page, limit, category });

    const query = {
      isPublic: true,
      status: { $in: ['active', 'planning', 'completed'] } // Exclude cancelled projects
    };

    if (category) query.category = category;

    console.log('Database query:', query);

    const projects = await Project.find(query)
      .populate({
        path: 'createdBy',
        select: 'username email role affiliation',
        options: { lean: true }
      })
      .populate({
        path: 'members.user',
        select: 'username email role affiliation',
        options: { lean: true }
      })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    console.log(`Found ${projects.length} public projects out of ${total} total`);
    console.log('Projects found:', projects.map(p => ({ id: p._id, title: p.title, isPublic: p.isPublic })));

    // Add member count and basic stats to each project
    const projectsWithStats = projects.map(project => {
      const projectObj = project.toObject();
      return {
        ...projectObj,
        memberCount: project.members?.length || 0,
        goalCount: project.goals?.length || 0,
        objectiveCount: project.objectives?.length || 0,
        // Check if current user (if authenticated) is already a member
        isJoined: req.user ? project.members.some(
          member => member.user._id.toString() === req.user._id.toString()
        ) : false
      };
    });

    console.log('=== SENDING RESPONSE ===');
    console.log('Projects count:', projectsWithStats.length);

    res.json({
      success: true,
      data: {
        projects: projectsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProjects: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      },
      message: `Found ${projectsWithStats.length} public projects`
    });

  } catch (error) {
    console.error('=== PUBLIC PROJECTS ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get public projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Request to Join Public Project
const requestJoinProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    console.log('User', userId, 'requesting to join project', projectId);

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'This is not a public project'
      });
    }

    // Check if user is already a member
    const existingMember = project.members.find(
      member => member.user.toString() === userId.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this project'
      });
    }

    // Add user as collaborator to public project
    const newMember = {
      user: userId,
      role: 'collaborator',
      permissions: {
        canEdit: false,
        canManageMembers: false,
        canUploadDocuments: true,
        canViewDocuments: true
      },
      joinedAt: new Date()
    };

    project.members.push(newMember);
    project.updatedAt = new Date();
    await project.save();

    await project.populate('members.user', 'username email role affiliation');

    console.log('User successfully joined project');

    res.json({
      success: true,
      message: 'Successfully joined the project',
      data: {
        project: {
          id: project._id,
          title: project.title,
          memberCount: project.members.length
        }
      }
    });

  } catch (error) {
    console.error('Join project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  addProjectMember,
  getPublicProjects,
  requestJoinProject,
};