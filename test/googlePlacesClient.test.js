const assert = require('assert');

// Mock the @googlemaps/google-maps-services-js Client
// This MUST be done BEFORE requiring GooglePlacesClient for the mock to take effect.
let mockGoogleMapsClientInstance;
const mockGoogleMapsClient = {
  placesNearby: ({ params }) => {
    mockGoogleMapsClientInstance.lastParams = params;
    if (params.key === 'valid_key_nearby_ok') {
      return Promise.resolve({
        data: {
          status: GooglePlacesAPIStatus.OK,
          results: [{ place_id: 'place1', name: 'Restaurant A' }],
          html_attributions: [],
        }
      });
    } else if (params.key === 'valid_key_nearby_zero_results') {
      return Promise.resolve({
        data: { status: GooglePlacesAPIStatus.ZERO_RESULTS, results: [], html_attributions: [] }
      });
    } else if (params.key === 'valid_key_api_error') {
      return Promise.resolve({
        data: { status: GooglePlacesAPIStatus.REQUEST_DENIED, error_message: 'API key error' }
      });
    } else if (params.key === 'network_error_key') {
        return Promise.reject(new Error('Simulated network error'));
    }
    return Promise.resolve({ data: { status: 'UNKNOWN_MOCK_ERROR' } });
  },
  placeDetails: ({ params }) => {
    mockGoogleMapsClientInstance.lastParams = params;
    if (params.key === 'valid_key_details_ok' && params.place_id === 'place1') {
      return Promise.resolve({
        data: {
          status: GooglePlacesAPIStatus.OK,
          result: { place_id: 'place1', name: 'Restaurant A', vicinity: '123 Main St' },
          html_attributions: [],
        }
      });
    } else if (params.key === 'valid_key_details_not_found') {
       return Promise.resolve({
        data: { status: GooglePlacesAPIStatus.NOT_FOUND }
      });
    } else if (params.key === 'network_error_key_details') {
        return Promise.reject(new Error('Simulated network error details'));
    }
    return Promise.resolve({ data: { status: 'UNKNOWN_MOCK_ERROR' } });
  }
};

// Store original Client to restore it later if needed, though for tests it's usually not.
const OriginalGoogleMapsClient = require('@googlemaps/google-maps-services-js').Client; // Get ref to original
const googleMapsAPIs = require('@googlemaps/google-maps-services-js'); // Get module object
googleMapsAPIs.Client = function() { // Override Client constructor on the module object
  mockGoogleMapsClientInstance = this;
  return mockGoogleMapsClient;
};

// Now require the service and config, after the mock is in place.
const { GooglePlacesClient, GooglePlacesAPIError, GooglePlacesAPIStatus } = require('../services/GooglePlacesClient');
const { googlePlacesConfig } = require('../config/googlePlaces');


