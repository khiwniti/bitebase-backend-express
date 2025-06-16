/**
 * Simple server startup script with error handling
 */

console.log('🚀 Starting BiteBase Backend Server...');

try {
  // Check if all required modules are available
  console.log('📦 Checking dependencies...');
  
  const express = require('express');
  const cors = require('cors');
  const { Pool } = require('pg');
  
  console.log('✅ Core dependencies loaded');
  
  // Start the main server
  require('./index.js');
  
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  console.error('📝 Error details:', error);
  
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('\n🔧 To fix this issue:');
    console.log('1. Run: npm install');
    console.log('2. Make sure you are in the bitebase-backend-express directory');
    console.log('3. Check that package.json exists');
  }
  
  process.exit(1);
}
