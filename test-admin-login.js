#!/usr/bin/env node

/**
 * Test Admin Login Script
 * Tests the admin user login functionality
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:56038';

async function testAdminLogin() {
  try {
    console.log('🔐 Testing Admin Login...');
    
    // Admin credentials
    const adminCredentials = {
      email: 'admin@bitebase.app',
      password: 'Libralytics1234!*'
    };
    
    console.log(`📧 Email: ${adminCredentials.email}`);
    console.log(`🔑 Password: ${adminCredentials.password}`);
    
    // Test login
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, adminCredentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Admin login successful!');
      console.log('👤 User data:', JSON.stringify(response.data.data.user, null, 2));
      console.log('🎫 Token:', response.data.data.token.substring(0, 50) + '...');
      
      // Test authenticated endpoint
      const token = response.data.data.token;
      const meResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (meResponse.data.success) {
        console.log('✅ Authenticated endpoint test successful!');
        console.log('👤 Profile data:', JSON.stringify(meResponse.data.data, null, 2));
      } else {
        console.log('❌ Authenticated endpoint test failed');
      }
      
    } else {
      console.log('❌ Admin login failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed with status:', error.response.status);
      console.log('📝 Error message:', error.response.data.message || error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server. Make sure the backend is running on port 56038');
      console.log('💡 Run: npm run dev');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

// Test demo user as well
async function testDemoLogin() {
  try {
    console.log('\n🔐 Testing Demo User Login...');
    
    const demoCredentials = {
      email: 'demo@bitebase.com',
      password: 'demo123'
    };
    
    console.log(`📧 Email: ${demoCredentials.email}`);
    console.log(`🔑 Password: ${demoCredentials.password}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, demoCredentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Demo user login successful!');
      console.log('👤 User data:', JSON.stringify(response.data.data.user, null, 2));
    } else {
      console.log('❌ Demo user login failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Demo login failed with status:', error.response.status);
      console.log('📝 Error message:', error.response.data.message || error.response.data);
    } else {
      console.log('❌ Demo login error:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 BiteBase Admin Login Test\n');
  
  // Test server health first
  try {
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is healthy:', healthResponse.data.status);
  } catch (error) {
    console.log('❌ Server health check failed. Make sure backend is running.');
    return;
  }
  
  await testAdminLogin();
  await testDemoLogin();
  
  console.log('\n🎉 Login tests completed!');
  console.log('\n📋 Admin Access:');
  console.log('   Email: admin@bitebase.app');
  console.log('   Password: Libralytics1234!*');
  console.log('   Role: admin');
  console.log('   Subscription: ENTERPRISE');
}

// Run tests
runTests().catch(console.error);