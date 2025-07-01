/**
 * Location Intelligence API Routes
 * Handles all Foursquare integration endpoints
 */

const express = require('express');
const LocationIntelligenceService = require('../services/LocationIntelligenceService');

const router = express.Router();

// Utility function for standardized API responses
const sendResponse = (res, data, message = 'Success', status = 200) => {
  res.status(status).json({
    success: status < 400,
    message,
    data,
    timestamp: new Date().toISOString(),
    status
  });
};

// Utility function for error responses
const sendError = (res, message, status = 500, details = null) => {
  console.error(`API Error [${status}]: ${message}`, details);
  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? details : undefined,
    timestamp: new Date().toISOString(),
    status
  });
};

// Initialize location intelligence service
let locationService = null;

const initializeLocationService = async (db) => {
  if (!locationService) {
    locationService = new LocationIntelligenceService(db);
    await locationService.initialize();
  }
  return locationService;
};

// Middleware to ensure service is initialized
const ensureServiceInitialized = async (req, res, next) => {
  try {
    if (!locationService) {
      await initializeLocationService(req.db || null);
    }
    next();
  } catch (error) {
    sendError(res, 'Failed to initialize location service', 503, error.message);
  }
};

// Apply middleware to all routes
router.use(ensureServiceInitialized);

/**
 * GET /api/location/health
 * Health check for location intelligence service
 */
router.get('/health', async (req, res) => {
  try {
    const health = await locationService.getHealthStatus();
    
    const status = health.overall_status === 'healthy' ? 200 : 
                  health.overall_status === 'degraded' ? 206 : 503;
    
    sendResponse(res, health, 'Location service health check', status);
  } catch (error) {
    sendError(res, 'Health check failed', 503, error.message);
  }
});

/**
 * GET /api/location/restaurants/:id/analysis
 * Get comprehensive location analysis for a restaurant
 */
router.get('/restaurants/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      radius = 2000, 
      force_refresh = false,
      include_events = true 
    } = req.query;

    if (!id) {
      return sendError(res, 'Restaurant ID is required', 400);
    }

    console.log(`📊 Generating location analysis for restaurant: ${id}`);

    const options = {
      radius: parseInt(radius),
      forceRefresh: force_refresh === 'true',
      includeEvents: include_events === 'true'
    };

    const report = await locationService.generateLocationReport(id, options);
    
    sendResponse(res, report, 'Location analysis completed successfully');
  } catch (error) {
    console.error('❌ Location analysis failed:', error);
    
    if (error.message.includes('not found')) {
      sendError(res, 'Restaurant not found', 404, error.message);
    } else {
      sendError(res, 'Failed to generate location analysis', 500, error.message);
    }
  }
});

/**
 * POST /api/location/competitor-analysis
 * Get competitor analysis for a specific location
 */
router.post('/competitor-analysis', async (req, res) => {
  try {
    const { 
      location, 
      radius = 2000,
      restaurant_type = 'all_dining'
    } = req.body;

    if (!location || !location.lat || !location.lng) {
      return sendError(res, 'Location coordinates (lat, lng) are required', 400);
    }

    console.log(`🏪 Analyzing competitors for location: ${location.lat}, ${location.lng}`);

    const analysis = await locationService.getCompetitorAnalysisWithCache(
      location, 
      parseInt(radius)
    );
    
    sendResponse(res, {
      location,
      radius: parseInt(radius),
      analysis,
      generated_at: new Date().toISOString()
    }, 'Competitor analysis completed successfully');
  } catch (error) {
    console.error('❌ Competitor analysis failed:', error);
    sendError(res, 'Failed to analyze competitors', 500, error.message);
  }
});

/**
 * POST /api/location/foot-traffic
 * Get foot traffic analysis for an area
 */
