const express = require('express');
const { 
  register, 
  verifyEmail, 
  login, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');
const { 
  validateRegistration, 
  validateLogin, 
  validateForgotPassword,
  validateResetPassword 
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', validateRegistration, register);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);

module.exports = router;
