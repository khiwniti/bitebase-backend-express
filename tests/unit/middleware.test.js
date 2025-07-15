const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

describe('Middleware Tests', () => {
  describe('Rate Limiting', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      
      // AI rate limiter (10 requests per minute)
      const aiLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: {
          error: 'Too many requests',
          message: 'AI endpoint rate limit exceeded. Please wait before making more requests.',
          retryAfter: 60
        },
        standardHeaders: true,
        legacyHeaders: false
      });

      app.use('/ai', aiLimiter);
      
      app.post('/ai/test', (req, res) => {
        res.json({ success: true, message: 'AI request processed' });
      });
    });

    test('should allow requests within rate limit', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/ai/test')
          .send({ test: true });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should block requests exceeding rate limit', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/ai/test')
          .send({ test: true });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/ai/test')
        .send({ test: true });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests');
    });

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/ai/test')
        .send({ test: true });

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('Security Headers', () => {
    let app;

    beforeEach(() => {
      app = express();
      
      // Security middleware
      app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
      });

      app.get('/test', (req, res) => {
        res.json({ message: 'Security test' });
      });
    });

    test('should include security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('CORS', () => {
    let app;

    beforeEach(() => {
      app = express();
      
      // CORS middleware
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });

      app.get('/test', (req, res) => {
        res.json({ message: 'CORS test' });
      });
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/test')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    test('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});