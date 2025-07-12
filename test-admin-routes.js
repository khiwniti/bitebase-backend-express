const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let adminToken = '';

async function testAdminRoutes() {
  console.log('🔐 Testing Admin Routes\n');

  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@bitebase.app',
      password: 'Libralytics1234!*'
    });

    if (loginResponse.data.success) {
      adminToken = loginResponse.data.data.token;
      console.log('✅ Admin login successful!\n');
    } else {
      console.log('❌ Admin login failed');
      return;
    }

    // Test 2: Admin Dashboard
    console.log('2. Testing admin dashboard...');
    try {
      const dashboardResponse = await axios.get(`${API_BASE}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Dashboard data:', dashboardResponse.data.data.stats);
    } catch (error) {
      console.log('❌ Dashboard error:', error.response?.data?.message || error.message);
    }

    // Test 3: SEO Overview
    console.log('\n3. Testing SEO overview...');
    try {
      const seoResponse = await axios.get(`${API_BASE}/admin/seo/overview`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ SEO data:', {
        pages: seoResponse.data.data.pages.length,
        trackedKeywords: seoResponse.data.data.keywords.tracked
      });
    } catch (error) {
      console.log('❌ SEO error:', error.response?.data?.message || error.message);
    }

    // Test 4: Blog Posts
    console.log('\n4. Testing blog management...');
    try {
      const blogResponse = await axios.get(`${API_BASE}/admin/blog/posts`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Blog posts:', blogResponse.data.data.length);
    } catch (error) {
      console.log('❌ Blog error:', error.response?.data?.message || error.message);
    }

    // Test 5: Create Blog Post
    console.log('\n5. Testing blog post creation...');
    try {
      const newPost = {
        title: 'Test Blog Post',
        content: 'This is a test blog post content.',
        excerpt: 'Test excerpt',
        categories: ['SEO', 'Marketing'],
        tags: ['test', 'admin'],
        metaTitle: 'Test Blog Post - BiteBase',
        metaDescription: 'This is a test blog post for admin testing'
      };

      const createResponse = await axios.post(`${API_BASE}/admin/blog/posts`, newPost, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Blog post created:', createResponse.data.data.id);
    } catch (error) {
      console.log('❌ Create blog error:', error.response?.data?.message || error.message);
    }

    // Test 6: Marketing Campaigns
    console.log('\n6. Testing marketing campaigns...');
    try {
      const marketingResponse = await axios.get(`${API_BASE}/admin/marketing/campaigns`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Marketing campaigns:', marketingResponse.data.data.length);
    } catch (error) {
      console.log('❌ Marketing error:', error.response?.data?.message || error.message);
    }

    // Test 7: User Management
    console.log('\n7. Testing user management...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Total users:', usersResponse.data.data.length);
    } catch (error) {
      console.log('❌ Users error:', error.response?.data?.message || error.message);
    }

    // Test 8: System Configuration
    console.log('\n8. Testing system configuration...');
    try {
      const configResponse = await axios.get(`${API_BASE}/admin/config`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('✅ Config loaded:', Object.keys(configResponse.data.data));
    } catch (error) {
      console.log('❌ Config error:', error.response?.data?.message || error.message);
    }

    // Test 9: Non-admin access (should fail)
    console.log('\n9. Testing non-admin access...');
    try {
      // Login as regular user
      const userLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: 'demo@bitebase.com',
        password: 'demo123'
      });
      const userToken = userLogin.data.data.token;

      // Try to access admin dashboard
      await axios.get(`${API_BASE}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      console.log('❌ Non-admin should not have access!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Non-admin correctly blocked!');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n✅ All admin route tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.response ? error.response.data : error.message);
  }
}

// Run the tests
testAdminRoutes();