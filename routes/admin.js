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
const DatabaseService = require('../services/DatabaseService');
const KVService = require('../services/KVService');
const AnalyticsService = require('../services/AnalyticsService');

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

/**
 * Restaurant Management Routes for Admin
 */

// Get all restaurants with location-based insights
router.get('/restaurants', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, city, area, cuisine, search } = req.query;
    
    // Build filters
    const filters = {};
    if (city) filters.city = city;
    if (area) filters.area = area;
    if (cuisine) filters.cuisine = cuisine;
    if (search) filters.brand = search;

    // Get restaurants from database
    const allRestaurants = await DatabaseService.getRestaurants(filters);
    
    // Apply search filter if provided
    let filteredRestaurants = allRestaurants;
    if (search) {
      filteredRestaurants = allRestaurants.filter(r => 
        r.brand.toLowerCase().includes(search.toLowerCase()) ||
        r.area.toLowerCase().includes(search.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRestaurants = filteredRestaurants.slice(startIndex, startIndex + parseInt(limit));

    // Add analytics data for each restaurant
    const restaurantsWithAnalytics = await Promise.all(
      paginatedRestaurants.map(async (restaurant) => {
        const analytics = await AnalyticsService.getRestaurantAnalytics(restaurant.id, 7);
        return {
          ...restaurant,
          weeklyStats: analytics.summary || {},
          lastUpdated: new Date().toISOString()
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      totalRestaurants: filteredRestaurants.length,
      averageRating: filteredRestaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / filteredRestaurants.length,
      averagePrice: filteredRestaurants.reduce((sum, r) => sum + (r.medianPrice || 0), 0) / filteredRestaurants.length,
      topCuisines: getTopCuisines(filteredRestaurants),
      topAreas: getTopAreas(filteredRestaurants),
      ratingDistribution: getRatingDistribution(filteredRestaurants)
    };

    res.json({
      success: true,
      data: {
        restaurants: restaurantsWithAnalytics,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredRestaurants.length,
          totalPages: Math.ceil(filteredRestaurants.length / parseInt(limit))
        },
        filters: { city, area, cuisine, search }
      }
    });
  } catch (error) {
    console.error('Admin restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurants',
      error: error.message
    });
  }
});

// Get detailed restaurant information with Wongnai integration
router.get('/restaurants/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get restaurant details
    const restaurant = await DatabaseService.getRestaurantById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get comprehensive analytics
    const analytics = await AnalyticsService.getRestaurantAnalytics(id, 30);
    
    // Get location insights
    const locationInsights = await KVService.getCachedLocationInsights(restaurant.area) || {};
    
    // Mock Wongnai integration data
    const wongnaiData = {
      wongnaiId: `wongnai_${id}`,
      wongnaiRating: restaurant.rating + (Math.random() * 0.2 - 0.1),
      wongnaiReviews: restaurant.totalReviews + Math.floor(Math.random() * 100),
      popularDishes: [
        { name: 'Signature Dish', price: restaurant.medianPrice * 1.2, orders: 150 },
        { name: 'Popular Item', price: restaurant.medianPrice * 0.8, orders: 120 },
        { name: 'Special Menu', price: restaurant.medianPrice * 1.5, orders: 80 }
      ],
      menuCategories: [
        { category: 'Main Dishes', count: 15, avgPrice: restaurant.medianPrice },
        { category: 'Appetizers', count: 8, avgPrice: restaurant.medianPrice * 0.6 },
        { category: 'Beverages', count: 12, avgPrice: restaurant.medianPrice * 0.4 },
        { category: 'Desserts', count: 6, avgPrice: restaurant.medianPrice * 0.7 }
      ],
      operatingHours: {
        monday: '10:00-22:00',
        tuesday: '10:00-22:00',
        wednesday: '10:00-22:00',
        thursday: '10:00-22:00',
        friday: '10:00-23:00',
        saturday: '10:00-23:00',
        sunday: '10:00-22:00'
      },
      features: ['Delivery', 'Takeaway', 'Dine-in', 'Online Payment'],
      photos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg'
      ],
      lastUpdated: new Date().toISOString()
    };

    // Get nearby competitors
    const competitors = await DatabaseService.getRestaurants({ 
      area: restaurant.area,
      cuisine: restaurant.cuisine 
    });
    const nearbyCompetitors = competitors
      .filter(c => c.id !== restaurant.id)
      .slice(0, 5)
      .map(c => ({
        ...c,
        distance: (Math.random() * 2 + 0.1).toFixed(1) + ' km',
        competitionLevel: calculateCompetitionLevel(restaurant, c)
      }));

    // Market position analysis
    const marketPosition = calculateMarketPosition(restaurant, competitors);

    const detailedData = {
      restaurant,
      analytics,
      wongnaiData,
      locationInsights,
      nearbyCompetitors,
      marketPosition,
      insights: generateRestaurantInsights(restaurant, analytics, competitors),
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: detailedData
    });
  } catch (error) {
    console.error('Admin restaurant details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurant details',
      error: error.message
    });
  }
});

