const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const SQLiteAdapter = require('../database/sqlite-adapter');
const { RestaurantDataService } = require('../services/RestaurantDataService');

// Database pool will be injected by the main server
let dbPool = null;
let restaurantService = null;

// Function to initialize with database pool
function initializeWithPool(pool) {
  dbPool = pool;
  if (pool) {
    restaurantService = new RestaurantDataService(dbPool);
  }
}

// Export the initialization function
router.initializeWithPool = initializeWithPool;

// Middleware to check database connection
const checkDatabase = (req, res, next) => {
  if (!dbPool || !restaurantService) {
    return sendError(res, 'Database not initialized', 503, 'Restaurant service unavailable');
  }
  next();
};

// Apply database check middleware to all routes
router.use(checkDatabase);

// Utility function for standardized API responses
const sendResponse = (res, data, message = 'Success', status = 200) => {
  res.status(status).json({
    success: status < 400,
    message,
    data,
    timestamp: new Date().toISOString(),
    via: 'BiteBase API'
  });
};

const sendError = (res, message, status = 500, details = null) => {
  res.status(status).json({
    success: false,
    message,
    error: details,
    timestamp: new Date().toISOString(),
    via: 'BiteBase API'
  });
};

// Helper function to transform restaurant data to frontend format
function transformToFrontendFormat(restaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    rating: restaurant.rating || 0,
    price_level: restaurant.priceRange || 2,
    cuisine: Array.isArray(restaurant.cuisine) ? restaurant.cuisine[0] : restaurant.cuisine || 'restaurant',
    address: restaurant.address,
    photo_url: restaurant.metadata?.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${restaurant.metadata.photos[0].reference}&key=${process.env.GOOGLE_PLACES_API_KEY}` 
      : null,
    opening_hours: restaurant.metadata?.openNow,
    place_id: restaurant.metadata?.googlePlaceId || restaurant.metadata?.foursquareId,
    types: restaurant.metadata?.types || [],
    distance: restaurant.distance,
    review_count: restaurant.reviewCount,
    data_source: restaurant.dataSource,
    created_at: restaurant.createdAt,
    updated_at: restaurant.updatedAt
  };
}

// GET /api/restaurants - Get all restaurants (for dashboard)
router.get('/', async (req, res) => {
  try {
    const { 
      latitude = 13.7563, 
      longitude = 100.5018, 
      radius = 5000,
      cuisine,
      priceRange,
      rating,
      limit = 20,
      offset = 0,
      sortBy = 'distance'
    } = req.query;

    console.log(`🔍 Getting all restaurants: lat=${latitude}, lng=${longitude}, radius=${radius}m, limit=${limit}`);

    const searchParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      cuisine: cuisine ? cuisine.split(',') : null,
      priceRange: priceRange ? parseInt(priceRange) : null,
      rating: rating ? parseFloat(rating) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      includeExternal: true
    };

    const result = await restaurantService.searchRestaurants(searchParams);
    const transformedRestaurants = result.restaurants.map(transformToFrontendFormat);

    console.log(`✅ Retrieved ${transformedRestaurants.length} restaurants (${result.sources.local} local, ${result.sources.external} external)`);

    sendResponse(res, {
      restaurants: transformedRestaurants,
      total: result.total,
      sources: result.sources,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      searchParams: result.searchParams
    }, `Retrieved ${transformedRestaurants.length} restaurants`);
  } catch (error) {
    console.error('❌ Get all restaurants error:', error);
    sendError(res, 'Failed to get restaurants', 500, error.message);
  }
});

// GET /api/restaurants/search - Search restaurants
router.get('/search', async (req, res) => {
  try {
    const { 
      query = 'restaurant', 
      latitude = 13.7563, 
      longitude = 100.5018, 
      radius = 5000,
      cuisine,
      priceRange,
      rating,
      limit = 20,
      offset = 0,
      sortBy = 'distance'
    } = req.query;

    console.log(`🔍 Searching restaurants: query="${query}", lat=${latitude}, lng=${longitude}, radius=${radius}m`);

    // Parse cuisine from query if not explicitly provided
    const searchCuisine = cuisine ? cuisine.split(',') : (query !== 'restaurant' ? [query] : null);

    const searchParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      cuisine: searchCuisine,
      priceRange: priceRange ? parseInt(priceRange) : null,
      rating: rating ? parseFloat(rating) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      includeExternal: true
    };

    const result = await restaurantService.searchRestaurants(searchParams);
    const transformedRestaurants = result.restaurants.map(transformToFrontendFormat);

    console.log(`✅ Found ${transformedRestaurants.length} restaurants (${result.sources.local} local, ${result.sources.external} external)`);

    sendResponse(res, {
      restaurants: transformedRestaurants,
      total: result.total,
      sources: result.sources,
      query,
      searchParams: result.searchParams
    }, `Found ${transformedRestaurants.length} restaurants`);
  } catch (error) {
    console.error('❌ Restaurant search error:', error);
    sendError(res, 'Failed to search restaurants', 500, error.message);
  }
});

// POST /api/restaurants/search - Search restaurants with POST data
router.post('/search', async (req, res) => {
  try {
    const { 
      query = 'restaurant', 
      location,
      latitude: directLatitude,
      longitude: directLongitude,
      radius = 5000,
      cuisine,
      priceRange,
      rating,
      limit = 20,
      offset = 0,
      sortBy = 'distance',
      includeExternal = true
    } = req.body;

    // Extract coordinates from location object or use direct values
    const latitude = location?.latitude || directLatitude || 13.7563;
    const longitude = location?.longitude || directLongitude || 100.5018;

    console.log(`🔍 POST Searching restaurants: query="${query}", lat=${latitude}, lng=${longitude}, radius=${radius}m`);

    // Parse cuisine from query if not explicitly provided
    const searchCuisine = cuisine ? (Array.isArray(cuisine) ? cuisine : [cuisine]) : (query !== 'restaurant' ? [query] : null);

    const searchParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      cuisine: searchCuisine,
      priceRange: priceRange ? parseInt(priceRange) : null,
      rating: rating ? parseFloat(rating) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      includeExternal
    };

    const result = await restaurantService.searchRestaurants(searchParams);
    const transformedRestaurants = result.restaurants.map(transformToFrontendFormat);

    console.log(`✅ Found ${transformedRestaurants.length} restaurants (${result.sources.local} local, ${result.sources.external} external)`);

    sendResponse(res, {
      restaurants: transformedRestaurants,
      total: result.total,
      sources: result.sources,
      query,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      searchParams: result.searchParams
    }, `Found ${transformedRestaurants.length} restaurants`);
  } catch (error) {
    console.error('❌ Restaurant POST search error:', error);
    sendError(res, 'Failed to search restaurants', 500, error.message);
  }
});

// POST /api/restaurants/wongnai/search - Wongnai-style search (using Google Places)
router.post('/wongnai/search', async (req, res) => {
  try {
    const { 
      query = 'restaurant', 
      latitude = 13.7563, 
      longitude = 100.5018, 
      limit = 20 
    } = req.body;

    console.log(`🔍 Wongnai search: query="${query}", lat=${latitude}, lng=${longitude}, limit=${limit}`);

    const restaurants = await searchRestaurantsWithGooglePlaces(
      query, 
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(limit)
    );

    console.log(`✅ Wongnai search found ${restaurants.length} restaurants`);

    sendResponse(res, {
      restaurants,
      total: restaurants.length,
      query,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    }, `Found ${restaurants.length} restaurants via Wongnai search`);
  } catch (error) {
    console.error('❌ Wongnai search error:', error);
    sendError(res, 'Failed to search restaurants via Wongnai', 500, error.message);
  }
});

// GET /api/restaurants/discover - Discover restaurants
router.get('/discover', async (req, res) => {
  try {
    const { 
      latitude = 13.7563, 
      longitude = 100.5018, 
      limit = 20 
    } = req.query;

    console.log(`🔍 Discovering restaurants: lat=${latitude}, lng=${longitude}, limit=${limit}`);

    const restaurants = await searchRestaurantsWithGooglePlaces(
      'popular restaurant', 
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(limit)
    );

    console.log(`✅ Discovered ${restaurants.length} restaurants`);

    sendResponse(res, {
      restaurants,
      total: restaurants.length,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    }, `Discovered ${restaurants.length} restaurants`);
  } catch (error) {
    console.error('❌ Restaurant discovery error:', error);
    sendError(res, 'Failed to discover restaurants', 500, error.message);
  }
});

// GET /api/restaurants/nearby - Find nearby restaurants
router.get('/nearby', async (req, res) => {
  try {
    const { 
      latitude = 13.7563, 
      longitude = 100.5018, 
      radius = 5000,
      limit = 20 
    } = req.query;

    console.log(`🔍 Finding nearby restaurants: lat=${latitude}, lng=${longitude}, radius=${radius}m, limit=${limit}`);

    const restaurants = await searchRestaurantsWithGooglePlaces(
      'restaurant', 
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(limit)
    );

    console.log(`✅ Found ${restaurants.length} nearby restaurants`);

    sendResponse(res, {
      restaurants,
      total: restaurants.length,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      radius: parseInt(radius)
    }, `Found ${restaurants.length} nearby restaurants`);
  } catch (error) {
    console.error('❌ Nearby restaurants error:', error);
    sendError(res, 'Failed to find nearby restaurants', 500, error.message);
  }
});

// GET /api/restaurants/health - Health check for restaurant service
router.get('/health', async (req, res) => {
  try {
    console.log('🔍 Checking restaurant service health');

    const healthStatus = await restaurantService.healthCheck();

    const status = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(status).json({
      success: healthStatus.status === 'healthy',
      message: `Restaurant service is ${healthStatus.status}`,
      data: healthStatus,
      timestamp: new Date().toISOString(),
      via: 'BiteBase Restaurant API'
    });

  } catch (error) {
    console.error('❌ Restaurant service health check error:', error);
    sendError(res, 'Restaurant service health check failed', 503, error.message);
  }
});

// GET /api/restaurants/stats - Get service statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('🔍 Getting restaurant service statistics');

    const stats = restaurantService.getStats();

    sendResponse(res, stats, 'Restaurant service statistics retrieved');

  } catch (error) {
    console.error('❌ Restaurant service stats error:', error);
    sendError(res, 'Failed to get restaurant service statistics', 500, error.message);
  }
});

// GET /api/restaurants/:id - Get restaurant details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Getting restaurant details for ID: ${id}`);

    const restaurant = await restaurantService.getRestaurantById(id);
    
    if (!restaurant) {
      return sendError(res, 'Restaurant not found', 404);
    }

    const transformedRestaurant = transformToFrontendFormat(restaurant);

    console.log(`✅ Retrieved restaurant details: ${restaurant.name}`);

    sendResponse(res, transformedRestaurant, 'Restaurant details retrieved');
  } catch (error) {
    console.error('❌ Restaurant details error:', error);
    sendError(res, 'Failed to get restaurant details', 500, error.message);
  }
});

