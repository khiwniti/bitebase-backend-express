/**
 * Conversational AI Chat Routes
 * Handles real-time AI-powered chat conversations using Cloudflare AI
 */

const express = require('express');
const router = express.Router();
const CloudflareAI = require('../services/CloudflareAI');
const logger = require('../utils/logger');

// Initialize Cloudflare AI client
const cloudflareAI = new CloudflareAI({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN
});

// System prompt for BiteBase AI Assistant
const SYSTEM_PROMPT = `You are BiteBase AI Assistant, a knowledgeable and helpful AI designed to assist with restaurant operations, business intelligence, and customer service. You specialize in:

- Restaurant management and operations
- Customer service and engagement
- Business analytics and insights
- Marketing strategies for restaurants
- Food service industry best practices
- Menu optimization and pricing
- Staff management and training
- Technology solutions for restaurants

You are conversational, professional, and provide actionable insights. Always be helpful, engaging, and knowledgeable about the restaurant industry. When users ask about marketing, provide specific, data-driven recommendations. For general questions, be informative and supportive.

Keep responses concise but comprehensive, and always maintain a friendly, professional tone.`;

/**
 * POST /api/chat/message
 * Send a message to the AI assistant and get a response
 */
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory = [], provider = 'openai' } = req.body;
    
    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }
    
    // Validate message length
    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long. Maximum 4000 characters allowed.'
      });
    }
    
    logger.info(`Chat request received - Cloudflare AI, Message length: ${message.length}`);
    
    // Prepare conversation messages
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      // Add conversation history (limit to last 10 messages to manage context)
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    
    let response;
    let tokensUsed = 0;
    let modelUsed = '';
    
    // Use Cloudflare AI for chat
    try {
      const result = await cloudflareAI.chat(messages, {
        max_tokens: 1000,
        temperature: 0.7
      });
      
      if (result.success) {
        response = result.response;
        tokensUsed = result.usage?.total_tokens || 0;
        modelUsed = result.model;
      } else {
        throw new Error(result.error || 'Cloudflare AI request failed');
      }
      
    } catch (error) {
      logger.error('Cloudflare AI error:', error);
      throw error;
    }
    
    // Detect if response is marketing-related for frontend categorization
    const isMarketingResponse = /marketing|campaign|promotion|advertis|customer|analytics|social media|branding|engagement|strategy|target audience/i.test(message + ' ' + response);
    
    // Generate mock sentiment and keywords for marketing responses
    let additionalData = {};
    if (isMarketingResponse) {
      additionalData = {
        isMarketingResponse: true,
        sentiment: {
          compound: Math.random() * 0.6 + 0.2,
          pos: Math.random() * 0.4 + 0.4,
          neu: Math.random() * 0.4 + 0.3,
          neg: Math.random() * 0.2
        },
        keywords: [
          ['marketing', Math.floor(Math.random() * 15) + 5],
          ['customers', Math.floor(Math.random() * 12) + 3],
          ['strategy', Math.floor(Math.random() * 10) + 2],
          ['engagement', Math.floor(Math.random() * 8) + 2],
          ['analytics', Math.floor(Math.random() * 6) + 1],
          ['growth', Math.floor(Math.random() * 5) + 1]
        ]
      };
    }
    
    // Success response
    res.json({
      success: true,
      data: {
        message: response,
        ...additionalData
      },
      metadata: {
        provider: 'cloudflare',
        model: modelUsed,
        tokensUsed,
        messageLength: message.length,
        responseLength: response.length,
        timestamp: new Date().toISOString(),
        conversationLength: conversationHistory.length + 1
      }
    });
    
  } catch (error) {
    logger.error('Chat API error:', error);
    
    // Handle specific API errors
    if (error.code === 'insufficient_quota' || error.status === 429) {
      res.status(429).json({
        success: false,
        error: 'AI service temporarily unavailable. Please try again later.',
        details: 'Rate limit exceeded'
      });
    } else if (error.code === 'invalid_api_key' || error.status === 401) {
      res.status(500).json({
        success: false,
        error: 'AI service configuration error. Please contact support.',
        details: 'Authentication failed'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'I apologize, but I encountered an issue processing your request. Please try again.',
        details: error.message
      });
    }
  }
});

/**
 * POST /api/chat/conversation
 * Start a new conversation with context
 */
router.post('/conversation', async (req, res) => {
  try {
    const { context, userProfile, businessType } = req.body;
    
    // Enhanced system prompt with context
    let contextualPrompt = SYSTEM_PROMPT;
    
    if (context) {
      contextualPrompt += `\n\nAdditional Context: ${context}`;
    }
    
    if (businessType) {
      contextualPrompt += `\n\nBusiness Type: ${businessType}`;
    }
    
    if (userProfile) {
      contextualPrompt += `\n\nUser Profile: ${userProfile}`;
    }
    
    res.json({
      success: true,
      data: {
        conversationId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        systemPrompt: contextualPrompt,
        greeting: "Hello! I'm your BiteBase AI Assistant. How can I help you with your restaurant business today?"
      },
      metadata: {
        timestamp: new Date().toISOString(),
        hasContext: !!context,
        businessType: businessType || 'restaurant'
      }
    });
    
  } catch (error) {
    logger.error('Conversation start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/health
 * Health check for chat AI services
 */
router.get('/health', async (req, res) => {
  try {
    const healthResult = await cloudflareAI.healthCheck();
    
    res.json({
      success: true,
      healthy: healthResult.status === 'healthy',
      service: 'cloudflare_ai',
      details: healthResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Chat health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/providers
 * Get available AI providers and their capabilities
 */
router.get('/providers', (req, res) => {
  const capabilities = cloudflareAI.getCapabilities();
  
  res.json({
    success: true,
    provider: {
      name: 'Cloudflare AI - Llama 3',
      available: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      features: ['Fast responses', 'Edge-optimized', 'Global availability', 'Cost-effective'],
      model: capabilities.models.chat,
      capabilities: capabilities.features
    },
    defaultProvider: 'cloudflare',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
