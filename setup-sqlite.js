#!/usr/bin/env node

/**
 * BiteBase SQLite Database Setup
 * Creates local SQLite database for development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function setupSQLiteDatabase() {
  console.log('🚀 Setting up BiteBase SQLite database...');
  
  const dbPath = path.join(__dirname, 'data', 'bitebase.db');
  const schemaPath = path.join(__dirname, 'database', 'sqlite-schema.sql');
  
  try {
    // Check if sqlite3 is available
    try {
      execSync('which sqlite3', { stdio: 'ignore' });
    } catch (error) {
      console.log('📦 Installing sqlite3...');
      execSync('apt-get update && apt-get install -y sqlite3', { stdio: 'inherit' });
    }
    
    // Remove existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️  Removed existing database');
    }
    
    // Create database directory
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Read schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Create database and run schema
    console.log('📊 Creating database and running schema...');
    execSync(`sqlite3 "${dbPath}" < "${schemaPath}"`, { stdio: 'inherit' });
    
    // Verify database creation
    const result = execSync(`sqlite3 "${dbPath}" "SELECT name FROM sqlite_master WHERE type='table';"`, { encoding: 'utf8' });
    const tables = result.trim().split('\n').filter(t => t);
    
    console.log('✅ Database created successfully!');
    console.log('📋 Tables created:', tables.join(', '));
    
    // Test query
    const restaurantCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM restaurants;"`, { encoding: 'utf8' }).trim();
    console.log(`🏪 Sample restaurants: ${restaurantCount}`);
    
    const userCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM users;"`, { encoding: 'utf8' }).trim();
    console.log(`👥 Sample users: ${userCount}`);
    
    console.log('\n✅ SQLite database setup completed!');
    console.log(`📁 Database location: ${dbPath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Restart the backend server: npm run dev');
    console.log('2. Test the API: curl http://localhost:56222/health');
    console.log('3. Login with demo credentials:');
    console.log('   Email: demo@bitebase.com');
    console.log('   Password: demo123');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupSQLiteDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupSQLiteDatabase };