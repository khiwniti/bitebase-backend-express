const request = require('supertest');
const express = require('express');
const aiRoutes = require('../../routes/ai');

describe('AI Analytics Routes', () => {
  let app;
  let authToken;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/ai', aiRoutes);
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = global.testUtils.createMockUser();
      next();
    });
    
    authToken = 'mock_jwt_token';
  });

  describe('POST /ai/predictive-analytics', () => {
    test('should generate predictive analytics', async () => {
      const analyticsData = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        businessType: 'restaurant',
        timeframe: '6_months'
      };

      const response = await request(app)
        .post('/ai/predictive-analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(analyticsData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('salesForecast');
      expect(response.body.data).toHaveProperty('marketTrends');
      expect(response.body.data).toHaveProperty('riskFactors');
      expect(response.body.data).toHaveProperty('confidence');
    });

    test('should validate required parameters', async () => {
      const response = await request(app)
        .post('/ai/predictive-analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('location');
    });

    test('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const analyticsData = {
        location: { latitude: 40.7128, longitude: -74.0060 },
        businessType: 'restaurant'
      };

      // First 10 requests should succeed
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/ai/predictive-analytics')
          .set('Authorization', `Bearer ${authToken}`)
          .send(analyticsData)
          .expect(200);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/ai/predictive-analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(analyticsData)
        .expect(429);

      expect(response.body).toHaveProperty('error', 'Too many requests');
    });
  });

  describe('POST /ai/market-segmentation', () => {
    test('should perform market segmentation analysis', async () => {
      const segmentationData = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        radius: 2000,
        demographics: ['age', 'income', 'lifestyle']
      };

      const response = await request(app)
        .post('/ai/market-segmentation')
        .set('Authorization', `Bearer ${authToken}`)
        .send(segmentationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('segments');
      expect(response.body.data).toHaveProperty('targetAudience');
      expect(response.body.data).toHaveProperty('marketSize');
    });

    test('should validate location parameters', async () => {
      const invalidData = {
        location: {
          latitude: 'invalid'
        }
      };

      const response = await request(app)
        .post('/ai/market-segmentation')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /ai/sales-prediction', () => {
    test('should generate sales predictions', async () => {
      const predictionData = {
        businessData: {
          location: { latitude: 40.7128, longitude: -74.0060 },
          cuisine: 'italian',
          priceRange: 3,
          seatingCapacity: 50
        },
        timeframe: '12_months'
      };

      const response = await request(app)
        .post('/ai/sales-prediction')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('monthlySales');
      expect(response.body.data).toHaveProperty('seasonalTrends');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data.confidence).toBeGreaterThan(0);
      expect(response.body.data.confidence).toBeLessThanOrEqual(1);
    });

    test('should require authentication', async () => {
      const predictionData = {
        businessData: {
          location: { latitude: 40.7128, longitude: -74.0060 }
        }
      };

      const response = await request(app)
        .post('/ai/sales-prediction')
        .send(predictionData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /ai/competitor-analysis', () => {
    test('should analyze competitors in area', async () => {
      const analysisData = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        radius: 1500,
        businessType: 'restaurant'
      };

      const response = await request(app)
        .post('/ai/competitor-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send(analysisData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('competitors');
      expect(response.body.data).toHaveProperty('marketDensity');
      expect(response.body.data).toHaveProperty('competitiveAdvantages');
      expect(Array.isArray(response.body.data.competitors)).toBe(true);
    });
  });
});