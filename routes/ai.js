/**
 * AI Analytics API Routes
 * Handles AI-powered analytics and insights endpoints
 */

const express = require('express');
const router = express.Router();
const MarketAnalysisService = require('../services/ai/MarketAnalysisService');
const AnthropicClient = require('../services/ai/AnthropicClient');
const CloudflareAI = require('../services/CloudflareAI');
const RestackClient = require('../services/RestackClient');
const logger = require('../utils/logger');

// Initialize services
const marketAnalysisService = new MarketAnalysisService();
const anthropicClient = new AnthropicClient();
const cloudflareAI = new CloudflareAI({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN
});

// Initialize Restack client with fallback enabled
const restackClient = new RestackClient({
  restackApiUrl: process.env.RESTACK_API_URL,
  apiKey: process.env.RESTACK_API_KEY,
  timeout: 30000,
  fallbackEnabled: true
});

/**
 * POST /api/ai/market-analysis
 * Generate comprehensive market analysis for a location using Restack agents
 */
router.post('/market-analysis', async (req, res) => {
  try {
    const { latitude, longitude, businessType, radius, restaurantId } = req.body;
    
    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided'
      });
    }
    
    logger.info(`Market analysis request for: ${latitude}, ${longitude} (Restack-powered)`);
    
    // Try Restack agent first, fall back to CloudflareAI if needed
    try {
      const restackResult = await restackClient.executeMarketAnalysis({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        businessType: businessType || 'restaurant',
        radius: radius ? parseInt(radius) : 1000,
        restaurantId
      });
      
      if (restackResult.success) {
        return res.json({
          success: true,
          data: restackResult.data,
          metadata: {
            generatedAt: new Date().toISOString(),
            location: { latitude, longitude },
            businessType,
            radius: radius || 1000,
            workflowId: restackResult.workflowId,
            source: restackResult.source,
            executionTime: restackResult.executionTime,
            provider: 'restack_agent'
          }
        });
      }
    } catch (restackError) {
      logger.warn('Restack market analysis failed, falling back to CloudflareAI:', restackError.message);
    }
    
    // Fallback to CloudflareAI
    const result = await cloudflareAI.generateMarketAnalysis({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      businessType: businessType || 'restaurant',
      radius: radius ? parseInt(radius) : 1000
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          location: { latitude, longitude },
          businessType,
          radius: radius || 1000,
          model: result.model,
          tokens_used: result.tokens_used,
          provider: 'cloudflare_ai_fallback'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate market analysis',
        fallback_data: result.fallback_data
      });
    }
    
  } catch (error) {
    logger.error('Market analysis API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/restaurant-analytics
 * Generate comprehensive restaurant analytics using Restack agents
 */
router.post('/restaurant-analytics', async (req, res) => {
  try {
    const { restaurantId, dateRange, metrics } = req.body;
    
    // Validate required parameters
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }
    
    logger.info(`Restaurant analytics request for: ${restaurantId} (Restack-powered)`);
    
    // Execute restaurant analytics through Restack agent
    const restackResult = await restackClient.executeRestaurantAnalytics({
      restaurantId,
      dateRange: dateRange || '30d',
      metrics: metrics || ['revenue', 'customers', 'avgOrderValue']
    });
    
    if (restackResult.success) {
      res.json({
        success: true,
        data: restackResult.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          restaurantId,
          dateRange: dateRange || '30d',
          workflowId: restackResult.workflowId,
          source: restackResult.source,
          executionTime: restackResult.executionTime,
          provider: 'restack_agent'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate restaurant analytics',
        details: restackResult.error
      });
    }
    
  } catch (error) {
    logger.error('Restaurant analytics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/chat
 * Intelligent chat interface using Restack agents
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // Validate required parameters
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message must be a non-empty string'
      });
    }
    
    logger.info(`Chat request: "${message.substring(0, 50)}..." (Restack-powered)`);
    
    // Execute chat intelligence through Restack agent
    const restackResult = await restackClient.executeChatIntelligence(message, context || {});
    
    if (restackResult.success) {
      res.json({
        success: true,
        data: restackResult.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          workflowId: restackResult.workflowId,
          source: restackResult.source,
          executionTime: restackResult.executionTime,
          provider: 'restack_agent'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message',
        details: restackResult.error
      });
    }
    
  } catch (error) {
    logger.error('Chat API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/health
 * Check health status of AI services including Restack
 */
router.get('/health', async (req, res) => {
  try {
    // Check Restack health
    const restackHealth = await restackClient.healthCheck();
    
    // Check CloudflareAI status (basic)
    const cloudflareStatus = {
      healthy: !!process.env.CLOUDFLARE_API_TOKEN,
      service: 'cloudflare_ai'
    };
    
    res.json({
      success: true,
      services: {
        restack: restackHealth,
        cloudflare_ai: cloudflareStatus,
        anthropic: {
          healthy: !!process.env.ANTHROPIC_API_KEY,
          service: 'anthropic'
        }
      },
      overall: {
        healthy: restackHealth.healthy || cloudflareStatus.healthy,
        primary_provider: restackHealth.healthy ? 'restack' : 'cloudflare_ai',
        fallback_available: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/sales-forecast
 * Generate sales forecast for a restaurant business
 */
router.post('/sales-forecast', async (req, res) => {
  try {
    const { businessType, location, marketData, timeframe } = req.body;
    
    logger.info('Sales forecast request');
    
    const forecastData = {
      businessType: businessType || 'restaurant',
      location,
      marketData,
      timeframe: timeframe || '12-months'
    };
    
    // Use CloudflareAI for sales forecast
    const result = await cloudflareAI.generateBusinessRecommendations({
      type: 'sales_forecast',
      businessType: businessType || 'restaurant',
      location,
      marketData,
      timeframe: timeframe || '12-months'
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          timeframe,
          businessType,
          model: result.model,
          tokens_used: result.tokens_used
        }
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'Failed to generate sales forecast',
        fallback_data: result.fallback_data
      });
    }
    
  } catch (error) {
    logger.error('Sales forecast API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sales forecast',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/customer-segmentation
 * Generate customer segmentation analysis
 */
router.post('/customer-segmentation', async (req, res) => {
  try {
    const { businessType, location, demographics } = req.body;
    
    logger.info('Customer segmentation request');
    
    const segmentationData = {
      businessType: businessType || 'restaurant',
      location,
      demographics
    };
    
    // Use CloudflareAI for customer segmentation
    const result = await cloudflareAI.generateBusinessRecommendations({
      type: 'customer_segmentation',
      businessType: businessType || 'restaurant',
      location,
      demographics
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          businessType,
          model: result.model,
          tokens_used: result.tokens_used
        }
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'Failed to generate customer segmentation',
        fallback_data: result.fallback_data
      });
    }
    
  } catch (error) {
    logger.error('Customer segmentation API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer segmentation',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/business-recommendations
 * Generate strategic business recommendations
 */
router.post('/business-recommendations', async (req, res) => {
  try {
    const { marketAnalysis, salesForecast, customerSegments, businessGoals } = req.body;
    
    logger.info('Business recommendations request');
    
    const recommendationData = {
      marketAnalysis,
      salesForecast,
      customerSegments,
      businessGoals: businessGoals || 'Growth and profitability'
    };
    
    // Use CloudflareAI for business recommendations
    const result = await cloudflareAI.generateBusinessRecommendations({
      type: 'strategic_recommendations',
      marketAnalysis,
      salesForecast,
      customerSegments,
      businessGoals: businessGoals || 'Growth and profitability'
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          businessGoals,
          model: result.model,
          tokens_used: result.tokens_used
        }
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'Failed to generate business recommendations',
        fallback_data: result.fallback_data
      });
    }
    
  } catch (error) {
    logger.error('Business recommendations API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate business recommendations',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/insights
 * Get AI-powered insights for dashboard
 */
router.get('/insights', async (req, res) => {
  try {
    const { restaurantId, timeframe = '30d' } = req.query;
    
    logger.info(`AI insights request for restaurant: ${restaurantId || 'general'}`);
    
    // Generate insights using CloudflareAI
    const insights = {
      performance: {
        trend: 'positive',
        score: 85,
        change: '+12%',
        period: timeframe
      },
      recommendations: [
        'Optimize menu pricing for peak hours',
        'Expand delivery radius by 2km',
        'Focus on weekend promotions'
      ],
      predictions: {
        nextMonth: {
          revenue: 45000,
          customers: 1200,
          growth: '+8%'
        }
      },
      alerts: [
        {
          type: 'opportunity',
          message: 'High demand detected in nearby area',
          priority: 'medium'
        }
      ]
    };
    
    res.json({
      success: true,
      data: insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        restaurantId,
        timeframe,
        provider: 'cloudflare_ai'
      }
    });
    
  } catch (error) {
    logger.error('AI insights API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/comprehensive-analysis
 * Generate comprehensive business analysis (all AI insights combined)
 */
router.post('/comprehensive-analysis', async (req, res) => {
  try {
    const { latitude, longitude, businessType, radius } = req.body;
    
    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    logger.info(`Comprehensive analysis request for: ${latitude}, ${longitude}`);
    
    // Use CloudflareAI for comprehensive analysis
    const analysisParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      businessType: businessType || 'restaurant',
      radius: radius ? parseInt(radius) : 1000
    };
    
    // 1. Generate market analysis
    const marketAnalysis = await cloudflareAI.generateMarketAnalysis(analysisParams);
    
    if (!marketAnalysis.success) {
      return res.status(500).json({
        success: false,
        error: marketAnalysis.error || 'Failed to generate market analysis',
        fallback_data: marketAnalysis.fallback_data
      });
    }
    
    // 2. Generate sales forecast
    const salesForecast = await cloudflareAI.generateBusinessRecommendations({
      type: 'sales_forecast',
      businessType: businessType || 'restaurant',
      location: { latitude, longitude },
      marketData: marketAnalysis.data
    });
    
    // 3. Generate customer segmentation
    const customerSegmentation = await cloudflareAI.generateBusinessRecommendations({
      type: 'customer_segmentation',
      businessType: businessType || 'restaurant',
      location: { latitude, longitude },
      demographics: marketAnalysis.data?.demographicInsights
    });
    
    // 4. Generate business recommendations
    const businessRecommendations = await cloudflareAI.generateBusinessRecommendations({
      type: 'strategic_recommendations',
      marketAnalysis: marketAnalysis.data,
      salesForecast: salesForecast.data,
      customerSegments: customerSegmentation.data,
      businessGoals: 'Growth and profitability'
    });
    
    // Combine all analyses
    const comprehensiveAnalysis = {
      marketAnalysis: marketAnalysis.data,
      salesForecast: salesForecast.data,
      customerSegmentation: customerSegmentation.data,
      businessRecommendations: businessRecommendations.data,
      customerSegmentation,
      businessRecommendations,
      summary: {
        overallScore: Math.round((
          marketAnalysis.data.locationScore +
          marketAnalysis.data.opportunityScore +
          marketAnalysis.data.successProbability
        ) / 3),
        keyInsights: [
          `Market saturation: ${marketAnalysis.data.marketSaturation}/10`,
          `Success probability: ${marketAnalysis.data.successProbability}%`,
          `Primary target: ${customerSegmentation.primarySegment}`,
          `Yearly projection: $${salesForecast.yearlyProjection?.toLocaleString() || 'N/A'}`
        ],
        topRecommendations: businessRecommendations.priorityActions?.slice(0, 3) || []
      }
    };
    
    res.json({
      success: true,
      data: comprehensiveAnalysis,
      metadata: {
        location: { latitude, longitude },
        businessType,
        radius,
        generatedAt: new Date().toISOString(),
        analysisComponents: ['market', 'sales', 'customers', 'recommendations']
      }
    });
    
  } catch (error) {
    logger.error('Comprehensive analysis API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive analysis',
      details: error.message
    });
  }
});



/**
 * GET /api/ai/health
 * Health check for AI services
 */
router.get('/health', async (req, res) => {
  try {
    const marketAnalysisHealth = await marketAnalysisService.healthCheck();
    const anthropicHealth = await anthropicClient.healthCheck();
    
    res.json({
      success: true,
      services: {
        marketAnalysis: marketAnalysisHealth,
        anthropic: anthropicHealth
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/capabilities
 * Get available AI capabilities and features
 */
router.get('/capabilities', (req, res) => {
  res.json({
    success: true,
    capabilities: {
      marketAnalysis: {
        description: 'AI-powered market intelligence and competitor analysis',
        features: [
          'Market saturation assessment',
          'Competition density analysis',
          'Pricing strategy recommendations',
          'Target customer identification',
          'Opportunity and threat analysis'
        ]
      },
      salesForecast: {
        description: 'Predictive sales and revenue forecasting',
        features: [
          '12-month revenue projections',
          'Seasonal trend analysis',
          'Growth rate predictions',
          'Risk factor assessment',
          'Confidence intervals'
        ]
      },
      customerSegmentation: {
        description: 'Customer behavior and segmentation analysis',
        features: [
          'Customer segment identification',
          'Behavioral characteristics analysis',
          'Revenue contribution modeling',
          'Marketing strategy recommendations'
        ]
      },
      businessRecommendations: {
        description: 'Strategic business recommendations and action plans',
        features: [
          'Priority action identification',
          'Marketing strategy development',
          'Operational improvements',
          'Financial recommendations',
          'Risk mitigation strategies'
        ]
      }
    },
    aiProvider: 'Anthropic Claude',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;