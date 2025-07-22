/**
 * Setup Test Users for Comprehensive Testing
 * Creates test users with different roles and permissions
 */

const bcrypt = require('bcrypt');
const SQLiteAdapter = require('./database/sqlite-adapter');

async function setupTestUsers() {
  console.log('🚀 Setting up comprehensive test users...');
  
  const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || './data/bitebase-local.db';
  const db = new SQLiteAdapter(dbPath);
  
  try {
    // Test users with different roles
    const testUsers = [
      {
        email: 'admin@bitebase.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User',
        permissions: ['all'],
        description: 'Super admin with full access to all features'
      },
      {
        email: 'manager@test.com',
        password: 'test123',
        role: 'restaurant_manager',
        name: 'Restaurant Manager',
        permissions: ['restaurant_management', 'analytics', 'seo'],
        description: 'Restaurant manager with access to restaurant features'
      },
      {
        email: 'analyst@bitebase.com',
        password: 'analyst123',
        role: 'analyst',
        name: 'Data Analyst',
        permissions: ['analytics', 'location_intelligence', 'reports'],
        description: 'Data analyst with access to analytics and intelligence features'
      },
      {
        email: 'seo@bitebase.com',
        password: 'seo123',
        role: 'seo_specialist',
        name: 'SEO Specialist',
        permissions: ['seo', 'content_management'],
        description: 'SEO specialist with access to SEO tools and content management'
      },
      {
        email: 'viewer@test.com',
        password: 'viewer123',
        role: 'viewer',
        name: 'Read-Only User',
        permissions: ['view_only'],
        description: 'Read-only user for testing view permissions'
      }
    ];

    // Create users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        name TEXT,
        permissions TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Create test sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_token TEXT UNIQUE,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    console.log('📝 Creating test users...');
    
    for (const user of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await db.query(
          'SELECT id FROM users WHERE email = ?',
          [user.email]
        );

        if (existingUser.length > 0) {
          console.log(`⚠️  User ${user.email} already exists, updating...`);
          
          // Update existing user
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await db.query(`
            UPDATE users 
            SET password = ?, role = ?, name = ?, permissions = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
          `, [
            hashedPassword,
            user.role,
            user.name,
            JSON.stringify(user.permissions),
            user.description,
            user.email
          ]);
        } else {
          // Create new user
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await db.query(`
            INSERT INTO users (email, password, role, name, permissions, description)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            user.email,
            hashedPassword,
            user.role,
            user.name,
            JSON.stringify(user.permissions),
            user.description
          ]);
        }
        
        console.log(`✅ User created/updated: ${user.email} (${user.role})`);
      } catch (error) {
        console.error(`❌ Error creating user ${user.email}:`, error.message);
      }
    }

    // Create test restaurant data
    console.log('🏪 Setting up test restaurant data...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        area TEXT,
        city TEXT DEFAULT 'Bangkok',
        cuisine TEXT,
        rating REAL DEFAULT 0,
        totalReviews INTEGER DEFAULT 0,
        medianPrice INTEGER DEFAULT 0,
        logo TEXT,
        address TEXT,
        phone TEXT,
        website TEXT,
        openingHours TEXT,
        wongnaiId TEXT,
        coordinates_lat REAL,
        coordinates_lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const testRestaurants = [
      {
        brand: "McDonald's",
        area: 'Siam',
        city: 'Bangkok',
        cuisine: 'Fast Food',
        rating: 4.2,
        totalReviews: 22450,
        medianPrice: 150,
        logo: '🍟',
        address: '999 Rama I Rd, Pathum Wan, Bangkok 10330',
        phone: '+66 2 658 1000',
        website: 'https://mcdonalds.co.th',
        openingHours: '06:00 - 24:00',
        wongnaiId: 'wongnai_mcdonalds_siam',
        coordinates_lat: 13.7563,
        coordinates_lng: 100.5018
      },
      {
        brand: 'Burger King',
        area: 'Sukhumvit',
        city: 'Bangkok',
        cuisine: 'Fast Food',
        rating: 4.1,
        totalReviews: 9517,
        medianPrice: 120,
        logo: '👑',
        address: '123 Sukhumvit Rd, Bangkok 10110',
        phone: '+66 2 123 4567',
        website: 'https://burgerking.co.th',
        openingHours: '10:00 - 22:00',
        wongnaiId: 'wongnai_burgerking_sukhumvit',
        coordinates_lat: 13.7308,
        coordinates_lng: 100.5418
      },
      {
        brand: 'KFC',
        area: 'Chatuchak',
        city: 'Bangkok',
        cuisine: 'Fast Food',
        rating: 3.8,
        totalReviews: 1893,
        medianPrice: 140,
        logo: '🍗',
        address: '456 Phahonyothin Rd, Bangkok 10900',
        phone: '+66 2 987 6543',
        website: 'https://kfc.co.th',
        openingHours: '10:00 - 22:00',
        wongnaiId: 'wongnai_kfc_chatuchak',
        coordinates_lat: 13.8019,
        coordinates_lng: 100.5540
      },
      {
        brand: 'Pizza Hut',
        area: 'Silom',
        city: 'Bangkok',
        cuisine: 'Pizza',
        rating: 4.0,
        totalReviews: 1922,
        medianPrice: 280,
        logo: '🍕',
        address: '789 Silom Rd, Bangkok 10500',
        phone: '+66 2 234 5678',
        website: 'https://pizzahut.co.th',
        openingHours: '11:00 - 23:00',
        wongnaiId: 'wongnai_pizzahut_silom',
        coordinates_lat: 13.7248,
        coordinates_lng: 100.5332
      },
      {
        brand: 'Starbucks',
        area: 'Phrom Phong',
        city: 'Bangkok',
        cuisine: 'Coffee',
        rating: 4.3,
        totalReviews: 12890,
        medianPrice: 180,
        logo: '☕',
        address: '321 Sukhumvit Rd, Bangkok 10110',
        phone: '+66 2 345 6789',
        website: 'https://starbucks.co.th',
        openingHours: '06:00 - 22:00',
        wongnaiId: 'wongnai_starbucks_promphong',
        coordinates_lat: 13.7307,
        coordinates_lng: 100.5697
      }
    ];

    for (const restaurant of testRestaurants) {
      try {
        // Check if restaurant already exists
        const existing = await db.query(
          'SELECT id FROM restaurants WHERE brand = ? AND area = ?',
          [restaurant.brand, restaurant.area]
        );

        if (existing.length === 0) {
          await db.query(`
            INSERT INTO restaurants (
              brand, area, city, cuisine, rating, totalReviews, medianPrice, 
              logo, address, phone, website, openingHours, wongnaiId, 
              coordinates_lat, coordinates_lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            restaurant.brand, restaurant.area, restaurant.city, restaurant.cuisine,
            restaurant.rating, restaurant.totalReviews, restaurant.medianPrice,
            restaurant.logo, restaurant.address, restaurant.phone, restaurant.website,
            restaurant.openingHours, restaurant.wongnaiId, restaurant.coordinates_lat,
            restaurant.coordinates_lng
          ]);
          
          console.log(`✅ Restaurant created: ${restaurant.brand} - ${restaurant.area}`);
        } else {
          console.log(`⚠️  Restaurant already exists: ${restaurant.brand} - ${restaurant.area}`);
        }
      } catch (error) {
        console.error(`❌ Error creating restaurant ${restaurant.brand}:`, error.message);
      }
    }

    // Create test analytics data
    console.log('📊 Setting up test analytics data...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        user_id INTEGER,
        restaurant_id INTEGER,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add some sample analytics events
    const sampleEvents = [
      { event_type: 'restaurant_view', restaurant_id: 1, data: JSON.stringify({ source: 'search' }) },
      { event_type: 'search', data: JSON.stringify({ query: 'McDonald\'s', results: 5 }) },
      { event_type: 'location_analysis', data: JSON.stringify({ area: 'Siam', insights: 'high_traffic' }) }
    ];

    for (const event of sampleEvents) {
      await db.query(`
        INSERT INTO analytics_events (event_type, restaurant_id, data)
        VALUES (?, ?, ?)
      `, [event.event_type, event.restaurant_id || null, event.data]);
    }

    console.log('✅ Test analytics data created');

    // Display test user credentials
    console.log('\n🔑 Test User Credentials:');
    console.log('========================');
    
    for (const user of testUsers) {
      console.log(`👤 ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Permissions: ${user.permissions.join(', ')}`);
      console.log(`   Description: ${user.description}`);
      console.log('');
    }

    console.log('🎯 Test Scenarios:');
    console.log('==================');
    console.log('1. Admin User - Full access to all features');
    console.log('2. Restaurant Manager - Restaurant management and analytics');
    console.log('3. Data Analyst - Location intelligence and reports');
    console.log('4. SEO Specialist - SEO tools and content management');
    console.log('5. Viewer - Read-only access for testing permissions');
    console.log('');

    console.log('🌐 Frontend URLs:');
    console.log('=================');
    console.log('Admin Panel: http://localhost:51115/admin');
    console.log('Restaurant Management: http://localhost:51115/admin/restaurants');
    console.log('Location Intelligence: http://localhost:51115/admin/location-intelligence');
    console.log('SEO Management: http://localhost:51115/admin/seo');
    console.log('');

    console.log('🔧 API Endpoints:');
    console.log('=================');
    console.log('Location Intelligence Search: GET /api/location-intelligence/search');
    console.log('Restaurant Details: GET /api/location-intelligence/restaurant/:id');
    console.log('Market Analysis: GET /api/location-intelligence/market-analysis');
    console.log('Area Insights: GET /api/location-intelligence/insights/:area');
    console.log('');

    console.log('✅ Comprehensive test environment setup complete!');
    console.log('🚀 Ready for full feature testing with intelligence integration');

  } catch (error) {
    console.error('❌ Error setting up test users:', error);
  } finally {
    if (db && db.close) {
      await db.close();
    }
  }
}

// Run the setup
if (require.main === module) {
  setupTestUsers().catch(console.error);
}

module.exports = { setupTestUsers };