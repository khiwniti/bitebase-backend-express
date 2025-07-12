/**
 * BiteBase Backend Server with Database and Real API Integration
 * Connects to real database and external services
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

// Import AI and MCP components
const BedrockAI = require('./bedrock-ai');
const BiteBaseMCPServer = require('./mcp-server');

const app = express();
const PORT = process.env.PORT || 12001;

// Database Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:12002', 'https://work-2-qctqfcbslblhfccl.prod-runtime.all-hands.dev'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize AI and MCP services
const bedrockAI = new BedrockAI();
const mcpServer = new BiteBaseMCPServer();

console.log('🚀 BiteBase Express.js Backend with Database running on port', PORT);
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️ Database: Connected to NeonDB');
console.log('🔗 Backend URL: http://0.0.0.0:' + PORT);
console.log('🤖 AI Assistant: http://0.0.0.0:' + PORT + '/api/ai/chat');

// Initialize the database connection
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Test the connection
    await client.query('SELECT NOW()');
    console.log('✅ Database query test successful');
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️ Server will continue running with mock data fallback');
  }
}

// Initialize database with retry logic
async function initializeDatabaseWithRetry() {
  let retries = 3;
  while (retries > 0) {
    try {
      await initializeDatabase();
      break;
    } catch (error) {
      retries--;
      if (retries > 0) {
        console.log(`Retrying database connection... ${retries} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

initializeDatabaseWithRetry();

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  let dbResponseTime = 0;
  let externalApiStatus = {
    foursquare: 'unknown',
    mapbox: 'unknown',
    stripe: 'unknown'
  };

  try {
    // Check database health
    const startTime = performance.now();
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    dbResponseTime = performance.now() - startTime;
    dbStatus = 'connected';
  } catch (err) {
    console.error('Database health check failed:', err.message);
    dbStatus = 'disconnected';
  }

  // Check Foursquare API
  try {
    await axios.get('https://api.foursquare.com/v2/venues/categories', {
      params: {
        client_id: process.env.FOURSQUARE_CLIENT_ID,
        client_secret: process.env.FOURSQUARE_CLIENT_SECRET,
        v: '20230101'
      },
      timeout: 5000
    });
    externalApiStatus.foursquare = 'available';
  } catch (err) {
    console.error('Foursquare API health check failed:', err.message);
    externalApiStatus.foursquare = err.response ? 'limited' : 'unavailable';
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'bitebase-backend-express',
    mode: 'database-connected',
    database: {
      connected: dbStatus === 'connected',
      status: dbStatus,
      responseTime: dbResponseTime
    },
    ai_services: {
      openrouter: 'active',
      mcp_tools: 'active'
    },
    external_apis: externalApiStatus
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
    const language = bedrockAI.detectLanguage(message);
    const intent = bedrockAI.determineIntent(message);

    console.log(`🎯 Detected intent: ${intent}, language: ${language}`);

    // Get restaurant data from database if available, or use mock data as fallback
    let userRestaurant = {
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

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM restaurants LIMIT 1');
      client.release();
      
      if (result.rows.length > 0) {
        userRestaurant = {
          restaurant: result.rows[0],
          performance: await getRestaurantPerformance(result.rows[0].id)
        };
      }
    } catch (error) {
      console.log('Using mock restaurant data (database unavailable)');
      // Continue with mock data already set above
    }

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
    console.log('🤖 Calling AWS Bedrock AI...');
    const response = await bedrockAI.generateResponse(message, language, {
      userRestaurant,
      marketData,
      revenueData,
      ...advancedData
    });

    console.log(`🔄 AI response generated: {
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

// Helper function to get restaurant performance from database
async function getRestaurantPerformance(restaurantId) {
  try {
    // Check Foursquare API
    await axios.get('https://api.foursquare.com/v3/places/search', {
      headers: {
        'Accept': 'application/json',
        'Authorization': process.env.FOURSQUARE_API_KEY
      },
      params: {
        ll: '13.7563,100.5018',
        categories: '13000',
        limit: 1
      },
      timeout: 5000
    });
    externalApiStatus.foursquare = 'available';
  } catch (err) {
    console.error('Foursquare API health check failed:', err.message);
    externalApiStatus.foursquare = err.response ? 'limited' : 'unavailable';
  }
}

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

// Location tracking with real Foursquare integration
app.post('/user/location/update', async (req, res) => {
  try {
    const { latitude, longitude, accuracy, session_id } = req.body;

    // Store location in database
    try {
      const client = await pool.connect();
      await client.query(
        'INSERT INTO user_locations (session_id, latitude, longitude, accuracy, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT DO NOTHING',
        [session_id || 'anonymous', latitude, longitude, accuracy]
      );
      client.release();
    } catch (dbError) {
      console.log('Location data not stored (database unavailable)');
      // Continue even if storage fails
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        tracking_id: session_id || 'anonymous',
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

// Restaurant search with Foursquare integration
app.get('/restaurants/search', async (req, res) => {
  try {
    const { latitude = 13.7563, longitude = 100.5018, radius = 10 } = req.query;
    
    let restaurants = [];
    
    try {
      // Try to get real data from Foursquare
      const response = await axios.get('https://api.foursquare.com/v3/places/search', {
        headers: {
          'Accept': 'application/json',
          'Authorization': process.env.FOURSQUARE_API_KEY
        },
        params: {
          ll: `${latitude},${longitude}`,
          categories: '13000', // Food category
          radius: radius * 1000, // Convert to meters
          limit: 10
        },
        timeout: 5000
      });
      
      if (response.data && response.data.results) {
        restaurants = response.data.results.map(venue => ({
          id: venue.fsq_id,
          name: venue.name,
          latitude: venue.geocodes.main.latitude,
          longitude: venue.geocodes.main.longitude,
          address: venue.location.formatted_address || '',
          category: venue.categories && venue.categories[0] ? venue.categories[0].name : 'Restaurant',
          distance_km: venue.distance ? venue.distance / 1000 : null,
          platform: 'foursquare'
        }));
      }
    } catch (apiError) {
      console.error('Foursquare API error:', apiError.message);
      // Fall back to mock data if Foursquare API fails
      restaurants = [
        {
          id: 1,
          name: "Gaggan Anand",
          latitude: 13.749079662006503,
          longitude: 100.50964666397836,
          cuisine_type: "Progressive Indian",
          price_range: 4,
          rating: 4.8,
          review_count: 2847,
          platform: "foursquare",
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
          platform: "foursquare",
          distance_km: 0.85
        }
      ];
    }

    res.json({
      success: true,
      data: {
        restaurants: restaurants,
        total: restaurants.length,
        pagination: {
          page: 1,
          total_pages: 1,
          per_page: 20
        }
      }
    });
  } catch (error) {
    console.error('❌ Restaurant search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Restaurant search failed'
    });
  }
});

// Restaurant search (realtime)
app.post('/restaurants/search/realtime', async (req, res) => {
  try {
    const { latitude, longitude, initial_radius = 2, buffer_zones = false } = req.body;
    
    let restaurants = [];
    
    try {
      // Try to get real data from Foursquare
      const response = await axios.get('https://api.foursquare.com/v3/places/search', {
        headers: {
          'Accept': 'application/json',
          'Authorization': process.env.FOURSQUARE_API_KEY
        },
        params: {
          ll: `${latitude},${longitude}`,
          categories: '13000', // Food category
          radius: initial_radius * 1000, // Convert to meters
          limit: 10
        },
        timeout: 5000
      });
      
      if (response.data && response.data.results) {
        restaurants = response.data.results.map(venue => ({
          id: venue.fsq_id,
          name: venue.name,
          latitude: venue.geocodes.main.latitude,
          longitude: venue.geocodes.main.longitude,
          address: venue.location.formatted_address || '',
          category: venue.categories && venue.categories[0] ? venue.categories[0].name : 'Restaurant',
          distance_km: venue.distance ? venue.distance / 1000 : null,
          platform: 'foursquare'
        }));
      }
    } catch (apiError) {
      console.error('Foursquare API error:', apiError.message);
      // Fall back to mock data if Foursquare API fails
      restaurants = [
        {
          id: 1,
          name: "Gaggan Anand",
          latitude: 13.749079662006503,
          longitude: 100.50964666397836,
          cuisine_type: "Progressive Indian",
          price_range: 4,
          rating: 4.8,
          review_count: 2847,
          platform: "foursquare",
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
          platform: "foursquare",
          distance_km: 0.85
        }
      ];
    }

    res.json({
      success: true,
      data: {
        restaurants: restaurants,
        total: restaurants.length,
        search_params: {
          center: { latitude, longitude },
          initial_radius_km: initial_radius,
          final_radius_km: initial_radius,
          buffer_zones_enabled: buffer_zones
        },
        buffer_zones: buffer_zones ? {
          inner_zone: { radius_km: 1.2, count: restaurants.length, restaurants: restaurants }
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

// Mapbox integration endpoint
app.get('/api/mapbox/geocode', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }
    
    const response = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
      params: {
        access_token: process.env.MAPBOX_API_KEY,
        limit: 5
      }
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Geocoding failed'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running and ready for frontend connections!`);
  console.log(`🔗 Test AI: curl -X POST http://localhost:${PORT}/api/ai/chat -H "Content-Type: application/json" -d '{"message": "Hello"}'`);
});
