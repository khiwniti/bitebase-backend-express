/**
 * Comprehensive Frontend-Backend Integration Test
 * Tests all API endpoints that the frontend uses
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:12001';

// Test cases covering all frontend API calls
const integrationTests = [
  // Health Check Tests
  {
    name: 'Backend Health Check',
    method: 'GET',
    endpoint: '/health',
    description: 'Basic health check endpoint'
  },
  
  // Restaurant Search Tests
  {
    name: 'Restaurant Search',
    method: 'GET',
    endpoint: '/restaurants/search?latitude=13.7563&longitude=100.5018&radius=5',
    description: 'Basic restaurant search by location'
  },
  
  {
    name: 'Wongnai Restaurant Search',
    method: 'POST',
    endpoint: '/restaurants/wongnai/search',
    body: {
      latitude: 13.7563,
      longitude: 100.5018,
      query: 'thai food',
      limit: 10
    },
    description: 'Wongnai integration search'
  },
  
  // Enhanced Location Features Tests
  {
    name: 'Real-time Restaurant Search',
    method: 'POST',
    endpoint: '/restaurants/search/realtime',
    body: {
      latitude: 13.7563,
      longitude: 100.5018,
      initial_radius: 2,
      max_radius: 10,
      min_results: 5,
      buffer_zones: true,
      session_id: 'test_session_123'
    },
    description: 'Enhanced real-time search with auto-radius'
  },
  
  {
    name: 'Nearby Restaurants with Buffer',
    method: 'POST',
    endpoint: '/restaurants/nearby',
    body: {
      latitude: 13.7563,
      longitude: 100.5018,
      radius: 5,
      buffer_radius: 1.0,
      platforms: ['wongnai', 'google'],
      real_time: true
    },
    description: 'Nearby restaurants with buffer radius'
  },
  
  // Location Tracking Tests
  {
    name: 'Update User Location',
    method: 'POST',
    endpoint: '/user/location/update',
    body: {
      latitude: 13.7563,
      longitude: 100.5018,
      accuracy: 10.5,
      session_id: 'test_session_123'
    },
    description: 'User location tracking'
  },
  
  {
    name: 'Get Current User Location',
    method: 'GET',
    endpoint: '/user/location/current/test_user_123',
    description: 'Retrieve current user location'
  },
  
  {
    name: 'Set Location Preferences',
    method: 'POST',
    endpoint: '/user/preferences/location',
    body: {
      user_id: 'test_user_123',
      default_search_radius: 5.0,
      max_search_radius: 15.0,
      location_sharing_enabled: true,
      auto_location_update: true,
      distance_unit: 'km'
    },
    description: 'User location preferences'
  },
  
  {
    name: 'Get Location Preferences',
    method: 'GET',
    endpoint: '/user/preferences/location/test_user_123',
    description: 'Retrieve location preferences'
  },
  
  // AI Chat Tests
  {
    name: 'AI Chat - Thai Greeting',
    method: 'POST',
    endpoint: '/api/ai/chat',
    body: {
      message: 'สวัสดีครับ',
      user_id: 'test_user_123',
      context: {
        language: 'th',
        userId: 'test_user_123'
      }
    },
    description: 'AI chat with Thai language'
  },
  
  {
    name: 'AI Chat - English Business Query',
    method: 'POST',
    endpoint: '/api/ai/chat',
    body: {
      message: 'Can you analyze my restaurant revenue?',
      user_id: 'test_user_123',
      context: {
        language: 'en',
        userId: 'test_user_123'
      }
    },
    description: 'AI chat with English business intelligence'
  },
  
  {
    name: 'AI Chat - Advanced Intelligence',
    method: 'POST',
    endpoint: '/api/ai/chat',
    body: {
      message: 'Predict my restaurant revenue for the next 3 months',
      user_id: 'test_user_123',
      context: {
        language: 'en',
        userId: 'test_user_123'
      }
    },
    description: 'AI chat with predictive analytics'
  },
  
  // MCP Tools Tests
  {
    name: 'MCP Tools List',
    method: 'GET',
    endpoint: '/api/mcp/tools',
    description: 'List available MCP tools'
  },
  
  {
    name: 'MCP Tool Execution - Predictive Analytics',
    method: 'POST',
    endpoint: '/api/mcp/execute',
    body: {
      tool_name: 'get_predictive_analytics',
      parameters: {
        restaurant_id: 'test_restaurant_123',
        forecast_period: '90d'
      }
    },
    description: 'Execute predictive analytics MCP tool'
  },
  
  // Restaurant Details Tests
  {
    name: 'Restaurant Details',
    method: 'GET',
    endpoint: '/restaurants/1',
    description: 'Get restaurant details by ID'
  },
  
  {
    name: 'Restaurant Menu',
    method: 'GET',
    endpoint: '/restaurants/1/menu-items',
    description: 'Get restaurant menu items'
  },
  
  {
    name: 'Restaurant Analytics',
    method: 'GET',
    endpoint: '/restaurants/1/analytics',
    description: 'Get restaurant analytics data'
  }
];

async function runIntegrationTest(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`📝 Description: ${test.description}`);
  console.log(`🔗 ${test.method} ${test.endpoint}`);
  
  try {
    const config = {
      method: test.method,
      url: `${BASE_URL}${test.endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (test.body) {
      config.data = test.body;
      console.log(`📦 Request Body: ${JSON.stringify(test.body, null, 2)}`);
    }
    
    const response = await axios(config);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response Size: ${JSON.stringify(response.data).length} characters`);
    
    // Show response preview
    if (response.data) {
      const preview = JSON.stringify(response.data, null, 2).substring(0, 200);
      console.log(`📄 Response Preview: ${preview}${JSON.stringify(response.data).length > 200 ? '...' : ''}`);
    }
    
    // Validate response structure
    let validationResults = [];
    
    if (response.status >= 200 && response.status < 300) {
      validationResults.push('✅ HTTP status successful');
    } else {
      validationResults.push(`❌ HTTP status error: ${response.status}`);
    }
    
    if (response.data) {
      validationResults.push('✅ Response data received');
      
      // Check for common response patterns
      if (response.data.success !== undefined) {
        if (response.data.success) {
          validationResults.push('✅ API success flag true');
        } else {
          validationResults.push('❌ API success flag false');
        }
      }
      
      if (response.data.error) {
        validationResults.push(`⚠️ API error: ${response.data.error}`);
      }
    } else {
      validationResults.push('⚠️ No response data');
    }
    
    console.log(`🔍 Validation Results:`);
    validationResults.forEach(result => console.log(`   ${result}`));
    
    return {
      success: true,
      status: response.status,
      hasData: !!response.data,
      responseSize: JSON.stringify(response.data).length
    };
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.response?.status || 'Network Error'}`);
    console.log(`📝 Error: ${error.response?.data?.error || error.message}`);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status || 0
    };
  }
}

async function runAllIntegrationTests() {
  console.log('🔗 Starting Frontend-Backend Integration Test Suite');
  console.log('=' .repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let healthyEndpoints = 0;
  let aiEndpoints = 0;
  let locationEndpoints = 0;
  let restaurantEndpoints = 0;
  
  for (const test of integrationTests) {
    const result = await runIntegrationTest(test);
    totalTests++;
    
    if (result.success) {
      passedTests++;
      
      // Categorize endpoints
      if (test.endpoint.includes('/health')) {
        healthyEndpoints++;
      } else if (test.endpoint.includes('/api/ai/') || test.endpoint.includes('/api/mcp/')) {
        aiEndpoints++;
      } else if (test.endpoint.includes('/user/location/') || test.endpoint.includes('/user/preferences/')) {
        locationEndpoints++;
      } else if (test.endpoint.includes('/restaurants/')) {
        restaurantEndpoints++;
      }
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 Frontend-Backend Integration Test Results:');
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log(`🏥 Health Endpoints: ${healthyEndpoints} working`);
  console.log(`🤖 AI Endpoints: ${aiEndpoints} working`);
  console.log(`📍 Location Endpoints: ${locationEndpoints} working`);
  console.log(`🍽️ Restaurant Endpoints: ${restaurantEndpoints} working`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All frontend-backend integrations are working perfectly!');
    console.log('✨ Frontend can seamlessly connect to all backend features');
    console.log('🔗 API connectivity is fully operational');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ Frontend-backend integration is working well with minor issues');
    console.log('⚠️ Some endpoints may need attention');
  } else {
    console.log('\n⚠️ Frontend-backend integration needs attention');
    console.log('🔧 Multiple endpoints are not responding correctly');
  }
  
  console.log('\n🔧 Integration Status Summary:');
  console.log('   🏥 Health Check: Backend status monitoring');
  console.log('   🍽️ Restaurant Data: Search, details, menu, analytics');
  console.log('   📍 Location Services: Real-time tracking, preferences, buffer zones');
  console.log('   🤖 AI Intelligence: Chat, business analytics, predictive insights');
  console.log('   🔧 MCP Tools: Advanced business intelligence tools');
}

// Run the integration tests
runAllIntegrationTests().catch(console.error);
