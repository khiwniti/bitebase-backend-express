const express = require('express');
const router = express.Router();
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticate
} = require('../middleware/auth');

// In-memory user storage for testing
const users = new Map();
const refreshTokens = new Map();

// Mock users for testing
const mockUser = {
  id: 1,
  email: 'demo@bitebase.com',
  password_hash: null, // Will be set on first login
  first_name: 'Demo',
  last_name: 'User',
  role: 'user',
  subscription_tier: 'pro',
  subscription_status: 'active',
  email_verified: true,
  created_at: new Date().toISOString()
};

const adminUser = {
  id: 'admin-001-bitebase-platform',
  email: 'admin@bitebase.app',
  password_hash: null, // Will be set on initialization
  first_name: 'BiteBase',
  last_name: 'Administrator',
  name: 'BiteBase Administrator',
  role: 'admin',
  userType: 'ORGANIZATION',
  subscription_tier: 'ENTERPRISE',
  subscription_status: 'active',
  isAdmin: true,
  isActive: true,
  email_verified: true,
  emailVerified: true,
  created_at: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Initialize mock users with hashed passwords
(async () => {
  mockUser.password_hash = await hashPassword('demo123');
  users.set(mockUser.email, mockUser);
  
  adminUser.password_hash = await hashPassword('Libralytics1234!*');
  users.set(adminUser.email, adminUser);
})();

/**
 * Register new user (mock)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, company } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user exists
    if (users.has(email)) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with proper ID
    const maxId = Math.max(...Array.from(users.values()).map(u => u.id), 0);
    const newUser = {
      id: maxId + 1,
      email,
      password_hash: passwordHash,
      first_name: first_name || '',
      last_name: last_name || '',
      phone: phone || '',
      company: company || '',
      role: 'user',
      subscription_tier: 'basic',
      subscription_status: 'trial',
      email_verified: false,
      created_at: new Date().toISOString()
    };

    users.set(email, newUser);

    // Generate tokens
    const token = generateToken(newUser.id, newUser.email, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    // Store refresh token
    refreshTokens.set(refreshToken, {
      user_id: newUser.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          subscription_tier: newUser.subscription_tier,
          subscription_status: newUser.subscription_status
        },
        token,
        refresh_token: refreshToken,
        expires_in: 604800 // 7 days in seconds
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

/**
 * Login user (mock)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.last_login = new Date().toISOString();

    // Generate tokens
    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    refreshTokens.set(refreshToken, {
      user_id: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.first_name} ${user.last_name}`.trim() || user.email.split('@')[0],
          subscription_tier: user.subscription_tier,
          subscription_status: user.subscription_status
        },
        token,
        refresh_token: refreshToken,
        expires_in: 604800 // 7 days in seconds
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

/**
 * Google OAuth login (mock)
 */
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Mock Google user
    const googleUser = {
      id: 999,
      email: 'google.user@gmail.com',
      first_name: 'Google',
      last_name: 'User',
      role: 'user',
      subscription_tier: 'basic',
      subscription_status: 'trial',
      email_verified: true,
      google_id: 'google-123456',
      created_at: new Date().toISOString()
    };

    // Store or update user
    users.set(googleUser.email, googleUser);

    // Generate tokens
    const authToken = generateToken(googleUser.id, googleUser.email, googleUser.role);
    const refreshToken = generateRefreshToken(googleUser.id);

    // Store refresh token
    refreshTokens.set(refreshToken, {
      user_id: googleUser.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({
      success: true,
      data: {
        user: {
          id: googleUser.id,
          email: googleUser.email,
          role: googleUser.role,
          name: `${googleUser.first_name} ${googleUser.last_name}`,
          subscription_tier: googleUser.subscription_tier,
          subscription_status: googleUser.subscription_status
        },
        token: authToken,
        refresh_token: refreshToken,
        expires_in: 604800
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

/**
 * Get current user (mock)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // Find user by ID
    let user = null;
    for (const [email, u] of users) {
      if (u.id === req.user.id) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email.split('@')[0],
        role: user.role,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        email_verified: user.email_verified,
        created_at: user.created_at,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

/**
 * Refresh token (mock)
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refresh_token);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if token exists
    const tokenData = refreshTokens.get(refresh_token);
    if (!tokenData || tokenData.expires_at < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user
    let user = null;
    for (const [email, u] of users) {
      if (u.id === tokenData.user_id) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.id, user.email, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Delete old refresh token
    refreshTokens.delete(refresh_token);

    // Store new refresh token
    refreshTokens.set(newRefreshToken, {
      user_id: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token: newToken,
        refresh_token: newRefreshToken,
        expires_in: 604800
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
});

/**
 * Logout (mock)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Delete all refresh tokens for the user
    for (const [token, data] of refreshTokens) {
      if (data.user_id === req.user.id) {
        refreshTokens.delete(token);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * Request password reset (mock)
 */
router.post('/password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = users.get(email);

    // Don't reveal if user exists
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      // For testing purposes
      debug: process.env.NODE_ENV === 'development' && user ? {
        resetToken: 'mock-reset-token-123456'
      } : undefined
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

/**
 * Verify email (mock)
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

// Export mock data for testing
router._mockData = {
  users,
  refreshTokens,
  mockUser
};

module.exports = router;