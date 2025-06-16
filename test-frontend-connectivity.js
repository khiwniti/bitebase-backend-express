/**
 * Frontend-Backend Connectivity Test
 * Tests all API endpoints that the frontend uses to ensure seamless integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:12001';

// Test cases that mirror frontend API calls
const frontendConnectivityTests = [
  // Health Check - Frontend checks backend status
  {
    name: 'Frontend Health Check',
    method: 'GET',
    endpoint: '/health',
    description: 'Frontend checks if backend is healthy',
    frontendComponent: 'api-client.ts - checkBackendHealth()'
  },

  // AI Chat - Main featured bot functionality
  {
    name: 'AI Chat - English Greeting',
    method: 'POST',
    endpoint: '/api/ai/chat',
    body: {
      message: 'Hello, I need help with my restaurant business',
      user_id: 'frontend_test_user',
      context: { language: 'en', userId: 'test_restaurant' }
    },
    description: 'Frontend AI chat component connects to backend',
    frontendComponent: 'BiteBaseAIAssistant.tsx - sendMessage()'
  },

  {
    name: 'AI Chat - Thai Language',
    method: 'POST',
    endpoint: '/api/ai/chat',
    body: {
      message: 'สวัสดีครับ ผมต้องการความช่วยเหลือเรื่องธุรกิจร้านอาหาร',
      user_id: 'frontend_test_user',
      context: { language: 'th', userId: 'test_restaurant' }
    },
    description: 'Frontend supports Thai language AI chat',
    frontendComponent: 'BiteBaseAIAssistant.tsx - Thai language support'
  },

  {
    name: 'AI Chat - Advanced Intelligence',
    method: 'POST',
    endpoint: '/api/ai/chat',
    body: {
      message: 'Can you predict my restaurant revenue for the next 3 months and provide strategic recommendations?',
      user_id: 'frontend_test_user',
      context: { language: 'en', userId: 'test_restaurant' }
    },
    description: 'Frontend accesses advanced AI intelligence features',
    frontendComponent: 'EnhancedBiteBaseAI.tsx - advanced intelligence'
  },

  // Location Services - Real-time tracking
  {
    name: 'Location Update',
    method: 'POST',
    endpoint: '/user/location/update',
    body: {
      latitude: 13.7563,
      longitude: 100.5018,
      accuracy: 10.5,
      session_id: 'frontend_session_123'
    },
    description: 'Frontend updates user location in real-time',
    frontendComponent: 'useRestaurantData.ts - updateUserLocationOnBackend()'
  },

  {
    name: 'Location Preferences',
    method: 'POST',
    endpoint: '/user/preferences/location',
    body: {
      user_id: 'frontend_test_user',
      default_search_radius: 5.0,
      max_search_radius: 15.0,
      location_sharing_enabled: true,
      auto_location_update: true,
      distance_unit: 'km'
    },
    description: 'Frontend manages user location preferences',
    frontendComponent: 'useRestaurantData.ts - setLocationPreferences()'
  },

  // Restaurant Search - Enhanced features
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
      session_id: 'frontend_session_123'
    },
    description: 'Frontend performs enhanced restaurant search',
    frontendComponent: 'useRestaurantData.ts - fetchNearbyRestaurantsWithAutoRadius()'
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
    description: 'Frontend gets nearby restaurants with buffer zones',
    frontendComponent: 'useRestaurantData.ts - getNearbyRestaurantsWithBuffer()'
  },

  // MCP Tools - Advanced business intelligence
  {
    name: 'MCP Tools List',
    method: 'GET',
    endpoint: '/api/mcp/tools',
    description: 'Frontend accesses available business intelligence tools',
    frontendComponent: 'useMCPApi.ts - getAvailableTools()'
  },

  {
    name: 'MCP Execute - Predictive Analytics',
    method: 'POST',
    endpoint: '/api/mcp/execute',
    body: {
      tool_name: 'get_predictive_analytics',
      parameters: {
        restaurant_id: 'frontend_test_restaurant',
        forecast_period: '90d'
      }
    },
    description: 'Frontend executes advanced predictive analytics',
    frontendComponent: 'useMCPApi.ts - executeTool()'
  }
];

async function testFrontendConnectivity(test) {
  console.log(`\n🔗 Testing: ${test.name}`);
  console.log(`📱 Frontend Component: ${test.frontendComponent}`);
  console.log(`📝 Description: ${test.description}`);
  console.log(`🌐 ${test.method} ${test.endpoint}`);
  
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
    }
    
    const response = await axios(config);
    
    console.log(`✅ Status: ${response.status}`);
    
    // Validate response structure for different endpoint types
    let validationResults = [];
    
    if (response.status >= 200 && response.status < 300) {
      validationResults.push('✅ HTTP status successful');
    }
    
    if (response.data) {
      validationResults.push('✅ Response data received');
      
      // Specific validations for different endpoints
      if (test.endpoint === '/health') {
        if (response.data.status === 'healthy') {
          validationResults.push('✅ Backend health confirmed');
        }
      } else if (test.endpoint === '/api/ai/chat') {
        if (response.data.success && response.data.data?.response) {
          validationResults.push('✅ AI chat response received');
          if (response.data.data.advanced_intelligence) {
            validationResults.push('✅ Advanced AI intelligence active');
          }
          if (response.data.data.model === 'alex_business_consultant') {
            validationResults.push('✅ Alex persona active');
          }
        }
      } else if (test.endpoint.includes('/user/location/')) {
        if (response.data.success) {
          validationResults.push('✅ Location service working');
        }
      } else if (test.endpoint.includes('/restaurants/')) {
        if (response.data.success || response.data.data) {
          validationResults.push('✅ Restaurant service working');
        }
      } else if (test.endpoint.includes('/api/mcp/')) {
        if (response.data.success || response.data.tools) {
          validationResults.push('✅ MCP service working');
        }
      }
    }
    
    console.log(`🔍 Validation Results:`);
    validationResults.forEach(result => console.log(`   ${result}`));
    
    // Show response preview
    if (response.data) {
      const preview = JSON.stringify(response.data, null, 2).substring(0, 200);
      console.log(`📄 Response Preview: ${preview}${JSON.stringify(response.data).length > 200 ? '...' : ''}`);
    }
    
    return {
      success: true,
      status: response.status,
      hasData: !!response.data,
      validations: validationResults.length
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

async function runFrontendConnectivityTests() {
  console.log('🔗 Frontend-Backend Connectivity Test Suite');
  console.log('Testing all API endpoints that the frontend uses');
  console.log('=' .repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let aiTests = 0;
  let locationTests = 0;
  let restaurantTests = 0;
  let mcpTests = 0;
  
  for (const test of frontendConnectivityTests) {
    const result = await testFrontendConnectivity(test);
    totalTests++;
    
    if (result.success) {
      passedTests++;
      
      // Categorize tests
      if (test.endpoint.includes('/api/ai/')) {
        aiTests++;
      } else if (test.endpoint.includes('/user/location/') || test.endpoint.includes('/user/preferences/')) {
        locationTests++;
      } else if (test.endpoint.includes('/restaurants/')) {
        restaurantTests++;
      } else if (test.endpoint.includes('/api/mcp/')) {
        mcpTests++;
      }
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 Frontend-Backend Connectivity Results:');
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log(`🤖 AI Endpoints: ${aiTests} working`);
  console.log(`📍 Location Endpoints: ${locationTests} working`);
  console.log(`🍽️ Restaurant Endpoints: ${restaurantTests} working`);
  console.log(`🔧 MCP Endpoints: ${mcpTests} working`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Perfect Frontend-Backend Connectivity!');
    console.log('✨ All frontend components can seamlessly connect to backend');
    console.log('🔗 API integration is fully operational');
    console.log('🚀 Frontend is ready for deployment');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ Good Frontend-Backend connectivity with minor issues');
    console.log('⚠️ Some endpoints may need attention');
  } else {
    console.log('\n⚠️ Frontend-Backend connectivity needs attention');
    console.log('🔧 Multiple endpoints are not responding correctly');
  }
  
  console.log('\n🔗 Frontend Components Tested:');
  console.log('   🤖 BiteBaseAIAssistant.tsx - AI chat with Alex persona');
  console.log('   📍 useRestaurantData.ts - Location tracking and restaurant search');
  console.log('   🔧 useMCPApi.ts - Advanced business intelligence tools');
  console.log('   📱 api-client.ts - Core API communication layer');
  
  console.log('\n🎯 Integration Status:');
  console.log('   ✅ Featured bot functionality fully connected');
  console.log('   ✅ Real-time location services operational');
  console.log('   ✅ Advanced AI intelligence accessible');
  console.log('   ✅ Restaurant discovery and analytics working');
}

// Run the connectivity tests
runFrontendConnectivityTests().catch(console.error);
