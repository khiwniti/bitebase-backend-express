/**
 * Test script for enhanced location tracking and buffer radius features
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:12001';

// Test data - Bangkok coordinates
const testLocation = {
  latitude: 13.7563,
  longitude: 100.5018
};

const testUserId = `test_user_${Date.now()}`;
const testSessionId = `session_${Date.now()}`;

async function testLocationUpdate() {
  console.log('\n🧪 Testing Location Update...');
  
  try {
    const response = await axios.post(`${BASE_URL}/user/location/update`, {
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      accuracy: 10.5,
      altitude: 15.2,
      heading: 45.0,
      speed: 2.5,
      user_id: testUserId,
      session_id: testSessionId
    });

    console.log('✅ Location update successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Location update failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLocationPreferences() {
  console.log('\n🧪 Testing Location Preferences...');
  
  try {
    // Set preferences
    const setResponse = await axios.post(`${BASE_URL}/user/preferences/location`, {
      user_id: testUserId,
      default_search_radius: 3.0,
      max_search_radius: 12.0,
      location_sharing_enabled: true,
      auto_location_update: true,
      distance_unit: 'km'
    });

    console.log('✅ Preferences set successfully:', setResponse.data);

    // Get preferences
    const getResponse = await axios.get(`${BASE_URL}/user/preferences/location/${testUserId}`);
    console.log('✅ Preferences retrieved:', getResponse.data);
    
    return true;
  } catch (error) {
    console.error('❌ Preferences test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testRealtimeSearch() {
  console.log('\n🧪 Testing Real-time Search with Auto-Radius...');
  
  try {
    const response = await axios.post(`${BASE_URL}/restaurants/search/realtime`, {
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      initial_radius: 2,
      max_radius: 10,
      min_results: 3,
      buffer_zones: true,
      user_id: testUserId,
      limit: 10
    });

    console.log('✅ Real-time search successful:');
    console.log(`   📍 Search center: ${response.data.data.search_params.center.latitude}, ${response.data.data.search_params.center.longitude}`);
    console.log(`   📏 Final radius: ${response.data.data.search_params.final_radius_km}km`);
    console.log(`   🔍 Search attempts: ${response.data.data.search_params.search_attempts}`);
    console.log(`   🏪 Restaurants found: ${response.data.data.total}`);
    
    if (response.data.data.buffer_zones) {
      console.log('   🎯 Buffer zones:');
      console.log(`      Inner zone (${response.data.data.buffer_zones.inner_zone.radius_km}km): ${response.data.data.buffer_zones.inner_zone.count} restaurants`);
      console.log(`      Middle zone (${response.data.data.buffer_zones.middle_zone.radius_km}km): ${response.data.data.buffer_zones.middle_zone.count} restaurants`);
      console.log(`      Outer zone (${response.data.data.buffer_zones.outer_zone.radius_km}km): ${response.data.data.buffer_zones.outer_zone.count} restaurants`);
    }

    // Show sample restaurants with distances
    if (response.data.data.restaurants.length > 0) {
      console.log('   🍽️ Sample restaurants:');
      response.data.data.restaurants.slice(0, 3).forEach((restaurant, index) => {
        console.log(`      ${index + 1}. ${restaurant.name} - ${restaurant.distance_km}km away (${restaurant.cuisine_type})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Real-time search failed:', error.response?.data || error.message);
    return false;
  }
}

async function testBufferRadiusSearch() {
  console.log('\n🧪 Testing Buffer Radius Search...');
  
  try {
    const response = await axios.post(`${BASE_URL}/restaurants/nearby`, {
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      radius: 5,
      buffer_radius: 1.0,
      platforms: ['wongnai', 'google'],
      limit: 15,
      real_time: true
    });

    console.log('✅ Buffer radius search successful:');
    console.log(`   📍 Search center: ${response.data.data.search_params.center.latitude}, ${response.data.data.search_params.center.longitude}`);
    console.log(`   📏 Search radius: ${response.data.data.search_params.radius_km}km`);
    console.log(`   🔄 Buffer radius: ${response.data.data.search_params.buffer_radius_km}km`);
    console.log(`   🏪 Restaurants found: ${response.data.data.total}`);
    console.log(`   🔍 Platforms searched: ${response.data.platforms_searched.join(', ')}`);
    
    if (response.data.data.restaurants.length > 0) {
      console.log('   🍽️ Sample restaurants with distances:');
      response.data.data.restaurants.slice(0, 3).forEach((restaurant, index) => {
        console.log(`      ${index + 1}. ${restaurant.name} - ${restaurant.distance_km}km (${restaurant.cuisine_type}, Rating: ${restaurant.rating})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Buffer radius search failed:', error.response?.data || error.message);
    return false;
  }
}

// Additional test: Buffer radius adjustment
async function testBufferRadiusAdjustment() {
  console.log('\n🧪 Testing Buffer Radius Adjustment...');
  
  try {
    // Set buffer radius preference
    const setResponse = await axios.post(`${BASE_URL}/user/preferences/buffer-radius`, {
      user_id: testUserId,
      buffer_radius: 1.5
    });

    console.log('✅ Buffer radius preference set successfully:', setResponse.data);
    
    // Test realtime search with buffer radius adjustment
    const searchResponse = await axios.post(`${BASE_URL}/restaurants/search/realtime`, {
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      initial_radius: 2,
      buffer_radius_adjustment: 1.5,
      min_results: 3,
      buffer_zones: true,
      user_id: testUserId,
      follow_user_location: true,
      limit: 10
    });

    console.log('✅ Real-time search with buffer radius successful:');
    console.log(`   📍 Search center: ${searchResponse.data.data.search_params.center.latitude}, ${searchResponse.data.data.search_params.center.longitude}`);
    console.log(`   📏 Core radius: ${searchResponse.data.data.search_params.final_radius_km}km`);
    console.log(`   🔄 Buffer radius: ${searchResponse.data.data.search_params.buffer_radius_km}km`);
    console.log(`   🎯 Effective radius: ${searchResponse.data.data.search_params.effective_radius_km}km`);
    console.log(`   🏪 Restaurants found: ${searchResponse.data.data.total}`);
    
    if (searchResponse.data.data.core_buffer_distribution) {
      console.log('   🎯 Distribution:');
      console.log(`      Core results: ${searchResponse.data.data.core_buffer_distribution.core_results}`);
      console.log(`      Buffer results: ${searchResponse.data.data.core_buffer_distribution.buffer_results}`);
    }
    
    // Test nearby search with buffer radius
    const nearbyResponse = await axios.post(`${BASE_URL}/restaurants/nearby`, {
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      radius: 2,
      buffer_radius: 1.5,
      user_id: testUserId,
      real_time: true
    });

    console.log('✅ Nearby restaurants with buffer radius successful:');
    console.log(`   📏 Core radius: ${nearbyResponse.data.data.search_params.radius_km}km`);
    console.log(`   🔄 Buffer radius: ${nearbyResponse.data.data.search_params.buffer_radius_km}km`);
    console.log(`   🎯 Effective radius: ${nearbyResponse.data.data.search_params.effective_radius_km}km`);
    console.log(`   🏪 Total restaurants: ${nearbyResponse.data.data.total}`);
    
    if (nearbyResponse.data.data.distribution) {
      console.log(`   🎯 Core results: ${nearbyResponse.data.data.distribution.core_radius_results}`);
      console.log(`   🎯 Buffer results: ${nearbyResponse.data.data.distribution.buffer_zone_results}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Buffer radius adjustment test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLocationHistory() {
  console.log('\n🧪 Testing Location History...');
  
  try {
    // Add a few more location updates
    await axios.post(`${BASE_URL}/user/location/update`, {
      latitude: testLocation.latitude + 0.001,
      longitude: testLocation.longitude + 0.001,
      user_id: testUserId
    });

    await axios.post(`${BASE_URL}/user/location/update`, {
      latitude: testLocation.latitude + 0.002,
      longitude: testLocation.longitude + 0.002,
      user_id: testUserId
    });

    // Get location history
    const response = await axios.get(`${BASE_URL}/user/location/history/${testUserId}?limit=5&hours=1`);
    
    console.log('✅ Location history retrieved:');
    console.log(`   📍 Total locations: ${response.data.data.total}`);
    console.log(`   ⏰ Time range: ${response.data.data.time_range_hours} hours`);
    
    if (response.data.data.locations.length > 0) {
      console.log('   📍 Recent locations:');
      response.data.data.locations.forEach((location, index) => {
        console.log(`      ${index + 1}. ${location.latitude}, ${location.longitude} at ${location.timestamp}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Location history test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCurrentLocation() {
  console.log('\n🧪 Testing Current Location Retrieval...');
  
  try {
    const response = await axios.get(`${BASE_URL}/user/location/current/${testUserId}`);
    
    console.log('✅ Current location retrieved:');
    console.log(`   📍 Location: ${response.data.data.location.latitude}, ${response.data.data.location.longitude}`);
    console.log(`   🎯 Accuracy: ${response.data.data.location.accuracy}m`);
    console.log(`   ⏰ Last updated: ${response.data.data.last_updated}`);
    
    return true;
  } catch (error) {
    console.error('❌ Current location test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced Location Features Test Suite');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Location Update', fn: testLocationUpdate },
    { name: 'Location Preferences', fn: testLocationPreferences },
    { name: 'Real-time Search', fn: testRealtimeSearch },
    { name: 'Buffer Radius Search', fn: testBufferRadiusSearch },
    { name: 'Buffer Radius Adjustment', fn: testBufferRadiusAdjustment },
    { name: 'Location History', fn: testLocationHistory },
    { name: 'Current Location', fn: testCurrentLocation }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('🎉 All enhanced location features are working perfectly!');
  } else {
    console.log('⚠️ Some tests failed. Please check the error messages above.');
  }
}

// Run the tests
runAllTests().catch(console.error);
