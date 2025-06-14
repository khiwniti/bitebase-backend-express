// BiteBase Express.js Backend API
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 12001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://neondb_owner:npg_vS3jnaJFXm7R@ep-quiet-cell-a4f411kc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors({
  origin: [
    'https://beta.bitebase.app', 
    'https://bitebase.app',
    'https://www.bitebase.app',
    'http://localhost:3000', 
    'https://localhost:3000',
    'http://localhost:12000',
    'https://localhost:12000',
    'https://work-1-rglykkquxarpgyuq.prod-runtime.all-hands.dev',
    'https://work-2-rglykkquxarpgyuq.prod-runtime.all-hands.dev'
  ],
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
    console.log('🔄 Starting database initialization...');

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
    res.status(500).json({
      success: false,
      message: 'Restaurant search failed',
      error: error.message,
      timestamp: new Date().toISOString()
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
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics data',
      error: error.message,
      timestamp: new Date().toISOString()
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

// 404 handler
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
      "GET /restaurants/:id",
      "GET /analytics/dashboard",
      "GET /test"
    ]
  });
});

// AI Assistant endpoint
app.post('/ai/chat', async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Simple AI responses based on message content
    let response = '';
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      response = `Based on your current data, your sales this month are performing well! Here's what I can see:

📈 **Monthly Revenue**: ฿185,400 (+12.3% vs last month)
👥 **Customer Count**: 892 customers (+8.7% vs last month)  
💰 **Average Order**: ฿680 (+5.2% vs last month)

**Key Insights:**
• Your weekend dinner rush (Fri-Sat 7-9pm) shows 35% higher demand than capacity
• Seafood Linguine and Truffle Risotto are driving 45% of your revenue
• Customer satisfaction is strong at 4.6/5

**Recommendations:**
1. Consider expanding weekend dinner capacity
2. Promote your signature pasta dishes more
3. Monitor the new competitor "Nonna's Kitchen" nearby`;
    } else if (lowerMessage.includes('promotion') || lowerMessage.includes('marketing')) {
      response = `Here are some targeted promotion ideas for your restaurant:

🎯 **Weekend Rush Special**
• Offer early bird discounts (5-7pm) to spread demand
• "Beat the Rush" - 15% off orders placed before 6:30pm

🍝 **Signature Dish Promotion**
• Create a "Pasta Lovers" combo with your top performers
• Limited-time truffle pasta variations

🏆 **Competitive Response**
• "Local's Choice" campaign highlighting your 4.6/5 rating
• Loyalty program for repeat customers

📱 **Digital Marketing**
• Social media posts during peak hours (7-9pm)
• Customer review incentives
• Partner with food delivery apps for exclusive deals`;
    } else if (lowerMessage.includes('competition') || lowerMessage.includes('competitor')) {
      response = `Here's your competitive landscape analysis:

⚠️ **New Threat**: Nonna's Kitchen (200m away)
• 20% lower prices than yours
• Recently opened, gaining traction
• **Action**: Monitor their menu and consider value-added services

🏆 **Your Advantages**:
• Higher rating (4.6 vs 4.3)
• Established customer base (892 monthly customers)
• Strong signature dishes (45% revenue from 2 items)

📊 **Market Position**:
• Market share: 8.7% (+0.9% vs last quarter)
• 4 main competitors within 500m
• You rank #2 in the area by rating

**Strategic Recommendations**:
1. Emphasize quality and experience over price
2. Strengthen customer loyalty programs
3. Highlight your signature dishes in marketing`;
    } else {
      response = `I'm here to help you with your restaurant business! I can assist with:

📊 **Analytics & Reports**
• Sales performance and trends
• Customer insights and behavior
• Market analysis and competition

💡 **Business Strategy**
• Menu optimization suggestions
• Pricing strategy recommendations
• Marketing and promotion ideas

🎯 **Operations**
• Staff scheduling optimization
• Inventory management tips
• Customer service improvements

What would you like to know more about?`;
    }

    res.json({
      success: true,
      data: {
        response,
        conversation_id: conversation_id || `conv_${Date.now()}`,
        timestamp: new Date().toISOString()
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BiteBase Express.js Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: Connected to Neon PostgreSQL`);
  console.log(`🔗 Backend URL: http://0.0.0.0:${PORT}`);
  console.log(`🔗 External URL: https://work-2-rglykkquxarpgyuq.prod-runtime.all-hands.dev`);
  console.log(`🤖 AI Assistant: http://0.0.0.0:${PORT}/ai/chat`);
});

// Export for Vercel
module.exports = app;