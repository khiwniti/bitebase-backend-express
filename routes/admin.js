const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  requireAdmin, 
  canManageSEO, 
  canManageBlog,
  canManageMarketing 
} = require('../middleware/admin');
const { getSystemHealth, getPerformanceMetrics, checkAlerts } = require('../middleware/monitoring');

/**
 * Admin Dashboard
 */
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    // Mock dashboard data
    const dashboardData = {
      stats: {
        totalUsers: 1250,
        activeRestaurants: 89,
        blogPosts: 45,
        seoScore: 87
      },
      recentActivity: [
        { type: 'blog_published', title: 'Top 10 Restaurant Analytics Tools', date: new Date() },
        { type: 'seo_updated', page: 'Homepage', changes: 'Meta tags optimized', date: new Date() },
        { type: 'user_registered', email: 'newrestaurant@example.com', date: new Date() }
      ],
      seoMetrics: {
        organicTraffic: 15420,
        keywordRankings: 234,
        backlinks: 1892,
        pageSpeed: 92
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

/**
 * SEO Management Routes
 */
router.get('/seo/overview', authenticate, canManageSEO, async (req, res) => {
  try {
    const seoData = {
      pages: [
        { 
          url: '/', 
          title: 'BiteBase - Restaurant Analytics Platform',
          metaDescription: 'Advanced analytics and insights for restaurants',
          keywords: ['restaurant analytics', 'food service data', 'restaurant insights'],
          score: 92
        },
        {
          url: '/features',
          title: 'Features - BiteBase',
          metaDescription: 'Discover powerful features for restaurant management',
          keywords: ['restaurant features', 'analytics tools', 'reporting'],
          score: 88
        }
      ],
      keywords: {
        tracked: 45,
        improved: 28,
        declined: 5,
        new: 12
      }
    };

    res.json({
      success: true,
      data: seoData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching SEO data',
      error: error.message
    });
  }
});

router.put('/seo/page/:pageId', authenticate, canManageSEO, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { title, metaDescription, keywords, canonicalUrl } = req.body;

    // Mock update
    res.json({
      success: true,
      message: 'SEO settings updated successfully',
      data: {
        pageId,
        title,
        metaDescription,
        keywords,
        canonicalUrl,
        updatedBy: req.user.email,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating SEO settings',
      error: error.message
    });
  }
});

/**
 * Blog Management Routes
 */
router.get('/blog/posts', authenticate, canManageBlog, async (req, res) => {
  try {
    const posts = [
      {
        id: 1,
        title: 'How to Optimize Your Restaurant Menu with Data',
        slug: 'optimize-restaurant-menu-data',
        author: 'Admin User',
        status: 'published',
        views: 1234,
        seoScore: 95,
        publishedAt: new Date('2025-01-15'),
        categories: ['Analytics', 'Menu Management']
      },
      {
        id: 2,
        title: 'Restaurant SEO: A Complete Guide for 2025',
        slug: 'restaurant-seo-guide-2025',
        author: 'Admin User',
        status: 'draft',
        views: 0,
        seoScore: 78,
        publishedAt: null,
        categories: ['SEO', 'Marketing']
      }
    ];

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog posts',
      error: error.message
    });
  }
});

router.post('/blog/posts', authenticate, canManageBlog, async (req, res) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      categories, 
      tags,
      metaTitle,
      metaDescription,
      featuredImage 
    } = req.body;

    // Mock create
    const newPost = {
      id: Date.now(),
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      content,
      excerpt,
      categories,
      tags,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      featuredImage,
      author: req.user.email,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: newPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating blog post',
      error: error.message
    });
  }
});

router.put('/blog/posts/:postId', authenticate, canManageBlog, async (req, res) => {
  try {
    const { postId } = req.params;
    const updates = req.body;

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      data: {
        id: postId,
        ...updates,
        updatedBy: req.user.email,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating blog post',
      error: error.message
    });
  }
});

router.post('/blog/posts/:postId/publish', authenticate, canManageBlog, async (req, res) => {
  try {
    const { postId } = req.params;

    res.json({
      success: true,
      message: 'Blog post published successfully',
      data: {
        id: postId,
        status: 'published',
        publishedAt: new Date(),
        publishedBy: req.user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error publishing blog post',
      error: error.message
    });
  }
});

/**
 * Marketing Management Routes
 */
router.get('/marketing/campaigns', authenticate, canManageMarketing, async (req, res) => {
  try {
    const campaigns = [
      {
        id: 1,
        name: 'Summer Restaurant Promotion',
        type: 'email',
        status: 'active',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-08-31'),
        metrics: {
          sent: 5420,
          opened: 2168,
          clicked: 651,
          converted: 89
        }
      },
      {
        id: 2,
        name: 'New Feature Launch',
        type: 'social',
        status: 'scheduled',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        metrics: null
      }
    ];

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching marketing campaigns',
      error: error.message
    });
  }
});

/**
 * User Management Routes
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    // Mock user list
    const users = [
      {
        id: 1,
        email: 'demo@bitebase.com',
        role: 'user',
        subscription_tier: 'pro',
        created_at: new Date('2025-01-01')
      },
      {
        id: 2,
        email: 'admin@bitebase.app',
        role: 'admin',
        subscription_tier: 'enterprise',
        created_at: new Date('2025-01-01')
      }
    ];

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

/**
 * System Configuration Routes
 */
