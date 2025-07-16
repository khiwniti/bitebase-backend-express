/**
 * AI Analytics API Routes
 * Handles AI-powered analytics and insights endpoints
 */

const express = require('express');
const router = express.Router();
const MarketAnalysisService = require('../services/ai/MarketAnalysisService');
const AnthropicClient = require('../services/ai/AnthropicClient');
const logger = require('../utils/logger');

// Initialize services
const marketAnalysisService = new MarketAnalysisService();
const anthropicClient = new AnthropicClient();

/**
 * POST /api/ai/market-analysis
 * Generate comprehensive market analysis for a location
 */
router.post('/market-analysis', async (req, res) => {
  try {
    const { latitude, longitude, businessType, radius } = req.body;
    
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
    
    logger.info(`Market analysis request for: ${latitude}, ${longitude}`);
    
    const result = await marketAnalysisService.generateMarketAnalysis({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      businessType,
      radius: radius ? parseInt(radius) : 1000
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
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
    
    const result = await anthropicClient.generateSalesForecast(forecastData);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeframe,
        businessType
      }
    });
    
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
    
    const result = await anthropicClient.generateCustomerSegmentation(segmentationData);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        generatedAt: new Date().toISOString(),
        businessType
      }
    });
    
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
    
    const result = await anthropicClient.generateBusinessRecommendations(recommendationData);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        generatedAt: new Date().toISOString(),
        businessGoals
      }
    });
    
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
    
    // 1. Generate market analysis
    const marketAnalysis = await marketAnalysisService.generateMarketAnalysis({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      businessType,
      radius: radius ? parseInt(radius) : 1000
    });
    
    if (!marketAnalysis.success) {
      return res.status(500).json(marketAnalysis);
    }
    
    // 2. Generate sales forecast
    const salesForecast = await anthropicClient.generateSalesForecast({
      businessType: businessType || 'restaurant',
      location: { latitude, longitude },
      marketData: marketAnalysis.data
    });
    
    // 3. Generate customer segmentation
    const customerSegmentation = await anthropicClient.generateCustomerSegmentation({
      businessType: businessType || 'restaurant',
      location: { latitude, longitude },
      demographics: marketAnalysis.data.demographicInsights
    });
    
    // 4. Generate business recommendations
    const businessRecommendations = await anthropicClient.generateBusinessRecommendations({
      marketAnalysis: marketAnalysis.data,
      salesForecast,
      customerSegments: customerSegmentation,
      businessGoals: 'Growth and profitability'
    });
    
    // Combine all analyses
    const comprehensiveAnalysis = {
      marketAnalysis: marketAnalysis.data,
      salesForecast,
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