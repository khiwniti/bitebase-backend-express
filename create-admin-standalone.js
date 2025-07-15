#!/usr/bin/env node

/**
 * Standalone Admin User Creator
 * Creates admin user data without database connection
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');

// Admin user configuration
const ADMIN_USER = {
  id: 'admin-001-bitebase-platform',
  email: 'admin@bitebase.app',
  password: 'Libralytics1234!*',
  name: 'BiteBase Administrator',
  userType: 'ORGANIZATION',
  subscriptionTier: 'ENTERPRISE',
  isAdmin: true,
  isActive: true,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function createAdminUser() {
  try {
    console.log('🔐 Creating BiteBase Admin User...');
    
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, saltRounds);
    
    // Create admin user object
    const adminUser = {
      ...ADMIN_USER,
      password_hash: hashedPassword
    };
    
    // Remove plain password from object
    delete adminUser.password;
    
    console.log('✅ Admin user configuration:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   User Type: ${adminUser.userType}`);
    console.log(`   Subscription: ${adminUser.subscriptionTier}`);
    console.log(`   Admin Status: ${adminUser.isAdmin}`);
    console.log(`   Password Hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Generate SQL for database insertion
    const insertSQL = `
INSERT INTO users (
  id, 
  email, 
  password_hash, 
  name, 
  user_type, 
  subscription_tier, 
  is_admin, 
  is_active, 
  email_verified, 
  created_at, 
  updated_at
) VALUES (
  '${adminUser.id}',
  '${adminUser.email}',
  '${adminUser.password_hash}',
  '${adminUser.name}',
  '${adminUser.userType}',
  '${adminUser.subscriptionTier}',
  ${adminUser.isAdmin},
  ${adminUser.isActive},
  ${adminUser.emailVerified},
  '${adminUser.createdAt}',
  '${adminUser.updatedAt}'
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  user_type = EXCLUDED.user_type,
  subscription_tier = EXCLUDED.subscription_tier,
  is_admin = EXCLUDED.is_admin,
  is_active = EXCLUDED.is_active,
  email_verified = EXCLUDED.email_verified,
  updated_at = EXCLUDED.updated_at;
`;
    
    console.log('\n📝 SQL for database insertion:');
    console.log(insertSQL);
    
    // Save admin user data to JSON file for reference
    const adminUserData = {
      ...adminUser,
      sql: insertSQL,
      note: 'Admin user for BiteBase Intelligence Platform',
      created: new Date().toISOString()
    };
    
    fs.writeFileSync(
      './admin-user-data.json', 
      JSON.stringify(adminUserData, null, 2)
    );
    
    console.log('\n💾 Admin user data saved to: admin-user-data.json');
    
    // Create environment variable for admin credentials
    const envContent = `
# Admin User Credentials (for development/testing)
ADMIN_EMAIL=admin@bitebase.app
ADMIN_PASSWORD_HASH=${hashedPassword}
ADMIN_USER_ID=${adminUser.id}
`;
    
    fs.writeFileSync('./admin-credentials.env', envContent);
    console.log('🔑 Admin credentials saved to: admin-credentials.env');
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the SQL command in your PostgreSQL database');
    console.log('2. Or use the mock data service for development');
    console.log('3. Login with: admin@bitebase.app / Libralytics1234!*');
    
    return adminUser;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n✅ Admin user creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Admin user creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser, ADMIN_USER };