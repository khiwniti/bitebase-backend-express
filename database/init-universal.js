/**
 * Universal Database Initialization for BiteBase
 * Supports both PostgreSQL (production) and SQLite (development/D1)
 */

const { Pool } = require('pg');
const SQLiteAdapter = require('./sqlite-adapter-improved');
const path = require('path');

// Determine database type based on environment
function getDatabaseAdapter() {
  const dbType = process.env.DB_TYPE || 'auto';
  
  if (dbType === 'sqlite' || (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production')) {
    // Use SQLite for development or when explicitly specified
    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'bitebase-local.db');
    console.log('🔧 Using SQLite database:', dbPath);
    return new SQLiteAdapter(dbPath);
  } else if (process.env.DATABASE_URL) {
    // Use PostgreSQL for production
    console.log('🔧 Using PostgreSQL database');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    return pool;
  } else {
    throw new Error('No database configuration found. Set DATABASE_URL or use SQLite.');
  }
}

// Initialize database connection
async function initializeDatabase() {
  const db = getDatabaseAdapter();
  
  try {
    console.log('🚀 Initializing BiteBase database...');
    
    // Test connection
    if (db instanceof SQLiteAdapter) {
      await db.connect();
      const health = await db.healthCheck();
      console.log('✅ SQLite connection healthy:', health.version);
    } else {
      // PostgreSQL health check
      const result = await db.query('SELECT NOW() as current_time, version() as postgres_version');
      console.log('✅ PostgreSQL connection healthy:', result.rows[0].postgres_version.split(' ')[1]);
    }
    
    console.log('✅ Database initialization complete!');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Get database instance (singleton pattern)
let dbInstance = null;

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
}

// Health check endpoint
async function healthCheck() {
  try {
    const db = await getDatabase();
    
    if (db instanceof SQLiteAdapter) {
      return await db.healthCheck();
    } else {
      // PostgreSQL health check
      const result = await db.query('SELECT NOW() as current_time, version() as postgres_version');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL',
        version: result.rows[0].postgres_version.split(' ')[1],
        current_time: result.rows[0].current_time
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Close database connection
async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.end();
    dbInstance = null;
    console.log('🔌 Database connection closed');
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  healthCheck,
  closeDatabase,
  getDatabaseAdapter
};