describe('GooglePlacesClient', () => {
  let client;
  let tempApiKey; // To store and restore original API key

  beforeEach(() => {
    // Reset counts or any instance-specific mock states if necessary
    if (mockGoogleMapsClientInstance) {
        mockGoogleMapsClientInstance.lastParams = null;
    }
    // Ensure a dummy API key is set for most tests to pass constructor validation
    // Tests specifically for API key handling will override this.
    tempApiKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'AIzaTestKeyForGeneralTests';
  });

  afterEach(() => {
    // Restore original API key
    if (tempApiKey === undefined) {
      delete process.env.GOOGLE_PLACES_API_KEY;
    } else {
      process.env.GOOGLE_PLACES_API_KEY = tempApiKey;
    }
  });

  describe('Constructor', () => {
    it('should instantiate with default config if API key is present', () => {
      const tempApiKey = process.env.GOOGLE_PLACES_API_KEY;
      process.env.GOOGLE_PLACES_API_KEY = 'AIzaTestKey'; // Mock API key
      client = new GooglePlacesClient();
      assert(client.client, 'Client should have an inner google maps client');
      process.env.GOOGLE_PLACES_API_KEY = tempApiKey; // Restore
    });

    it('should log an error if API key is missing but still instantiate (current behavior)', () => {
        const tempApiKey = process.env.GOOGLE_PLACES_API_KEY;
        delete process.env.GOOGLE_PLACES_API_KEY; // Ensure key is missing
        // Suppress console.error for this test
        const originalConsoleError = console.error;
        let consoleErrorOutput = '';
        console.error = (message) => { consoleErrorOutput += message; };

        client = new GooglePlacesClient(); // This will log error

        console.error = originalConsoleError; // Restore console.error
        process.env.GOOGLE_PLACES_API_KEY = tempApiKey; // Restore

        assert(client, 'Client should still instantiate');
        assert(consoleErrorOutput.includes('GOOGLE_PLACES_API_KEY environment variable is required'), 'Should log missing API key error');
    });
  });

  describe('searchNearbyRestaurants', () => {
    beforeEach(() => {
        client = new GooglePlacesClient({ ...googlePlacesConfig, apiKey: 'valid_key_nearby_ok' });
    });

    it('should return data on successful API call', async () => {
      const response = await client.searchNearbyRestaurants(40.7, -74.0);
      assert.strictEqual(response.status, GooglePlacesAPIStatus.OK);
      assert.strictEqual(response.results[0].name, 'Restaurant A');
    });

    it('should correctly pass parameters to the underlying client', async () => {
      await client.searchNearbyRestaurants(40.7, -74.0, 1500, 'pizza', 'restaurant');
      assert.deepStrictEqual(mockGoogleMapsClientInstance.lastParams.location, { lat: 40.7, lng: -74.0 });
      assert.strictEqual(mockGoogleMapsClientInstance.lastParams.radius, 1500);
      assert.strictEqual(mockGoogleMapsClientInstance.lastParams.keyword, 'pizza');
      assert.strictEqual(mockGoogleMapsClientInstance.lastParams.type, 'restaurant');
    });

    it('should handle ZERO_RESULTS correctly', async () => {
      client.config.apiKey = 'valid_key_nearby_zero_results';
      const response = await client.searchNearbyRestaurants(40.7, -74.0);
      assert.strictEqual(response.status, GooglePlacesAPIStatus.ZERO_RESULTS);
      assert.strictEqual(response.results.length, 0);
    });

    it('should throw GooglePlacesAPIError on API error status', async () => {
      client.config.apiKey = 'valid_key_api_error';
      try {
        await client.searchNearbyRestaurants(40.7, -74.0);
        assert.fail('Should have thrown GooglePlacesAPIError');
      } catch (error) {
        assert(error instanceof GooglePlacesAPIError, 'Error should be GooglePlacesAPIError');
        assert.strictEqual(error.status, GooglePlacesAPIStatus.REQUEST_DENIED);
        assert(error.message.includes('API key error'));
      }
    });

    it('should throw GooglePlacesAPIError on network error', async () => {
      client.config.apiKey = 'network_error_key';
       try {
        await client.searchNearbyRestaurants(40.7, -74.0);
        assert.fail('Should have thrown GooglePlacesAPIError on network issue');
      } catch (error) {
        assert(error instanceof GooglePlacesAPIError, 'Error should be GooglePlacesAPIError');
        assert.strictEqual(error.status, 'CLIENT_SIDE_ERROR');
        assert(error.message.includes('Simulated network error'));
      }
    });

    it('should throw error if API key is missing during call', async () => {
        client.config.apiKey = null; // Simulate missing API key at call time
        try {
            await client.searchNearbyRestaurants(40.7, -74.0);
            assert.fail('Should have thrown due to missing API key');
        } catch (e) {
            assert(e instanceof GooglePlacesAPIError);
            assert.strictEqual(e.status, 'MISSING_API_KEY');
        }
    });
  });

  describe('getPlaceDetails', () => {
    beforeEach(() => {
        client = new GooglePlacesClient({ ...googlePlacesConfig, apiKey: 'valid_key_details_ok' });
    });

    it('should return place details on successful API call', async () => {
      const response = await client.getPlaceDetails('place1');
      assert.strictEqual(response.status, GooglePlacesAPIStatus.OK);
      assert.strictEqual(response.result.name, 'Restaurant A');
    });

    it('should correctly pass parameters including fields to the underlying client', async () => {
      const fields = ['name', 'geometry'];
      await client.getPlaceDetails('place1', fields);
      assert.strictEqual(mockGoogleMapsClientInstance.lastParams.place_id, 'place1');
      assert.strictEqual(mockGoogleMapsClientInstance.lastParams.fields, 'name,geometry');
    });

    it('should throw GooglePlacesAPIError if place not found', async () => {
      client.config.apiKey = 'valid_key_details_not_found';
      try {
        await client.getPlaceDetails('nonexistent_place');
        assert.fail('Should have thrown GooglePlacesAPIError for NOT_FOUND');
      } catch (error) {
        assert(error instanceof GooglePlacesAPIError, 'Error should be GooglePlacesAPIError');
        assert.strictEqual(error.status, GooglePlacesAPIStatus.NOT_FOUND);
      }
    });

    it('should throw GooglePlacesAPIError on network error for details', async () => {
      client.config.apiKey = 'network_error_key_details';
       try {
        await client.getPlaceDetails('place1');
        assert.fail('Should have thrown GooglePlacesAPIError on network issue for details');
      } catch (error) {
        assert(error instanceof GooglePlacesAPIError, 'Error should be GooglePlacesAPIError');
        assert.strictEqual(error.status, 'CLIENT_SIDE_ERROR');
        assert(error.message.includes('Simulated network error details'));
      }
    });
  });

  describe('healthCheck', () => {
    it('should return healthy if API key is valid and nearby search works', async () => {
        client = new GooglePlacesClient({ ...googlePlacesConfig, apiKey: 'valid_key_nearby_ok' });
        const health = await client.healthCheck();
        assert.strictEqual(health.status, 'healthy');
        assert.strictEqual(health.api_accessible, true);
    });

    it('should return unhealthy if API key is invalid (results in REQUEST_DENIED)', async () => {
        client = new GooglePlacesClient({ ...googlePlacesConfig, apiKey: 'valid_key_api_error' });
        const health = await client.healthCheck();
        assert.strictEqual(health.status, 'unhealthy');
        assert.strictEqual(health.api_accessible, false);
        assert.strictEqual(health.error_details, GooglePlacesAPIStatus.REQUEST_DENIED);
    });

    it('should return unhealthy if API key is missing', async () => {
        client = new GooglePlacesClient({ ...googlePlacesConfig, apiKey: null });
        const health = await client.healthCheck();
        assert.strictEqual(health.status, 'unhealthy');
        assert.strictEqual(health.reason, 'API key is missing');
    });
  });

});

