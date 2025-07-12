const assert = require('assert');
const RestaurantDiscoveryService = require('../services/RestaurantDiscoveryService');
const { FoursquareClient } = require('../services/FoursquareClient');
const { GooglePlacesClient } = require('../services/GooglePlacesClient');

// --- Mocks ---
let mockFoursquareClientInstance;
const MockFoursquareClient = function() {
  mockFoursquareClientInstance = this;
  this.searchVenues = async (params) => {
    this.lastParams = params;
    if (params.location.lat === 1) return [{ fsq_id: 'fsq1', name: 'Foursquareaurant A', categories: [{name: 'Restaurant'}] }];
    return [];
  };
  this.getVenueDetails = async (id) => {
    this.lastParams = { id };
    if (id === 'fsq1') return { fsq_id: 'fsq1', name: 'Foursquareaurant A Detailed', location: { formatted_address: '1 FSQ St' } };
    return null;
  };
  this.getVenueStats = async (id) => {
    if (id === 'fsq1') return { visits: 100 };
    return null;
  };
   this.healthCheck = async () => ({ status: 'healthy', client: 'foursquare' });
};

let mockGooglePlacesClientInstance;
const MockGooglePlacesClient = function() {
  mockGooglePlacesClientInstance = this;
  this.searchNearbyRestaurants = async (lat, lng, radius, keyword, type) => {
    this.lastParams = { lat, lng, radius, keyword, type };
    if (lat === 2) return { results: [{ place_id: 'gplace1', name: 'Googlerant B', types: ['restaurant'] }] };
    return { results: [] };
  };
  this.getPlaceDetails = async (placeId) => {
    this.lastParams = { placeId };
    if (placeId === 'gplace1') return { result: { place_id: 'gplace1', name: 'Googlerant B Detailed', vicinity: '2 Google Rd' } };
    return { result: null };
  };
  this.healthCheck = async () => ({ status: 'healthy', client: 'google' });
};

// Simple mock registry to replace original clients
const mockServiceRegistry = {
  '../services/FoursquareClient': { FoursquareClient: MockFoursquareClient },
  '../services/GooglePlacesClient': { GooglePlacesClient: MockGooglePlacesClient },
};

// Override require for these specific modules for testing purposes
const originalRequire = require;
RestaurantDiscoveryService.__set__ = (name, val) => { // For rewire or similar if we had it
    if (name === 'FoursquareClient') FoursquareClient = val;
    if (name === 'GooglePlacesClient') GooglePlacesClient = val;
};


