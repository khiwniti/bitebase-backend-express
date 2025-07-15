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

// This will be set by the main app
let pool = null;

// Function to set the database pool
const setPool = (dbPool) => {
  pool = dbPool;
};

/**
 * Login endpoint
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

    // For demo purposes, handle demo credentials directly
    if (email === 'demo@bitebase.com' && password === 'demo123') {
      const user = {
        id: 'demo-user-1',
        email: 'demo@bitebase.com',
        full_name: 'Demo User',
        role: 'restaurant_owner',
        subscription_tier: 'pro',
        is_active: true,
        email_verified: true
      };

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          subscription_tier: user.subscription_tier
        },
        token,
        refreshToken
      });
    }

    // For admin credentials
    if (email === 'admin@bitebase.app' && password === 'Libralytics1234!*') {
      const user = {
        id: 'admin-user-1',
        email: 'admin@bitebase.app',
        full_name: 'BiteBase Administrator',
        role: 'admin',
        subscription_tier: 'enterprise',
        is_active: true,
        email_verified: true
      };

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          subscription_tier: user.subscription_tier
        },
        token,
        refreshToken
      });
    }

    // If we have a database pool, try to query it
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (result.rows && result.rows.length > 0) {
          const user = result.rows[0];
          // For now, just check if user exists and return success
          // In production, you'd verify the password hash
          const token = generateToken(user);
          const refreshToken = generateRefreshToken(user);

          return res.json({
            success: true,
            message: 'Login successful',
            user: {
              id: user.id,
              email: user.email,
              name: user.full_name,
              role: user.role,
              subscription_tier: user.subscription_tier
            },
            token,
            refreshToken
          });
        }
      } catch (dbError) {
        console.error('Database query error:', dbError);
      }
    }

    // Invalid credentials
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Register endpoint
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // For demo purposes, just return success
    const user = {
      id: `user-${Date.now()}`,
      email,
      full_name: name,
      role: 'restaurant_owner',
      subscription_tier: 'basic',
      is_active: true,
      email_verified: false
    };

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        subscription_tier: user.subscription_tier
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Refresh token endpoint
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    // Generate new tokens
    const newToken = generateToken(decoded);
    const newRefreshToken = generateRefreshToken(decoded);

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * Logout endpoint
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a real implementation, you'd invalidate the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Get current user endpoint
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
module.exports.setPool = setPool;