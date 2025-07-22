/**
 * Improved SQLite Database Adapter for BiteBase
 * Provides a PostgreSQL-like interface for SQLite operations using sqlite3 module
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteAdapter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ SQLite connection error:', err.message);
          reject(err);
        } else {
          this.connected = true;
          console.log('✅ SQLite database connected:', this.dbPath);
          resolve();
        }
      });
    });
  }

  // Execute a query and return results in PostgreSQL-like format
  async query(sql, params = []) {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const upperSql = sql.trim().toUpperCase();

      if (upperSql.startsWith('SELECT')) {
        // SELECT queries
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', err.message);
            reject(err);
          } else {
            resolve({ rows: rows || [] });
          }
        });
      } else if (upperSql.startsWith('INSERT')) {
        // INSERT queries
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('SQLite insert error:', err.message);
            reject(err);
          } else {
            resolve({ 
              rows: [{ id: this.lastID }],
              rowCount: this.changes,
              lastID: this.lastID
            });
          }
        });
      } else if (upperSql.startsWith('UPDATE') || upperSql.startsWith('DELETE')) {
        // UPDATE/DELETE queries
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('SQLite update/delete error:', err.message);
            reject(err);
          } else {
            resolve({ 
              rows: [],
              rowCount: this.changes
            });
          }
        });
      } else {
        // Other queries (CREATE, DROP, etc.)
        this.db.run(sql, params, (err) => {
          if (err) {
            console.error('SQLite query error:', err.message);
            reject(err);
          } else {
            resolve({ rows: [] });
          }
        });
      }
    });
  }

  // Get a single row (equivalent to PostgreSQL's query with LIMIT 1)
  async get(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  // Execute multiple queries in a transaction
  async transaction(queries) {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const results = [];
        let completed = 0;
        let hasError = false;

        for (let i = 0; i < queries.length; i++) {
          const { sql, params = [] } = queries[i];
          
          this.db.run(sql, params, function(err) {
            if (err && !hasError) {
              hasError = true;
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            results[i] = { 
              rows: [],
              rowCount: this.changes,
              lastID: this.lastID
            };
            
            completed++;
            
            if (completed === queries.length && !hasError) {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(results);
                }
              });
            }
          });
        }
      });
    });
  }

  // Close connection
  async end() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing SQLite database:', err.message);
          } else {
            console.log('SQLite connection closed');
          }
          this.connected = false;
          resolve();
        });
      });
    }
  }

  // Check if connected
  isConnected() {
    return this.connected;
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.query("SELECT datetime('now') as current_time, sqlite_version() as sqlite_version");
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'SQLite',
        version: result.rows[0]?.sqlite_version || 'unknown',
        current_time: result.rows[0]?.current_time || new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SQLiteAdapter;