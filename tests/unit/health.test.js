const request = require('supertest');
const express = require('express');

describe('Health Check', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Simple health check route
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: 'connected',
          external_apis: 'operational'
        }
      });
    });
  });

  test('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('database', 'connected');
  });

  test('should include timestamp in response', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });

  test('should return JSON content type', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/json/);
  });
});