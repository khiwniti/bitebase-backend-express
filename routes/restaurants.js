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

module.exports = router;