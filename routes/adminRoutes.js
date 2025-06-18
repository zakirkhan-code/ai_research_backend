const express = require('express');
const { getAllUsers, getUserStats } = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);
router.get('/users', getAllUsers);
router.get('/stats', getUserStats);

module.exports = router;