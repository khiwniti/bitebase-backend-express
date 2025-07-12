/**
 * Google Places API Client
 * Uses the @googlemaps/google-maps-services-js library to interact with Google Places API.
 */

const { Client, Status } = require('@googlemaps/google-maps-services-js');
const { googlePlacesConfig, validateGooglePlacesConfig } = require('../config/googlePlaces');

// Custom error classes
class GooglePlacesAPIError extends Error {
  constructor(message, status, responseData = null) {
    super(message);
    this.name = 'GooglePlacesAPIError';
    this.status = status; // Google API status code (e.g., ZERO_RESULTS, OVER_QUERY_LIMIT)
    this.responseData = responseData; // Raw response data from Google, if available
  }
}

class GooglePlacesClient {
  constructor(config = googlePlacesConfig) {
    this.config = config;

    // Validate configuration before initializing client
    if (!validateGooglePlacesConfig()) {
      // Log the error as validateGooglePlacesConfig already logs details
      console.error('Google Places Client initialization failed due to invalid configuration.');
      // Depending on application requirements, could throw or operate in a disabled state.
      // For now, the client will be created, but API calls will likely fail.
      // A more robust solution might prevent instantiation or use a mock client.
    }

    this.client = new Client({});
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastRequestTime = null;
  }

  // Helper to build common request parameters
  _buildRequestParams(customParams = {}) {
    return {
      key: this.config.apiKey,
      language: this.config.defaults.language,
      ...customParams,
    };
  }

  // Helper to handle API responses and errors
  _handleResponse(response, methodName) {
    this.requestCount++;
    this.lastRequestTime = new Date();

    console.log(`🌐 Google Places API Request: ${methodName} - Status: ${response.data.status}`);

    if (response.data.status === Status.OK || response.data.status === Status.ZERO_RESULTS) {
      return response.data;
    } else {
      this.errorCount++;
      console.error(`❌ Google Places API Error (${methodName}): ${response.data.status}`, response.data.error_message || '');
      throw new GooglePlacesAPIError(
        response.data.error_message || `API request failed with status ${response.data.status}`,
        response.data.status,
        response.data
      );
    }
  }

  /**
   * Search for nearby places (restaurants).
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} [radius=googlePlacesConfig.defaults.radius] - Search radius in meters.
   * @param {string} [keyword] - A term to be matched against all content that Google has indexed for this place.
   * @param {string} [type='restaurant'] - Restricts results to places matching the specified type.
   * @param {string[]} [fields=googlePlacesConfig.fields.restaurantDiscovery] - Specific fields to return.
   * @returns {Promise<object>} The API response data.
   */
  async searchNearbyRestaurants(
    latitude,
    longitude,
    radius = this.config.defaults.radius,
    keyword = undefined, // Optional: 'restaurant' or specific cuisine
    type = 'restaurant', // Default to searching for restaurants
    fields = this.config.fields.restaurantDiscovery // Using a curated list of fields
  ) {
    if (!this.config.apiKey) {
        throw new GooglePlacesAPIError('API key is missing. Cannot perform search.', 'MISSING_API_KEY');
    }
    if (!latitude || !longitude) {
      throw new Error('Latitude and Longitude are required for nearby search.');
    }

    const params = this._buildRequestParams({
      location: { lat: latitude, lng: longitude },
      radius: radius,
      type: type,
      keyword: keyword,
      // Using 'fields' with Nearby Search is not directly supported in the same way as Place Details.
      // Nearby Search returns a default set of fields. We select from restaurantDiscovery for consistency,
      // but the API itself determines what's returned by default for Nearby Search.
      // For more control, one would do a Nearby Search (gets place_ids) then Place Details for each.
      // However, for discovery, the default set is often sufficient and more cost-effective.
    });

    try {
      const response = await this.client.placesNearby({ params });
      return this._handleResponse(response, 'searchNearbyRestaurants');
    } catch (error) {
      this.errorCount++;
      if (error instanceof GooglePlacesAPIError) throw error; // Re-throw our custom error
      console.error('❌ Google Places Client Network/SDK Error (searchNearbyRestaurants):', error.message || error);
      // Check for Axios-like error structure if the underlying client throws it
      if (error.response && error.response.data) {
         throw new GooglePlacesAPIError(
            error.response.data.error_message || `SDK error: ${error.response.status}`,
            error.response.data.status || 'SDK_ERROR',
            error.response.data
         );
      }
      throw new GooglePlacesAPIError(error.message || 'An unexpected error occurred during nearby search.', 'CLIENT_SIDE_ERROR');
    }
  }

