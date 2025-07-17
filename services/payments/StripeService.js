/**
 * Stripe Payment Service
 * Handles subscription management, checkout sessions, and webhooks
 */

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const logger = require('../../utils/logger');

class StripeService {
  constructor() {
    this.stripe = stripe;
    if (!stripe) {
      console.log('⚠️ StripeService initialized without STRIPE_SECRET_KEY - payment features will be disabled');
    }
  }

  /**
   * Check if Stripe is available
   */
  isAvailable() {
    return !!this.stripe;
  }

  /**
   * Throw error if Stripe is not available
   */
  _requireStripe() {
    if (!this.stripe) {
      throw new Error('Stripe is not configured - STRIPE_SECRET_KEY environment variable is required');
    }
  }

  /**
   * Create a new customer in Stripe
   */
  async createCustomer(userData) {
    this._requireStripe();
    try {
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          userId: userData.id,
          userType: userData.userType
        }
      });

      logger.info(`Stripe customer created: ${customer.id} for user: ${userData.id}`);
      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw new Error('Failed to create customer account');
    }
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
    this._requireStripe();
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        metadata: {
          customerId: customerId
        }
      });

      logger.info(`Checkout session created: ${session.id} for customer: ${customerId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(customerId, returnUrl) {
    this._requireStripe();
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info(`Portal session created for customer: ${customerId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId) {
    this._requireStripe();
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Failed to retrieve subscription:', error);
      throw new Error('Failed to retrieve subscription details');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    this._requireStripe();
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });

      logger.info(`Subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Get customer's subscriptions
   */
  async getCustomerSubscriptions(customerId) {
    this._requireStripe();
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method']
      });

      return subscriptions.data;
    } catch (error) {
      logger.error('Failed to retrieve customer subscriptions:', error);
      throw new Error('Failed to retrieve subscriptions');
    }
  }

  /**
   * Get pricing plans
   */
  getPricingPlans() {
    return {
      free: {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
          'Basic location search',
          'Limited market analysis',
          '5 searches per month',
          'Community support'
        ],
        limits: {
          searches: 5,
          analytics: false,
          realtime: false,
          export: false
        }
      },
      basic: {
        id: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
        name: 'Basic',
        price: 29,
        interval: 'month',
        features: [
          'Unlimited location searches',
          'Basic AI analytics',
          '50 market analyses per month',
          'Email support',
          'Data export (CSV)'
        ],
        limits: {
          searches: -1, // unlimited
          analytics: true,
          realtime: false,
          export: true
        }
      },
      professional: {
        id: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
        name: 'Professional',
        price: 99,
        interval: 'month',
        features: [
          'Everything in Basic',
          'Advanced AI analytics',
          'Real-time data updates',
          'Unlimited market analyses',
          'Priority support',
          'Advanced data export',
          'Custom reports'
        ],
        limits: {
          searches: -1,
          analytics: true,
          realtime: true,
          export: true
        }
      },
      enterprise: {
        id: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
        name: 'Enterprise',
        price: 299,
        interval: 'month',
        features: [
          'Everything in Professional',
          'White-label solution',
          'API access',
          'Custom integrations',
          'Dedicated account manager',
          'SLA guarantee',
          'Advanced security features'
        ],
        limits: {
          searches: -1,
          analytics: true,
          realtime: true,
          export: true,
          api: true,
          whitelabel: true
        }
      }
    };
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload, signature, endpointSecret) {
    this._requireStripe();
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );
      return event;
    } catch (error) {
      logger.error('Webhook signature validation failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Failed to handle webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle subscription created webhook
   */
  async handleSubscriptionCreated(subscription) {
    logger.info(`Subscription created: ${subscription.id}`);
    // Update database with subscription details
    // This would integrate with your database service
  }

  /**
   * Handle subscription updated webhook
   */
  async handleSubscriptionUpdated(subscription) {
    logger.info(`Subscription updated: ${subscription.id}`);
    // Update database with subscription changes
  }

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(subscription) {
    logger.info(`Subscription deleted: ${subscription.id}`);
    // Update database to reflect cancellation
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSucceeded(invoice) {
    logger.info(`Payment succeeded for invoice: ${invoice.id}`);
    // Update user access, send confirmation email, etc.
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailed(invoice) {
    logger.error(`Payment failed for invoice: ${invoice.id}`);
    // Handle failed payment, notify user, etc.
  }
}

module.exports = StripeService;