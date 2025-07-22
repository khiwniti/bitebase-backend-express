#!/usr/bin/env node

/**
 * BiteBase D1 Database Setup Script
 * Sets up Cloudflare D1 database with proper schema and sample data
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const DATABASE_NAME = 'bitebase-db';
const WRANGLER_CONFIG = path.join(__dirname, '..', 'wrangler.toml');

async function setupD1Database() {
  console.log('🚀 BiteBase D1 Database Setup');
  console.log(`📊 Database Name: ${DATABASE_NAME}`);
  
  try {
    // Check if wrangler is installed
    console.log('\n🔧 Checking Wrangler CLI...');
    try {
      execSync('wrangler --version', { stdio: 'pipe' });
      console.log('✅ Wrangler CLI is available');
    } catch (error) {
      console.log('❌ Wrangler CLI not found. Please install it:');
      console.log('   npm install -g wrangler');
      console.log('   or: npm install wrangler --save-dev');
      return;
    }

    // Check if user is logged in to Cloudflare
    console.log('\n🔐 Checking Cloudflare authentication...');
    try {
      execSync('wrangler whoami', { stdio: 'pipe' });
      console.log('✅ Authenticated with Cloudflare');
    } catch (error) {
      console.log('❌ Not authenticated with Cloudflare. Please login:');
      console.log('   wrangler login');
      return;
    }

    // Create D1 database
    console.log(`\n📊 Creating D1 database: ${DATABASE_NAME}...`);
    let databaseId;
    try {
      const createOutput = execSync(`wrangler d1 create ${DATABASE_NAME}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Extract database ID from output
      const idMatch = createOutput.match(/database_id = "([^"]+)"/);
      if (idMatch) {
        databaseId = idMatch[1];
        console.log(`✅ Database created with ID: ${databaseId}`);
      } else {
        console.log('⚠️  Database may already exist or creation output format changed');
        console.log('Output:', createOutput);
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Database already exists');
        // Try to get existing database ID
        try {
          const listOutput = execSync('wrangler d1 list', { encoding: 'utf8', stdio: 'pipe' });
          const lines = listOutput.split('\n');
          const dbLine = lines.find(line => line.includes(DATABASE_NAME));
          if (dbLine) {
            const parts = dbLine.split('│').map(p => p.trim());
            databaseId = parts[1]; // Assuming ID is in second column
            console.log(`✅ Found existing database ID: ${databaseId}`);
          }
        } catch (listError) {
          console.log('⚠️  Could not retrieve existing database ID');
        }
      } else {
        throw error;
      }
    }

    // Update wrangler.toml with database configuration
    if (databaseId) {
      console.log('\n📝 Updating wrangler.toml configuration...');
      await updateWranglerConfig(databaseId);
    }

    // Execute schema migration
    console.log('\n🔄 Executing database schema...');
    await executeSchema();

    // Insert sample data
    console.log('\n📊 Inserting sample data...');
    await insertSampleData();

    // Create admin user with proper password hash
    console.log('\n👤 Creating admin user...');
    await createAdminUser();

    console.log('\n✅ D1 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy your worker: wrangler deploy');
    console.log('2. Test the API endpoints');
    console.log('3. Login with admin credentials:');
    console.log('   Email: admin@bitebase.app');
    console.log('   Password: Libralytics1234!*');

  } catch (error) {
    console.error('\n❌ D1 Database setup failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

async function updateWranglerConfig(databaseId) {
  try {
    let config = await fs.readFile(WRANGLER_CONFIG, 'utf8');
    
    // Check if D1 configuration already exists
    if (config.includes('[[d1_databases]]')) {
      // Update existing configuration
      config = config.replace(
        /# \[\[d1_databases\]\][\s\S]*?# database_id = "YOUR_D1_DATABASE_ID"/,
        `[[d1_databases]]
binding = "DB"
database_name = "${DATABASE_NAME}"
database_id = "${databaseId}"`
      );
    } else {
      // Add new D1 configuration
      const d1Config = `
# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "${DATABASE_NAME}"
database_id = "${databaseId}"`;
      
      config = config.replace(
        /# Optional: D1 Database \(uncomment when needed\)[\s\S]*?# database_id = "YOUR_D1_DATABASE_ID"/,
        d1Config.trim()
      );
    }
    
    await fs.writeFile(WRANGLER_CONFIG, config);
    console.log('✅ wrangler.toml updated with D1 configuration');
  } catch (error) {
    console.error('❌ Failed to update wrangler.toml:', error.message);
    throw error;
  }
}

async function executeSchema() {
  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'sqlite-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('INSERT'));
    
    console.log(`📊 Executing ${statements.length} schema statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      try {
        execSync(`wrangler d1 execute ${DATABASE_NAME} --command="${statement.replace(/"/g, '\\"')}"`, {
          stdio: 'pipe'
        });
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} - table already exists`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          console.error('Statement:', statement);
        }
      }
    }
    
    console.log('✅ Schema execution completed');
  } catch (error) {
    console.error('❌ Schema execution failed:', error.message);
    throw error;
  }
}

async function insertSampleData() {
  try {
    // Sample restaurant data
    const sampleRestaurants = [
      {
        place_id: 'bitebase_demo_mcdonalds_001',
        name: "McDonald's",
        lat: 13.7563,
        lng: 100.5018,
        rating: 4.2,
        user_ratings_total: 22450,
        price_level: 2,
        types: '["restaurant", "food", "establishment"]',
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
        types: '["restaurant", "food", "establishment"]',
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

    for (const restaurant of sampleRestaurants) {
      const insertCmd = `INSERT OR IGNORE INTO restaurants (place_id, name, lat, lng, rating, user_ratings_total, price_level, types, vicinity, business_status, phone, website) VALUES ('${restaurant.place_id}', '${restaurant.name}', ${restaurant.lat}, ${restaurant.lng}, ${restaurant.rating}, ${restaurant.user_ratings_total}, ${restaurant.price_level}, '${restaurant.types}', '${restaurant.vicinity}', '${restaurant.business_status}', '${restaurant.phone}', '${restaurant.website}')`;
      
      try {
        execSync(`wrangler d1 execute ${DATABASE_NAME} --command="${insertCmd}"`, {
          stdio: 'pipe'
        });
        console.log(`✅ Inserted restaurant: ${restaurant.name}`);
      } catch (error) {
        console.log(`⚠️  Restaurant ${restaurant.name} may already exist`);
      }
    }

    console.log('✅ Sample restaurant data inserted');
  } catch (error) {
    console.error('❌ Sample data insertion failed:', error.message);
    throw error;
  }
}

async function createAdminUser() {
  try {
    const bcrypt = require('bcrypt');
    const adminEmail = 'admin@bitebase.app';
    const adminPassword = 'Libralytics1234!*';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const insertCmd = `INSERT OR IGNORE INTO users (email, password_hash, full_name, role, subscription_tier, is_active, email_verified) VALUES ('${adminEmail}', '${hashedPassword}', 'BiteBase Administrator', 'admin', 'enterprise', 1, 1)`;
    
    try {
      execSync(`wrangler d1 execute ${DATABASE_NAME} --command="${insertCmd}"`, {
        stdio: 'pipe'
      });
      console.log('✅ Admin user created successfully');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('✅ Admin user already exists');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Admin user creation failed:', error.message);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupD1Database()
    .then(() => {
      console.log('\n🎉 D1 Database setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupD1Database };