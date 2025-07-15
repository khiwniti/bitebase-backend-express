const request = require('supertest');
const express = require('express');
const paymentRoutes = require('../../routes/payments');

describe('Payment Routes', () => {
  let app;
  let authToken;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/payments', paymentRoutes);
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = global.testUtils.createMockUser();
      next();
    });
    
    authToken = 'mock_jwt_token';
  });

  describe('POST /payments/create-checkout-session', () => {
    test('should create Stripe checkout session', async () => {
      const checkoutData = {
        priceId: 'price_basic_monthly',
        successUrl: 'https://bitebase.com/success',
        cancelUrl: 'https://bitebase.com/cancel'
      };

      const response = await request(app)
        .post('/payments/create-checkout-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.url).toContain('checkout.stripe.com');
    });

    test('should validate required parameters', async () => {
      const response = await request(app)
        .post('/payments/create-checkout-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('priceId');
    });

    test('should handle invalid price ID', async () => {
      const checkoutData = {
        priceId: 'invalid_price_id',
        successUrl: 'https://bitebase.com/success',
        cancelUrl: 'https://bitebase.com/cancel'
      };

      const response = await request(app)
        .post('/payments/create-checkout-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /payments/create-customer-portal', () => {
    test('should create customer portal session', async () => {
      const portalData = {
        returnUrl: 'https://bitebase.com/dashboard'
      };

      const response = await request(app)
        .post('/payments/create-customer-portal')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portalData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.url).toContain('billing.stripe.com');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/payments/create-customer-portal')
        .send({ returnUrl: 'https://bitebase.com/dashboard' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /payments/subscription-status', () => {
    test('should get user subscription status', async () => {
      const response = await request(app)
        .get('/payments/subscription-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('subscription');
      expect(response.body.data).toHaveProperty('customer');
      expect(response.body.data.subscription).toHaveProperty('status');
      expect(response.body.data.subscription).toHaveProperty('plan');
    });

    test('should handle user without subscription', async () => {
      // Mock user without subscription
      app.use((req, res, next) => {
        req.user = { ...global.testUtils.createMockUser(), subscription_tier: 'free' };
        next();
      });

      const response = await request(app)
        .get('/payments/subscription-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.subscription.status).toBe('inactive');
    });
  });

  describe('POST /payments/webhook', () => {
    test('should handle Stripe webhook events', async () => {
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123'
          }
        }
      };

      const response = await request(app)
        .post('/payments/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(webhookEvent)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    test('should validate webhook signature', async () => {
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: { object: {} }
      };

      const response = await request(app)
        .post('/payments/webhook')
        .send(webhookEvent)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /payments/pricing-plans', () => {
    test('should return available pricing plans', async () => {
      const response = await request(app)
        .get('/payments/pricing-plans')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('plans');
      expect(Array.isArray(response.body.data.plans)).toBe(true);
      expect(response.body.data.plans.length).toBeGreaterThan(0);
      
      // Check plan structure
      const plan = response.body.data.plans[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('features');
    });
  });
});