// Get location-based analytics dashboard
router.get('/analytics/location', authenticate, requireAdmin, async (req, res) => {
  try {
    const { city = 'Bangkok', timeframe = '30d' } = req.query;
    
    // Check cache first
    const cacheKey = `admin_location_analytics:${city}:${timeframe}`;
    const cached = await KVService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached)
      });
    }

    // Get all restaurants in the city
    const restaurants = await DatabaseService.getRestaurants({ city });
    
    // Get system analytics
    const systemAnalytics = await AnalyticsService.getDashboardAnalytics(30);
    
    // Calculate location-based insights
    const locationAnalytics = {
      overview: {
        totalRestaurants: restaurants.length,
        averageRating: restaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / restaurants.length,
        totalReviews: restaurants.reduce((sum, r) => sum + (r.totalReviews || 0), 0),
        averagePrice: restaurants.reduce((sum, r) => sum + (r.medianPrice || 0), 0) / restaurants.length
      },
      areaBreakdown: getAreaBreakdown(restaurants),
      cuisineAnalysis: getCuisineAnalysis(restaurants),
      priceAnalysis: getPriceAnalysis(restaurants),
      ratingAnalysis: getRatingAnalysis(restaurants),
      competitionHeatmap: generateCompetitionHeatmap(restaurants),
      marketOpportunities: identifyMarketOpportunities(restaurants),
      trends: {
        growingAreas: ['Thonglor', 'Ekkamai', 'Ari'],
        decliningAreas: ['Khao San Road'],
        emergingCuisines: ['Korean', 'Plant-based', 'Fusion'],
        saturatedCuisines: ['Thai Traditional', 'Chinese']
      },
      systemMetrics: systemAnalytics,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 1 hour
    await KVService.set(cacheKey, JSON.stringify(locationAnalytics), 3600);

    res.json({
      success: true,
      data: locationAnalytics
    });
  } catch (error) {
    console.error('Admin location analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location analytics',
      error: error.message
    });
  }
});

// Helper functions
function getTopCuisines(restaurants) {
  const cuisineCount = {};
  restaurants.forEach(r => {
    cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
  });
  
  return Object.entries(cuisineCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([cuisine, count]) => ({ cuisine, count }));
}

function getTopAreas(restaurants) {
  const areaCount = {};
  restaurants.forEach(r => {
    areaCount[r.area] = (areaCount[r.area] || 0) + 1;
  });
  
  return Object.entries(areaCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([area, count]) => ({ area, count }));
}

