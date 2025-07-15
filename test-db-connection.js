#!/usr/bin/env node

/**
 * Quick Database Connection Test
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

async function testConnection() {
  console.log('🔌 Testing database connection...');
  console.log(`📊 Database ID: 0e0af49f-0162-4da5-b5fc-315a009e78b5`);
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not found in environment');
    return;
  }

  if (process.env.DATABASE_URL.includes('[YOUR_PASSWORD]')) {
    console.log('❌ Please replace [YOUR_PASSWORD] with your actual Supabase password');
    console.log('💡 Update .env.development file with your database password');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connection successful!');
    console.log(`⏰ Server time: ${result.rows[0].time}`);
    console.log(`🐘 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
    
    // Test PostGIS
    try {
      await pool.query('SELECT PostGIS_Version()');
      console.log('✅ PostGIS extension available');
    } catch (error) {
      console.log('⚠️  PostGIS not available - will be installed during setup');
    }

  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Please check:');
      console.log('  1. Database URL is correct');
      console.log('  2. Database password is correct');
      console.log('  3. Network connectivity');
    }
  } finally {
    await pool.end();
  }
}

testConnection().catch(console.error);