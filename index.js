const express = require("express");
const cors = require("cors");
require("dotenv").config({ 
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development" 
});
const mapboxSdk = require("@mapbox/mapbox-sdk");
const { Pool } = require("pg");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

// Import production-ready AI service
const BedrockAI = require("./bedrock-ai");

// Import MCP integration
const { createMCPMiddleware } = require("./mcp");

const app = express();
const PORT = process.env.PORT || 3001;

// Production rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // limit each IP
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Utility function for standardized API responses
const sendResponse = (res, data, message = 'Success', status = 200) => {
  res.status(status).json({
    success: status < 400,
    message,
    data,
    timestamp: new Date().toISOString(),
    status
  });
};

// Utility function for error responses
const sendError = (res, message, status = 500, details = null) => {
  console.error(`API Error [${status}]: ${message}`, details);
  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? details : undefined,
    timestamp: new Date().toISOString(),
    status
  });
};

// Database connection with production optimizations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false,
  } : false,
  max: 20, // max number of clients in pool
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000,
});

// Enhanced CORS configuration for production
const getAllowedOrigins = () => {
  const baseOrigins = [];
  
  if (process.env.NODE_ENV === "development") {
    baseOrigins.push(
      "http://localhost:12000",
      "http://localhost:12001", 
      "http://localhost:3000",
      "http://localhost:3001"
    );
  }
  
  if (process.env.NODE_ENV === "production") {
    baseOrigins.push(
      "https://beta.bitebase.app",
      "https://bitebase.app",
      "https://www.bitebase.app",
      "https://khiwniti.github.io",
      "https://beta-bitebase-app.vercel.app"
    );
  }
  
  if (process.env.FRONTEND_URL) {
    baseOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Add Vercel preview deployments pattern
  baseOrigins.push(/^https:\/\/.*\.vercel\.app$/);
  
  return baseOrigins;
};

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "X-API-Key",
      "Origin",
      "Accept"
    ],
    exposedHeaders: ["X-Total-Count", "X-Rate-Limit-Remaining"],
    maxAge: 86400, // 24 hours
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Bedrock AI with production configuration
let bedrockAI = null;
try {
  bedrockAI = new BedrockAI();
  console.log("✅ AWS Bedrock AI initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Bedrock AI:", error.message);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Initialize Mapbox client with validation
let mapboxClient = null;
if (process.env.MAPBOX_API_KEY) {
  const apiKey = process.env.MAPBOX_API_KEY.trim();
  if (apiKey.startsWith("pk.") && apiKey.length > 20) {
    try {
      mapboxClient = mapboxSdk({ accessToken: apiKey });
      console.log("✅ Mapbox client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Mapbox client:", error.message);
      mapboxClient = null;
    }
  } else {
    console.warn("⚠️ MAPBOX_API_KEY format is invalid. Mapbox functionality will be disabled.");
  }
} else {
  console.warn("⚠️ MAPBOX_API_KEY is not defined. Mapbox functionality will be disabled.");
}

// Production health check endpoint
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "bitebase-production-backend",
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development",
      database: {
        connected: true,
        type: "postgresql",
        timestamp: result.rows[0].now,
      },
      services: {
        api: true,
        database: true,
        ai: !!bedrockAI,
        mapbox: !!mapboxClient,
      },
      ai_models: bedrockAI ? {
        chat: process.env.BEDROCK_CHAT_MODEL || "claude-3-sonnet",
        reasoning: process.env.BEDROCK_REASONING_MODEL || "claude-3.5-sonnet", 
        fast: process.env.BEDROCK_FAST_MODEL || "claude-3-haiku"
      } : null
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error("❌ Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      service: "bitebase-production-backend",
      error: "Database connection failed",
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

// AI status endpoint
app.get("/ai", (req, res) => {
  const aiStatus = {
    status: bedrockAI ? "operational" : "unavailable",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    features: ["conversational_analytics", "predictive_insights", "competitive_intelligence"],
    models: bedrockAI ? {
      chat: process.env.BEDROCK_CHAT_MODEL,
      reasoning: process.env.BEDROCK_REASONING_MODEL,
      fast: process.env.BEDROCK_FAST_MODEL,
      gateway_url: process.env.BEDROCK_API_BASE_URL
    } : null,
    fallback_available: true
  };

  res.status(200).json(aiStatus);
});

// Production-ready AI Chat endpoint with real data integration
app.post("/ai/chat", async (req, res) => {
  try {
    const { message, restaurant_id, conversation_id, context } = req.body;

    if (!message) {
      return sendError(res, "Message is required", 400);
    }

    if (!bedrockAI) {
      return sendError(res, "AI service is not available", 503);
    }

    console.log(`🤖 AI Chat Request: "${message}" for restaurant: ${restaurant_id || 'unknown'}`);

    // Get real restaurant data if restaurant_id provided
    let restaurantData = null;
    if (restaurant_id) {
      try {
        const query = `
          SELECT r.*, 
                 COALESCE(AVG(rm.revenue), 0) as avg_monthly_revenue,
                 COALESCE(AVG(rm.customer_count), 0) as avg_monthly_customers,
                 COALESCE(AVG(rm.average_order_value), 0) as avg_order_value
          FROM restaurants r
          LEFT JOIN restaurant_metrics rm ON r.id = rm.restaurant_id 
            AND rm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
          WHERE r.id = $1
          GROUP BY r.id
        `;
        
        const result = await pool.query(query, [restaurant_id]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          restaurantData = {
            userRestaurant: {
              restaurant: {
                id: row.id,
                name: row.name,
                cuisine_type: row.cuisine_types ? row.cuisine_types.join(', ') : 'Not specified',
                rating: row.rating || 0,
                price_range: row.price_range || 2,
                location: row.location
              },
              performance: {
                monthly_revenue: parseFloat(row.avg_monthly_revenue) || 0,
                monthly_customers: parseInt(row.avg_monthly_customers) || 0,
                avg_order_value: parseFloat(row.avg_order_value) || 0,
                last_updated: new Date().toISOString()
              }
            },
            marketData: {
              restaurant_id: restaurant_id,
              analysis_date: new Date().toISOString()
            },
            revenueData: {
              restaurant_id: restaurant_id,
              period: "last_30_days"
            }
          };
        }
      } catch (dbError) {
        console.error("Database query error:", dbError);
        // Continue with default data structure
      }
    }

    // Use default structure if no real data available
    if (!restaurantData) {
      restaurantData = {
        userRestaurant: {
          restaurant: {
            name: 'Your Restaurant',
            cuisine_type: 'Restaurant',
            rating: 0,
            price_range: 2
          },
          performance: {
            monthly_revenue: 0,
            monthly_customers: 0,
            avg_order_value: 0
          }
        },
        marketData: { 
          analysis_available: false
        },
        revenueData: { 
          analysis_available: false
        }
      };
    }

    // Generate AI response using Bedrock with real data
    const response = await bedrockAI.generateResponse(
      message, 
      context?.language || 'auto', 
      restaurantData,
      context?.location || null
    );

    sendResponse(res, {
      response: response.content,
      intent: response.intent,
      language: response.language,
      suggestions: response.suggestions,
      model: response.model,
      data_source: response.data_source,
      tokens_used: response.tokens_used,
      conversation_id: conversation_id || crypto.randomUUID(),
      restaurant_id: restaurant_id
    }, "AI response generated successfully");

  } catch (error) {
    console.error("❌ AI Chat failed:", error);
    sendError(res, "Failed to generate AI response", 500, error.message);
  }
});

// Production-ready restaurant analytics endpoint
app.get("/api/restaurants/:id/analytics", async (req, res) => {
  try {
    const { id } = req.params;
    const { date_range = '30d' } = req.query;

    if (!id) {
      return sendError(res, "Restaurant ID is required", 400);
    }

    // Convert date_range to SQL interval
    const intervalMap = {
      '7d': '7 days',
      '30d': '30 days', 
      '90d': '90 days',
      '1y': '1 year'
    };

    const interval = intervalMap[date_range] || '30 days';

    const analyticsQuery = `
      SELECT 
        r.id,
        r.name,
        r.cuisine_types,
        r.price_range,
        r.rating,
        COUNT(rm.id) as metrics_count,
        COALESCE(AVG(rm.revenue), 0) as avg_revenue,
        COALESCE(SUM(rm.revenue), 0) as total_revenue,
        COALESCE(AVG(rm.customer_count), 0) as avg_customers,
        COALESCE(SUM(rm.customer_count), 0) as total_customers,
        COALESCE(AVG(rm.average_order_value), 0) as avg_order_value,
        MIN(rm.metric_date) as period_start,
        MAX(rm.metric_date) as period_end
      FROM restaurants r
      LEFT JOIN restaurant_metrics rm ON r.id = rm.restaurant_id 
        AND rm.metric_date >= CURRENT_DATE - INTERVAL '${interval}'
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.cuisine_types, r.price_range, r.rating
    `;

    const result = await pool.query(analyticsQuery, [id]);

    if (result.rows.length === 0) {
      return sendError(res, "Restaurant not found", 404);
    }

    const analytics = result.rows[0];

    // Get daily trends
    const trendsQuery = `
      SELECT 
        metric_date,
        revenue,
        customer_count,
        average_order_value
      FROM restaurant_metrics 
      WHERE restaurant_id = $1 
        AND metric_date >= CURRENT_DATE - INTERVAL '${interval}'
      ORDER BY metric_date ASC
    `;

    const trendsResult = await pool.query(trendsQuery, [id]);

    const analyticsData = {
      restaurant_id: analytics.id,
      restaurant_name: analytics.name,
      cuisine_types: analytics.cuisine_types || [],
      price_range: analytics.price_range,
      rating: analytics.rating,
      period: {
        range: date_range,
        start: analytics.period_start,
        end: analytics.period_end,
        days_analyzed: analytics.metrics_count
      },
      metrics: {
        total_revenue: parseFloat(analytics.total_revenue) || 0,
        average_revenue: parseFloat(analytics.avg_revenue) || 0,
        total_customers: parseInt(analytics.total_customers) || 0,
        average_customers: parseFloat(analytics.avg_customers) || 0,
        average_order_value: parseFloat(analytics.avg_order_value) || 0
      },
      trends: trendsResult.rows.map(row => ({
        date: row.metric_date,
        revenue: parseFloat(row.revenue) || 0,
        customers: parseInt(row.customer_count) || 0,
        avg_order_value: parseFloat(row.average_order_value) || 0
      })),
      generated_at: new Date().toISOString()
    };

    sendResponse(res, analyticsData, "Analytics data retrieved successfully");

  } catch (error) {
    console.error("❌ Analytics retrieval failed:", error);
    sendError(res, "Failed to retrieve analytics data", 500, error.message);
  }
});

// Production-ready restaurant search endpoint
app.post("/api/restaurants/search", async (req, res) => {
  try {
    const { 
      location, 
      cuisine_types = [], 
      price_range = [1, 4], 
      rating_min = 0, 
      radius_km = 10,
      limit = 20,
      offset = 0 
    } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return sendError(res, "Location coordinates are required", 400);
    }

    let searchQuery = `
      SELECT 
        r.*,
        ST_Distance(
          ST_GeogFromText('POINT(' || $1 || ' ' || $2 || ')'),
          r.location::geography
        ) / 1000 as distance_km
      FROM restaurants r
      WHERE ST_DWithin(
        r.location::geography,
        ST_GeogFromText('POINT(' || $1 || ' ' || $2 || ')'),
        $3 * 1000
      )
    `;

    const params = [location.longitude, location.latitude, radius_km];
    let paramIndex = 4;

    // Add cuisine filter
    if (cuisine_types.length > 0) {
      searchQuery += ` AND r.cuisine_types && $${paramIndex}`;
      params.push(cuisine_types);
      paramIndex++;
    }

    // Add price range filter
    if (price_range.length === 2) {
      searchQuery += ` AND r.price_range BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(price_range[0], price_range[1]);
      paramIndex += 2;
    }

    // Add rating filter
    if (rating_min > 0) {
      searchQuery += ` AND r.rating >= $${paramIndex}`;
      params.push(rating_min);
      paramIndex++;
    }

    searchQuery += `
      ORDER BY distance_km ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(searchQuery, params);

    const restaurants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      cuisine_types: row.cuisine_types || [],
      price_range: row.price_range,
      rating: row.rating,
      location: {
        latitude: row.location ? parseFloat(row.location.split('(')[1].split(' ')[1]) : null,
        longitude: row.location ? parseFloat(row.location.split('(')[1].split(' ')[0]) : null
      },
      distance_km: parseFloat(row.distance_km),
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    sendResponse(res, {
      restaurants,
      search_params: {
        location,
        cuisine_types,
        price_range,
        rating_min,
        radius_km,
        limit,
        offset
      },
      total_found: restaurants.length,
      generated_at: new Date().toISOString()
    }, "Restaurant search completed successfully");

  } catch (error) {
    console.error("❌ Restaurant search failed:", error);
    sendError(res, "Failed to search restaurants", 500, error.message);
  }
});

// Location Intelligence Routes
const { router: locationRouter, initializeLocationService } = require('./routes/location');

// Add database reference to requests for location service
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Import routes
const analyticsRouter = require('./routes/analytics');

// Mount location intelligence routes
app.use('/api/location', locationRouter);

// Mount MCP routes
app.use('/api/mcp', createMCPMiddleware());

// Mount analytics routes
app.use('/api/analytics', analyticsRouter);

// Initialize location service on startup
(async () => {
  try {
    await initializeLocationService(pool);
    console.log('🌍 Location Intelligence Service initialized');
  } catch (error) {
    console.warn('⚠️ Location Intelligence Service initialization failed:', error.message);
  }
})();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 BiteBase Production Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Backend URL: http://0.0.0.0:${PORT}`);
  console.log(`🤖 AI Status: ${bedrockAI ? 'Operational' : 'Unavailable'}`);
  console.log(`🗺️ Mapbox Status: ${mapboxClient ? 'Available' : 'Disabled'}`);
});

module.exports = app;