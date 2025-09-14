const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { publishMessage } = require('../config/rabbitmq');
const { authenticateToken, requireVerified } = require('../middleware/auth');
const { validateUserRegistration } = require('../middleware/validation');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.execute(
      `SELECT id, email, first_name, last_name, role, phone, address, city, state, 
              country, postal_code, is_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user: users[0] }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, city, state, country, postalCode } = req.body;
    const pool = getPool();
    
    await pool.execute(
      `UPDATE users SET 
       first_name = COALESCE(?, first_name),
       last_name = COALESCE(?, last_name),
       phone = COALESCE(?, phone),
       address = COALESCE(?, address),
       city = COALESCE(?, city),
       state = COALESCE(?, state),
       country = COALESCE(?, country),
       postal_code = COALESCE(?, postal_code)
       WHERE id = ?`,
      [firstName, lastName, phone, address, city, state, country, postalCode, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const pool = getPool();
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, first_name FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }
    
    const user = users[0];
    
    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store reset token
    await pool.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );
    
    // Send reset email
    await publishMessage('email_notifications', {
      type: 'password_reset',
      to: email,
      data: {
        firstName: user.first_name,
        resetToken,
        userId: user.id
      }
    });
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const pool = getPool();
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Find user with valid reset token
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    const userId = users[0].id;
    
    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password and clear reset token
    await pool.execute(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
      [hashedPassword, userId]
    );
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    
    // Check if user is already verified
    if (req.user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Generate new verification token
    const verificationToken = uuidv4();
    
    // Update verification token
    await pool.execute(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [verificationToken, req.user.id]
    );
    
    // Send verification email
    await publishMessage('email_notifications', {
      type: 'verification',
      to: req.user.email,
      data: {
        firstName: req.user.first_name,
        verificationToken,
        userId: req.user.id
      }
    });
    
    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email'
    });
  }
});

// Delete account (GDPR compliance)
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const pool = getPool();
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }
    
    // Verify password
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isPasswordValid = await bcrypt.compare(password, users[0].password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }
    
    // Check if user has active orders
    const [orders] = await pool.execute(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status IN ("pending", "paid")',
      [req.user.id]
    );
    
    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with active orders. Please cancel or complete your orders first.'
      });
    }
    
    // Delete user (cascade will handle related records)
    await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

// Export user data (GDPR compliance)
router.get('/export-data', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;
    
    // Get user data
    const [users] = await pool.execute(
      `SELECT id, email, first_name, last_name, role, phone, address, city, state, 
              country, postal_code, is_verified, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );
    
    // Get orders
    const [orders] = await pool.execute(
      `SELECT o.*, e.title as event_title
       FROM orders o
       JOIN events e ON o.event_id = e.id
       WHERE o.user_id = ?`,
      [userId]
    );
    
    // Get tickets
    const [tickets] = await pool.execute(
      `SELECT t.*, tt.name as tier_name, e.title as event_title
       FROM tickets t
       JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
       JOIN events e ON tt.event_id = e.id
       WHERE t.order_id IN (SELECT id FROM orders WHERE user_id = ?)`,
      [userId]
    );
    
    const userData = {
      user: users[0],
      orders,
      tickets,
      exportedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user data'
    });
  }
});

module.exports = router;