router.get('/config', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = {
      seo: {
        defaultMetaTitle: 'BiteBase - Restaurant Analytics Platform',
        defaultMetaDescription: 'Advanced analytics and insights for restaurants',
        googleAnalyticsId: 'UA-XXXXXXXXX',
        googleSearchConsoleVerification: 'verification-code'
      },
      blog: {
        postsPerPage: 10,
        enableComments: false,
        moderationRequired: true
      },
      email: {
        provider: 'sendgrid',
        fromEmail: 'noreply@bitebase.com',
        fromName: 'BiteBase'
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system configuration',
      error: error.message
    });
  }
});

/**
 * Enterprise Monitoring Routes
 */

// System health endpoint
router.get('/system/health', authenticate, requireAdmin, async (req, res) => {
  try {
    const health = getSystemHealth();
    const alerts = checkAlerts();
    
    res.json({
      success: true,
      data: {
        ...health,
        alerts: alerts,
        alertCount: alerts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system health',
      error: error.message
    });
  }
});

// Performance metrics endpoint
router.get('/system/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const metrics = getPerformanceMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching performance metrics',
      error: error.message
    });
  }
});

// Security audit logs endpoint
router.get('/security/audit-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, userId, action } = req.query;
    
    // Mock audit logs (in production, fetch from database)
    const auditLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        userId: 'user_123',
        userEmail: 'admin@bitebase.com',
        action: 'LOGIN',
        resource: '/api/auth/login',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        success: true,
        details: { method: 'email' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        userId: 'user_456',
        userEmail: 'user@restaurant.com',
        action: 'CREATE_ANALYSIS',
        resource: '/api/ai/market-analysis',
        ip: '10.0.0.50',
        userAgent: 'Mozilla/5.0...',
        success: true,
        details: { location: 'New York, NY', analysisType: 'market' }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        userId: 'user_789',
        userEmail: 'suspicious@example.com',
        action: 'FAILED_LOGIN',
        resource: '/api/auth/login',
        ip: '203.0.113.1',
        userAgent: 'curl/7.68.0',
        success: false,
        details: { reason: 'invalid_credentials', attempts: 5 }
      }
    ];

    const filteredLogs = auditLogs.filter(log => {
      if (userId && log.userId !== userId) return false;
      if (action && log.action !== action) return false;
      if (startDate && new Date(log.timestamp) < new Date(startDate)) return false;
      if (endDate && new Date(log.timestamp) > new Date(endDate)) return false;
      return true;
    });

    const startIndex = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredLogs.length,
          pages: Math.ceil(filteredLogs.length / limit)
        },
        summary: {
          totalLogs: auditLogs.length,
          successfulActions: auditLogs.filter(l => l.success).length,
          failedActions: auditLogs.filter(l => !l.success).length,
          uniqueUsers: [...new Set(auditLogs.map(l => l.userId))].length,
          uniqueIPs: [...new Set(auditLogs.map(l => l.ip))].length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
});

// User management endpoint
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, subscriptionTier } = req.query;
    
    // Mock user data (in production, fetch from database)
    const users = [
      {
        id: 'user_123',
        email: 'admin@bitebase.com',
        name: 'Admin User',
        userType: 'ADMIN',
        subscriptionTier: 'ENTERPRISE',
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        usage: {
          searches: 150,
          analyses: 45,
          apiCalls: 1200
        }
      },
      {
        id: 'user_456',
        email: 'owner@restaurant.com',
        name: 'Restaurant Owner',
        userType: 'EXISTING_OWNER',
        subscriptionTier: 'PROFESSIONAL',
        status: 'active',
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        usage: {
          searches: 89,
          analyses: 23,
          apiCalls: 0
        }
      },
      {
        id: 'user_789',
        email: 'newbie@startup.com',
        name: 'New Entrepreneur',
        userType: 'NEW_ENTREPRENEUR',
        subscriptionTier: 'BASIC',
        status: 'active',
        lastLogin: new Date(Date.now() - 7200000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        usage: {
          searches: 25,
          analyses: 8,
          apiCalls: 0
        }
      }
    ];

    const filteredUsers = users.filter(user => {
      if (search && !user.email.toLowerCase().includes(search.toLowerCase()) && 
          !user.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (status && user.status !== status) return false;
      if (subscriptionTier && user.subscriptionTier !== subscriptionTier) return false;
      return true;
    });

    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredUsers.length,
          pages: Math.ceil(filteredUsers.length / limit)
        },
        summary: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.status === 'active').length,
          byTier: {
            free: users.filter(u => u.subscriptionTier === 'FREE').length,
            basic: users.filter(u => u.subscriptionTier === 'BASIC').length,
            professional: users.filter(u => u.subscriptionTier === 'PROFESSIONAL').length,
            enterprise: users.filter(u => u.subscriptionTier === 'ENTERPRISE').length
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// System alerts endpoint
router.get('/system/alerts', authenticate, requireAdmin, async (req, res) => {
  try {
    const alerts = checkAlerts();
    
    // Add some mock historical alerts
    const historicalAlerts = [
      {
        id: 1,
        type: 'memory',
        severity: 'warning',
        message: 'High memory usage: 87%',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        resolved: true,
        resolvedAt: new Date(Date.now() - 3000000).toISOString()
      },
      {
        id: 2,
        type: 'performance',
        severity: 'critical',
        message: 'Slow average response time: 5200ms',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        resolved: true,
        resolvedAt: new Date(Date.now() - 6600000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: {
        active: alerts,
        historical: historicalAlerts,
        summary: {
          activeCount: alerts.length,
          criticalCount: alerts.filter(a => a.severity === 'critical').length,
          warningCount: alerts.filter(a => a.severity === 'warning').length,
          resolvedToday: historicalAlerts.filter(a => 
            a.resolved && new Date(a.resolvedAt) > new Date(Date.now() - 86400000)
          ).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system alerts',
      error: error.message
    });
  }
});

module.exports = router;