const express = require('express');
const { getProfile, updateProfile, getDashboard , checkUserStatus} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticateToken);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);
router.get('/check-status', checkUserStatus);

module.exports = router;