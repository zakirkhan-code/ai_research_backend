const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `http://localhost:3000/verify-email/${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification - AI Research Hub',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Welcome to AI Research Hub!</h2>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p><small>This link will expire in 24 hours.</small></p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};
const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `http://localhost:3000/reset-password/${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - AI Research Hub',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your AI Research Hub account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="background-color: #dc3545; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><small>This link will expire in 1 hour.</small></p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">
          If you didn't request this password reset, please ignore this email.
        </p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { 
  sendVerificationEmail, 
  sendPasswordResetEmail 
};