router.post('/foot-traffic', async (req, res) => {
  try {
    const { 
      location, 
      radius = 1000,
      include_demographics = true 
    } = req.body;

    if (!location || !location.lat || !location.lng) {
      return sendError(res, 'Location coordinates (lat, lng) are required', 400);
    }

    console.log(`👥 Analyzing foot traffic for location: ${location.lat}, ${location.lng}`);

    const trafficData = await locationService.getAreaTrafficWithCache(
      location, 
      parseInt(radius)
    );
    
    sendResponse(res, {
      location,
      radius: parseInt(radius),
      traffic_analysis: trafficData,
      generated_at: new Date().toISOString()
    }, 'Foot traffic analysis completed successfully');
  } catch (error) {
    console.error('❌ Foot traffic analysis failed:', error);
    sendError(res, 'Failed to analyze foot traffic', 500, error.message);
  }
});

/**
 * POST /api/location/venue-search
 * Search for venues near a location
 */
router.post('/venue-search', async (req, res) => {
  try {
    const { 
      location, 
      radius = 1000,
      categories = ['13000'], // Food and Dining
      limit = 20,
      sort = 'popularity',
      price_range = null
    } = req.body;

    if (!location || !location.lat || !location.lng) {
      return sendError(res, 'Location coordinates (lat, lng) are required', 400);
    }

    console.log(`🔍 Searching venues near: ${location.lat}, ${location.lng}`);

    const venues = await locationService.restaurantDiscovery.findNearbyRestaurants({
      location,
      radius: parseInt(radius),
      categories: Array.isArray(categories) ? categories : [categories],
      limit: parseInt(limit),
      sort,
      priceRange: price_range
    });
    
    sendResponse(res, {
      search_parameters: {
        location,
        radius: parseInt(radius),
        categories,
        limit: parseInt(limit),
        sort
      },
      venues,
      total_found: venues.length,
      generated_at: new Date().toISOString()
    }, 'Venue search completed successfully');
  } catch (error) {
    console.error('❌ Venue search failed:', error);
    sendError(res, 'Failed to search venues', 500, error.message);
  }
});

/**
 * POST /api/location/local-events
 * Get local events for an area
 */
router.post('/local-events', async (req, res) => {
  try {
    const { 
      location, 
      radius_km = 5,
      days_ahead = 30,
      min_impact_score = 0
    } = req.body;

    if (!location || !location.lat || !location.lng) {
      return sendError(res, 'Location coordinates (lat, lng) are required', 400);
    }

    console.log(`📅 Finding local events near: ${location.lat}, ${location.lng}`);

    const events = await locationService.getLocalEventsWithCache(
      location, 
      parseInt(radius_km), 
      parseInt(days_ahead)
    );

    // Filter by minimum impact score if specified
    const filteredEvents = events.filter(event => 
      event.traffic_impact_score >= parseInt(min_impact_score)
    );
    
    sendResponse(res, {
      search_parameters: {
        location,
        radius_km: parseInt(radius_km),
        days_ahead: parseInt(days_ahead),
        min_impact_score: parseInt(min_impact_score)
      },
      events: filteredEvents,
      total_found: filteredEvents.length,
      high_impact_events: filteredEvents.filter(e => e.traffic_impact_score > 70).length,
      generated_at: new Date().toISOString()
    }, 'Local events search completed successfully');
  } catch (error) {
    console.error('❌ Local events search failed:', error);
    sendError(res, 'Failed to find local events', 500, error.message);
  }
});

/**
 * GET /api/location/venue/:id/details
 * Get detailed information about a specific venue
 */
router.get('/venue/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const { include_stats = false } = req.query;

    if (!id) {
      return sendError(res, 'Venue ID is required', 400);
    }

    console.log(`🏢 Getting venue details for: ${id}`);

    // Get venue details
    const details = await locationService.restaurantDiscovery.getVenueDetails(id);
    
    if (!details) {
      return sendError(res, 'Venue not found', 404);
    }

    let stats = null;
    if (include_stats === 'true') {
      try {
        stats = await locationService.restaurantDiscovery.getVenueVisitStats(id);
      } catch (error) {
        console.warn('⚠️ Could not retrieve venue stats:', error.message);
      }
    }
    
    sendResponse(res, {
      venue_id: id,
      details,
      stats: stats || null,
      generated_at: new Date().toISOString()
    }, 'Venue details retrieved successfully');
  } catch (error) {
    console.error('❌ Venue details retrieval failed:', error);
    sendError(res, 'Failed to get venue details', 500, error.message);
  }
});

