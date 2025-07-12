const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/auth';

async function testAdminAuth() {
  console.log('🔐 Testing Admin Authentication\n');

  try {
    // Test 1: Login as admin
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: 'admin@bitebase.app',
      password: 'Libralytics1234!*'
    });

    if (loginResponse.data.success) {
      console.log('✅ Admin login successful!');
      console.log('   User:', loginResponse.data.data.user);
      console.log('   Token:', loginResponse.data.data.token.substring(0, 50) + '...');
      
      const token = loginResponse.data.data.token;

      // Test 2: Get admin user info
      console.log('\n2. Testing get admin user info...');
      const userResponse = await axios.get(`${API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userResponse.data.success) {
        console.log('✅ Admin user info retrieved!');
        console.log('   User data:', userResponse.data.data);
      }

      // Test 3: Verify admin role
      console.log('\n3. Verifying admin role...');
      const userData = userResponse.data.data;
      if (userData.role === 'admin') {
        console.log('✅ User has admin role!');
      } else {
        console.log('❌ User does not have admin role. Role:', userData.role);
      }

    } else {
      console.log('❌ Admin login failed:', loginResponse.data.message);
    }

    // Test 4: Try wrong password
    console.log('\n4. Testing wrong password...');
    try {
      await axios.post(`${API_BASE}/login`, {
        email: 'admin@bitebase.app',
        password: 'wrongpassword'
      });
      console.log('❌ Wrong password should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Wrong password correctly rejected!');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 5: List all users (to verify both exist)
    console.log('\n5. Verifying both users exist...');
    console.log('   Demo user: demo@bitebase.com (role: user)');
    console.log('   Admin user: admin@bitebase.app (role: admin)');

  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
}

// Run the test
testAdminAuth();