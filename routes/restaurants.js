const express = require('express');
const router = express.Router();
const { Client } = require('@googlemaps/google-maps-services-js');

// Initialize Google Maps client
const googleMapsClient = new Client({});

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

// Helper function to convert Google Places string ID to numeric ID
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Helper function to transform Google Places data to frontend format
function transformToFrontendFormat(place) {
  return {
    id: hashCode(place.place_id), // Convert string ID to numeric
    name: place.name,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    rating: place.rating || 4.0,
    price_level: place.price_level || 2,
    cuisine: place.types?.find(type => 
      ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'].includes(type)
    ) || 'restaurant',
    address: place.vicinity || place.formatted_address,
    photo_url: place.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}` 
      : null,
    opening_hours: place.opening_hours?.open_now,
    place_id: place.place_id,
    types: place.types
  };
}

// Search restaurants using Google Places API
async function searchRestaurantsWithGooglePlaces(query, latitude, longitude, limit = 20) {
  try {
    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        radius: 5000, // 5km radius
        type: 'restaurant',
        keyword: query,
        key: process.env.GOOGLE_PLACES_API_KEY
      }
    });

    const places = response.data.results.slice(0, limit);
    return places.map(transformToFrontendFormat);
  } catch (error) {
    console.error('Google Places API error:', error);
    throw error;
  }
}

// GET /api/restaurants - Get all restaurants (for dashboard)
router.get('/', async (req, res) => {
  try {
    const { 
      latitude = 13.7563, 
      longitude = 100.5018, 
      limit = 20 
    } = req.query;

    console.log(`🔍 Getting all restaurants: lat=${latitude}, lng=${longitude}, limit=${limit}`);

    const restaurants = await searchRestaurantsWithGooglePlaces(
      'restaurant', 
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(limit)
    );

    console.log(`✅ Retrieved ${restaurants.length} restaurants`);

    sendResponse(res, {
      restaurants,
      total: restaurants.length,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    }, `Retrieved ${restaurants.length} restaurants`);
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
      limit = 20 
    } = req.query;

    console.log(`🔍 Searching restaurants: query="${query}", lat=${latitude}, lng=${longitude}, limit=${limit}`);

    const restaurants = await searchRestaurantsWithGooglePlaces(
      query, 
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(limit)
    );

    console.log(`✅ Found ${restaurants.length} restaurants from Google Places`);

    sendResponse(res, restaurants, `Found ${restaurants.length} restaurants`);
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
      latitude = 13.7563, 
      longitude = 100.5018, 
      limit = 20 
    } = req.body;

    console.log(`🔍 POST Searching restaurants: query="${query}", lat=${latitude}, lng=${longitude}, limit=${limit}`);

    const restaurants = await searchRestaurantsWithGooglePlaces(
      query, 
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(limit)
    );

    console.log(`✅ Found ${restaurants.length} restaurants from Google Places`);

    sendResponse(res, {
      restaurants,
      total: restaurants.length,
      query,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    }, `Found ${restaurants.length} restaurants`);
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

// GET /api/restaurants/:id - Get restaurant details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return mock data since we don't have a database
    // In a real implementation, you would fetch from database or Google Places Details API
    const restaurant = {
      id: parseInt(id),
      name: `Restaurant ${id}`,
      latitude: 13.7563,
      longitude: 100.5018,
      rating: 4.5,
      price_level: 2,
      cuisine: 'Thai',
      address: 'Bangkok, Thailand',
      description: 'A wonderful restaurant with great food and atmosphere.',
      opening_hours: true,
      photos: []
    };

    sendResponse(res, restaurant, 'Restaurant details retrieved');
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