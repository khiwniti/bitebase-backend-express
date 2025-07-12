/**
 * Google Places API Configuration
 * Configuration for BiteBase Google Places API integration
 */

require('dotenv').config();

const googlePlacesConfig = {
  apiKey: process.env.GOOGLE_PLACES_API_KEY,
  baseUrl: 'https://maps.googleapis.com/maps/api/place', // Base URL for Places API

  // Default parameters for requests (can be overridden)
  defaults: {
    radius: 1000, // Default search radius in meters
    language: 'en', // Default language for results
  },

  // Request configuration (timeouts, retries - though the client library might handle some of this)
  timeout: 10000, // 10 seconds
  retryAttempts: 3, // Number of retry attempts for transient errors

  // Define common sets of fields to request for different types of queries
  // This helps in managing costs and data consistency
  fields: {
    basic: ['place_id', 'name', 'geometry', 'types', 'vicinity'],
    contact: ['formatted_phone_number', 'international_phone_number'],
    atmosphere: ['rating', 'user_ratings_total', 'price_level'],
    detailed: [
      'place_id', 'name', 'geometry', 'types', 'vicinity',
      'formatted_address', 'address_components',
      'formatted_phone_number', 'international_phone_number',
      'opening_hours', 'website',
      'rating', 'user_ratings_total', 'price_level',
      'photos', 'reviews', 'url'
    ],
    // Specific for restaurant/food discovery
    restaurantDiscovery: [
        'place_id', 'name', 'business_status', 'formatted_address',
        'geometry.location', 'icon', 'icon_mask_base_uri', 'icon_background_color',
        'opening_hours.open_now', 'photos', 'price_level', 'rating', 'user_ratings_total',
        'types', 'vicinity', 'plus_code'
    ]
  }
};

// Validation function for the configuration
const validateConfig = () => {
  const errors = [];

  if (!googlePlacesConfig.apiKey) {
    errors.push('GOOGLE_PLACES_API_KEY environment variable is required.');
  } else if (!googlePlacesConfig.apiKey.startsWith('AIza')) {
    // Basic sanity check for Google API key format
    errors.push('GOOGLE_PLACES_API_KEY does not appear to be a valid Google API key.');
  }

  if (errors.length > 0) {
    // In a real application, you might want to throw this error
    // or handle it in a way that prevents the app from starting/using this service.
    console.error(`Google Places configuration errors:\n${errors.join('\n')}`);
    // For now, we'll just log it. Depending on how this is used,
    // the service using it might fail more gracefully.
    // throw new Error(`Google Places configuration errors:\n${errors.join('\n')}`);
  }

  return errors.length === 0; // Return true if valid, false otherwise
};

// Optionally, run validation when the module is loaded, or expect it to be called explicitly.
// validateConfig(); // Uncomment if you want to validate on module load, but might be too aggressive.

module.exports = {
  googlePlacesConfig,
  validateGooglePlacesConfig: validateConfig // Exporting the validation function
};
