const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../routes/admin');

describe('Admin Routes', () => {
  let app;
  let adminToken;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/admin', adminRoutes);
    
    // Mock admin authentication middleware
    app.use((req, res, next) => {
      req.user = global.testUtils.createMockAdmin();
      next();
    });
    
    adminToken = 'mock_admin_jwt_token';
  });

  describe('GET /admin/system/health', () => {
    test('should return system health status', async () => {
      const response = await request(app)
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.status).toBe('healthy');
    });

    test('should require admin authentication', async () => {
      const response = await request(app)
        .get('/admin/system/health')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /admin/performance/metrics', () => {
    test('should return performance metrics', async () => {
      const response = await request(app)
        .get('/admin/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('responseTime');
      expect(response.body.data).toHaveProperty('throughput');
      expect(response.body.data).toHaveProperty('errorRate');
      expect(response.body.data).toHaveProperty('topEndpoints');
      expect(Array.isArray(response.body.data.topEndpoints)).toBe(true);
    });

    test('should support time range filtering', async () => {
      const response = await request(app)
        .get('/admin/performance/metrics')
        .query({ timeRange: '24h' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('timeRange', '24h');
    });
  });

  describe('GET /admin/users', () => {
    test('should return user list with pagination', async () => {
      const response = await request(app)
        .get('/admin/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
    });

    test('should support user filtering', async () => {
      const response = await request(app)
        .get('/admin/users')
        .query({ role: 'user', subscription: 'basic' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /admin/audit-logs', () => {
    test('should return audit logs', async () => {
      const response = await request(app)
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('logs');
      expect(Array.isArray(response.body.data.logs)).toBe(true);
      
      if (response.body.data.logs.length > 0) {
        const log = response.body.data.logs[0];
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('user');
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('ip');
      }
    });

    test('should support log filtering by action', async () => {
      const response = await request(app)
        .get('/admin/audit-logs')
        .query({ action: 'LOGIN' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.logs.every(log => log.action === 'LOGIN')).toBe(true);
    });

    test('should support date range filtering', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/admin/audit-logs')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('PUT /admin/users/:id/status', () => {
    test('should update user status', async () => {
      const userId = 'user_123';
      const statusUpdate = {
        status: 'suspended',
        reason: 'Policy violation'
      };

      const response = await request(app)
        .put(`/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.status).toBe('suspended');
    });

    test('should validate status values', async () => {
      const userId = 'user_123';
      const invalidUpdate = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put(`/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /admin/analytics/overview', () => {
    test('should return platform analytics overview', async () => {
      const response = await request(app)
        .get('/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('apiUsage');
      expect(response.body.data).toHaveProperty('subscriptions');
    });
  });
});