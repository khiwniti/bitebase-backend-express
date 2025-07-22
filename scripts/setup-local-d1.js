#!/usr/bin/env node

/**
 * BiteBase Local D1 Database Setup Script
 * Sets up local SQLite database for D1 development
 */

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'data', 'bitebase-local.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'sqlite-schema.sql');

async function setupLocalD1() {
  console.log('🚀 BiteBase Local D1 Database Setup');
  console.log(`📊 Database Path: ${DB_PATH}`);
  
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    console.log('✅ Data directory ready');

    // Create database connection
    const db = new sqlite3.Database(DB_PATH);
    console.log('✅ Database connection established');

    // Read and execute schema
    console.log('\n🔄 Reading database schema...');
    const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
    
    // Clean the schema by removing comments and empty lines first
    const cleanedSchema = schema
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      })
      .join('\n');

    // Split schema into statements, handling multi-line statements properly
    const statements = cleanedSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Filter out empty statements
        if (!stmt || stmt.length === 0) return false;
        if (stmt.match(/^\s*$/)) return false;
        // Skip INSERT statements for now (we'll handle sample data separately)
        if (stmt.toUpperCase().startsWith('INSERT')) return false;
        return true;
      });

    console.log(`📊 Executing ${statements.length} statements...`);

    // Debug: show first few statements
    console.log('First few statements:');
    statements.slice(0, 3).forEach((stmt, i) => {
      console.log(`${i + 1}: ${stmt.substring(0, 100)}...`);
    });

    // Execute schema statements
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          db.run(statement, (err) => {
            if (err) {
              if (err.message.includes('already exists')) {
                console.log(`⚠️  Statement ${i + 1}/${statements.length} - already exists`);
                resolve();
              } else {
                console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, err.message);
                reject(err);
              }
            } else {
              console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
              resolve();
            }
          });
        });
      }
    }

    // Verify tables were created
    console.log('\n📋 Verifying database structure...');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('✅ Tables created:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });

    // Check sample data
    console.log('\n📊 Checking sample data...');
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

    console.log(`✅ Sample data: ${restaurantCount} restaurants, ${userCount} users`);

    // Close database
    db.close();

    console.log('\n✅ Local D1 Database setup completed successfully!');
    console.log('\n📋 Database ready for development:');
    console.log(`   Path: ${DB_PATH}`);
    console.log('   Admin credentials:');
    console.log('   Email: admin@bitebase.app');
    console.log('   Password: Libralytics1234!*');

  } catch (error) {
    console.error('\n❌ Local D1 setup failed:', error.message);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupLocalD1()
    .then(() => {
      console.log('\n🎉 Local D1 setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupLocalD1 };