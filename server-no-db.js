/**
 * BiteBase Backend Server - Database-Independent Version
 * Focuses on AI Intelligence and Frontend Integration
 */

const express = require('express');
const cors = require('cors');

// Import AI and MCP components
const OpenRouterAI = require('./openrouter-ai');
const BiteBaseMCPServer = require('./mcp-server');

const app = express();
const PORT = process.env.PORT || 12001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://work-2-qctqfcbslblhfccl.prod-runtime.all-hands.dev'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize AI and MCP services
const openRouterAI = new OpenRouterAI();
const mcpServer = new BiteBaseMCPServer();

console.log('🚀 BiteBase Express.js Backend (No-DB Mode) running on port', PORT);
console.log('🌐 Environment: development');
console.log('🗄️ Database: Disabled (using mock data)');
console.log('🔗 Backend URL: http://0.0.0.0:' + PORT);
console.log('🤖 AI Assistant: http://0.0.0.0:' + PORT + '/api/ai/chat');

// Health check endpoint
app.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'bitebase-backend-express',
    mode: 'no-database',
    database: {
      connected: false,
      mode: 'mock_data_fallback'
    },
    ai_services: {
      openrouter: 'active',
      mcp_tools: 'active'
    }
  });
});

// Enhanced AI Assistant with Advanced Intelligence
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, conversation_id, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`🤖 AI Chat Request: "${message}"`);

    // Detect language and intent
    const language = openRouterAI.detectLanguage(message);
    const intent = openRouterAI.determineIntent(message);
    
    console.log(`🎯 Detected intent: ${intent}, language: ${language}`);

    // Get mock data for AI context
    const userRestaurant = {
      restaurant: { 
        name: 'Bella Vista Ristorante', 
        cuisine_type: 'Italian',
        rating: 4.6,
        price_range: 3
      },
      performance: {
        monthly_revenue: 185400,
        monthly_customers: 892,
        avg_order_value: 680,
        revenue_growth: 12.3,
        repeat_customer_rate: 75,
        peak_hours: ['18:00-20:00']
      }
    };

    const marketData = { market_trends: 'stable', competition_level: 'moderate' };
    const revenueData = { monthly_trend: 'positive', growth_rate: 12.3 };

    // Get advanced intelligence data based on intent
    let advancedData = {};

    if (intent === 'predictive_analytics') {
      advancedData.predictive = mcpServer.getMockPredictiveAnalytics({});
    } else if (intent === 'customer_intelligence') {
      advancedData.customerIntelligence = mcpServer.getMockCustomerIntelligence({});
    } else if (intent === 'competitive_intelligence') {
      advancedData.competitiveIntelligence = mcpServer.getMockCompetitiveIntelligence({});
    } else if (intent === 'menu_optimization') {
      advancedData.menuOptimization = mcpServer.getMockMenuOptimization({});
    } else if (intent === 'operational_intelligence') {
      advancedData.operationalIntelligence = mcpServer.getMockOperationalIntelligence({});
    } else if (intent === 'strategic_intelligence') {
      advancedData.strategicIntelligence = mcpServer.getMockStrategicIntelligence({});
    }

    // Generate AI response
    console.log('🤖 Calling OpenRouter AI...');
    const response = await openRouterAI.generateResponse(message, language, {
      userRestaurant,
      marketData,
      revenueData,
      ...advancedData
    });

    console.log(`📤 AI response generated: {
      hasContent: ${!!response.content},
      contentLength: ${response.content?.length || 0},
      intent: '${response.intent}',
      language: '${response.language}'
    }`);

    res.json({
      success: true,
      data: {
        response: response.content,
        conversation_id: conversation_id || `conv_${Date.now()}`,
        timestamp: new Date().toISOString(),
        language: response.language,
        intent: response.intent,
        suggestions: response.suggestions || [],
        data_source: response.data_source || 'enhanced_ai',
        model: response.model || 'alex_business_consultant',
        tokens_used: 0,
        advanced_intelligence: !!advancedData[Object.keys(advancedData)[0]]
      }
    });

  } catch (error) {
    console.error('❌ AI Chat Error:', error);
    res.status(500).json({
      success: false,
      error: 'AI service temporarily unavailable',
      details: error.message
    });
  }
});

