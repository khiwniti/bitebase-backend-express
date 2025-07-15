#!/usr/bin/env node

/**
 * BiteBase Database Setup Script
 * Migrates database to new Supabase instance: 0e0af49f-0162-4da5-b5fc-315a009e78b5
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.development' });

const DATABASE_ID = '0e0af49f-0162-4da5-b5fc-315a009e78b5';

async function setupDatabase() {
  console.log('🚀 BiteBase Database Migration Setup');
  console.log(`📊 Target Database ID: ${DATABASE_ID}`);
  
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR_PASSWORD]')) {
    console.log('\n❌ Database URL not configured properly.');
    console.log('\n📋 To complete the setup:');
    console.log('1. Get your Supabase database password');
    console.log('2. Update .env.development file:');
    console.log(`   DATABASE_URL=postgresql://postgres.${DATABASE_ID}:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres`);
    console.log('3. Run this script again: node setup-database.js');
    console.log('\n💡 You can find your password in Supabase Dashboard > Settings > Database');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('\n🔌 Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database connected successfully!');
    console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL: ${result.rows[0].postgres_version.split(' ')[1]}`);

    // Check for existing tables
    console.log('\n📋 Checking existing database structure...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('📊 Existing tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('📊 No existing tables found - fresh database');
    }

    // Check for PostGIS extension
    console.log('\n🗺️  Checking PostGIS extension...');
    const extensionsResult = await pool.query(`
      SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp')
    `);
    
    const extensions = extensionsResult.rows.map(row => row.extname);
    if (extensions.includes('postgis')) {
      console.log('✅ PostGIS extension is available');
    } else {
      console.log('⚠️  PostGIS extension not found - will be installed during migration');
    }

    if (extensions.includes('uuid-ossp')) {
      console.log('✅ UUID extension is available');
    } else {
      console.log('⚠️  UUID extension not found - will be installed during migration');
    }

    // Run migration
    console.log('\n🔄 Running database migration...');
    await runMigration(pool);

    // Insert sample data if requested
    if (process.argv.includes('--with-sample-data')) {
      console.log('\n📊 Inserting sample data...');
      await insertSampleData(pool);
    }

    // Create admin user
    console.log('\n👤 Setting up admin user...');
    await createAdminUser(pool);

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart the backend server: npm run dev');
    console.log('2. Test the API: curl http://localhost:56222/health');
    console.log('3. Login with admin credentials:');
    console.log('   Email: admin@bitebase.app');
    console.log('   Password: Libralytics1234!*');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Please check:');
      console.log('1. Database URL is correct');
      console.log('2. Database password is correct');
      console.log('3. Network connectivity to Supabase');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

async function runMigration(pool) {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'database/migrations/001_initial_schema.sql');
    const migration = await fs.readFile(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migration);
    console.log('✅ Migration 001_initial_schema.sql executed successfully');

    // Check if we need the full schema as well
    const restaurantsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' AND column_name = 'place_id'
    `);

    if (restaurantsCheck.rows.length === 0) {
      console.log('🔄 Running full schema setup...');
      const schemaPath = path.join(__dirname, 'database/schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // Split and execute statements
      const statements = schema
        .split(';')
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn('⚠️  Statement warning:', error.message);
          }
        }
      }
      console.log('✅ Full schema setup completed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function insertSampleData(pool) {
  try {
    // Check if sample data already exists
    const existingData = await pool.query('SELECT COUNT(*) as count FROM restaurants');
    if (parseInt(existingData.rows[0].count) > 0) {
      console.log('📊 Sample data already exists, skipping insertion');
      return;
    }

    // Use the initialization script
    const { initializeDatabase } = require('./database/init.js');
    process.env.INSERT_SAMPLE_DATA = 'true';
    
    // Create a temporary pool for sample data
    const samplePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Insert sample restaurant and related data
    await insertSampleRestaurantData(samplePool);
    await samplePool.end();
    
    console.log('✅ Sample data inserted successfully');
  } catch (error) {
    console.error('❌ Sample data insertion failed:', error.message);
    throw error;
  }
}

async function insertSampleRestaurantData(pool) {
  // Insert sample restaurant with proper PostGIS geometry
  const restaurantResult = await pool.query(`
    INSERT INTO restaurants (
      place_id, name, lat, lng, location, rating, 
      user_ratings_total, price_level, types, vicinity, 
      business_status, phone, website
    ) VALUES (
      'bitebase_demo_restaurant_001',
      'BiteBase Demo Restaurant',
      40.7128,
      -74.0060,
      ST_MakePoint(-74.0060, 40.7128)::geography,
      4.5,
      1234,
      2,
      '["restaurant", "food", "establishment"]'::jsonb,
      '123 Broadway, New York, NY 10001',
      'OPERATIONAL',
      '+1-212-555-0123',
      'https://demo.bitebase.com'
    ) RETURNING id
  `);

  console.log('✅ Sample restaurant created:', restaurantResult.rows[0].id);
}

async function createAdminUser(pool) {
  try {
    const bcrypt = require('bcrypt');
    const adminEmail = 'admin@bitebase.app';
    const adminPassword = 'Libralytics1234!*';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin user already exists
    const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length > 0) {
      console.log('👤 Admin user already exists');
      return;
    }

    // Create admin user
    const adminResult = await pool.query(`
      INSERT INTO users (
        email, password_hash, full_name, role, 
        subscription_tier, is_active, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [
      adminEmail,
      hashedPassword,
      'BiteBase Administrator',
      'admin',
      'enterprise',
      true,
      true
    ]);

    console.log('✅ Admin user created:', adminResult.rows[0].id);
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

  } catch (error) {
    console.error('❌ Admin user creation failed:', error.message);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🎉 Database setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupDatabase };