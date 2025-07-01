#!/usr/bin/env node

/**
 * Test Script for Location Intelligence API
 * This script tests the main endpoints of our Foursquare integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test configuration
const TEST_LOCATION = {
  lat: 40.7128,
  lng: -74.0060 // NYC coordinates
};

const TEST_RESTAURANT_ID = 'demo-restaurant-id';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testEndpoint(name, testFunction) {
  try {
    log(`\n🔄 Testing: ${name}`, 'blue');
    const startTime = Date.now();
    
    const result = await testFunction();
    
    const duration = Date.now() - startTime;
    log(`✅ ${name} - PASSED (${duration}ms)`, 'green');
    
    return { success: true, duration, result };
  } catch (error) {
    log(`❌ ${name} - FAILED: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function healthCheck() {
  const response = await axios.get(`${BASE_URL}/location/health`);
  
  if (response.data.success) {
    log(`Health Status: ${response.data.data.overall_status}`, 'yellow');
    return response.data;
  } else {
    throw new Error('Health check failed');
  }
}

async function testCompetitorAnalysis() {
  const response = await axios.post(`${BASE_URL}/location/competitor-analysis`, {
    location: TEST_LOCATION,
    radius: 2000
  });
  
  if (response.data.success) {
    const analysis = response.data.data.analysis;
    log(`Found ${analysis.total_competitors} competitors`, 'yellow');
    log(`Competition density: ${analysis.competition_density}/km²`, 'yellow');
    return response.data;
  } else {
    throw new Error('Competitor analysis failed');
  }
}

async function testFootTrafficAnalysis() {
  const response = await axios.post(`${BASE_URL}/location/foot-traffic`, {
    location: TEST_LOCATION,
    radius: 1000
  });
  
  if (response.data.success) {
    const traffic = response.data.data.traffic_analysis;
    log(`Average daily visits: ${traffic.average_daily_visits}`, 'yellow');
    log(`Opportunity score: ${traffic.opportunity_score}`, 'yellow');
    return response.data;
  } else {
    throw new Error('Foot traffic analysis failed');
  }
}

async function testVenueSearch() {
  const response = await axios.post(`${BASE_URL}/location/venue-search`, {
    location: TEST_LOCATION,
    radius: 1000,
    limit: 10
  });
  
  if (response.data.success) {
    const venues = response.data.data.venues;
    log(`Found ${venues.length} venues`, 'yellow');
    return response.data;
  } else {
    throw new Error('Venue search failed');
  }
}

async function testLocalEvents() {
  const response = await axios.post(`${BASE_URL}/location/local-events`, {
    location: TEST_LOCATION,
    radius_km: 5,
    days_ahead: 30
  });
  
  if (response.data.success) {
    const events = response.data.data.events;
    log(`Found ${events.length} local events`, 'yellow');
    return response.data;
  } else {
    throw new Error('Local events search failed');
  }
}

async function testUsageStats() {
  const response = await axios.get(`${BASE_URL}/location/usage-stats`);
  
  if (response.data.success) {
    const stats = response.data.data.foursquare_api;
    log(`Total requests: ${stats.total_requests}`, 'yellow');
    log(`Error rate: ${stats.error_rate.toFixed(2)}%`, 'yellow');
    return response.data;
  } else {
    throw new Error('Usage stats failed');
  }
}

async function testCacheStats() {
  const response = await axios.get(`${BASE_URL}/location/cache/stats`);
  
  if (response.data.success) {
    const cacheStats = response.data.data.cache_stats;
    log(`Cache connected: ${cacheStats.connected}`, 'yellow');
    return response.data;
  } else {
    throw new Error('Cache stats failed');
  }
}

async function testBatchAnalysis() {
  const locations = [
    { lat: 40.7128, lng: -74.0060 }, // NYC
    { lat: 34.0522, lng: -118.2437 }, // LA
    { lat: 41.8781, lng: -87.6298 }  // Chicago
  ];
  
  const response = await axios.post(`${BASE_URL}/location/batch-analysis`, {
    locations,
    analysis_type: 'competitor',
    radius: 2000
  });
  
  if (response.data.success) {
    const results = response.data.data;
    log(`Analyzed ${results.successful_analyses}/${results.total_locations} locations`, 'yellow');
    return response.data;
  } else {
    throw new Error('Batch analysis failed');
  }
}

async function runAllTests() {
  log('🚀 Starting Location Intelligence API Tests', 'blue');
  log('=' * 50, 'blue');
  
  const tests = [
    { name: 'Health Check', fn: healthCheck },
    { name: 'Competitor Analysis', fn: testCompetitorAnalysis },
    { name: 'Foot Traffic Analysis', fn: testFootTrafficAnalysis },
    { name: 'Venue Search', fn: testVenueSearch },
    { name: 'Local Events', fn: testLocalEvents },
    { name: 'Usage Statistics', fn: testUsageStats },
    { name: 'Cache Statistics', fn: testCacheStats },
    { name: 'Batch Analysis', fn: testBatchAnalysis }
  ];
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.fn);
    results.push({ name: test.name, ...result });
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await delay(500);
  }
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  log('=' * 50, 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`, 'yellow');
  
  if (failed > 0) {
    log('\n🔍 Failed Tests:', 'red');
    results.filter(r => !r.success).forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'red');
    });
  }
  
  const avgDuration = results
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / passed;
  
  if (avgDuration > 0) {
    log(`⏱️ Average Response Time: ${avgDuration.toFixed(0)}ms`, 'yellow');
  }
  
  log('\n🏁 Testing completed!', 'blue');
  
  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Location Intelligence API Test Suite

Usage: node test-location-api.js [options]

Options:
  --help, -h     Show this help message
  --base-url     Override base URL (default: http://localhost:3001/api)
  --location     Override test location (format: lat,lng)

Examples:
  node test-location-api.js
  node test-location-api.js --base-url http://localhost:3001/api
  node test-location-api.js --location 34.0522,-118.2437
  `);
  process.exit(0);
}

// Override base URL if provided
const baseUrlIndex = args.indexOf('--base-url');
if (baseUrlIndex !== -1 && args[baseUrlIndex + 1]) {
  BASE_URL = args[baseUrlIndex + 1];
}

// Override test location if provided
const locationIndex = args.indexOf('--location');
if (locationIndex !== -1 && args[locationIndex + 1]) {
  const [lat, lng] = args[locationIndex + 1].split(',').map(Number);
  if (!isNaN(lat) && !isNaN(lng)) {
    TEST_LOCATION.lat = lat;
    TEST_LOCATION.lng = lng;
  }
}

// Run the tests
log(`🎯 Testing Location Intelligence API at: ${BASE_URL}`, 'blue');
log(`📍 Test Location: ${TEST_LOCATION.lat}, ${TEST_LOCATION.lng}`, 'blue');

runAllTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'red');
  process.exit(1);
});