// POST /api/restaurants - Create a new restaurant (for restaurant setup)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      cuisine,
      priceRange,
      address,
      city,
      district,
      postalCode,
      latitude,
      longitude,
      phone,
      email,
      website,
      openingHours,
      capacity,
      averageTicket,
      features
    } = req.body;

    // Validate required fields
    if (!name || !cuisine || !priceRange || !address || !phone) {
      return sendError(res, 'Missing required fields: name, cuisine, priceRange, address, phone', 400);
    }

    // For now, create a mock restaurant ID and return success
    // In production, this would save to the database
    const restaurantId = Math.floor(Math.random() * 10000) + 1000;
    
    const newRestaurant = {
      id: restaurantId,
      name,
      description,
      cuisine,
      priceRange,
      address: `${address}, ${district}, ${city} ${postalCode}`,
      city,
      district,
      postalCode,
      latitude: parseFloat(latitude) || 13.7563,
      longitude: parseFloat(longitude) || 100.5018,
      phone,
      email,
      website,
      openingHours,
      capacity: parseInt(capacity) || 0,
      averageTicket: parseFloat(averageTicket) || 0,
      features: Array.isArray(features) ? features : [],
      rating: 0,
      reviewCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ Restaurant created: ${name} (ID: ${restaurantId})`);

    sendResponse(res, {
      restaurant: newRestaurant,
      message: 'Restaurant setup completed successfully!',
      nextSteps: [
        'Complete your market analysis',
        'Set up your menu items',
        'Configure analytics tracking'
      ]
    }, 'Restaurant created successfully', 201);

  } catch (error) {
    console.error('❌ Restaurant creation error:', error);
    sendError(res, 'Failed to create restaurant', 500, error.message);
  }
});

// GET /api/restaurants/user/:userId - Get restaurants for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return mock data
    // In production, this would query the database for user's restaurants
    const userRestaurants = [
      {
        id: 1001,
        name: 'Sample Restaurant',
        cuisine: 'Thai',
        priceRange: '$$',
        address: 'Bangkok, Thailand',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];

    sendResponse(res, {
      restaurants: userRestaurants,
      total: userRestaurants.length,
      userId
    }, 'User restaurants retrieved successfully');

  } catch (error) {
    console.error('❌ User restaurants error:', error);
    sendError(res, 'Failed to get user restaurants', 500, error.message);
  }
});

// PUT /api/restaurants/:id - Update restaurant details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // For now, return success with updated data
    // In production, this would update the database
    const updatedRestaurant = {
      id: parseInt(id),
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ Restaurant updated: ID ${id}`);

    sendResponse(res, {
      restaurant: updatedRestaurant
    }, 'Restaurant updated successfully');

  } catch (error) {
    console.error('❌ Restaurant update error:', error);
    sendError(res, 'Failed to update restaurant', 500, error.message);
  }
});

