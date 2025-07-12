/**
 * Authentication System Test Script
 * Run this to test all auth endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/auth';

// Test user data
const testUser = {
  email: 'test@bitebase.com',
  password: 'TestPassword123!',
  first_name: 'Test',
  last_name: 'User',
  phone: '+1234567890',
  company: 'BiteBase Test'
};

let authToken = '';
let refreshToken = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, data = null, headers = {}) {
  try {
    log(`\nTesting ${name}...`, 'blue');
    
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    
    log(`✓ ${name} successful`, 'green');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    log(`✗ ${name} failed`, 'red');
    if (error.response) {
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    return null;
  }
}

async function runTests() {
  log('\n🔐 BiteBase Authentication System Test\n', 'yellow');

  // Test 1: Register new user
  const registerResult = await testEndpoint(
    'Register',
    'POST',
    '/register',
    testUser
  );

  if (registerResult && registerResult.data) {
    authToken = registerResult.data.token;
    refreshToken = registerResult.data.refresh_token;
  }

  // Test 2: Login with credentials
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    '/login',
    {
      email: testUser.email,
      password: testUser.password
    }
  );

  if (loginResult && loginResult.data) {
    authToken = loginResult.data.token;
    refreshToken = loginResult.data.refresh_token;
  }

  // Test 3: Get current user (authenticated)
  await testEndpoint(
    'Get Current User',
    'GET',
    '/me',
    null,
    {
      Authorization: `Bearer ${authToken}`
    }
  );

  // Test 4: Refresh token
  const refreshResult = await testEndpoint(
    'Refresh Token',
    'POST',
    '/refresh',
    {
      refresh_token: refreshToken
    }
  );

  if (refreshResult && refreshResult.data) {
    authToken = refreshResult.data.token;
    refreshToken = refreshResult.data.refresh_token;
  }

  // Test 5: Password reset request
  await testEndpoint(
    'Password Reset Request',
    'POST',
    '/password-reset',
    {
      email: testUser.email
    }
  );

  // Test 6: Logout
  await testEndpoint(
    'Logout',
    'POST',
    '/logout',
    null,
    {
      Authorization: `Bearer ${authToken}`
    }
  );

  // Test 7: Try to access protected route after logout
  await testEndpoint(
    'Access After Logout (should fail)',
    'GET',
    '/me',
    null,
    {
      Authorization: `Bearer ${authToken}`
    }
  );

  log('\n✅ All tests completed!\n', 'yellow');
}

// Run tests
runTests().catch(error => {
  log('\n❌ Test suite failed:', 'red');
  console.error(error);
});