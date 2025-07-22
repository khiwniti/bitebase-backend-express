#!/usr/bin/env node

/**
 * BiteBase D1 Data Population Script
 * Populates the D1 database with sample data and admin user
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'data', 'bitebase-local.db');

async function populateD1Data() {
  console.log('🚀 BiteBase D1 Data Population');
  console.log(`📊 Database Path: ${DB_PATH}`);
  
  try {
    // Create database connection
    const db = new sqlite3.Database(DB_PATH);
    console.log('✅ Database connection established');

    // Insert sample restaurants
    console.log('\n📊 Inserting sample restaurants...');
    await insertSampleRestaurants(db);

    // Create admin user
    console.log('\n👤 Creating admin user...');
    await createAdminUser(db);

    // Create demo user
    console.log('\n👤 Creating demo user...');
    await createDemoUser(db);

    // Verify data
    console.log('\n📋 Verifying data...');
    await verifyData(db);

    // Close database
    db.close();

    console.log('\n✅ D1 Data population completed successfully!');

  } catch (error) {
    console.error('\n❌ Data population failed:', error.message);
    throw error;
  }
}

async function insertSampleRestaurants(db) {
  const restaurants = [
    {
      place_id: 'bitebase_demo_mcdonalds_001',
      name: "McDonald's",
      lat: 13.7563,
      lng: 100.5018,
      rating: 4.2,
      user_ratings_total: 22450,
      price_level: 2,
      types: '["restaurant", "food", "establishment", "fast_food"]',
      vicinity: 'Siam, Bangkok',
      business_status: 'OPERATIONAL',
      phone: '+66-2-123-4567',
      website: 'https://mcdonalds.co.th'
    },
    {
      place_id: 'bitebase_demo_burgerking_001',
      name: 'Burger King',
      lat: 13.7308,
      lng: 100.5418,
      rating: 4.1,
      user_ratings_total: 9517,
      price_level: 2,
      types: '["restaurant", "food", "establishment", "fast_food"]',
      vicinity: 'Sukhumvit, Bangkok',
      business_status: 'OPERATIONAL',
      phone: '+66-2-234-5678',
      website: 'https://burgerking.co.th'
    },
    {
      place_id: 'bitebase_demo_starbucks_001',
      name: 'Starbucks',
      lat: 13.7307,
      lng: 100.5418,
      rating: 4.3,
      user_ratings_total: 12890,
      price_level: 3,
      types: '["cafe", "food", "establishment"]',
      vicinity: 'Phrom Phong, Bangkok',
      business_status: 'OPERATIONAL',
      phone: '+66-2-345-6789',
      website: 'https://starbucks.co.th'
    }
  ];

  for (const restaurant of restaurants) {
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO restaurants (
          place_id, name, lat, lng, rating, user_ratings_total, 
          price_level, types, vicinity, business_status, phone, website
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        restaurant.place_id,
        restaurant.name,
        restaurant.lat,
        restaurant.lng,
        restaurant.rating,
        restaurant.user_ratings_total,
        restaurant.price_level,
        restaurant.types,
        restaurant.vicinity,
        restaurant.business_status,
        restaurant.phone,
        restaurant.website
      ], (err) => {
        if (err) {
          console.error(`❌ Failed to insert ${restaurant.name}:`, err.message);
          reject(err);
        } else {
          console.log(`✅ Inserted restaurant: ${restaurant.name}`);
          resolve();
        }
      });
      
      stmt.finalize();
    });
  }
}

async function createAdminUser(db) {
  const adminEmail = 'admin@bitebase.app';
  const adminPassword = 'Libralytics1234!*';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users (
        email, password_hash, full_name, role, 
        subscription_tier, is_active, email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      adminEmail,
      hashedPassword,
      'BiteBase Administrator',
      'admin',
      'enterprise',
      1,
      1
    ], (err) => {
      if (err) {
        console.error('❌ Failed to create admin user:', err.message);
        reject(err);
      } else {
        console.log('✅ Admin user created successfully');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

async function createDemoUser(db) {
  const demoEmail = 'demo@bitebase.com';
  const demoPassword = 'demo123';
  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  await new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users (
        email, password_hash, full_name, role, 
        subscription_tier, is_active, email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      demoEmail,
      hashedPassword,
      'Demo User',
      'restaurant_owner',
      'pro',
      1,
      1
    ], (err) => {
      if (err) {
        console.error('❌ Failed to create demo user:', err.message);
        reject(err);
      } else {
        console.log('✅ Demo user created successfully');
        console.log(`📧 Email: ${demoEmail}`);
        console.log(`🔑 Password: ${demoPassword}`);
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

async function verifyData(db) {
  const restaurantCount = await new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM restaurants", (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });

  const userCount = await new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });

  console.log(`✅ Final data count: ${restaurantCount} restaurants, ${userCount} users`);

  // Show restaurant details
  const restaurants = await new Promise((resolve, reject) => {
    db.all("SELECT name, rating, vicinity FROM restaurants", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log('📊 Restaurant data:');
  restaurants.forEach(restaurant => {
    console.log(`   - ${restaurant.name} (${restaurant.rating}⭐) - ${restaurant.vicinity}`);
  });
}

// Run population if called directly
if (require.main === module) {
  populateD1Data()
    .then(() => {
      console.log('\n🎉 D1 data population completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Population failed:', error.message);
      process.exit(1);
    });
}

module.exports = { populateD1Data };