const express = require('express');
const router = express.Router();
const ExternalMenuProvider = require('../services/ExternalMenuProvider');
const MenuDataService = require('../services/MenuDataService');
const logger = require('../utils/logger');

// Initialize services
const menuProvider = new ExternalMenuProvider();
let menuDataService;

// Handle SQLite initialization with error handling
try {
  menuDataService = new MenuDataService();
} catch (error) {
  console.log('⚠️ SQLite initialization failed, using mock service:', error.message);
  // Mock service to prevent crashes
  menuDataService = {
    saveMenuData: async (data) => ({ success: true, id: 'mock-id' }),
    getMenuData: async (id) => ({ success: false, error: 'Mock service' }),
    getAllMenus: async () => ({ success: true, data: [] })
  };
}

/**
 * GET /api/menu/businesses
 * Fetch businesses from external menu data provider
 */
router.get('/businesses', async (req, res) => {
  try {
    const {
      lat = 13.7563,
      lng = 100.5018,
      radius = 5000,
      keyword = '',
      page = 1,
      limit = 20
    } = req.query;

    const result = await menuProvider.fetchBusinesses({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius),
      keyword,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: result.success,
      data: result.businesses,
      total: result.businesses.length,
      page: parseInt(page),
      limit: parseInt(limit),
      error: result.error,
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu API'
    });
  } catch (error) {
    logger.error('Error in /businesses endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/menu/restaurant/:publicId
 * Fetch menu data for a specific restaurant
 */
router.get('/restaurant/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { forceRefresh = false } = req.query;

    // Check if we have cached data first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = menuDataService.getMenuData(publicId);
      if (cachedData.success) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString(),
          via: 'BiteBase Menu Cache'
        });
      }
    }

    // Fetch fresh data from external provider
    const result = await menuProvider.fetchDeliveryMenu(publicId);
    
    if (result.success) {
      // Save to database
      await menuDataService.saveMenuData(publicId, publicId, result);
    }

    res.json({
      success: result.success,
      data: result,
      cached: false,
      error: result.error,
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu API'
    });
  } catch (error) {
    logger.error(`Error in /restaurant/${req.params.publicId} endpoint:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/menu/batch-fetch
 * Batch fetch menu data for multiple restaurants
 */
router.post('/batch-fetch', async (req, res) => {
  try {
    const { publicIds = [] } = req.body;

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'publicIds array is required',
        timestamp: new Date().toISOString()
      });
    }

    if (publicIds.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 restaurants can be processed at once',
        timestamp: new Date().toISOString()
      });
    }

    const results = await menuProvider.batchFetchMenus(publicIds);
    
    // Save successful results to database
    const savePromises = results
      .filter(result => result.success)
      .map(result => menuDataService.saveMenuData(result.publicId, result.publicId, result));
    
    await Promise.allSettled(savePromises);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu API'
    });
  } catch (error) {
    logger.error('Error in /batch-fetch endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/menu/analytics
 * Get menu analytics across restaurants
 */
router.get('/analytics', async (req, res) => {
  try {
    const { restaurantIds } = req.query;
    const ids = restaurantIds ? restaurantIds.split(',') : [];

    const analytics = menuDataService.getMenuAnalytics(ids);

    res.json({
      success: analytics.success,
      data: analytics,
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu Analytics'
    });
  } catch (error) {
    logger.error('Error in /analytics endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/menu/search
 * Search menu items across restaurants
 */
router.get('/search', async (req, res) => {
  try {
    const {
      query = '',
      category = '',
      minPrice = 0,
      maxPrice = 999999,
      isPopular,
      restaurantIds,
      limit = 50
    } = req.query;

    const searchParams = {
      query,
      category,
      minPrice: parseFloat(minPrice),
      maxPrice: parseFloat(maxPrice),
      isPopular: isPopular === 'true' ? true : isPopular === 'false' ? false : null,
      restaurantIds: restaurantIds ? restaurantIds.split(',') : [],
      limit: parseInt(limit)
    };

    const results = menuDataService.searchMenuItems(searchParams);

    res.json({
      success: results.success,
      data: results.results,
      total: results.total,
      searchParams,
      error: results.error,
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu Search'
    });
  } catch (error) {
    logger.error('Error in /search endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/menu/insights/:restaurantId
 * Get menu insights for a specific restaurant
 */
router.get('/insights/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const menuData = menuDataService.getMenuData(restaurantId);
    
    if (!menuData.success) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant menu data not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        restaurantId,
        insights: menuData.insights,
        summary: {
          totalItems: menuData.items.length,
          totalCategories: menuData.categories.length,
          averagePrice: menuData.menu.average_price,
          lastUpdated: menuData.menu.last_updated
        }
      },
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu Insights'
    });
  } catch (error) {
    logger.error(`Error in /insights/${req.params.restaurantId} endpoint:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/menu/schedule/pending
 * Get restaurants pending menu updates
 */
router.get('/schedule/pending', async (req, res) => {
  try {
    const pendingUpdates = menuDataService.getRestaurantsForUpdate();

    res.json({
      success: true,
      data: pendingUpdates,
      total: pendingUpdates.length,
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu Scheduler'
    });
  } catch (error) {
    logger.error('Error in /schedule/pending endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/menu/schedule/add
 * Add restaurant to update schedule
 */
router.post('/schedule/add', async (req, res) => {
  try {
    const { restaurantId, publicId, frequency = 'bi-weekly' } = req.body;

    if (!restaurantId || !publicId) {
      return res.status(400).json({
        success: false,
        error: 'restaurantId and publicId are required',
        timestamp: new Date().toISOString()
      });
    }

    menuDataService.updateSchedule(restaurantId, publicId, frequency);

    res.json({
      success: true,
      message: 'Restaurant added to update schedule',
      data: { restaurantId, publicId, frequency },
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu Scheduler'
    });
  } catch (error) {
    logger.error('Error in /schedule/add endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/menu/optimize
 * Get menu optimization recommendations
 */
router.post('/optimize', async (req, res) => {
  try {
    const { restaurantId, targetMetrics = {} } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'restaurantId is required',
        timestamp: new Date().toISOString()
      });
    }

    const menuData = menuDataService.getMenuData(restaurantId);
    
    if (!menuData.success) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant menu data not found',
        timestamp: new Date().toISOString()
      });
    }

    // Generate optimization recommendations
    const recommendations = generateOptimizationRecommendations(menuData, targetMetrics);

    res.json({
      success: true,
      data: {
        restaurantId,
        currentMetrics: {
          totalItems: menuData.items.length,
          averagePrice: menuData.menu.average_price,
          popularItemsCount: menuData.items.filter(item => item.is_popular).length
        },
        targetMetrics,
        recommendations,
        priority: recommendations.map(r => r.priority).reduce((a, b) => a + b, 0) / recommendations.length
      },
      timestamp: new Date().toISOString(),
      via: 'BiteBase Menu Optimizer'
    });
  } catch (error) {
    logger.error('Error in /optimize endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate menu optimization recommendations
 * @param {Object} menuData - Restaurant menu data
 * @param {Object} targetMetrics - Target metrics for optimization
 * @returns {Array} Optimization recommendations
 */
function generateOptimizationRecommendations(menuData, targetMetrics) {
  const recommendations = [];
  const items = menuData.items;
  const categories = menuData.categories;

  // Price optimization
  const avgPrice = menuData.menu.average_price;
  const targetAvgPrice = targetMetrics.averagePrice;
  
  if (targetAvgPrice && Math.abs(avgPrice - targetAvgPrice) > targetAvgPrice * 0.1) {
    const action = avgPrice < targetAvgPrice ? 'increase' : 'decrease';
    recommendations.push({
      type: 'pricing',
      priority: 8,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} average menu pricing`,
      description: `Current average price (${avgPrice}) is ${action === 'increase' ? 'below' : 'above'} target (${targetAvgPrice})`,
      action: `Consider ${action}ing prices on ${action === 'increase' ? 'premium' : 'budget'} items`,
      impact: 'high'
    });
  }

  // Popular items optimization
  const popularItems = items.filter(item => item.is_popular);
  const popularRatio = popularItems.length / items.length;
  
  if (popularRatio < 0.2) {
    recommendations.push({
      type: 'popularity',
      priority: 7,
      title: 'Increase popular item visibility',
      description: `Only ${Math.round(popularRatio * 100)}% of items are marked as popular`,
      action: 'Promote high-rated items and gather customer feedback',
      impact: 'medium'
    });
  }

  // Category balance
  const categoryDistribution = categories.map(cat => cat.item_count);
  const maxItems = Math.max(...categoryDistribution);
  const minItems = Math.min(...categoryDistribution);
  
  if (maxItems > minItems * 3) {
    recommendations.push({
      type: 'category_balance',
      priority: 5,
      title: 'Balance menu categories',
      description: 'Some categories have significantly more items than others',
      action: 'Consider redistributing items or expanding smaller categories',
      impact: 'low'
    });
  }

  // High-rated items promotion
  const highRatedItems = items.filter(item => item.rating >= 4.0);
  if (highRatedItems.length > 0 && highRatedItems.filter(item => item.is_recommended).length < highRatedItems.length * 0.5) {
    recommendations.push({
      type: 'promotion',
      priority: 6,
      title: 'Promote high-rated items',
      description: `${highRatedItems.length} items have ratings ≥4.0 but aren't marked as recommended`,
      action: 'Mark high-rated items as recommended to increase visibility',
      impact: 'medium'
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

module.exports = router;