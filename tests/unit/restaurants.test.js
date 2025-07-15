const request = require('supertest');
const express = require('express');
const restaurantRoutes = require('../../routes/restaurants');

describe('Restaurant Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/restaurants', restaurantRoutes);
  });

  describe('GET /restaurants/search', () => {
    test('should search restaurants by location', async () => {
      const searchParams = {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 1000
      };

      const response = await request(app)
        .get('/restaurants/search')
        .query(searchParams)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should validate required location parameters', async () => {
      const response = await request(app)
        .get('/restaurants/search')
        .query({ radius: 1000 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('latitude');
    });

    test('should handle invalid coordinates', async () => {
      const searchParams = {
        latitude: 999,
        longitude: 999,
        radius: 1000
      };

      const response = await request(app)
        .get('/restaurants/search')
        .query(searchParams)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /restaurants/featured', () => {
    test('should return featured restaurants', async () => {
      const response = await request(app)
        .get('/restaurants/featured')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should limit featured restaurants count', async () => {
      const response = await request(app)
        .get('/restaurants/featured')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /restaurants/search/realtime', () => {
    test('should perform real-time restaurant search', async () => {
      const searchData = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        radius: 1000,
        cuisine: ['italian', 'american'],
        priceRange: [2, 3]
      };

      const response = await request(app)
        .post('/restaurants/search/realtime')
        .send(searchData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('restaurants');
      expect(response.body.data).toHaveProperty('metadata');
    });

    test('should validate search parameters', async () => {
      const invalidSearchData = {
        location: {
          latitude: 'invalid'
        }
      };

      const response = await request(app)
        .post('/restaurants/search/realtime')
        .send(invalidSearchData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /restaurants/:id', () => {
    test('should get restaurant details by ID', async () => {
      const restaurantId = 'restaurant_123';

      const response = await request(app)
        .get(`/restaurants/${restaurantId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', restaurantId);
    });

    test('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
        .get('/restaurants/non_existent_id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});