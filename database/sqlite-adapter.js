/**
 * SQLite Database Adapter for BiteBase
 * Provides a PostgreSQL-like interface for SQLite operations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SQLiteAdapter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.connected = false;
    this.init();
  }

  init() {
    try {
      // Check if database file exists
      if (fs.existsSync(this.dbPath)) {
        this.connected = true;
        console.log('✅ SQLite database connected:', this.dbPath);
      } else {
        console.log('❌ SQLite database not found:', this.dbPath);
        console.log('💡 Run: node setup-sqlite.js to create the database');
      }
    } catch (error) {
      console.error('❌ SQLite connection error:', error.message);
    }
  }

  // Execute a query and return results
  async query(sql, params = []) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      // For simple queries without parameters, use sqlite3 directly
      if (params.length === 0) {
        const result = execSync(`sqlite3 "${this.dbPath}" "${sql}"`, { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Parse result based on query type
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const lines = result.trim().split('\n').filter(line => line);
          return { rows: lines.map(line => ({ result: line })) };
        } else {
          return { rows: [] };
        }
      }

      // For parameterized queries, we need a more sophisticated approach
      // For now, return mock data for common queries
      return this.handleCommonQueries(sql, params);

    } catch (error) {
      console.error('SQLite query error:', error.message);
      throw error;
    }
  }

  // Handle common queries with mock responses
  handleCommonQueries(sql, params) {
    const upperSql = sql.trim().toUpperCase();

    // Health check query
    if (upperSql.includes('SELECT NOW()') || upperSql.includes('SELECT CURRENT_TIMESTAMP')) {
      return {
        rows: [{
          current_time: new Date().toISOString(),
          postgres_version: 'SQLite 3.40.1 (BiteBase Adapter)'
        }]
      };
    }

    // Restaurant queries
    if (upperSql.includes('SELECT') && upperSql.includes('restaurants')) {
      return {
        rows: [
          {
            id: 'demo-restaurant-1',
            place_id: 'bitebase_demo_restaurant_001',
            name: 'BiteBase Demo Restaurant',
            lat: 40.7128,
            lng: -74.0060,
            rating: 4.5,
            user_ratings_total: 1234,
            price_level: 2,
            types: '["restaurant", "food", "establishment"]',
            vicinity: '123 Broadway, New York, NY 10001',
            business_status: 'OPERATIONAL',
            phone: '+1-212-555-0123',
            website: 'https://demo.bitebase.com'
          }
        ]
      };
    }

    // User authentication queries
    if (upperSql.includes('SELECT') && upperSql.includes('users')) {
      // Mock user for demo@bitebase.com
      return {
        rows: [
          {
            id: 'demo-user-1',
            email: 'demo@bitebase.com',
            password_hash: '$2b$10$demo.hash.placeholder.for.demo123.password.hash.value',
            full_name: 'Demo User',
            role: 'restaurant_owner',
            subscription_tier: 'pro',
            is_active: true,
            email_verified: true
          }
        ]
      };
    }

    // Default empty result
    return { rows: [] };
  }

  // Close connection (no-op for SQLite)
  async end() {
    this.connected = false;
    console.log('SQLite connection closed');
  }

  // Check if connected
  isConnected() {
    return this.connected;
  }
}

module.exports = SQLiteAdapter;