/**
 * Foursquare API Configuration
 * Production-ready configuration for BiteBase Foursquare integration
 */

require('dotenv').config();

const foursquareConfig = {
  // API Configuration
  apiKey: process.env.FOURSQUARE_API_KEY,
  baseUrl: 'https://api.foursquare.com/v3',
  version: '20231010', // API version
  
  // Rate Limiting Configuration
  rateLimit: {
    premium: process.env.FOURSQUARE_RATE_LIMIT || 100000, // 100,000 calls/day for premium
    standard: 1000, // 1,000 calls/day for standard
    requestsPerMinute: 200, // Max requests per minute
    burstLimit: 50 // Max burst requests
  },
  
  // Request Configuration
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // Base delay in ms
  
  // Caching Configuration
  cache: {
    venueDataTTL: 3600, // 1 hour for venue data
    searchResultsTTL: 1800, // 30 minutes for search results
    trafficDataTTL: 900, // 15 minutes for traffic data
    eventDataTTL: 7200 // 2 hours for event data
  },
  
  // Default Search Parameters
  defaults: {
    radius: 1000, // 1km default radius
    limit: 50, // Default result limit
    categories: {
      food_and_dining: '13000',
      restaurants: {
        fast_food: ['13145', '13146'],
        casual_dining: ['13065', '13066'],
        fine_dining: ['13064'],
        cafe: ['13032', '13033'],
        pizza: ['13064'],
        asian: ['13072', '13073'],
        mexican: ['13074'],
        italian: ['13066']
      }
    }
  },
  
  // Required fields for API requests
  fields: {
    venue: [
      'fsq_id',
      'name',
      'location',
      'categories',
      'chains',
      'distance',
      'popularity',
      'rating',
      'price',
      'hours',
      'website',
      'tel',
      'email',
      'social_media',
      'verified',
      'stats'
    ],
    stats: [
      'visits_by_day',
      'visits_by_hour',
      'popularity_by_hour',
      'demographic_breakdown'
    ]
  }
};

// Validation
const validateConfig = () => {
  const errors = [];
  
  if (!foursquareConfig.apiKey) {
    errors.push('FOURSQUARE_API_KEY environment variable is required');
  }
  
  if (foursquareConfig.apiKey && !foursquareConfig.apiKey.startsWith('fsq_')) {
    errors.push('FOURSQUARE_API_KEY should start with "fsq_"');
  }
  
  if (errors.length > 0) {
    throw new Error(`Foursquare configuration errors:\n${errors.join('\n')}`);
  }
  
  return true;
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  foursquareConfig.rateLimit.premium = 10000; // Reduced for development
  foursquareConfig.timeout = 15000; // Longer timeout for debugging
}

if (process.env.NODE_ENV === 'production') {
  foursquareConfig.retryAttempts = 5; // More retries in production
  foursquareConfig.cache.venueDataTTL = 7200; // Longer cache in production
}

module.exports = {
  foursquareConfig,
  validateConfig
};