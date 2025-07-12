/**
 * Script to create admin user in production database
 * Run with: node scripts/create-admin-user.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdminUser() {
  try {
    // Admin user details
    const adminEmail = 'admin@bitebase.app';
    const adminPassword = 'Libralytics1234!*';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (checkResult.rows.length > 0) {
      console.log('❌ Admin user already exists!');
      return;
    }

    // Create admin user
    const insertResult = await pool.query(
      `INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        subscription_tier, 
        subscription_status, 
        email_verified,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
      RETURNING id, email, role`,
      [
        adminEmail,
        hashedPassword,
        'Admin',
        'User',
        'admin',
        'enterprise',
        'active',
        true
      ]
    );

    console.log('✅ Admin user created successfully!');
    console.log('   ID:', insertResult.rows[0].id);
    console.log('   Email:', insertResult.rows[0].email);
    console.log('   Role:', insertResult.rows[0].role);
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@bitebase.app');
    console.log('   Password: Libralytics1234!*');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser();