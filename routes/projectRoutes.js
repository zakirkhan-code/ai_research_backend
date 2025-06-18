const express = require('express');
const {
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  addProjectMember
} = require('../controllers/projectController');
const { authenticateToken, requireVerifiedEmail } = require('../middleware/authMiddleware');
const { validateCreateProject } = require('../middleware/validation');

const router = express.Router();
router.use(authenticateToken);
router.use(requireVerifiedEmail);
router.post('/', validateCreateProject, createProject);
router.get('/', getUserProjects);
router.get('/:projectId', getProject);
router.put('/:projectId', updateProject);
router.post('/:projectId/members', addProjectMember);

module.exports = router;