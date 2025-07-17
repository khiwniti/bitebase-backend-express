/**
 * Payment Routes
 * Handles Stripe payment operations and subscription management
 */

const express = require('express');
const router = express.Router();
const StripeService = require('../services/payments/StripeService');
const logger = require('../utils/logger');

const stripeService = new StripeService();

// Middleware to check if Stripe is available
const requireStripe = (req, res, next) => {
  if (!stripeService.isAvailable()) {
    return res.status(503).json({
      success: false,
      error: 'Payment service is not configured - STRIPE_SECRET_KEY is required'
    });
  }
  next();
};

/**
 * GET /api/payments/plans
 * Get available pricing plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = stripeService.getPricingPlans();
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Failed to get pricing plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pricing plans'
    });
  }
});

/**
 * POST /api/payments/create-customer
 * Create a new Stripe customer
 */
router.post('/create-customer', requireStripe, async (req, res) => {
  try {
    const { email, name, userType } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }

    const userData = {
      id: req.user?.id || 'temp_user_id', // In production, get from auth middleware
      email,
      name,
      userType: userType || 'NEW_ENTREPRENEUR'
    };

    const customer = await stripeService.createCustomer(userData);

    res.json({
      success: true,
      data: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      }
    });
  } catch (error) {
    logger.error('Failed to create customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe checkout session for subscription
 */
router.post('/create-checkout-session', requireStripe, async (req, res) => {
  try {
    const { customerId, priceId, planName } = req.body;

    if (!customerId || !priceId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID and price ID are required'
      });
    }

    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/subscription/cancel`;

    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    logger.error('Failed to create checkout session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/create-portal-session
 * Create a Stripe customer portal session
 */
router.post('/create-portal-session', requireStripe, async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }

    const returnUrl = `${process.env.FRONTEND_URL}/subscription/manage`;

    const session = await stripeService.createPortalSession(customerId, returnUrl);

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    logger.error('Failed to create portal session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/payments/subscription/:subscriptionId
 * Get subscription details
 */
router.get('/subscription/:subscriptionId', requireStripe, async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await stripeService.getSubscription(subscriptionId);

    res.json({
      success: true,
      data: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        customer: subscription.customer,
        items: subscription.items.data.map(item => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to get subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel a subscription
 */
router.post('/cancel-subscription', requireStripe, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required'
      });
    }

    const subscription = await stripeService.cancelSubscription(subscriptionId);

    res.json({
      success: true,
      data: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end
      }
    });
  } catch (error) {
    logger.error('Failed to cancel subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/payments/customer/:customerId/subscriptions
 * Get customer's subscriptions
 */
router.get('/customer/:customerId/subscriptions', requireStripe, async (req, res) => {
  try {
    const { customerId } = req.params;

    const subscriptions = await stripeService.getCustomerSubscriptions(customerId);

    res.json({
      success: true,
      data: subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        items: sub.items.data.map(item => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity
        }))
      }))
    });
  } catch (error) {
    logger.error('Failed to get customer subscriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), requireStripe, async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !endpointSecret) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook signature or secret'
      });
    }

    const event = stripeService.validateWebhookSignature(
      req.body,
      signature,
      endpointSecret
    );

    await stripeService.handleWebhookEvent(event);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/payments/health
 * Health check for payment service
 */
router.get('/health', requireStripe, async (req, res) => {
  try {
    // Test Stripe connection by listing a few customers
    const customers = await stripeService.stripe.customers.list({ limit: 1 });
    
    res.json({
      success: true,
      message: 'Payment service is healthy',
      stripe: {
        connected: true,
        customersCount: customers.data.length
      }
    });
  } catch (error) {
    logger.error('Payment service health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment service is unhealthy',
      details: error.message
    });
  }
});

module.exports = router;