describe('RestaurantDiscoveryService', () => {
  let originalEnv;
  let service;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Ensure mocks are used by RestaurantDiscoveryService
    // This is tricky without a proper DI framework or rewire.
    // For this basic setup, we rely on process.env to switch, and the client constructors being simple.
    // A more robust test would involve injecting mocked clients or using a library like 'proxyquire'.
  });

  afterEach(() => {
    process.env = originalEnv; // Restore environment variables
    // Restore original clients if they were globally mocked (not done in this simple version)
  });

  describe('Constructor & Client Selection', () => {
    it('should use FoursquareClient if LOCATION_DATA_SOURCE is "foursquare"', () => {
      process.env.LOCATION_DATA_SOURCE = 'foursquare';
      service = new RestaurantDiscoveryService(null); // DB not used in this part of test
      assert(service.locationClient instanceof MockFoursquareClient, 'Should be FoursquareClient');
      assert.strictEqual(service.locationSource, 'foursquare');
    });

    it('should use GooglePlacesClient if LOCATION_DATA_SOURCE is "google"', () => {
      process.env.GOOGLE_PLACES_API_KEY = 'fake-google-key'; // Needed for GooglePlacesClient constructor
      process.env.LOCATION_DATA_SOURCE = 'google';
      service = new RestaurantDiscoveryService(null);
      assert(service.locationClient instanceof MockGooglePlacesClient, 'Should be GooglePlacesClient');
      assert.strictEqual(service.locationSource, 'google');
      delete process.env.GOOGLE_PLACES_API_KEY;
    });

    it('should default to FoursquareClient if LOCATION_DATA_SOURCE is not set or invalid', () => {
      delete process.env.LOCATION_DATA_SOURCE;
      service = new RestaurantDiscoveryService(null);
      assert(service.locationClient instanceof MockFoursquareClient, 'Should default to FoursquareClient');

      process.env.LOCATION_DATA_SOURCE = 'invalid_source';
      service = new RestaurantDiscoveryService(null);
      assert(service.locationClient instanceof MockFoursquareClient, 'Should default to FoursquareClient for invalid source');
    });
  });

  describe('Data Transformation', () => {
    beforeEach(() => {
        service = new RestaurantDiscoveryService(null); // Source doesn't matter for direct transform calls
    });

    it('_transformFoursquareVenueToStandardFormat should correctly map Foursquare data', () => {
      const fsqVenue = {
        fsq_id: 'fsq123', name: 'Test FSQ', location: { latitude: 10, longitude: 20, formatted_address: '1 FSQ Way' },
        categories: [{id: 'cat1', name: 'Cafe'}], chains: [{name: 'TestChain'}], distance: 100, popularity: 0.9,
        rating: 8.5, price: 2, hours: {display: 'Mon-Fri 9-5'}, website: 'http://fsq.com', tel: '123', email: 'hi@fsq.com',
        social_media: { twitter: 'fsq'}, verified: true, stats: {total_photos: 10}
      };
      const transformed = service._transformFoursquareVenueToStandardFormat(fsqVenue);
      assert.strictEqual(transformed.id, 'fsq123');
      assert.strictEqual(transformed.name, 'Test FSQ');
      assert.strictEqual(transformed.location.address, '1 FSQ Way');
      assert.strictEqual(transformed.source, 'foursquare');
      assert.strictEqual(transformed.rating, 8.5);
    });

    it('_transformGooglePlaceToStandardFormat should correctly map Google Place data', () => {
      const gPlace = {
        place_id: 'gplace789', name: 'Test Google', geometry: { location: { lat: 30, lng: 40 } },
        vicinity: 'Nearby Googleplex', formatted_address: '3 Google Road', types: ['restaurant', 'food'],
        rating: 4.5, user_ratings_total: 150, price_level: 3,
        opening_hours: { open_now: true }, website: 'http://google.com', formatted_phone_number: '456',
        business_status: 'OPERATIONAL'
      };
      const transformed = service._transformGooglePlaceToStandardFormat(gPlace);
      assert.strictEqual(transformed.id, 'gplace789');
      assert.strictEqual(transformed.fsq_id, 'gplace789'); // For DB compatibility
      assert.strictEqual(transformed.name, 'Test Google');
      assert.strictEqual(transformed.location.address, 'Nearby Googleplex');
      assert.strictEqual(transformed.location.formatted_address, '3 Google Road');
      assert.strictEqual(transformed.source, 'google');
      assert.strictEqual(transformed.rating, 4.5);
      assert.strictEqual(transformed.price, 3);
      assert.strictEqual(transformed.verified, true);
    });
  });

  describe('findNearbyRestaurants', () => {
    it('should call Foursquare client and transform data if source is Foursquare', async () => {
      process.env.LOCATION_DATA_SOURCE = 'foursquare';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockFoursquareClient(); // Explicitly set mock for clarity

      const results = await service.findNearbyRestaurants({ location: { lat: 1, lng: 1 } });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'fsq1');
      assert.strictEqual(results[0].name, 'Foursquareaurant A');
      assert.strictEqual(results[0].source, 'foursquare');
    });

    it('should call Google client and transform data if source is Google', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'fake-google-key';
      process.env.LOCATION_DATA_SOURCE = 'google';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockGooglePlacesClient(); // Explicitly set mock

      const results = await service.findNearbyRestaurants({ location: { lat: 2, lng: 2 } });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'gplace1');
      assert.strictEqual(results[0].name, 'Googlerant B');
      assert.strictEqual(results[0].source, 'google');
      delete process.env.GOOGLE_PLACES_API_KEY;
    });
  });

  describe('getVenueDetails', () => {
    it('should call Foursquare client for details if source is Foursquare', async () => {
      process.env.LOCATION_DATA_SOURCE = 'foursquare';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockFoursquareClient();

      const details = await service.getVenueDetails('fsq1');
      assert.strictEqual(details.id, 'fsq1');
      assert.strictEqual(details.name, 'Foursquareaurant A Detailed');
      assert.strictEqual(details.source, 'foursquare');
    });

    it('should call Google client for details if source is Google', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'fake-google-key';
      process.env.LOCATION_DATA_SOURCE = 'google';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockGooglePlacesClient();

      const details = await service.getVenueDetails('gplace1');
      assert.strictEqual(details.id, 'gplace1');
      assert.strictEqual(details.name, 'Googlerant B Detailed');
      assert.strictEqual(details.source, 'google');
      delete process.env.GOOGLE_PLACES_API_KEY;
    });
  });

  describe('getVenueVisitStats', () => {
    it('should return stats from Foursquare client if source is Foursquare', async () => {
      process.env.LOCATION_DATA_SOURCE = 'foursquare';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockFoursquareClient();
      const stats = await service.getVenueVisitStats('fsq1');
      assert.deepStrictEqual(stats, { visits: 100 });
    });

    it('should return null for stats if source is Google', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'fake-google-key';
      process.env.LOCATION_DATA_SOURCE = 'google';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockGooglePlacesClient(); // Even with mock, logic should return null
      const stats = await service.getVenueVisitStats('gplace1');
      assert.strictEqual(stats, null);
      delete process.env.GOOGLE_PLACES_API_KEY;
    });
  });

  describe('healthCheck', () => {
    it('should return health from Foursquare client if source is Foursquare', async () => {
      process.env.LOCATION_DATA_SOURCE = 'foursquare';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockFoursquareClient();
      const health = await service.healthCheck();
      assert.strictEqual(health.status, 'healthy');
      assert.strictEqual(health.client_source, 'foursquare');
    });

    it('should return health from Google client if source is Google', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'fake-google-key';
      process.env.LOCATION_DATA_SOURCE = 'google';
      service = new RestaurantDiscoveryService(null);
      service.locationClient = new MockGooglePlacesClient();
      const health = await service.healthCheck();
      assert.strictEqual(health.status, 'healthy');
      assert.strictEqual(health.client_source, 'google');
      delete process.env.GOOGLE_PLACES_API_KEY;
    });
  });

});

if (require.main === module) {
  console.log("Please run these tests using a test runner like Mocha or Jest.");
  console.log("Example: npx mocha test/restaurantDiscoveryService.test.js (after installing mocha)");
}