/**
 * GET /api/location/cache/stats
 * Get cache performance statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const cacheStats = await locationService.cache.getCacheStats();
    const cacheMetrics = await locationService.cache.getCacheMetrics();
    
    sendResponse(res, {
      cache_stats: cacheStats,
      cache_metrics: cacheMetrics,
      generated_at: new Date().toISOString()
    }, 'Cache statistics retrieved successfully');
  } catch (error) {
    console.error('❌ Cache stats retrieval failed:', error);
    sendError(res, 'Failed to get cache statistics', 500, error.message);
  }
});

/**
 * DELETE /api/location/cache/clear
 * Clear cache for a specific area or all cache
 */
router.delete('/cache/clear', async (req, res) => {
  try {
    const { location, radius, clear_all = false } = req.body;

    if (clear_all === true) {
      // This would require implementing a clear all function
      sendResponse(res, { 
        message: 'Clear all cache not implemented for safety' 
      }, 'Cache clear request processed');
    } else if (location && location.lat && location.lng && radius) {
      const cleared = await locationService.cache.invalidateAreaCache(
        location.lat, 
        location.lng, 
        parseInt(radius)
      );
      
      sendResponse(res, { 
        location,
        radius: parseInt(radius),
        cache_cleared: cleared 
      }, 'Area cache cleared successfully');
    } else {
      sendError(res, 'Either clear_all=true or location+radius required', 400);
    }
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    sendError(res, 'Failed to clear cache', 500, error.message);
  }
});

/**
 * GET /api/location/usage-stats
 * Get API usage statistics
 */
router.get('/usage-stats', async (req, res) => {
  try {
    const foursquareStats = await locationService.foursquareClient.getUsageStats();
    
    sendResponse(res, {
      foursquare_api: foursquareStats,
      generated_at: new Date().toISOString()
    }, 'Usage statistics retrieved successfully');
  } catch (error) {
    console.error('❌ Usage stats retrieval failed:', error);
    sendError(res, 'Failed to get usage statistics', 500, error.message);
  }
});

/**
 * POST /api/location/batch-analysis
 * Perform batch analysis for multiple locations
 */
router.post('/batch-analysis', async (req, res) => {
  try {
    const { locations, analysis_type = 'competitor', radius = 2000 } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return sendError(res, 'Array of locations is required', 400);
    }

    if (locations.length > 10) {
      return sendError(res, 'Maximum 10 locations allowed per batch', 400);
    }

    console.log(`📊 Running batch ${analysis_type} analysis for ${locations.length} locations`);

    const results = [];
    
    for (const [index, location] of locations.entries()) {
      if (!location.lat || !location.lng) {
        results.push({
          index,
          location,
          error: 'Invalid location coordinates'
        });
        continue;
      }

      try {
        let analysis;
        
        if (analysis_type === 'competitor') {
          analysis = await locationService.getCompetitorAnalysisWithCache(location, radius);
        } else if (analysis_type === 'traffic') {
          analysis = await locationService.getAreaTrafficWithCache(location, radius);
        } else {
          throw new Error(`Unsupported analysis type: ${analysis_type}`);
        }
        
        results.push({
          index,
          location,
          analysis,
          success: true
        });
      } catch (error) {
        results.push({
          index,
          location,
          error: error.message,
          success: false
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    sendResponse(res, {
      analysis_type,
      radius,
      total_locations: locations.length,
      successful_analyses: successCount,
      failed_analyses: locations.length - successCount,
      results,
      generated_at: new Date().toISOString()
    }, `Batch ${analysis_type} analysis completed`);
  } catch (error) {
    console.error('❌ Batch analysis failed:', error);
    sendError(res, 'Failed to perform batch analysis', 500, error.message);
  }
});

// Export router and initialization function for use in main server
module.exports = {
  router,
  initializeLocationService
};