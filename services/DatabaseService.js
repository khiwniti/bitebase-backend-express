/**
 * Unified Database Service for BiteBase
 * Supports in-memory development and Cloudflare D1 production
 */

class DatabaseService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.db = null;
    this.cache = new Map(); // In-memory cache for development
    this.init();
  }

  async init() {
    if (this.isProduction && process.env.D1_DATABASE_ID) {
      // Production: Use Cloudflare D1
      await this.initCloudflareD1();
    } else {
      // Development: Use in-memory database
      await this.initInMemoryDatabase();
    }
  }

  async initCloudflareD1() {
    try {
      // In production, D1 is available via the Cloudflare Workers runtime
      // This would be injected by the Cloudflare Workers environment
      console.log('🌩️ Initializing Cloudflare D1 database...');
      this.db = global.D1_DATABASE || null;
      
      if (this.db) {
        console.log('✅ Cloudflare D1 database connected');
        await this.createTables();
      } else {
        console.log('⚠️ Cloudflare D1 not available, falling back to in-memory');
        await this.initInMemoryDatabase();
      }
    } catch (error) {
      console.error('❌ Cloudflare D1 initialization failed:', error);
      await this.initInMemoryDatabase();
    }
  }

  async initInMemoryDatabase() {
    console.log('🧠 Initializing in-memory database for development...');
    
    // Initialize with sample data
    this.cache.set('restaurants', [
      {
        id: '1',
        brand: "McDonald's",
        city: 'Bangkok',
        area: 'Siam',
        cuisine: 'Fast Food',
        rating: 4.2,
        totalReviews: 22450,
        medianPrice: 150,
        logo: '🍟',
        lat: 13.7563,
        lng: 100.5018,
        phone: '+66-2-123-4567',
        website: 'https://mcdonalds.co.th',
        businessStatus: 'OPERATIONAL',
        priceLevel: 2
      },
      {
        id: '2',
        brand: 'Burger King',
        city: 'Bangkok',
        area: 'Sukhumvit',
        cuisine: 'Fast Food',
        rating: 4.1,
        totalReviews: 9517,
        medianPrice: 120,
        logo: '👑',
        lat: 13.7308,
        lng: 100.5418,
        phone: '+66-2-234-5678',
        website: 'https://burgerking.co.th',
        businessStatus: 'OPERATIONAL',
        priceLevel: 2
      },
      {
        id: '3',
        brand: 'KFC',
        city: 'Bangkok',
        area: 'Chatuchak',
        cuisine: 'Fast Food',
        rating: 4.0,
        totalReviews: 15230,
        medianPrice: 140,
        logo: '🍗',
        lat: 13.8019,
        lng: 100.5692,
        phone: '+66-2-345-6789',
        website: 'https://kfc.co.th',
        businessStatus: 'OPERATIONAL',
        priceLevel: 2
      },
      {
        id: '4',
        brand: 'Pizza Hut',
        city: 'Bangkok',
        area: 'Silom',
        cuisine: 'Pizza',
        rating: 3.9,
        totalReviews: 8765,
        medianPrice: 280,
        logo: '🍕',
        lat: 13.7248,
        lng: 100.5340,
        phone: '+66-2-456-7890',
        website: 'https://pizzahut.co.th',
        businessStatus: 'OPERATIONAL',
        priceLevel: 3
      },
      {
        id: '5',
        brand: 'Starbucks',
        city: 'Bangkok',
        area: 'Phrom Phong',
        cuisine: 'Coffee',
        rating: 4.3,
        totalReviews: 12890,
        medianPrice: 180,
        logo: '☕',
        lat: 13.7307,
        lng: 100.5698,
        phone: '+66-2-567-8901',
        website: 'https://starbucks.co.th',
        businessStatus: 'OPERATIONAL',
        priceLevel: 3
      }
    ]);

    this.cache.set('users', [
      {
        id: 'admin-1',
        email: 'admin@bitebase.com',
        passwordHash: '$2b$10$demo.hash.placeholder.for.admin123.password.hash.value',
        fullName: 'Admin User',
        role: 'admin',
        subscriptionTier: 'enterprise',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-1',
        email: 'demo@bitebase.com',
        passwordHash: '$2b$10$demo.hash.placeholder.for.demo123.password.hash.value',
        fullName: 'Demo Restaurant Owner',
        role: 'restaurant_owner',
        subscriptionTier: 'pro',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
      }
    ]);

    this.cache.set('analytics', [
      {
        id: '1',
        restaurantId: '1',
        date: new Date().toISOString().split('T')[0],
        visits: 1240,
        revenue: 45600,
        orders: 156,
        avgOrderValue: 292.31,
        peakHour: '12:00',
        customerSatisfaction: 4.2
      }
    ]);

    console.log('✅ In-memory database initialized with sample data');
  }

  async createTables() {
    if (!this.db) return;

    const schema = `
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        brand TEXT NOT NULL,
        city TEXT NOT NULL,
        area TEXT NOT NULL,
        cuisine TEXT NOT NULL,
        rating REAL DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        median_price REAL DEFAULT 0,
        logo TEXT,
        lat REAL,
        lng REAL,
        phone TEXT,
        website TEXT,
        business_status TEXT DEFAULT 'OPERATIONAL',
        price_level INTEGER DEFAULT 2,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        subscription_tier TEXT DEFAULT 'free',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT,
        date DATE NOT NULL,
        visits INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        orders INTEGER DEFAULT 0,
        avg_order_value REAL DEFAULT 0,
        peak_hour TEXT,
        customer_satisfaction REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT,
        name TEXT NOT NULL,
        category TEXT,
        price REAL,
        description TEXT,
        image_url TEXT,
        is_available BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );
    `;

    try {
      await this.db.exec(schema);
      console.log('✅ Database tables created successfully');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
    }
  }

  // Generic query method
  async query(sql, params = []) {
    if (this.db && this.isProduction) {
      // Cloudflare D1 query
      try {
        const stmt = this.db.prepare(sql);
        if (params.length > 0) {
          return await stmt.bind(...params).all();
        }
        return await stmt.all();
      } catch (error) {
        console.error('D1 query error:', error);
        throw error;
      }
    } else {
      // In-memory query simulation
      return this.simulateQuery(sql, params);
    }
  }

  simulateQuery(sql, params) {
    const upperSql = sql.trim().toUpperCase();
    
    // Restaurant queries
    if (upperSql.includes('SELECT') && upperSql.includes('restaurants')) {
      const restaurants = this.cache.get('restaurants') || [];
      return { results: restaurants };
    }

    // User queries
    if (upperSql.includes('SELECT') && upperSql.includes('users')) {
      const users = this.cache.get('users') || [];
      return { results: users };
    }

    // Analytics queries
    if (upperSql.includes('SELECT') && upperSql.includes('analytics')) {
      const analytics = this.cache.get('analytics') || [];
      return { results: analytics };
    }

    return { results: [] };
  }

  // Restaurant methods
  async getRestaurants(filters = {}) {
    if (this.isDevelopment) {
      let restaurants = this.cache.get('restaurants') || [];
      
      // Apply filters
      if (filters.cuisine) {
        restaurants = restaurants.filter(r => 
          r.cuisine.toLowerCase().includes(filters.cuisine.toLowerCase())
        );
      }
      
      if (filters.area) {
        restaurants = restaurants.filter(r => 
          r.area.toLowerCase().includes(filters.area.toLowerCase())
        );
      }
      
      if (filters.brand) {
        restaurants = restaurants.filter(r => 
          r.brand.toLowerCase().includes(filters.brand.toLowerCase())
        );
      }

      return restaurants;
    }

    // Production D1 query
    let sql = 'SELECT * FROM restaurants WHERE 1=1';
    const params = [];
    
    if (filters.cuisine) {
      sql += ' AND cuisine LIKE ?';
      params.push(`%${filters.cuisine}%`);
    }
    
    if (filters.area) {
      sql += ' AND area LIKE ?';
      params.push(`%${filters.area}%`);
    }
    
    if (filters.brand) {
      sql += ' AND brand LIKE ?';
      params.push(`%${filters.brand}%`);
    }

    const result = await this.query(sql, params);
    return result.results || [];
  }

  async getRestaurantById(id) {
    if (this.isDevelopment) {
      const restaurants = this.cache.get('restaurants') || [];
      return restaurants.find(r => r.id === id);
    }

    const result = await this.query('SELECT * FROM restaurants WHERE id = ?', [id]);
    return result.results?.[0];
  }

  async getAnalytics(restaurantId, dateRange = {}) {
    if (this.isDevelopment) {
      const analytics = this.cache.get('analytics') || [];
      return analytics.filter(a => !restaurantId || a.restaurantId === restaurantId);
    }

    let sql = 'SELECT * FROM analytics WHERE 1=1';
    const params = [];
    
    if (restaurantId) {
      sql += ' AND restaurant_id = ?';
      params.push(restaurantId);
    }

    const result = await this.query(sql, params);
    return result.results || [];
  }

  // User methods
  async getUserByEmail(email) {
    if (this.isDevelopment) {
      const users = this.cache.get('users') || [];
      return users.find(u => u.email === email);
    }

    const result = await this.query('SELECT * FROM users WHERE email = ?', [email]);
    return result.results?.[0];
  }

  async createUser(userData) {
    if (this.isDevelopment) {
      const users = this.cache.get('users') || [];
      const newUser = {
        id: `user-${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      this.cache.set('users', users);
      return newUser;
    }

    // Production D1 insert
    const sql = `
      INSERT INTO users (id, email, password_hash, full_name, role, subscription_tier)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const id = `user-${Date.now()}`;
    await this.query(sql, [
      id,
      userData.email,
      userData.passwordHash,
      userData.fullName,
      userData.role || 'user',
      userData.subscriptionTier || 'free'
    ]);
    
    return { id, ...userData };
  }

  // Health check
  async healthCheck() {
    try {
      if (this.isDevelopment) {
        return {
          status: 'healthy',
          database: 'in-memory',
          timestamp: new Date().toISOString(),
          restaurantCount: (this.cache.get('restaurants') || []).length,
          userCount: (this.cache.get('users') || []).length
        };
      }

      const result = await this.query('SELECT COUNT(*) as count FROM restaurants');
      return {
        status: 'healthy',
        database: 'cloudflare-d1',
        timestamp: new Date().toISOString(),
        restaurantCount: result.results?.[0]?.count || 0
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new DatabaseService();