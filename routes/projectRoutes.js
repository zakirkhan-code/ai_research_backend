// projectRoutes.js - Alternative approach with individual middleware

const express = require('express');
const {
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  addProjectMember,
  getPublicProjects,        
  requestJoinProject        
} = require('../controllers/projectController');
const { authenticateToken, requireVerifiedEmail } = require('../middleware/authMiddleware');
const { validateCreateProject } = require('../middleware/validation');

const router = express.Router();

// ==================== PUBLIC ROUTES (NO MIDDLEWARE) ====================
router.get('/public', getPublicProjects);  // Completely public

// ==================== PROTECTED ROUTES (INDIVIDUAL MIDDLEWARE) ====================
// Apply middleware individually to each protected route
router.post('/', 
  authenticateToken, 
  requireVerifiedEmail, 
  validateCreateProject, 
  createProject
);

router.get('/', 
  authenticateToken, 
  requireVerifiedEmail, 
  getUserProjects
);

router.get('/:projectId', 
  authenticateToken, 
  requireVerifiedEmail, 
  getProject
);

router.put('/:projectId', 
  authenticateToken, 
  requireVerifiedEmail, 
  updateProject
);

router.post('/:projectId/members', 
  authenticateToken, 
  requireVerifiedEmail, 
  addProjectMember
);

router.post('/:projectId/join', 
  authenticateToken, 
  requireVerifiedEmail, 
  requestJoinProject
);

module.exports = router;