// POST /api/restaurants/:id/market-analysis - Generate market analysis for a restaurant
router.post('/:id/market-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const { radius = 5, analysisType = 'comprehensive' } = req.body;

    // Get restaurant location (mock for now)
    const restaurantLat = 13.7563;
    const restaurantLng = 100.5018;

    // Search for nearby restaurants using Google Places
    const nearbyRestaurants = await searchRestaurantsWithGooglePlaces(
      'restaurant',
      restaurantLat,
      restaurantLng,
      50 // Get more restaurants for analysis
    );

    // Perform market analysis
    const analysis = {
      restaurantId: parseInt(id),
      location: {
        latitude: restaurantLat,
        longitude: restaurantLng,
        radius: radius
      },
      analysisType,
      competitorCount: nearbyRestaurants.length,
      competitors: nearbyRestaurants.slice(0, 10), // Top 10 competitors
      marketMetrics: {
        averageRating: nearbyRestaurants.reduce((sum, r) => sum + r.rating, 0) / nearbyRestaurants.length,
        priceDistribution: {
          budget: nearbyRestaurants.filter(r => r.price_level <= 1).length,
          moderate: nearbyRestaurants.filter(r => r.price_level === 2).length,
          upscale: nearbyRestaurants.filter(r => r.price_level === 3).length,
          fineDining: nearbyRestaurants.filter(r => r.price_level >= 4).length
        },
        cuisineDistribution: nearbyRestaurants.reduce((acc, r) => {
          const cuisine = r.cuisine || 'Other';
          acc[cuisine] = (acc[cuisine] || 0) + 1;
          return acc;
        }, {}),
        marketDensity: nearbyRestaurants.length / (Math.PI * radius * radius), // restaurants per km²
      },
      recommendations: [
        'Consider differentiating with unique cuisine offerings',
        'Focus on customer service to improve ratings',
        'Optimize pricing strategy based on local competition',
        'Leverage location advantages for marketing'
      ],
      generatedAt: new Date().toISOString()
    };

    console.log(`✅ Market analysis generated for restaurant ${id}`);

    sendResponse(res, analysis, 'Market analysis completed successfully');

  } catch (error) {
    console.error('❌ Market analysis error:', error);
    sendError(res, 'Failed to generate market analysis', 500, error.message);
  }
});

module.exports = router;