function getRatingDistribution(restaurants) {
  const distribution = { '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0 };
  restaurants.forEach(r => {
    const rating = r.rating || 0;
    if (rating >= 4) distribution['4-5']++;
    else if (rating >= 3) distribution['3-4']++;
    else if (rating >= 2) distribution['2-3']++;
    else distribution['1-2']++;
  });
  return distribution;
}

function calculateCompetitionLevel(restaurant, competitor) {
  const ratingDiff = Math.abs((restaurant.rating || 0) - (competitor.rating || 0));
  const priceDiff = Math.abs((restaurant.medianPrice || 0) - (competitor.medianPrice || 0));
  
  if (ratingDiff < 0.5 && priceDiff < 50) return 'High';
  if (ratingDiff < 1.0 && priceDiff < 100) return 'Medium';
  return 'Low';
}

function calculateMarketPosition(restaurant, competitors) {
  const sameAreaCompetitors = competitors.filter(c => c.area === restaurant.area);
  const sameCuisineCompetitors = competitors.filter(c => c.cuisine === restaurant.cuisine);
  
  const areaRank = sameAreaCompetitors
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .findIndex(r => r.id === restaurant.id) + 1;
    
  const cuisineRank = sameCuisineCompetitors
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .findIndex(r => r.id === restaurant.id) + 1;
  
  return {
    areaRank,
    areaTotal: sameAreaCompetitors.length,
    cuisineRank,
    cuisineTotal: sameCuisineCompetitors.length,
    percentile: {
      area: Math.round((1 - areaRank / sameAreaCompetitors.length) * 100),
      cuisine: Math.round((1 - cuisineRank / sameCuisineCompetitors.length) * 100)
    }
  };
}

function generateRestaurantInsights(restaurant, analytics, competitors) {
  const insights = [];
  
  // Rating insights
  if (restaurant.rating > 4.2) {
    insights.push({
      type: 'positive',
      title: 'Excellent Customer Satisfaction',
      description: `Rating of ${restaurant.rating} is above market average`,
      impact: 'High'
    });
  } else if (restaurant.rating < 3.5) {
    insights.push({
      type: 'warning',
      title: 'Below Average Rating',
      description: 'Consider improving service quality and customer experience',
      impact: 'High'
    });
  }
  
  // Competition insights
  const areaCompetitors = competitors.filter(c => c.area === restaurant.area);
  if (areaCompetitors.length > 10) {
    insights.push({
      type: 'info',
      title: 'High Competition Area',
      description: `${areaCompetitors.length} competitors in ${restaurant.area}`,
      impact: 'Medium'
    });
  }
  
  // Price positioning
  const avgPrice = competitors.reduce((sum, c) => sum + (c.medianPrice || 0), 0) / competitors.length;
  if (restaurant.medianPrice > avgPrice * 1.2) {
    insights.push({
      type: 'info',
      title: 'Premium Pricing',
      description: 'Priced above market average - ensure value proposition is clear',
      impact: 'Medium'
    });
  }
  
  return insights;
}

function getAreaBreakdown(restaurants) {
  const areas = {};
  restaurants.forEach(r => {
    if (!areas[r.area]) {
      areas[r.area] = { 
        count: 0, 
        totalRating: 0, 
        totalPrice: 0, 
        totalReviews: 0,
        cuisines: new Set()
      };
    }
    areas[r.area].count++;
    areas[r.area].totalRating += r.rating || 0;
    areas[r.area].totalPrice += r.medianPrice || 0;
    areas[r.area].totalReviews += r.totalReviews || 0;
    areas[r.area].cuisines.add(r.cuisine);
  });
  
  return Object.entries(areas)
    .map(([area, data]) => ({
      area,
      restaurantCount: data.count,
      averageRating: (data.totalRating / data.count).toFixed(1),
      averagePrice: Math.round(data.totalPrice / data.count),
      totalReviews: data.totalReviews,
      cuisineVariety: data.cuisines.size,
      marketShare: (data.count / restaurants.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.restaurantCount - a.restaurantCount);
}

function getCuisineAnalysis(restaurants) {
  const cuisines = {};
  restaurants.forEach(r => {
    if (!cuisines[r.cuisine]) {
      cuisines[r.cuisine] = { 
        count: 0, 
        totalRating: 0, 
        totalPrice: 0,
        areas: new Set()
      };
    }
    cuisines[r.cuisine].count++;
    cuisines[r.cuisine].totalRating += r.rating || 0;
    cuisines[r.cuisine].totalPrice += r.medianPrice || 0;
    cuisines[r.cuisine].areas.add(r.area);
  });
  
  return Object.entries(cuisines)
    .map(([cuisine, data]) => ({
      cuisine,
      restaurantCount: data.count,
      averageRating: (data.totalRating / data.count).toFixed(1),
      averagePrice: Math.round(data.totalPrice / data.count),
      areaSpread: data.areas.size,
      marketShare: (data.count / restaurants.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.restaurantCount - a.restaurantCount);
}

function getPriceAnalysis(restaurants) {
  const prices = restaurants.map(r => r.medianPrice || 0).filter(p => p > 0);
  prices.sort((a, b) => a - b);
  
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const median = prices[Math.floor(prices.length * 0.5)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
    median: Math.round(median),
    quartiles: { q1: Math.round(q1), q3: Math.round(q3) },
    distribution: {
      budget: prices.filter(p => p < q1).length,
      moderate: prices.filter(p => p >= q1 && p < q3).length,
      premium: prices.filter(p => p >= q3).length
    }
  };
}

function getRatingAnalysis(restaurants) {
  const ratings = restaurants.map(r => r.rating || 0).filter(r => r > 0);
  
  return {
    average: (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2),
    distribution: {
      excellent: ratings.filter(r => r >= 4.5).length,
      good: ratings.filter(r => r >= 4.0 && r < 4.5).length,
      average: ratings.filter(r => r >= 3.5 && r < 4.0).length,
      poor: ratings.filter(r => r < 3.5).length
    },
    trends: {
      improving: Math.floor(Math.random() * 20) + 10,
      declining: Math.floor(Math.random() * 10) + 5,
      stable: Math.floor(Math.random() * 30) + 20
    }
  };
}

function generateCompetitionHeatmap(restaurants) {
  const heatmap = {};
  restaurants.forEach(r => {
    if (!heatmap[r.area]) {
      heatmap[r.area] = { count: 0, density: 'Low' };
    }
    heatmap[r.area].count++;
  });
  
  // Calculate density levels
  Object.keys(heatmap).forEach(area => {
    const count = heatmap[area].count;
    if (count > 15) heatmap[area].density = 'Very High';
    else if (count > 10) heatmap[area].density = 'High';
    else if (count > 5) heatmap[area].density = 'Medium';
    else heatmap[area].density = 'Low';
  });
  
  return heatmap;
}

function identifyMarketOpportunities(restaurants) {
  const opportunities = [];
  
  // Analyze cuisine gaps by area
  const areasByCount = {};
  restaurants.forEach(r => {
    if (!areasByCount[r.area]) areasByCount[r.area] = [];
    areasByCount[r.area].push(r.cuisine);
  });
  
  Object.entries(areasByCount).forEach(([area, cuisines]) => {
    const uniqueCuisines = new Set(cuisines);
    const popularCuisines = ['Thai', 'Japanese', 'Italian', 'Chinese', 'Korean'];
    
    popularCuisines.forEach(cuisine => {
      if (!uniqueCuisines.has(cuisine)) {
        opportunities.push({
          type: 'cuisine_gap',
          area,
          cuisine,
          description: `No ${cuisine} restaurants in ${area}`,
          potential: 'High'
        });
      }
    });
  });
  
  return opportunities.slice(0, 10); // Return top 10 opportunities
}

module.exports = router;