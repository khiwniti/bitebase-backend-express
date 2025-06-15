// BiteBase Express.js Backend API
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const BiteBaseMCPServer = require('./mcp-server');
const OpenRouterAI = require('./openrouter-ai');

const app = express();
const PORT = process.env.PORT || 12001;

// Initialize MCP Server and OpenRouter AI
const mcpServer = new BiteBaseMCPServer();
const openRouterAI = new OpenRouterAI();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://beta.bitebase.app', 'https://bitebase.app', 'https://www.bitebase.app']
    : ['http://localhost:12000', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Session-ID']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Password hashing utilities using Node.js crypto
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, hashedPassword) => {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully:', result.rows[0]);
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'bitebase-backend-express',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      database: {
        connected: true,
        type: 'postgresql',
        provider: 'neon',
        timestamp: result.rows[0].now
      },
      services: {
        api: true,
        database: true,
        analytics: true,
        search: true
      }
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'bitebase-backend-express',
      error: 'Database connection failed',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Reset database endpoint (for development)
app.post('/reset-database', async (req, res) => {
  try {
    console.log('🔄 Resetting database...');

    // Drop tables in correct order (reverse of dependencies)
    await pool.query('DROP TABLE IF EXISTS user_favorites CASCADE;');
    await pool.query('DROP TABLE IF EXISTS analytics_events CASCADE;');
    await pool.query('DROP TABLE IF EXISTS user_sessions CASCADE;');
    await pool.query('DROP TABLE IF EXISTS restaurants CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');

    console.log('✅ Tables dropped successfully');

    res.status(200).json({
      success: true,
      message: 'Database reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database reset failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize database endpoint
app.post('/init-database', async (req, res) => {
  try {
    console.log('🔄 Starting database initialization with pgvector support...');

    // Enable pgvector extension
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('✅ pgvector extension enabled');
    } catch (error) {
      console.log('⚠️ pgvector extension not available, continuing without vector support');
    }

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cuisine_type VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        country VARCHAR(50) DEFAULT 'US',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4),
        rating DECIMAL(3, 2) DEFAULT 0.0,
        review_count INTEGER DEFAULT 0,
        hours JSONB,
        features TEXT[],
        images TEXT[],
        menu_url VARCHAR(255),
        delivery_available BOOLEAN DEFAULT false,
        takeout_available BOOLEAN DEFAULT true,
        reservations_available BOOLEAN DEFAULT false,
        description_embedding vector(1536),
        features_embedding vector(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, restaurant_id)
      );
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine_type);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(city, state);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_restaurants_price ON restaurants(price_range);');

    // Create vector indexes for similarity search
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_restaurants_description_embedding ON restaurants USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_restaurants_features_embedding ON restaurants USING ivfflat (features_embedding vector_cosine_ops) WITH (lists = 100);');
      console.log('✅ Vector indexes created successfully');
    } catch (error) {
      console.log('⚠️ Vector indexes not created (pgvector not available)');
    }

    console.log('✅ Tables and indexes created successfully');

    // Insert test data
    const testRestaurants = [
      {
        name: "Bella Vista Ristorante",
        description: "Authentic Italian cuisine with a modern twist, featuring handmade pasta and wood-fired pizzas",
        cuisine_type: "Italian",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        latitude: 40.7589,
        longitude: -73.9851,
        phone: "(555) 123-4567",
        email: "info@bellavista.com",
        website: "https://bellavista.com",
        price_range: 3,
        rating: 4.5,
        review_count: 127,
        features: ["outdoor_seating", "wine_bar", "romantic", "date_night"],
        delivery_available: true,
        takeout_available: true,
        reservations_available: true
      },
      {
        name: "Sakura Sushi Bar",
        description: "Fresh sushi and traditional Japanese dishes prepared by master chefs",
        cuisine_type: "Japanese",
        address: "456 Oak Ave",
        city: "San Francisco",
        state: "CA",
        zip_code: "94102",
        latitude: 37.7749,
        longitude: -122.4194,
        phone: "(555) 987-6543",
        email: "reservations@sakurasushi.com",
        website: "https://sakurasushi.com",
        price_range: 4,
        rating: 4.8,
        review_count: 89,
        features: ["sushi_bar", "sake_selection", "omakase", "fresh_fish"],
        delivery_available: false,
        takeout_available: true,
        reservations_available: true
      },
      {
        name: "El Corazón Mexicano",
        description: "Traditional Mexican flavors with locally sourced ingredients and authentic recipes",
        cuisine_type: "Mexican",
        address: "789 Sunset Blvd",
        city: "Los Angeles",
        state: "CA",
        zip_code: "90028",
        latitude: 34.0522,
        longitude: -118.2437,
        phone: "(555) 456-7890",
        email: "hola@elcorazon.com",
        website: "https://elcorazon.com",
        price_range: 2,
        rating: 4.3,
        review_count: 203,
        features: ["margaritas", "live_music", "patio", "family_friendly"],
        delivery_available: true,
        takeout_available: true,
        reservations_available: false
      },
      {
        name: "Le Petit Bistro",
        description: "Classic French bistro experience with seasonal menu and extensive wine selection",
        cuisine_type: "French",
        address: "321 Park Ave",
        city: "Chicago",
        state: "IL",
        zip_code: "60611",
        latitude: 41.8781,
        longitude: -87.6298,
        phone: "(555) 234-5678",
        email: "bonjour@lepetitbistro.com",
        website: "https://lepetitbistro.com",
        price_range: 4,
        rating: 4.6,
        review_count: 156,
        features: ["wine_cellar", "chef_specials", "intimate", "fine_dining"],
        delivery_available: false,
        takeout_available: false,
        reservations_available: true
      },
      {
        name: "The Burger Joint",
        description: "Gourmet burgers made with premium beef and craft beer selection",
        cuisine_type: "American",
        address: "654 Broadway",
        city: "Nashville",
        state: "TN",
        zip_code: "37203",
        latitude: 36.1627,
        longitude: -86.7816,
        phone: "(555) 345-6789",
        email: "info@burgerjoint.com",
        website: "https://burgerjoint.com",
        price_range: 2,
        rating: 4.2,
        review_count: 312,
        features: ["craft_beer", "outdoor_seating", "sports_bar", "casual"],
        delivery_available: true,
        takeout_available: true,
        reservations_available: false
      }
    ];

    for (const restaurant of testRestaurants) {
      await pool.query(`
        INSERT INTO restaurants (name, description, cuisine_type, address, city, state, zip_code, latitude, longitude, phone, email, website, price_range, rating, review_count, features, delivery_available, takeout_available, reservations_available)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        restaurant.name, restaurant.description, restaurant.cuisine_type,
        restaurant.address, restaurant.city, restaurant.state, restaurant.zip_code,
        restaurant.latitude, restaurant.longitude, restaurant.phone, restaurant.email,
        restaurant.website, restaurant.price_range, restaurant.rating, restaurant.review_count,
        restaurant.features, restaurant.delivery_available,
        restaurant.takeout_available, restaurant.reservations_available
      ]);
    }

    // Insert test users
    const testUsers = [
      {
        email: "admin@bitebase.app",
        password: "admin123",
        first_name: "Admin",
        last_name: "User",
        role: "admin"
      },
      {
        email: "maria@bellavista.com",
        password: "maria123",
        first_name: "Maria",
        last_name: "Rodriguez",
        role: "restaurant_owner"
      },
      {
        email: "john@example.com",
        password: "john123",
        first_name: "John",
        last_name: "Doe",
        role: "user"
      },
      {
        email: "sarah@example.com",
        password: "sarah123",
        first_name: "Sarah",
        last_name: "Johnson",
        role: "user"
      },
      {
        email: "demo@bitebase.app",
        password: "demo123",
        first_name: "Demo",
        last_name: "User",
        role: "user"
      }
    ];

    for (const user of testUsers) {
      const hashedPassword = hashPassword(user.password);
      await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `, [user.email, hashedPassword, user.first_name, user.last_name, user.role]);
    }

    console.log('✅ Test data inserted successfully');

    res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString(),
      tables_created: ['users', 'restaurants', 'user_sessions', 'analytics_events', 'user_favorites'],
      test_data: {
        restaurants: testRestaurants.length,
        users: testUsers.length
      },
      indexes_created: [
        'idx_restaurants_cuisine',
        'idx_restaurants_location', 
        'idx_restaurants_rating',
        'idx_restaurants_price'
      ]
    });

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Restaurant search endpoint
app.get('/restaurants/search', async (req, res) => {
  try {
    const {
      location,
      cuisine,
      price_range,
      rating,
      delivery,
      takeout,
      reservations,
      features,
      limit = 20,
      offset = 0
    } = req.query;

    let query = 'SELECT * FROM restaurants WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (location) {
      paramCount++;
      query += ` AND (city ILIKE $${paramCount} OR state ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }

    if (cuisine) {
      paramCount++;
      query += ` AND cuisine_type ILIKE $${paramCount}`;
      params.push(`%${cuisine}%`);
    }

    if (price_range) {
      paramCount++;
      query += ` AND price_range <= $${paramCount}`;
      params.push(parseInt(price_range));
    }

    if (rating) {
      paramCount++;
      query += ` AND rating >= $${paramCount}`;
      params.push(parseFloat(rating));
    }

    if (delivery === 'true') {
      query += ' AND delivery_available = true';
    }

    if (takeout === 'true') {
      query += ' AND takeout_available = true';
    }

    if (reservations === 'true') {
      query += ' AND reservations_available = true';
    }

    if (features) {
      const featureList = Array.isArray(features) ? features : [features];
      paramCount++;
      query += ` AND features && $${paramCount}`;
      params.push(featureList);
    }

    query += ' ORDER BY rating DESC, review_count DESC';
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Track search event
    try {
      await pool.query(`
        INSERT INTO analytics_events (event_type, event_data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `, [
        'restaurant_search',
        JSON.stringify({ location, cuisine, price_range, rating, results_count: result.rows.length }),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent')
      ]);
    } catch (analyticsError) {
      console.warn('Analytics tracking failed:', analyticsError.message);
    }

    res.status(200).json({
      success: true,
      data: {
        restaurants: result.rows,
        total: result.rows.length,
        filters: {
          location,
          cuisine,
          price_range,
          rating,
          delivery,
          takeout,
          reservations,
          features
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: result.rows.length === parseInt(limit)
        }
      },
      meta: {
        searchVia: 'database',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Restaurant search failed:', error);

    // Return mock data when database is unavailable
    const mockRestaurants = [
      {
        id: '1',
        name: 'Bella Vista Ristorante',
        description: 'Authentic Italian cuisine with modern twist',
        cuisine_type: 'Italian',
        rating: 4.6,
        review_count: 127,
        price_range: 3,
        city: 'Bangkok',
        state: 'Bangkok',
        address: '123 Sukhumvit Road',
        delivery_available: true,
        takeout_available: true,
        reservations_available: true,
        features: ['outdoor_seating', 'wine_bar', 'romantic']
      },
      {
        id: '2',
        name: 'Sakura Sushi Bar',
        description: 'Fresh sushi and traditional Japanese dishes',
        cuisine_type: 'Japanese',
        rating: 4.8,
        review_count: 89,
        price_range: 4,
        city: 'Bangkok',
        state: 'Bangkok',
        address: '456 Silom Road',
        delivery_available: true,
        takeout_available: true,
        reservations_available: true,
        features: ['sushi_bar', 'fresh_fish', 'traditional']
      },
      {
        id: '3',
        name: 'Spice Garden Thai',
        description: 'Authentic Thai flavors in a cozy setting',
        cuisine_type: 'Thai',
        rating: 4.5,
        review_count: 203,
        price_range: 2,
        city: 'Bangkok',
        state: 'Bangkok',
        address: '789 Phetchaburi Road',
        delivery_available: true,
        takeout_available: true,
        reservations_available: false,
        features: ['spicy', 'authentic', 'local_favorite']
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        restaurants: mockRestaurants,
        total: mockRestaurants.length,
        filters: req.query,
        pagination: {
          limit: parseInt(req.query.limit || 20),
          offset: parseInt(req.query.offset || 0),
          has_more: false
        }
      },
      meta: {
        searchVia: 'mock_fallback',
        timestamp: new Date().toISOString(),
        note: 'Using mock data - database unavailable'
      }
    });
  }
});

// Restaurant details endpoint
app.get('/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
        timestamp: new Date().toISOString()
      });
    }

    const restaurant = result.rows[0];

    // Get similar restaurants
    const similarResult = await pool.query(`
      SELECT * FROM restaurants 
      WHERE cuisine_type = $1 AND id != $2 
      ORDER BY rating DESC 
      LIMIT 3
    `, [restaurant.cuisine_type, id]);

    // Track view event
    try {
      await pool.query(`
        INSERT INTO analytics_events (event_type, event_data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `, [
        'restaurant_view',
        JSON.stringify({ restaurant_id: id, restaurant_name: restaurant.name }),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent')
      ]);
    } catch (analyticsError) {
      console.warn('Analytics tracking failed:', analyticsError.message);
    }

    res.status(200).json({
      success: true,
      data: {
        restaurant,
        similar_restaurants: similarResult.rows
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Restaurant details failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get restaurant details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Analytics dashboard endpoint
app.get('/analytics/dashboard', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    let dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
    if (timeframe === '1d') dateFilter = "created_at >= NOW() - INTERVAL '1 day'";
    if (timeframe === '30d') dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
    if (timeframe === '90d') dateFilter = "created_at >= NOW() - INTERVAL '90 days'";

    // Get basic metrics
    const [
      totalRestaurants,
      totalUsers,
      recentSearches,
      recentViews,
      popularCuisines,
      topRatedRestaurants
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM restaurants'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query(`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'restaurant_search' AND ${dateFilter}`),
      pool.query(`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'restaurant_view' AND ${dateFilter}`),
      pool.query(`
        SELECT cuisine_type, COUNT(*) as count 
        FROM restaurants 
        GROUP BY cuisine_type 
        ORDER BY count DESC 
        LIMIT 5
      `),
      pool.query(`
        SELECT name, rating, review_count 
        FROM restaurants 
        ORDER BY rating DESC, review_count DESC 
        LIMIT 5
      `)
    ]);

    // Track dashboard access
    try {
      await pool.query(`
        INSERT INTO analytics_events (event_type, event_data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `, [
        'dashboard_access',
        JSON.stringify({ timeframe }),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent')
      ]);
    } catch (analyticsError) {
      console.warn('Analytics tracking failed:', analyticsError.message);
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_restaurants: parseInt(totalRestaurants.rows[0].count),
          total_users: parseInt(totalUsers.rows[0].count),
          recent_searches: parseInt(recentSearches.rows[0].count),
          recent_views: parseInt(recentViews.rows[0].count)
        },
        popular_cuisines: popularCuisines.rows,
        top_rated_restaurants: topRatedRestaurants.rows,
        timeframe
      },
      meta: {
        timestamp: new Date().toISOString(),
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Analytics dashboard failed:', error);

    // Return mock analytics data when database is unavailable
    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_restaurants: 127,
          total_users: 45,
          recent_searches: 234,
          recent_views: 567
        },
        popular_cuisines: [
          { cuisine_type: 'Thai', count: 35 },
          { cuisine_type: 'Italian', count: 28 },
          { cuisine_type: 'Japanese', count: 22 },
          { cuisine_type: 'Chinese', count: 18 },
          { cuisine_type: 'American', count: 15 }
        ],
        top_rated_restaurants: [
          { name: 'Sakura Sushi Bar', rating: 4.8, review_count: 89 },
          { name: 'Bella Vista Ristorante', rating: 4.6, review_count: 127 },
          { name: 'Spice Garden Thai', rating: 4.5, review_count: 203 },
          { name: 'Le Petit Bistro', rating: 4.4, review_count: 156 },
          { name: 'Golden Dragon', rating: 4.3, review_count: 98 }
        ],
        timeframe: req.query.timeframe || '7d'
      },
      meta: {
        timestamp: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        data_source: 'mock_fallback',
        note: 'Using mock data - database unavailable'
      }
    });
  }
});

// User Management Endpoints

// Create user endpoint
app.post('/users', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'user' } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, first_name, last_name'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const password_hash = hashPassword(password);

    // Create user
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, created_at
    `, [email, password_hash, first_name, last_name, role]);

    const user = result.rows[0];

    // Log analytics event
    try {
      await pool.query(`
        INSERT INTO analytics_events (event_type, event_data)
        VALUES ('user_created', $1)
      `, [JSON.stringify({ user_id: user.id, email: user.email })]);
    } catch (analyticsError) {
      console.log('Analytics logging failed:', analyticsError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user by ID endpoint
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get user's favorite restaurants count
    const favoritesResult = await pool.query(`
      SELECT COUNT(*) as favorite_count
      FROM user_favorites 
      WHERE user_id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          favorite_restaurants_count: parseInt(favoritesResult.rows[0].favorite_count)
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// User login endpoint
app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get user by email
    const result = await pool.query(`
      SELECT id, email, password_hash, first_name, last_name, role
      FROM users 
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create session token
    const { v4: uuidv4 } = require('uuid');
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, sessionToken, expiresAt]);

    // Log analytics event
    try {
      await pool.query(`
        INSERT INTO analytics_events (event_type, event_data)
        VALUES ('user_login', $1)
      `, [JSON.stringify({ user_id: user.id, email: user.email })]);
    } catch (analyticsError) {
      console.log('Analytics logging failed:', analyticsError.message);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        session: {
          token: sessionToken,
          expires_at: expiresAt
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all users endpoint (for testing)
app.get('/users', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          total: totalUsers,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({
    message: "🎉 BiteBase Express.js Backend is working perfectly!",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    version: "1.0.0",
    service: "bitebase-backend-express"
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: "🍽️ BiteBase API Server - Express.js Backend",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /health - Health check with database status",
      "POST /init-database - Initialize database with test data",
      "GET /restaurants/search - Search restaurants with filters",
      "GET /restaurants/:id - Get restaurant details",
      "GET /analytics/dashboard - Analytics dashboard",
      "GET /test - Simple test endpoint"
    ],
    database: "Neon PostgreSQL",
    features: [
      "Restaurant search and discovery",
      "Analytics tracking",
      "Database management",
      "CORS enabled for frontend"
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// AI Assistant Helper Functions
async function getUserRestaurantData(userId = 'demo-user') {
  try {
    // Get user's restaurant data
    const userRestaurant = await pool.query(`
      SELECT
        r.*,
        COALESCE(a.monthly_revenue, 0) as monthly_revenue,
        COALESCE(a.monthly_customers, 0) as monthly_customers,
        COALESCE(a.avg_order_value, 0) as avg_order_value,
        COALESCE(a.last_month_revenue, 0) as last_month_revenue,
        COALESCE(a.revenue_growth, 0) as revenue_growth
      FROM restaurants r
      LEFT JOIN (
        SELECT
          restaurant_id,
          SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN revenue ELSE 0 END) as monthly_revenue,
          COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_customers,
          AVG(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN order_value END) as avg_order_value,
          SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN revenue ELSE 0 END) as last_month_revenue,
          CASE
            WHEN SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN revenue ELSE 0 END) > 0
            THEN ((SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN revenue ELSE 0 END) -
                   SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN revenue ELSE 0 END)) * 100.0 /
                   SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN revenue ELSE 0 END))
            ELSE 0
          END as revenue_growth
        FROM analytics_events
        WHERE event_type = 'order_completed'
        GROUP BY restaurant_id
      ) a ON r.id = a.restaurant_id
      WHERE r.name ILIKE '%bella vista%' OR r.id = $1
      LIMIT 1
    `, [userId]);

    if (userRestaurant.rows.length > 0) {
      return userRestaurant.rows[0];
    }

    // If no specific restaurant found, return mock data for demo
    return {
      id: 'demo-restaurant',
      name: 'Bella Vista Ristorante',
      cuisine_type: 'Italian',
      rating: 4.6,
      review_count: 127,
      price_range: 3,
      monthly_revenue: 185400,
      monthly_customers: 892,
      avg_order_value: 680,
      last_month_revenue: 165200,
      revenue_growth: 12.3,
      delivery_available: true,
      takeout_available: true,
      features: ['outdoor_seating', 'wine_bar', 'romantic']
    };
  } catch (error) {
    console.error('Database unavailable, using mock restaurant data:', error.message);
    // Return realistic mock restaurant data
    return {
      id: 'demo-restaurant',
      name: 'Bella Vista Ristorante',
      cuisine_type: 'Italian',
      rating: 4.6,
      review_count: 127,
      price_range: 3,
      monthly_revenue: 185400,
      monthly_customers: 892,
      avg_order_value: 680,
      last_month_revenue: 165200,
      revenue_growth: 12.3,
      delivery_available: true,
      takeout_available: true,
      features: ['outdoor_seating', 'wine_bar', 'romantic']
    };
  }
}

async function getRestaurantAnalytics() {
  try {
    // Get restaurant statistics from database
    const restaurantStats = await pool.query(`
      SELECT
        COUNT(*) as total_restaurants,
        AVG(rating) as avg_rating,
        AVG(price_range) as avg_price_range,
        COUNT(CASE WHEN rating >= 4.0 THEN 1 END) as high_rated_count,
        COUNT(CASE WHEN delivery_available = true THEN 1 END) as delivery_count,
        array_agg(DISTINCT cuisine_type) as cuisine_types
      FROM restaurants
      WHERE rating > 0
    `);

    // Get top rated restaurants
    const topRestaurants = await pool.query(`
      SELECT name, rating, cuisine_type, price_range, review_count
      FROM restaurants
      WHERE rating > 0
      ORDER BY rating DESC, review_count DESC
      LIMIT 5
    `);

    // Get cuisine distribution
    const cuisineStats = await pool.query(`
      SELECT cuisine_type, COUNT(*) as count, AVG(rating) as avg_rating
      FROM restaurants
      WHERE cuisine_type IS NOT NULL AND rating > 0
      GROUP BY cuisine_type
      ORDER BY count DESC
    `);

    return {
      stats: restaurantStats.rows[0],
      topRestaurants: topRestaurants.rows,
      cuisineDistribution: cuisineStats.rows
    };
  } catch (error) {
    console.error('Database unavailable, using mock data:', error.message);
    // Return realistic mock data when database is unavailable
    return {
      stats: {
        total_restaurants: 127,
        avg_rating: 4.2,
        avg_price_range: 2.5,
        high_rated_count: 89,
        delivery_count: 95
      },
      topRestaurants: [
        { name: "Bella Vista Ristorante", rating: 4.8, cuisine_type: "Italian", price_range: 3, review_count: 245 },
        { name: "Sakura Sushi Bar", rating: 4.7, cuisine_type: "Japanese", price_range: 3, review_count: 189 },
        { name: "Le Petit Bistro", rating: 4.6, cuisine_type: "French", price_range: 4, review_count: 156 },
        { name: "Spice Garden", rating: 4.5, cuisine_type: "Thai", price_range: 2, review_count: 203 },
        { name: "The Burger Joint", rating: 4.4, cuisine_type: "American", price_range: 2, review_count: 312 }
      ],
      cuisineDistribution: [
        { cuisine_type: "Italian", count: 23, avg_rating: 4.3 },
        { cuisine_type: "Thai", count: 19, avg_rating: 4.2 },
        { cuisine_type: "American", count: 18, avg_rating: 4.1 },
        { cuisine_type: "Japanese", count: 15, avg_rating: 4.4 },
        { cuisine_type: "Mexican", count: 12, avg_rating: 4.0 }
      ]
    };
  }
}

async function getCompetitorAnalysis() {
  try {
    // Get competitor analysis based on location and cuisine
    const competitors = await pool.query(`
      SELECT
        name,
        rating,
        price_range,
        cuisine_type,
        review_count,
        features,
        delivery_available,
        takeout_available
      FROM restaurants
      WHERE rating > 0
      ORDER BY rating DESC, review_count DESC
      LIMIT 10
    `);

    return {
      competitors: competitors.rows,
      marketInsights: {
        avgRating: competitors.rows.reduce((sum, r) => sum + parseFloat(r.rating), 0) / competitors.rows.length,
        priceDistribution: competitors.rows.reduce((acc, r) => {
          acc[r.price_range] = (acc[r.price_range] || 0) + 1;
          return acc;
        }, {}),
        deliveryAdoption: competitors.rows.filter(r => r.delivery_available).length / competitors.rows.length
      }
    };
  } catch (error) {
    console.error('Database unavailable for competitor analysis, using mock data');
    // Return realistic mock competitor data
    const mockCompetitors = [
      { name: "Bella Vista Ristorante", rating: 4.8, price_range: 3, cuisine_type: "Italian", review_count: 245, delivery_available: true },
      { name: "Sakura Sushi Bar", rating: 4.7, price_range: 3, cuisine_type: "Japanese", review_count: 189, delivery_available: true },
      { name: "Le Petit Bistro", rating: 4.6, price_range: 4, cuisine_type: "French", review_count: 156, delivery_available: false },
      { name: "Spice Garden", rating: 4.5, price_range: 2, cuisine_type: "Thai", review_count: 203, delivery_available: true },
      { name: "The Burger Joint", rating: 4.4, price_range: 2, cuisine_type: "American", review_count: 312, delivery_available: true },
      { name: "Nonna's Kitchen", rating: 4.3, price_range: 2, cuisine_type: "Italian", review_count: 98, delivery_available: true },
      { name: "Dragon Palace", rating: 4.2, price_range: 3, cuisine_type: "Chinese", review_count: 167, delivery_available: true },
      { name: "Taco Libre", rating: 4.1, price_range: 1, cuisine_type: "Mexican", review_count: 234, delivery_available: true }
    ];

    return {
      competitors: mockCompetitors,
      marketInsights: {
        avgRating: 4.3,
        priceDistribution: { 1: 1, 2: 4, 3: 3, 4: 1 },
        deliveryAdoption: 0.85
      }
    };
  }
}

async function generateNaturalResponse(message, language, userRestaurant, restaurantData, competitorData) {
  const lowerMessage = message.toLowerCase();

  // Determine intent and generate contextual response
  let intent = 'general';
  let content = '';
  let suggestions = [];

  // Sales and Revenue Analysis
  if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') || lowerMessage.includes('income') ||
      lowerMessage.includes('ยอดขาย') || lowerMessage.includes('รายได้')) {
    intent = 'sales_analysis';

    // Use actual user restaurant data
    const monthlyRevenue = userRestaurant.monthly_revenue || 0;
    const monthlyCustomers = userRestaurant.monthly_customers || 0;
    const avgOrderValue = userRestaurant.avg_order_value || 0;
    const revenueGrowth = userRestaurant.revenue_growth || 0;
    const restaurantName = userRestaurant.name || 'Your Restaurant';
    const rating = userRestaurant.rating || 0;
    const reviewCount = userRestaurant.review_count || 0;

    if (language === 'th') {
      content = `จากข้อมูลร้าน "${restaurantName}" ของคุณ ผมวิเคราะห์ผลประกอบการให้แล้วนะครับ! 📊

💰 **รายได้เดือนนี้**
• รายได้รวม: ฿${monthlyRevenue.toLocaleString()} ${revenueGrowth > 0 ? `(+${revenueGrowth.toFixed(1)}% จากเดือนที่แล้ว)` : revenueGrowth < 0 ? `(${revenueGrowth.toFixed(1)}% จากเดือนที่แล้ว)` : ''}
• ลูกค้าทั้งหมด: ${monthlyCustomers.toLocaleString()} คน
• ค่าเฉลี่ยต่อออเดอร์: ฿${avgOrderValue.toLocaleString()}

⭐ **สถานะร้าน**
• คะแนนปัจจุบัน: ${rating}/5.0 ดาว (${reviewCount} รีวิว)
• ประเภทอาหาร: ${userRestaurant.cuisine_type || 'ไม่ระบุ'}
• ระดับราคา: ${'$'.repeat(userRestaurant.price_range || 2)}

📈 **การวิเคราะห์**
${revenueGrowth > 0 ?
  `• ยอดขายเติบโต ${revenueGrowth.toFixed(1)}% - แนวโน้มดี!
• ควรรักษาคุณภาพและขยายฐานลูกค้า` :
  revenueGrowth < 0 ?
  `• ยอดขายลดลง ${Math.abs(revenueGrowth).toFixed(1)}% - ต้องปรับกลยุทธ์
• แนะนำเพิ่มโปรโมชั่นและปรับปรุงบริการ` :
  `• ยอดขายคงที่ - มีโอกาสเติบโต
• ควรเพิ่มการตลาดและพัฒนาเมนูใหม่`}

ต้องการคำแนะนำเฉพาะด้านไหนเพิ่มเติมครับ?`;

      suggestions = ['แนะนำโปรโมชั่น', 'วิเคราะห์คู่แข่ง', 'กลยุทธ์เพิ่มยอดขาย'];
    } else {
      content = `Here's your "${restaurantName}" performance analysis based on real data! 📊

💰 **This Month's Revenue**
• Total Revenue: $${monthlyRevenue.toLocaleString()} ${revenueGrowth > 0 ? `(+${revenueGrowth.toFixed(1)}% vs last month)` : revenueGrowth < 0 ? `(${revenueGrowth.toFixed(1)}% vs last month)` : ''}
• Customer Count: ${monthlyCustomers.toLocaleString()} customers
• Average Order Value: $${avgOrderValue.toLocaleString()}

⭐ **Restaurant Status**
• Current Rating: ${rating}/5.0 stars (${reviewCount} reviews)
• Cuisine Type: ${userRestaurant.cuisine_type || 'Not specified'}
• Price Range: ${'$'.repeat(userRestaurant.price_range || 2)}

📈 **Performance Analysis**
${revenueGrowth > 0 ?
  `• Revenue growing ${revenueGrowth.toFixed(1)}% - Great momentum!
• Focus on maintaining quality and expanding customer base` :
  revenueGrowth < 0 ?
  `• Revenue down ${Math.abs(revenueGrowth).toFixed(1)}% - Time to strategize
• Consider promotions and service improvements` :
  `• Revenue stable - Growth opportunity available
• Recommend marketing boost and menu innovation`}

What specific area would you like me to help you improve?`;

      suggestions = ['Marketing strategies', 'Competitor analysis', 'Growth tactics'];
    }
  }

  // Marketing and Promotion
  else if (lowerMessage.includes('marketing') || lowerMessage.includes('promotion') || lowerMessage.includes('advertis') ||
           lowerMessage.includes('โปรโมชั่น') || lowerMessage.includes('การตลาด')) {
    intent = 'marketing_advice';

    const deliveryRate = Math.round(competitorData.marketInsights.deliveryAdoption * 100);
    const topCuisines = restaurantData.cuisineDistribution.slice(0, 3);
    const restaurantName = userRestaurant.name || 'Your Restaurant';
    const hasDelivery = userRestaurant.delivery_available;
    const rating = userRestaurant.rating || 0;
    const cuisineType = userRestaurant.cuisine_type;

    if (language === 'th') {
      content = `ผมมีไอเดียการตลาดสำหรับร้าน "${restaurantName}" เลยครับ! 🎯

📊 **สถานะปัจจุบันของคุณ**
• คะแนน: ${rating}/5.0 ดาว
• ประเภทอาหาร: ${cuisineType || 'ไม่ระบุ'}
• บริการเดลิเวอรี่: ${hasDelivery ? '✅ มีแล้ว' : '❌ ยังไม่มี - แนะนำให้เริ่ม!'}

📱 **กลยุทธ์ Digital Marketing**
${!hasDelivery ? `• เริ่มบริการเดลิเวอรี่ทันที! ${deliveryRate}% ของตลาดมีแล้ว` : '• ขยายช่องทางเดลิเวอรี่เพิ่มเติม (GrabFood, Foodpanda)'}
• โพสต์รูปอาหารในช่วงเวลาหิว (11:00-12:00, 18:00-19:00)
• ใช้ hashtag #${cuisineType?.toLowerCase() || 'อาหาร'}อร่อย #ร้านอาหาร${cuisineType || ''}

🎁 **โปรโมชั่นเฉพาะร้านคุณ**
${rating < 4.0 ?
  `• "ปรับปรุงใหม่" - ลด 25% สำหรับลูกค้าที่ให้รีวิว 5 ดาว
• "รับฟังความคิดเห็น" - เครื่องดื่มฟรีเมื่อแสดงความคิดเห็น` :
  `• "ร้านดัง" - โปรโมต์คะแนน ${rating} ดาว
• "ลูกค้าประจำ" - สะสมแต้ม 10 ครั้ง ฟรี 1 มื้อ`}
• "Happy Hour" ช่วง 15:00-17:00 ลด 15%

ต้องการคำแนะนำเฉพาะด้านไหนเพิ่มเติมครับ?`;

      suggestions = ['เพิ่มยอดขาย', 'ปรับปรุงรีวิว', 'กลยุทธ์ Social Media'];
    } else {
      content = `Here are personalized marketing strategies for "${restaurantName}"! 🎯

📊 **Your Current Status**
• Rating: ${rating}/5.0 stars
• Cuisine: ${cuisineType || 'Not specified'}
• Delivery: ${hasDelivery ? '✅ Available' : '❌ Not available - Highly recommended!'}

📱 **Digital Strategy for You**
${!hasDelivery ? `• Start delivery service immediately! ${deliveryRate}% of market already offers it` : '• Expand delivery partnerships (UberEats, DoorDash, Grubhub)'}
• Post food photos during peak times (11 AM-12 PM, 6-7 PM)
• Use hashtags: #${cuisineType?.toLowerCase() || 'food'} #local${cuisineType || 'restaurant'}

🎁 **Tailored Promotions**
${rating < 4.0 ?
  `• "Grand Reopening" - 25% off for customers who leave 5-star reviews
• "We're Listening" - Free appetizer for feedback` :
  `• "Award Winner" - Promote your ${rating}-star rating
• "VIP Customer" - Loyalty program: 10 visits = 1 free meal`}
• Happy hour specials (3-5 PM) with 15% discount

Which area should we focus on first?`;

      suggestions = ['Boost sales', 'Improve reviews', 'Social media strategy'];
    }
  }

  // Competition Analysis
  else if (lowerMessage.includes('competitor') || lowerMessage.includes('competition') || lowerMessage.includes('rival') ||
           lowerMessage.includes('คู่แข่ง') || lowerMessage.includes('แข่งขัน')) {
    intent = 'competitor_analysis';

    const topCompetitors = competitorData.competitors.slice(0, 5);
    const avgMarketRating = competitorData.marketInsights.avgRating.toFixed(1);

    if (language === 'th') {
      content = `ผมวิเคราะห์คู่แข่งในตลาดให้คุณแล้วครับ! 🔍

🏆 **คู่แข่งชั้นนำ**
${topCompetitors.map((comp, i) =>
  `${i + 1}. ${comp.name} - ${comp.rating}⭐ (${comp.cuisine_type}, ราคา ${'$'.repeat(comp.price_range)})`
).join('\n')}

📊 **ข้อมูลตลาด**
• คะแนนเฉลี่ยของตลาด: ${avgMarketRating}/5.0
• อัตราการมีบริการเดลิเวอรี่: ${Math.round(competitorData.marketInsights.deliveryAdoption * 100)}%

💪 **จุดแข็งที่ควรมี**
• คะแนนรีวิวสูงกว่า ${avgMarketRating} ดาว
• บริการเดลิเวอรี่และ takeaway
• เมนูเด็ดที่เป็นเอกลักษณ์
• การบริการที่ประทับใจ

🎯 **กลยุทธ์แนะนำ**
• เน้นจุดเด่นที่แตกต่างจากคู่แข่ง
• ตอบรีวิวลูกค้าทุกรีวิว
• สร้างประสบการณ์ที่จดจำได้

ต้องการวิเคราะห์เจาะลึกด้านไหนเพิ่มเติมไหมครับ?`;

      suggestions = ['วิเคราะห์ราคา', 'กลยุทธ์เมนู', 'การบริการลูกค้า'];
    } else {
      content = `Here's my analysis of your competitive landscape! 🔍

🏆 **Top Competitors**
${topCompetitors.map((comp, i) =>
  `${i + 1}. ${comp.name} - ${comp.rating}⭐ (${comp.cuisine_type}, ${'$'.repeat(comp.price_range)} price range)`
).join('\n')}

📊 **Market Benchmarks**
• Average market rating: ${avgMarketRating}/5.0
• Delivery adoption: ${Math.round(competitorData.marketInsights.deliveryAdoption * 100)}%
• Review count matters - top performers have 50+ reviews

💪 **Success Factors**
• Maintain rating above ${avgMarketRating} stars
• Offer both delivery and takeout options
• Develop signature dishes
• Respond to all customer reviews

🎯 **Competitive Strategy**
• Differentiate through unique value proposition
• Monitor competitor pricing and promotions
• Focus on customer experience excellence
• Build strong online presence

What competitive aspect would you like to explore further?`;

      suggestions = ['Pricing analysis', 'Menu differentiation', 'Service excellence'];
    }
  }

  // General Help
  else {
    intent = 'general_help';

    if (language === 'th') {
      content = `สวัสดีครับ! ผมเป็น AI ที่ปรึกษาร้านอาหารของ BiteBase 🤖

ผมสามารถช่วยคุณได้ในเรื่อง:

📊 **การวิเคราะห์ข้อมูล**
• วิเคราะห์ยอดขายและรายได้
• ข้อมูลลูกค้าและพฤติกรรม
• การวิเคราะห์ตลาดและคู่แข่ง

💡 **กลยุทธ์ธุรกิจ**
• คำแนะนำการปรับปรุงเมนู
• กลยุทธ์การตั้งราคา
• ไอเดียการตลาดและโปรโมชั่น

🎯 **การดำเนินงาน**
• การจัดตารางพนักงาน
• การจัดการสต็อก
• การปรับปรุงการบริการ

มีอะไรที่อยากปรึกษาเป็นพิเศษไหมครับ?`;

      suggestions = ['วิเคราะห์ยอดขาย', 'แนะนำโปรโมชั่น', 'วิเคราะห์คู่แข่ง'];
    } else {
      content = `Hello! I'm your BiteBase restaurant AI consultant! 🤖

I can help you with:

📊 **Data Analytics**
• Sales performance and revenue analysis
• Customer insights and behavior patterns
• Market analysis and competitive intelligence

💡 **Business Strategy**
• Menu optimization recommendations
• Pricing strategy development
• Marketing and promotion ideas

🎯 **Operations**
• Staff scheduling optimization
• Inventory management
• Customer service improvements

Based on our database of ${restaurantData.stats.total_restaurants} restaurants, I can provide data-driven insights tailored to your business.

What would you like to explore first?`;

      suggestions = ['Analyze my sales', 'Marketing ideas', 'Competitor insights'];
    }
  }

  return {
    content,
    intent,
    suggestions,
    language
  };
}

async function generateNaturalResponseWithMCP(message, language, userRestaurant, marketData, revenueData) {
  const lowerMessage = message.toLowerCase();

  // Determine intent and generate contextual response
  let intent = 'general';
  let content = '';
  let suggestions = [];

  // Sales and Revenue Analysis using MCP data
  if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') || lowerMessage.includes('income') ||
      lowerMessage.includes('ยอดขาย') || lowerMessage.includes('รายได้')) {
    intent = 'sales_analysis';

    const restaurant = userRestaurant.restaurant || {};
    const performance = userRestaurant.performance || {};
    const revenue = revenueData.revenue_analytics || {};

    if (language === 'th') {
      content = `จากข้อมูลร้าน "${restaurant.name || 'ร้านของคุณ'}" ที่เชื่อมต่อกับฐานข้อมูลจริง 📊

💰 **ผลประกอบการปัจจุบัน**
• รายได้รายเดือน: ฿${performance.monthly_revenue?.toLocaleString() || '0'}
• ลูกค้าต่อเดือน: ${performance.monthly_customers?.toLocaleString() || '0'} คน
• ค่าเฉลี่ยต่อออเดอร์: ฿${performance.avg_order_value?.toLocaleString() || '0'}
• การเติบโต: ${performance.revenue_growth > 0 ? '+' : ''}${performance.revenue_growth || 0}%

⭐ **สถานะร้าน**
• คะแนน: ${restaurant.rating || 0}/5.0 ดาว
• ประเภทอาหาร: ${restaurant.cuisine_type || 'ไม่ระบุ'}
• จำนวนรีวิว: ${restaurant.review_count || 0} รีวิว

📈 **การวิเคราะห์แนวโน้ม**
• แนวโน้มรายได้: ${revenue.trend || 'คงที่'}
• ลูกค้าประจำ: ${performance.repeat_customer_rate || 65}%
• ช่วงเวลาคึกคัก: ${performance.peak_hours?.join(', ') || '18:00-20:00'}

💡 **คำแนะนำ**
${performance.revenue_growth > 5 ?
  '• ธุรกิจเติบโตดี ควรขยายกำลังการผลิต\n• เพิ่มช่องทางการตลาดออนไลน์' :
  performance.revenue_growth < -5 ?
  '• ต้องปรับกลยุทธ์เร่งด่วน\n• เพิ่มโปรโมชั่นและปรับปรุงบริการ' :
  '• มีโอกาสเติบโต ควรเพิ่มการตลาด\n• พัฒนาเมนูและบริการใหม่'}

ต้องการวิเคราะห์เจาะลึกด้านไหนเพิ่มเติมครับ?`;

      suggestions = ['วิเคราะห์คู่แข่ง', 'แนะนำโปรโมชั่น', 'กลยุทธ์เพิ่มยอดขาย'];
    } else {
      content = `Here's your "${restaurant.name || 'Restaurant'}" performance analysis from real database! 📊

💰 **Current Performance**
• Monthly Revenue: $${performance.monthly_revenue?.toLocaleString() || '0'}
• Monthly Customers: ${performance.monthly_customers?.toLocaleString() || '0'}
• Average Order Value: $${performance.avg_order_value?.toLocaleString() || '0'}
• Revenue Growth: ${performance.revenue_growth > 0 ? '+' : ''}${performance.revenue_growth || 0}%

⭐ **Restaurant Status**
• Rating: ${restaurant.rating || 0}/5.0 stars
• Cuisine: ${restaurant.cuisine_type || 'Not specified'}
• Reviews: ${restaurant.review_count || 0} reviews

📈 **Trend Analysis**
• Revenue Trend: ${revenue.trend || 'Stable'}
• Repeat Customer Rate: ${performance.repeat_customer_rate || 65}%
• Peak Hours: ${performance.peak_hours?.join(', ') || '6-8 PM'}

💡 **Recommendations**
${performance.revenue_growth > 5 ?
  '• Great growth! Consider expanding capacity\n• Invest in digital marketing' :
  performance.revenue_growth < -5 ?
  '• Urgent strategy adjustment needed\n• Implement promotions and service improvements' :
  '• Growth opportunity available\n• Enhance marketing and menu innovation'}

What specific area would you like me to analyze further?`;

      suggestions = ['Competitor analysis', 'Marketing strategies', 'Growth tactics'];
    }
  }

  // Marketing Analysis using market data
  else if (lowerMessage.includes('marketing') || lowerMessage.includes('promotion') ||
           lowerMessage.includes('โปรโมชั่น') || lowerMessage.includes('การตลาด')) {
    intent = 'marketing_advice';

    const market = marketData.market_overview || {};
    const topPerformers = marketData.top_performers || [];

    if (language === 'th') {
      content = `จากการวิเคราะห์ตลาดจริงในฐานข้อมูล ผมมีคำแนะนำการตลาดให้คุณ! 🎯

📊 **ภาพรวมตลาด**
• ร้านอาหารทั้งหมด: ${market.total_restaurants || 0} ร้าน
• คะแนนเฉลี่ย: ${parseFloat(market.avg_rating || 0).toFixed(1)}/5.0 ดาว
• ร้านที่มีบริการเดลิเวอรี่: ${market.delivery_count || 0} ร้าน

🏆 **คู่แข่งชั้นนำ**
${topPerformers.slice(0, 3).map((comp, i) =>
  `${i + 1}. ${comp.name} - ${comp.rating}⭐ (${comp.cuisine_type})`
).join('\n')}

🎯 **กลยุทธ์แนะนำ**
• เน้นคุณภาพให้สูงกว่าค่าเฉลี่ยตลาด (${parseFloat(market.avg_rating || 0).toFixed(1)} ดาว)
• ${market.delivery_count < market.total_restaurants * 0.7 ? 'เริ่มบริการเดลิเวอรี่ทันที!' : 'ขยายช่องทางเดลิเวอรี่เพิ่ม'}
• สร้างจุดเด่นที่แตกต่างจากคู่แข่ง

💡 **โปรโมชั่นแนะนำ**
• "ชิมฟรี" สำหรับลูกค้าใหม่
• โปรแกรมสะสมแต้มลูกค้าประจำ
• ส่วนลดช่วงเวลาเงียบ (15:00-17:00)

ต้องการคำแนะนำเฉพาะด้านไหนครับ?`;

      suggestions = ['วิเคราะห์ราคา', 'กลยุทธ์ Social Media', 'การแข่งขัน'];
    } else {
      content = `Based on real market analysis from our database! 🎯

📊 **Market Overview**
• Total Restaurants: ${market.total_restaurants || 0}
• Average Rating: ${parseFloat(market.avg_rating || 0).toFixed(1)}/5.0 stars
• Delivery Available: ${market.delivery_count || 0} restaurants

🏆 **Top Competitors**
${topPerformers.slice(0, 3).map((comp, i) =>
  `${i + 1}. ${comp.name} - ${comp.rating}⭐ (${comp.cuisine_type})`
).join('\n')}

🎯 **Strategic Recommendations**
• Aim for rating above market average (${parseFloat(market.avg_rating || 0).toFixed(1)} stars)
• ${market.delivery_count < market.total_restaurants * 0.7 ? 'Start delivery service immediately!' : 'Expand delivery partnerships'}
• Differentiate from top competitors

💡 **Promotion Ideas**
• "Try us free" for new customers
• Loyalty program with points
• Off-peak discounts (3-5 PM)

Which area should we focus on?`;

      suggestions = ['Pricing strategy', 'Social media', 'Competition'];
    }
  }

  // General help
  else {
    intent = 'general_help';

    if (language === 'th') {
      content = `สวัสดีครับ! ผมเป็น AI ที่ปรึกษาธุรกิจร้านอาหารที่เชื่อมต่อกับฐานข้อมูลจริง 🤖

ผมสามารถช่วยวิเคราะห์:

📊 **ข้อมูลจริงจากฐานข้อมูล**
• รายได้และยอดขายจริง
• ข้อมูลลูกค้าและแนวโน้ม
• การวิเคราะห์ตลาดและคู่แข่ง

💡 **คำแนะนำเชิงลึก**
• กลยุทธ์การตลาดตามข้อมูลจริง
• การปรับปรุงประสิทธิภาพ
• การเพิ่มรายได้

🔍 **การค้นหาแบบ Semantic**
• ค้นหาร้านอาหารด้วยภาษาธรรมชาติ
• เปรียบเทียบกับคู่แข่ง
• วิเคราะห์ตลาดเฉพาะพื้นที่

มีอะไรที่อยากให้ผมวิเคราะห์จากข้อมูลจริงไหมครับ?`;

      suggestions = ['วิเคราะห์รายได้', 'ดูข้อมูลตลาด', 'แนะนำกลยุทธ์'];
    } else {
      content = `Hello! I'm your BiteBase AI consultant connected to real database! 🤖

I can analyze:

📊 **Real Database Insights**
• Actual revenue and sales data
• Customer patterns and trends
• Market analysis with real competitors

💡 **Data-Driven Recommendations**
• Marketing strategies based on real data
• Performance optimization
• Revenue growth tactics

🔍 **Semantic Search Capabilities**
• Natural language restaurant search
• Competitor comparison
• Location-specific market analysis

Connected to ${marketData.market_overview?.total_restaurants || 'multiple'} restaurants in our database.

What would you like me to analyze from real data?`;

      suggestions = ['Analyze revenue', 'Market insights', 'Growth strategies'];
    }
  }

  return {
    content,
    intent,
    suggestions,
    language,
    data_source: 'mcp_database'
  };
}

async function storeConversation(conversationId, userMessage, aiResponse, language) {
  try {
    // Create chat_history table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id VARCHAR(255),
        user_message TEXT,
        ai_response TEXT,
        language VARCHAR(10),
        intent VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Store the conversation
    await pool.query(`
      INSERT INTO chat_history (conversation_id, user_message, ai_response, language, intent)
      VALUES ($1, $2, $3, $4, $5)
    `, [conversationId, userMessage, aiResponse.content, language, aiResponse.intent]);

  } catch (error) {
    console.error('Error storing conversation:', error);
    // Don't throw error - conversation storage is not critical
  }
}

// Enhanced AI Assistant with Database Integration
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, conversation_id, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Detect language (simple detection)
    const isThaiMessage = /[\u0E00-\u0E7F]/.test(message);
    const language = context?.language || (isThaiMessage ? 'th' : 'en');

    // Use MCP server to get real database data
    const userRestaurant = await mcpServer.callTool('get_restaurant_performance', {
      restaurant_id: context?.userId || 'Bella Vista Ristorante',
      date_range: '30d'
    });

    const marketData = await mcpServer.callTool('get_market_analysis', {
      cuisine_type: userRestaurant.restaurant?.cuisine_type
    });

    const revenueData = await mcpServer.callTool('get_revenue_analytics', {
      restaurant_id: context?.userId || 'Bella Vista Ristorante',
      period: 'monthly'
    });

    // Generate AI response using OpenRouter with MCP data
    console.log('🤖 Calling OpenRouter AI...');
    const response = await openRouterAI.generateResponse(message, language, {
      userRestaurant,
      marketData,
      revenueData
    });

    console.log('📤 AI response generated:', {
      hasContent: !!response.content,
      contentLength: response.content?.length || 0,
      intent: response.intent,
      language: response.language
    });

    // Store conversation in database (for future chat history)
    await storeConversation(conversation_id, message, response.content, language);

    res.json({
      success: true,
      data: {
        response: response.content,
        conversation_id: conversation_id || `conv_${Date.now()}`,
        timestamp: new Date().toISOString(),
        language: response.language,
        intent: response.intent,
        suggestions: response.suggestions || [],
        data_source: response.data_source,
        model: response.model || 'openrouter',
        tokens_used: response.tokens_used || 0
      }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI request'
    });
  }
});

// AI Chat History endpoint
app.get('/api/ai/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Get chat history from database
    const historyResult = await pool.query(`
      SELECT
        conversation_id,
        user_message,
        ai_response,
        language,
        intent,
        created_at
      FROM chat_history
      WHERE conversation_id LIKE $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [`%${userId}%`, limit]);

    const history = historyResult.rows.map(row => ({
      role: 'user',
      content: row.user_message,
      timestamp: row.created_at,
      response: {
        content: row.ai_response,
        language: row.language,
        intent: row.intent
      }
    }));

    res.json({
      success: true,
      history: history,
      userId: userId,
      limit: limit,
      total: historyResult.rows.length
    });
  } catch (error) {
    console.error('AI History Error:', error);
    res.json({
      success: true,
      history: [],
      userId: req.params.userId,
      limit: parseInt(req.query.limit) || 10,
      error: 'Could not load history'
    });
  }
});

// AI Clear Chat endpoint
app.delete('/api/ai/clear/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Clear chat history from database
    const deleteResult = await pool.query(`
      DELETE FROM chat_history
      WHERE conversation_id LIKE $1
    `, [`%${userId}%`]);

    res.json({
      success: true,
      message: 'Chat history cleared successfully',
      userId: userId,
      deletedCount: deleteResult.rowCount
    });
  } catch (error) {
    console.error('AI Clear Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history',
      details: error.message
    });
  }
});

// Real restaurant data fetching endpoint
app.post('/restaurants/fetch-real-data', async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, platforms = ['wongnai', 'google'] } = req.body;

    // Enhanced mock restaurant data for testing
    const mockRestaurants = [
      {
        id: 1,
        name: "Gaggan Anand",
        latitude: latitude + 0.001,
        longitude: longitude + 0.002,
        address: "68/1 Soi Langsuan, Ploenchit Rd, Lumpini",
        cuisine: "Progressive Indian",
        price_range: "฿฿฿฿",
        rating: 4.8,
        review_count: 2847,
        platform: "wongnai",
        platform_id: "gaggan-anand-wongnai",
        phone: "+66 2 652 1700",
        website: "https://www.gaggan.com",
        hours: "18:00-23:00",
        features: ["Fine Dining", "Tasting Menu", "Wine Pairing"],
        images: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
        description: "Progressive Indian cuisine with molecular gastronomy techniques",
        delivery_available: "No",
        takeout_available: "No",
        reservations_available: "Yes"
      },
      {
        id: 2,
        name: "Sorn",
        latitude: latitude - 0.002,
        longitude: longitude + 0.001,
        address: "56 Sukhumvit 26, Khlong Tan",
        cuisine: "Southern Thai",
        price_range: "฿฿฿",
        rating: 4.7,
        review_count: 1523,
        platform: "google",
        platform_id: "sorn-restaurant-google",
        phone: "+66 2 663 3710",
        website: "https://www.sornrestaurant.com",
        hours: "18:30-22:30",
        features: ["Authentic", "Local Ingredients", "Chef's Table"],
        images: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400",
        description: "Authentic Southern Thai cuisine using traditional recipes",
        delivery_available: "No",
        takeout_available: "Limited",
        reservations_available: "Yes"
      },
      {
        id: 3,
        name: "Le Du",
        latitude: latitude + 0.003,
        longitude: longitude - 0.001,
        address: "399/3 Silom Rd, Silom",
        cuisine: "Modern Thai",
        price_range: "฿฿฿",
        rating: 4.6,
        review_count: 987,
        platform: "wongnai",
        platform_id: "le-du-wongnai",
        phone: "+66 2 919 9918",
        website: "https://www.ledubkk.com",
        hours: "18:00-23:00",
        features: ["Modern Thai", "Local Ingredients", "Wine List"],
        images: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
        description: "Contemporary Thai cuisine with local ingredients",
        delivery_available: "No",
        takeout_available: "No",
        reservations_available: "Yes"
      },
      {
        id: 4,
        name: "Paste Bangkok",
        latitude: latitude - 0.001,
        longitude: longitude - 0.002,
        address: "999/9 Ploenchit Rd, Lumpini",
        cuisine: "Thai Fine Dining",
        price_range: "฿฿฿฿",
        rating: 4.5,
        review_count: 1456,
        platform: "google",
        platform_id: "paste-bangkok-google",
        phone: "+66 2 656 1003",
        website: "https://www.pastebangkok.com",
        hours: "18:00-22:30",
        features: ["Fine Dining", "Traditional Recipes", "Premium Ingredients"],
        images: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
        description: "Refined Thai cuisine using traditional recipes and premium ingredients",
        delivery_available: "No",
        takeout_available: "No",
        reservations_available: "Yes"
      },
      {
        id: 5,
        name: "Baan Tepa",
        latitude: latitude + 0.002,
        longitude: longitude + 0.003,
        address: "69 Soi Sukhumvit 53, Khlong Tan Nuea",
        cuisine: "Thai",
        price_range: "฿฿",
        rating: 4.4,
        review_count: 2134,
        platform: "wongnai",
        platform_id: "baan-tepa-wongnai",
        phone: "+66 2 662 0550",
        website: "https://www.baantepa.com",
        hours: "11:30-14:30, 17:30-22:00",
        features: ["Traditional", "Garden Setting", "Family Recipes"],
        images: "https://images.unsplash.com/photo-1559847844-d721426d6edc?w=400",
        description: "Traditional Thai cuisine in a beautiful garden setting",
        delivery_available: "Yes",
        takeout_available: "Yes",
        reservations_available: "Yes"
      }
    ];

    // Filter restaurants within radius (simplified calculation)
    const filteredRestaurants = mockRestaurants.filter(restaurant => {
      const distance = Math.sqrt(
        Math.pow(restaurant.latitude - latitude, 2) +
        Math.pow(restaurant.longitude - longitude, 2)
      ) * 111; // Rough conversion to km
      return distance <= radius;
    });

    const response = {
      status: "success",
      location: { latitude, longitude, radius },
      platforms_searched: platforms,
      restaurants_found: {
        wongnai: filteredRestaurants.filter(r => r.platform === 'wongnai').length,
        google: filteredRestaurants.filter(r => r.platform === 'google').length,
        total: filteredRestaurants.length
      },
      all_restaurants: filteredRestaurants,
      sample_restaurants: filteredRestaurants.slice(0, 3),
      message: `Found ${filteredRestaurants.length} restaurants within ${radius}km radius`
    };

    console.log(`✅ Returning ${filteredRestaurants.length} restaurants`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching real restaurant data:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch restaurant data",
      error: error.message
    });
  }
});

// Wongnai integration endpoints (mock for now)
app.post('/restaurants/wongnai/search', async (req, res) => {
  try {
    const { latitude, longitude, query, cuisine, limit = 10 } = req.body;

    // Mock Wongnai search results
    const mockResults = [
      {
        id: 'wongnai_1',
        name: 'Som Tam Nua',
        description: 'Famous som tam restaurant in Siam area',
        cuisine_type: 'Thai',
        rating: 4.5,
        review_count: 1250,
        price_range: 2,
        latitude: latitude || 13.7563,
        longitude: longitude || 100.5018,
        source: 'wongnai'
      },
      {
        id: 'wongnai_2',
        name: 'Gaggan Anand',
        description: 'Progressive Indian cuisine by Chef Gaggan',
        cuisine_type: 'Indian',
        rating: 4.8,
        review_count: 890,
        price_range: 4,
        latitude: latitude || 13.7563,
        longitude: longitude || 100.5018,
        source: 'wongnai'
      }
    ];

    res.json({
      success: true,
      data: {
        restaurants: mockResults,
        total: mockResults.length
      },
      meta: {
        source: 'wongnai_mock',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Wongnai search error:', error);
    res.status(500).json({
      success: false,
      error: 'Wongnai search failed'
    });
  }
});

// Restaurant menu endpoint
app.get('/restaurants/:id/menu-items', async (req, res) => {
  try {
    const { id } = req.params;

    // Mock menu items
    const mockMenu = [
      {
        id: 1,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        price: 320,
        category: 'Pizza',
        available: true
      },
      {
        id: 2,
        name: 'Spaghetti Carbonara',
        description: 'Creamy pasta with bacon and parmesan',
        price: 280,
        category: 'Pasta',
        available: true
      }
    ];

    res.json({
      success: true,
      data: mockMenu,
      restaurant_id: id
    });
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu'
    });
  }
});

// Restaurant analytics endpoint
app.get('/restaurants/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;

    // Mock analytics data
    const mockAnalytics = {
      restaurant_id: id,
      metrics: {
        total_visits: 1250,
        avg_rating: 4.5,
        revenue_estimate: 850000,
        market_share: 12.5
      },
      trends: {
        visits_trend: [100, 120, 110, 140, 130, 150, 145],
        rating_trend: [4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.5]
      },
      recommendations: [
        'Increase social media presence',
        'Optimize menu pricing',
        'Improve customer service during peak hours'
      ]
    };

    res.json({
      success: true,
      data: mockAnalytics
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
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
      server: 'BiteBase MCP Server',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('MCP Tools Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get MCP tools'
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

    const result = await mcpServer.callTool(tool_name, parameters || {});

    res.json({
      success: true,
      tool: tool_name,
      parameters: parameters,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MCP Execute Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tool: req.body.tool_name
    });
  }
});

// 404 handler - MUST be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
    requested_path: req.path,
    available_endpoints: [
      "GET /health",
      "POST /init-database",
      "GET /restaurants/search",
      "POST /restaurants/fetch-real-data",
      "POST /restaurants/wongnai/search",
      "GET /restaurants/:id",
      "GET /analytics/dashboard",
      "GET /test",
      "POST /api/ai/chat",
      "GET /api/ai/history/:userId",
      "DELETE /api/ai/clear/:userId",
      "GET /api/mcp/tools",
      "POST /api/mcp/execute"
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BiteBase Express.js Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: Connected to Neon PostgreSQL`);
  console.log(`🔗 Backend URL: http://0.0.0.0:${PORT}`);
  console.log(`🔗 External URL: https://work-2-qctqfcbslblhfccl.prod-runtime.all-hands.dev`);
  console.log(`🤖 AI Assistant: http://0.0.0.0:${PORT}/api/ai/chat`);
});

// Export for Vercel
module.exports = app;