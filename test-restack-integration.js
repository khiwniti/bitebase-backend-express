#!/usr/bin/env node

/**
 * BiteBase Restack Integration Test
 * Comprehensive test suite for validating Restack AI agents integration
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  backend_url: process.env.BACKEND_API_URL || 'http://localhost:56222',
  restack_url: process.env.RESTACK_API_URL || 'http://localhost:5233',
  agents_url: process.env.AGENTS_API_URL || 'http://localhost:5234',
  timeout: 30000,
  verbose: process.env.VERBOSE === 'true'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function generateTestId() {
  return crypto.randomBytes(8).toString('hex');
}

async function makeRequest(url, method = 'GET', data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testServiceHealth() {
  log('\\n🏥 Testing Service Health...', colors.blue);
  
  const tests = [
    { name: 'Backend API Health', url: `${CONFIG.backend_url}/health` },
    { name: 'Restack Server Health', url: `${CONFIG.restack_url}/health` },
    { name: 'AI Agents Health', url: `${CONFIG.agents_url}/health` },
    { name: 'AI Services Health', url: `${CONFIG.backend_url}/api/ai/health` }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.url);
    
    if (result.success) {
      log(`✅ ${test.name}: Healthy`, colors.green);
      testResults.passed++;
    } else {
      log(`❌ ${test.name}: Unhealthy (${result.status})`, colors.red);
      testResults.failed++;
      
      if (CONFIG.verbose) {
        console.log('Error details:', result.error);
      }
    }
    
    testResults.details.push({
      test: test.name,
      status: result.success ? 'passed' : 'failed',
      response: result.success ? result.data : result.error
    });
  }
}

async function testMarketAnalysis() {
  log('\\n📊 Testing Market Analysis...', colors.blue);
  
  const testCases = [
    {
      name: 'Valid NYC Location',
      data: {
        latitude: 40.7128,
        longitude: -74.0060,
        businessType: 'restaurant',
        radius: 1000
      }
    },
    {
      name: 'Valid LA Location',
      data: {
        latitude: 34.0522,
        longitude: -118.2437,
        businessType: 'restaurant',
        radius: 1500
      }
    },
    {
      name: 'Invalid Coordinates',
      data: {
        latitude: 100,
        longitude: 200,
        businessType: 'restaurant'
      },
      expectError: true
    }
  ];

  for (const testCase of testCases) {
    const result = await makeRequest(
      `${CONFIG.backend_url}/api/ai/market-analysis`,
      'POST',
      testCase.data
    );
    
    if (testCase.expectError) {
      if (!result.success) {
        log(`✅ ${testCase.name}: Correctly rejected invalid input`, colors.green);
        testResults.passed++;
      } else {
        log(`❌ ${testCase.name}: Should have rejected invalid input`, colors.red);
        testResults.failed++;
      }
    } else {
      if (result.success && result.data.success) {
        log(`✅ ${testCase.name}: Market analysis completed`, colors.green);
        testResults.passed++;
        
        // Validate response structure
        const data = result.data.data;
        if (data.location && data.competitors && data.insights) {
          log(`  📈 Found ${data.competitors.length} competitors`, colors.blue);
          log(`  🎯 Opportunity score: ${data.insights.opportunity_score}%`, colors.blue);
          log(`  📊 Market saturation: ${data.insights.market_saturation}%`, colors.blue);
        }
      } else {
        log(`❌ ${testCase.name}: Failed to complete analysis`, colors.red);
        testResults.failed++;
        
        if (CONFIG.verbose) {
          console.log('Error details:', result.error);
        }
      }
    }
    
    testResults.details.push({
      test: `Market Analysis - ${testCase.name}`,
      status: (testCase.expectError ? !result.success : result.success) ? 'passed' : 'failed',
      response: result.success ? result.data : result.error
    });
  }
}

async function testRestaurantAnalytics() {
  log('\\n📈 Testing Restaurant Analytics...', colors.blue);
  
  const testCases = [
    {
      name: 'Valid Restaurant ID',
      data: {
        restaurantId: 'test_restaurant_123',
        dateRange: '30d',
        metrics: ['revenue', 'customers', 'avgOrderValue']
      }
    },
    {
      name: 'Different Date Range',
      data: {
        restaurantId: 'test_restaurant_456',
        dateRange: '90d'
      }
    },
    {
      name: 'Missing Restaurant ID',
      data: {
        dateRange: '30d'
      },
      expectError: true
    }
  ];

  for (const testCase of testCases) {
    const result = await makeRequest(
      `${CONFIG.backend_url}/api/ai/restaurant-analytics`,
      'POST',
      testCase.data
    );
    
    if (testCase.expectError) {
      if (!result.success) {
        log(`✅ ${testCase.name}: Correctly rejected invalid input`, colors.green);
        testResults.passed++;
      } else {
        log(`❌ ${testCase.name}: Should have rejected invalid input`, colors.red);
        testResults.failed++;
      }
    } else {
      if (result.success && result.data.success) {
        log(`✅ ${testCase.name}: Analytics completed`, colors.green);
        testResults.passed++;
        
        // Validate response structure
        const data = result.data.data;
        if (data.performance && data.trends && data.recommendations) {
          log(`  📊 Revenue trend: ${data.performance.revenue.trend}`, colors.blue);
          log(`  👥 Customer trend: ${data.performance.customers.trend}`, colors.blue);
          log(`  💡 Recommendations: ${data.recommendations.length}`, colors.blue);
        }
      } else {
        log(`❌ ${testCase.name}: Failed to complete analytics`, colors.red);
        testResults.failed++;
        
        if (CONFIG.verbose) {
          console.log('Error details:', result.error);
        }
      }
    }
    
    testResults.details.push({
      test: `Restaurant Analytics - ${testCase.name}`,
      status: (testCase.expectError ? !result.success : result.success) ? 'passed' : 'failed',
      response: result.success ? result.data : result.error
    });
  }
}

async function testChatIntelligence() {
  log('\\n💬 Testing Chat Intelligence...', colors.blue);
  
  const testCases = [
    {
      name: 'Market Analysis Query',
      data: {
        message: 'Can you analyze the market for my restaurant location?',
        context: {
          restaurantId: 'test_restaurant_123',
          language: 'en'
        }
      }
    },
    {
      name: 'Performance Query',
      data: {
        message: 'How is my restaurant performing this month?',
        context: {
          restaurantId: 'test_restaurant_123',
          conversationId: generateTestId()
        }
      }
    },
    {
      name: 'General Help Query',
      data: {
        message: 'What can you help me with?',
        context: {
          language: 'en'
        }
      }
    },
    {
      name: 'Empty Message',
      data: {
        message: '',
        context: {}
      },
      expectError: true
    }
  ];

  for (const testCase of testCases) {
    const result = await makeRequest(
      `${CONFIG.backend_url}/api/ai/chat`,
      'POST',
      testCase.data
    );
    
    if (testCase.expectError) {
      if (!result.success) {
        log(`✅ ${testCase.name}: Correctly rejected invalid input`, colors.green);
        testResults.passed++;
      } else {
        log(`❌ ${testCase.name}: Should have rejected invalid input`, colors.red);
        testResults.failed++;
      }
    } else {
      if (result.success && result.data.success) {
        log(`✅ ${testCase.name}: Chat response generated`, colors.green);
        testResults.passed++;
        
        // Validate response structure
        const data = result.data.data;
        if (data.response && data.suggestions && data.persona) {
          log(`  🎭 Persona: ${data.persona}`, colors.blue);
          log(`  🎯 Confidence: ${data.confidence}%`, colors.blue);
          log(`  💡 Suggestions: ${data.suggestions.length}`, colors.blue);
          
          if (CONFIG.verbose) {
            log(`  Response: ${data.response.substring(0, 100)}...`, colors.blue);
          }
        }
      } else {
        log(`❌ ${testCase.name}: Failed to generate response`, colors.red);
        testResults.failed++;
        
        if (CONFIG.verbose) {
          console.log('Error details:', result.error);
        }
      }
    }
    
    testResults.details.push({
      test: `Chat Intelligence - ${testCase.name}`,
      status: (testCase.expectError ? !result.success : result.success) ? 'passed' : 'failed',
      response: result.success ? result.data : result.error
    });
  }
}

async function testFallbackMechanisms() {
  log('\\n🔄 Testing Fallback Mechanisms...', colors.blue);
  
  // Test market analysis fallback
  const marketAnalysisResult = await makeRequest(
    `${CONFIG.backend_url}/api/ai/market-analysis`,
    'POST',
    {
      latitude: 40.7128,
      longitude: -74.0060,
      businessType: 'restaurant'
    }
  );
  
  if (marketAnalysisResult.success) {
    const provider = marketAnalysisResult.data.metadata?.provider;
    if (provider === 'restack_agent') {
      log(`✅ Market Analysis: Using Restack (primary)`, colors.green);
    } else if (provider === 'cloudflare_ai_fallback') {
      log(`✅ Market Analysis: Using CloudflareAI (fallback)`, colors.yellow);
    } else {
      log(`✅ Market Analysis: Using unknown provider: ${provider}`, colors.yellow);
    }
    testResults.passed++;
  } else {
    log(`❌ Market Analysis: All systems failed`, colors.red);
    testResults.failed++;
  }
  
  testResults.details.push({
    test: 'Fallback Mechanisms - Market Analysis',
    status: marketAnalysisResult.success ? 'passed' : 'failed',
    response: marketAnalysisResult.success ? marketAnalysisResult.data : marketAnalysisResult.error
  });
}

async function testPerformanceMetrics() {
  log('\\n⚡ Testing Performance Metrics...', colors.blue);
  
  const startTime = Date.now();
  
  // Test concurrent requests
  const concurrentRequests = [
    makeRequest(`${CONFIG.backend_url}/api/ai/market-analysis`, 'POST', {
      latitude: 40.7128,
      longitude: -74.0060,
      businessType: 'restaurant'
    }),
    makeRequest(`${CONFIG.backend_url}/api/ai/restaurant-analytics`, 'POST', {
      restaurantId: 'test_restaurant_123',
      dateRange: '30d'
    }),
    makeRequest(`${CONFIG.backend_url}/api/ai/chat`, 'POST', {
      message: 'What is my restaurant performance?',
      context: { restaurantId: 'test_restaurant_123' }
    })
  ];
  
  const results = await Promise.all(concurrentRequests);
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successCount = results.filter(r => r.success).length;
  log(`✅ Concurrent Requests: ${successCount}/${results.length} successful`, colors.green);
  log(`⏱️  Total Time: ${totalTime}ms`, colors.blue);
  log(`📊 Average Time per Request: ${Math.round(totalTime / results.length)}ms`, colors.blue);
  
  if (successCount >= 2) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({
    test: 'Performance Metrics - Concurrent Requests',
    status: successCount >= 2 ? 'passed' : 'failed',
    response: {
      successful: successCount,
      total: results.length,
      totalTime,
      averageTime: Math.round(totalTime / results.length)
    }
  });
}

async function generateReport() {
  log('\\n📋 Generating Test Report...', colors.blue);
  
  const report = {
    timestamp: new Date().toISOString(),
    configuration: CONFIG,
    summary: {
      total: testResults.passed + testResults.failed + testResults.skipped,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      success_rate: Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)
    },
    details: testResults.details
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`📄 Report saved to: ${reportPath}`, colors.blue);
  
  // Display summary
  log('\\n📊 Test Summary:', colors.blue);
  log(`Total Tests: ${report.summary.total}`, colors.blue);
  log(`Passed: ${report.summary.passed}`, colors.green);
  log(`Failed: ${report.summary.failed}`, colors.red);
  log(`Skipped: ${report.summary.skipped}`, colors.yellow);
  log(`Success Rate: ${report.summary.success_rate}%`, colors.blue);
  
  return report;
}

// Main test execution
async function runTests() {
  log('🚀 Starting BiteBase Restack Integration Tests...', colors.blue);
  log(`Backend URL: ${CONFIG.backend_url}`, colors.blue);
  log(`Restack URL: ${CONFIG.restack_url}`, colors.blue);
  log(`Agents URL: ${CONFIG.agents_url}`, colors.blue);
  
  try {
    await testServiceHealth();
    await testMarketAnalysis();
    await testRestaurantAnalytics();
    await testChatIntelligence();
    await testFallbackMechanisms();
    await testPerformanceMetrics();
    
    const report = await generateReport();
    
    if (report.summary.failed === 0) {
      log('\\n🎉 All tests passed!', colors.green);
      process.exit(0);
    } else {
      log(`\\n⚠️  ${report.summary.failed} tests failed`, colors.red);
      process.exit(1);
    }
  } catch (error) {
    log(`\\n💥 Test execution failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
BiteBase Restack Integration Test Suite

Usage: node test-restack-integration.js [options]

Options:
  --help, -h     Show this help message
  --verbose      Enable verbose output
  
Environment Variables:
  BACKEND_API_URL    Backend API URL (default: http://localhost:56222)
  RESTACK_API_URL    Restack API URL (default: http://localhost:5233)
  AGENTS_API_URL     Agents API URL (default: http://localhost:5234)
  VERBOSE           Enable verbose output (default: false)
  
Examples:
  node test-restack-integration.js
  VERBOSE=true node test-restack-integration.js
  BACKEND_API_URL=https://api.bitebase.app node test-restack-integration.js
  `);
  process.exit(0);
}

// Start tests
runTests().catch(error => {
  log(`💥 Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});