// Basic test runner for this file
// In a real project, use Jest, Mocha, Ava, etc.
async function runTests() {
  console.log('Running tests for GooglePlacesClient...');
  const testSuite = new describe('GooglePlacesClient', () => {}); // Dummy for structure
  let passed = 0;
  let failed = 0;

  for (const key in testSuite) {
    if (typeof testSuite[key] === 'function' && key.startsWith('it should')) {
      try {
        await testSuite[key](); // This won't work directly as tests are nested.
                                // This runner is too simple for nested `describe` and `it`.
                                // For now, this file must be run with a proper test runner that understands `describe` and `it`.
        // For manual execution, one would call the test functions directly.
        console.log(`  ❓ ${key} - (cannot auto-run with this simple runner)`);
      } catch (e) {
        // console.error(`  ❌ ${key} - FAILED: ${e.message}`);
        // failed++;
      }
    }
  }

  // This simple runner cannot execute describe/it blocks.
  // You would typically use a test runner like Jest or Mocha:
  // e.g., `npx mocha test/googlePlacesClient.test.js`
  // Or integrate into `npm test` script.
  console.log('\nTest execution requires a proper test runner (e.g., Mocha, Jest).');
  console.log('The describe/it blocks are for structure and compatibility with such runners.');
  console.log('To manually check, you can try running this file with node and see if errors are thrown by asserts.');

  // Example of how one might manually invoke a test if they were standalone functions:
  // await new describe('GooglePlacesClient', {}).describe('Constructor', {}).it('should instantiate...',); // etc.
}

// If run directly:
if (require.main === module) {
  // runTests(); // Commented out as it won't work as expected.
  console.log("Please run these tests using a test runner like Mocha or Jest.");
  console.log("Example: npx mocha test/googlePlacesClient.test.js (after installing mocha)");
}

module.exports = {
    // Exporting for potential use in a combined test runner
};
