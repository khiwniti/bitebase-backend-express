const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  requireAdmin, 
  canManageSEO, 
  canManageBlog,
  canManageMarketing 
} = require('../middleware/admin');

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

module.exports = router;