const User = require('../models/User');

// Get User Profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        affiliation: user.affiliation,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  try {
    const { username, affiliation } = req.body;
    const userId = req.user._id;

    // Validation
    const errors = [];
    if (username && username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (affiliation && affiliation.trim().length < 2) {
      errors.push('Affiliation must be at least 2 characters long');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username.trim();
    if (affiliation) updateData.affiliation = affiliation.trim();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        affiliation: updatedUser.affiliation,
        isEmailVerified: updatedUser.isEmailVerified,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Get Dashboard Data
const getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const dashboardData = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        affiliation: user.affiliation
      },
      stats: {
        totalProjects: 0,
        totalDocuments: 0,
        totalCollaborations: 0,
        recentActivity: []
      },
      quickActions: [
        {
          title: 'Create New Project',
          description: 'Start a new research project',
          action: 'create_project',
          icon: 'project'
        },
        {
          title: 'Upload Document',
          description: 'Share research documents',
          action: 'upload_document',
          icon: 'upload'
        },
        {
          title: 'Join Discussion',
          description: 'Participate in research discussions',
          action: 'join_discussion',
          icon: 'discussion'
        }
      ],
      recentNotifications: [
        {
          id: 1,
          type: 'welcome',
          title: 'Welcome to AI Research Hub!',
          message: 'Your account has been successfully verified.',
          timestamp: new Date(),
          read: false
        }
      ]
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
};
const checkUserStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const user = await User.findOne({ email }).select('username email role affiliation isEmailVerified createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
          affiliation: user.affiliation,
          isEmailVerified: user.isEmailVerified,
          canBeAddedToProject: user.isEmailVerified,
          memberSince: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Check user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check user status'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  checkUserStatus
};