// MCP Tools endpoint
app.get('/api/mcp/tools', async (req, res) => {
  try {
    const tools = mcpServer.getAvailableTools();
    res.json({
      success: true,
      tools: tools,
      total: tools.length,
      categories: [
        'Restaurant Performance',
        'Market Analysis', 
        'Revenue Analytics',
        'Predictive Analytics',
        'Customer Intelligence',
        'Competitive Intelligence',
        'Menu Optimization',
        'Operational Intelligence',
        'Strategic Intelligence'
      ]
    });
  } catch (error) {
    console.error('❌ MCP Tools Error:', error);
    res.status(500).json({
      success: false,
      error: 'MCP service error',
      details: error.message
    });
  }
});

// MCP Tool execution endpoint
app.post('/api/mcp/execute', async (req, res) => {
  try {
    const { tool_name, parameters } = req.body;

    if (!tool_name) {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required'
      });
    }

    console.log(`🔧 Executing MCP tool: ${tool_name}`);

    // Use mock data for all tools
    let result;
    switch (tool_name) {
      case 'get_predictive_analytics':
        result = mcpServer.getMockPredictiveAnalytics(parameters || {});
        break;
      case 'get_customer_intelligence':
        result = mcpServer.getMockCustomerIntelligence(parameters || {});
        break;
      case 'get_competitive_intelligence':
        result = mcpServer.getMockCompetitiveIntelligence(parameters || {});
        break;
      case 'get_menu_optimization':
        result = mcpServer.getMockMenuOptimization(parameters || {});
        break;
      case 'get_operational_intelligence':
        result = mcpServer.getMockOperationalIntelligence(parameters || {});
        break;
      case 'get_strategic_intelligence':
        result = mcpServer.getMockStrategicIntelligence(parameters || {});
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool_name}`
        });
    }

    res.json({
      success: true,
      tool: tool_name,
      parameters: parameters || {},
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ MCP Execute Error:', error);
    res.status(500).json({
      success: false,
      error: 'Tool execution failed',
      details: error.message
    });
  }
});

// Location tracking (mock)
app.post('/user/location/update', async (req, res) => {
  try {
    const { latitude, longitude, accuracy, session_id } = req.body;
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        tracking_id: session_id || 'mock_session',
        location: { latitude, longitude, accuracy },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Location update failed'
    });
  }
});

// Restaurant search (mock)
app.post('/restaurants/search/realtime', async (req, res) => {
  try {
    const { latitude, longitude, initial_radius = 2, buffer_zones = false } = req.body;
    
    // Mock restaurant data
    const mockRestaurants = [
      {
        id: 1,
        name: "Gaggan Anand",
        latitude: 13.749079662006503,
        longitude: 100.50964666397836,
        cuisine_type: "Progressive Indian",
        price_range: 4,
        rating: 4.8,
        review_count: 2847,
        platform: "wongnai",
        distance_km: 1.17
      },
      {
        id: 2,
        name: "Sorn",
        latitude: 13.755949253096102,
        longitude: 100.5096323569135,
        cuisine_type: "Southern Thai",
        price_range: 3,
        rating: 4.7,
        review_count: 1523,
        platform: "google",
        distance_km: 0.85
      }
    ];

    res.json({
      success: true,
      data: {
        restaurants: mockRestaurants,
        total: mockRestaurants.length,
        search_params: {
          center: { latitude, longitude },
          initial_radius_km: initial_radius,
          final_radius_km: initial_radius,
          buffer_zones_enabled: buffer_zones
        },
        buffer_zones: buffer_zones ? {
          inner_zone: { radius_km: 1.2, count: 2, restaurants: mockRestaurants }
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Restaurant search failed'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running and ready for frontend connections!`);
  console.log(`🔗 Test AI: curl -X POST http://localhost:${PORT}/api/ai/chat -H "Content-Type: application/json" -d '{"message": "Hello"}'`);
});