  /**
   * Get details for a specific place.
   * @param {string} placeId - The Google Place ID.
   * @param {string[]} [fields=googlePlacesConfig.fields.detailed] - Array of fields to request.
   * @returns {Promise<object>} The API response data.
   */
  async getPlaceDetails(placeId, fields = this.config.fields.detailed) {
    if (!this.config.apiKey) {
        throw new GooglePlacesAPIError('API key is missing. Cannot get place details.', 'MISSING_API_KEY');
    }
    if (!placeId) {
      throw new Error('Place ID is required for getting details.');
    }

    const params = this._buildRequestParams({
      place_id: placeId,
      fields: fields.join(','), // Fields should be a comma-separated string
    });

    try {
      const response = await this.client.placeDetails({ params });
      return this._handleResponse(response, 'getPlaceDetails');
    } catch (error) {
      this.errorCount++;
      if (error instanceof GooglePlacesAPIError) throw error;
      console.error('❌ Google Places Client Network/SDK Error (getPlaceDetails):', error.message || error);
       if (error.response && error.response.data) {
         throw new GooglePlacesAPIError(
            error.response.data.error_message || `SDK error: ${error.response.status}`,
            error.response.data.status || 'SDK_ERROR',
            error.response.data
         );
      }
      throw new GooglePlacesAPIError(error.message || 'An unexpected error occurred while fetching place details.', 'CLIENT_SIDE_ERROR');
    }
  }

  /**
   * Health check for the Google Places client.
   * Attempts a simple, low-cost query to verify API key validity and connectivity.
   * @returns {Promise<object>} Health status object.
   */
  async healthCheck() {
    if (!this.config.apiKey) {
      return {
        status: 'unhealthy',
        reason: 'API key is missing',
        api_accessible: false,
        error: 'Google Places API key not configured in environment variables.',
        last_request: this.lastRequestTime,
        request_count: this.requestCount,
        error_count: this.errorCount
      };
    }
    try {
      // A simple nearby search for a known location with minimal radius and results.
      // Using a type that's very common, like 'point_of_interest' to ensure some result if API is working.
      const response = await this.client.placesNearby({
        params: this._buildRequestParams({
          location: { lat: 40.7128, lng: -74.0060 }, // New York City
          radius: 1,
          type: 'point_of_interest'
        }),
      });

      if (response.data.status === Status.OK || response.data.status === Status.ZERO_RESULTS) {
        return {
          status: 'healthy',
          api_accessible: true,
          message: 'Successfully connected to Google Places API.',
          response_status: response.data.status,
          last_request: this.lastRequestTime,
          request_count: this.requestCount,
          error_count: this.errorCount
        };
      } else {
        // This case might indicate an issue with the API key or permissions, even if not a network error
        throw new GooglePlacesAPIError(
          response.data.error_message || `API health check failed with status ${response.data.status}`,
          response.data.status,
          response.data
        );
      }
    } catch (error) {
      let errorMessage = error.message;
      let errorStatus = 'HEALTH_CHECK_ERROR';
      if (error instanceof GooglePlacesAPIError) {
          errorMessage = error.message;
          errorStatus = error.status;
      } else if (error.response && error.response.data) {
          errorMessage = error.response.data.error_message || `SDK error: ${error.response.status}`;
          errorStatus = error.response.data.status || 'SDK_ERROR';
      }

      return {
        status: 'unhealthy',
        api_accessible: false,
        reason: `Health check failed: ${errorMessage}`,
        error_details: errorStatus,
        last_request: this.lastRequestTime,
        request_count: this.requestCount,
        error_count: this.errorCount
      };
    }
  }

  getUsageStats() {
    return {
      total_requests: this.requestCount,
      total_errors: this.errorCount,
      error_rate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      last_request_time: this.lastRequestTime,
    };
  }
}

module.exports = {
  GooglePlacesClient,
  GooglePlacesAPIError,
  GooglePlacesAPIStatus: Status // Exporting Google's Status enum for convenience
};
