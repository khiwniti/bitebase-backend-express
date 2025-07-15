const request = require('supertest');
const app = require('../../index');

describe('API Integration Tests', () => {
  let server;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Start server for integration tests
    server = app.listen(3001);
    
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'integration@test.com',
        password: 'TestPass123!',
        name: 'Integration Test User'
      });
    
    testUser = registerResponse.body.data.user;
    authToken = registerResponse.body.data.token;
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Full User Journey', () => {
    test('should complete full restaurant search and analysis workflow', async () => {
      // 1. Search for restaurants
      const searchResponse = await request(app)
        .post('/api/restaurants/search/realtime')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          radius: 1000,
          cuisine: ['italian']
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.restaurants).toBeDefined();

      // 2. Generate market analysis
      const analysisResponse = await request(app)
        .post('/api/ai/market-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          radius: 1000,
          businessType: 'restaurant'
        });

      expect(analysisResponse.status).toBe(200);
      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data.analysis).toBeDefined();

      // 3. Get predictive analytics
      const predictiveResponse = await request(app)
        .post('/api/ai/predictive-analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          businessType: 'restaurant',
          timeframe: '6_months'
        });

      expect(predictiveResponse.status).toBe(200);
      expect(predictiveResponse.body.success).toBe(true);
      expect(predictiveResponse.body.data.salesForecast).toBeDefined();
    });

    test('should handle payment workflow', async () => {
      // 1. Get pricing plans
      const plansResponse = await request(app)
        .get('/api/payments/pricing-plans');

      expect(plansResponse.status).toBe(200);
      expect(plansResponse.body.data.plans).toBeDefined();
      expect(plansResponse.body.data.plans.length).toBeGreaterThan(0);

      // 2. Create checkout session
      const checkoutResponse = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priceId: 'price_basic_monthly',
          successUrl: 'https://bitebase.com/success',
          cancelUrl: 'https://bitebase.com/cancel'
        });

      expect(checkoutResponse.status).toBe(200);
      expect(checkoutResponse.body.data.sessionId).toBeDefined();
      expect(checkoutResponse.body.data.url).toBeDefined();

      // 3. Check subscription status
      const statusResponse = await request(app)
        .get('/api/payments/subscription-status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.subscription).toBeDefined();
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should enforce AI endpoint rate limits', async () => {
      const requestData = {
        location: { latitude: 40.7128, longitude: -74.0060 },
        businessType: 'restaurant'
      };

      // Make requests up to the limit
      const responses = [];
      for (let i = 0; i < 12; i++) {
        const response = await request(app)
          .post('/api/ai/predictive-analytics')
          .set('Authorization', `Bearer ${authToken}`)
          .send(requestData);
        
        responses.push(response);
      }

      // First 10 should succeed, rest should be rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeLessThanOrEqual(10);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test('should enforce payment endpoint rate limits', async () => {
      const checkoutData = {
        priceId: 'price_basic_monthly',
        successUrl: 'https://bitebase.com/success',
        cancelUrl: 'https://bitebase.com/cancel'
      };

      // Make requests up to the limit
      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/payments/create-checkout-session')
          .set('Authorization', `Bearer ${authToken}`)
          .send(checkoutData);
        
        responses.push(response);
      }

      // First 3 should succeed, rest should be rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeLessThanOrEqual(3);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Security Integration', () => {
    test('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'post', path: '/api/ai/predictive-analytics' },
        { method: 'post', path: '/api/payments/create-checkout-session' },
        { method: 'get', path: '/api/payments/subscription-status' },
        { method: 'get', path: '/api/admin/system/health' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate input data', async () => {
      const invalidRequests = [
        {
          endpoint: '/api/restaurants/search/realtime',
          data: { location: { latitude: 'invalid' } }
        },
        {
          endpoint: '/api/ai/predictive-analytics',
          data: { businessType: 123 }
        },
        {
          endpoint: '/api/payments/create-checkout-session',
          data: { priceId: '' }
        }
      ];

      for (const req of invalidRequests) {
        const response = await request(app)
          .post(req.endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .send(req.data);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Performance Integration', () => {
    test('should respond within acceptable time limits', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/api/restaurants/featured' },
        { method: 'get', path: '/api/payments/pricing-plans' }
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request(app)[endpoint.method](endpoint.path);
        const responseTime = Date.now() - startTime;

        expect(response.status).toBeLessThan(500);
        expect(responseTime).toBeLessThan(2000); // 2 second limit
      }
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill().map(() =>
        request(app)
          .get('/api/restaurants/featured')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});