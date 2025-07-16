/**
 * Cloudflare Worker - BiteBase Backend
 * Simplified version without Node.js dependencies
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/' || path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'BiteBase Backend',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'production'
        }), {
          headers: corsHeaders,
          status: 200
        });
      }

      // Location endpoints
      if (path.startsWith('/api/location')) {
        return handleLocationEndpoints(request, env, corsHeaders);
      }

      // Analytics endpoints
      if (path.startsWith('/api/analytics')) {
        return handleAnalyticsEndpoints(request, env, corsHeaders);
      }

      // Auth endpoints
      if (path.startsWith('/api/auth')) {
        return handleAuthEndpoints(request, env, corsHeaders);
      }

      // MCP endpoints
      if (path.startsWith('/api/mcp')) {
        return handleMCPEndpoints(request, env, corsHeaders);
      }

      // 404 for unmatched routes
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Route ${path} not found`
      }), {
        headers: corsHeaders,
        status: 404
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        headers: corsHeaders,
        status: 500
      });
    }
  }
};

// Location endpoints handler
async function handleLocationEndpoints(request, env, headers) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/location/nearby') {
    // Mock nearby restaurants data
    const lat = url.searchParams.get('lat') || '13.7563';
    const lng = url.searchParams.get('lng') || '100.5018';
    const radius = url.searchParams.get('radius') || '3';

    return new Response(JSON.stringify({
      success: true,
      data: {
        restaurants: generateMockRestaurants(lat, lng, radius),
        total: 20,
        radius: radius,
        center: { lat: parseFloat(lat), lng: parseFloat(lng) }
      }
    }), { headers, status: 200 });
  }

  if (path === '/api/location/track') {
    // Handle location tracking
    return new Response(JSON.stringify({
      success: true,
      data: {
        sessionId: generateSessionId(),
        status: 'tracking',
        timestamp: new Date().toISOString()
      }
    }), { headers, status: 200 });
  }

  return new Response(JSON.stringify({
    error: 'Not Found',
    message: 'Location endpoint not found'
  }), { headers, status: 404 });
}

// Analytics endpoints handler
async function handleAnalyticsEndpoints(request, env, headers) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/analytics/dashboard') {
    return new Response(JSON.stringify({
      success: true,
      data: {
        metrics: {
          totalRestaurants: 20,
          averageRating: 4.2,
          dataConnections: 3,
          apiCallsToday: 12400,
          coverageArea: 'Bangkok',
          dataAccuracy: 98.5
        },
        trends: {
          restaurantGrowth: 5.2,
          ratingChange: 0.1,
          newConnections: 1,
          apiCallGrowth: 18.5
        }
      }
    }), { headers, status: 200 });
  }

  if (path === '/api/analytics/competitors') {
    return new Response(JSON.stringify({
      success: true,
      data: {
        competitors: [
          { name: "Nonna's Kitchen", distance: '200m', rating: 4.3, priceRange: '฿฿', marketShare: 12, trend: 'up' },
          { name: 'Ciao Bella', distance: '350m', rating: 4.5, priceRange: '฿฿฿', marketShare: 18, trend: 'stable' },
          { name: 'Mediterranean Delights', distance: '500m', rating: 4.1, priceRange: '฿฿', marketShare: 9, trend: 'down' },
          { name: 'Pasta Paradise', distance: '400m', rating: 4.4, priceRange: '฿฿', marketShare: 14, trend: 'up' }
        ]
      }
    }), { headers, status: 200 });
  }

  return new Response(JSON.stringify({
    error: 'Not Found',
    message: 'Analytics endpoint not found'
  }), { headers, status: 404 });
}

// MCP endpoints handler
async function handleMCPEndpoints(request, env, headers) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/mcp/tools') {
    return new Response(JSON.stringify({
      success: true,
      data: {
        marketing: [
          'analyze-customer-segments',
          'competitor-gap-analysis',
          'track-campaign-performance',
          'generate-marketing-plan'
        ],
        seo: [
          'keywordAnalysis',
          'optimizeMetaTags',
          'generateSEOBlog',
          'trackRankings'
        ],
        geospatial: [
          'analyzeLocation',
          'findNearbyRestaurants',
          'calculateMarketPotential',
          'analyzeFootTraffic'
        ]
      }
    }), { headers, status: 200 });
  }

  if (path === '/api/mcp/execute' && request.method === 'POST') {
    const body = await request.json();
    const { tool, params } = body;

    // Mock tool execution
    return new Response(JSON.stringify({
      success: true,
      data: {
        tool: tool,
        result: `Executed ${tool} with params: ${JSON.stringify(params)}`,
        timestamp: new Date().toISOString()
      }
    }), { headers, status: 200 });
  }

  return new Response(JSON.stringify({
    error: 'Not Found',
    message: 'MCP endpoint not found'
  }), { headers, status: 404 });
}

// Auth endpoints handler
async function handleAuthEndpoints(request, env, headers) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/auth/login' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { email, password } = body;

      // Mock authentication - in production, this would validate against a database
      if (email && password) {
        // Generate mock JWT token
        const token = generateMockJWT(email);
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            user: {
              id: `user_${Date.now()}`,
              email: email,
              name: email.split('@')[0],
              role: 'user',
              subscription_tier: 'basic',
              email_verified: true,
              created_at: new Date().toISOString()
            },
            token: token,
            expires_in: 3600
          }
        }), { headers, status: 200 });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid email or password'
        }), { headers, status: 401 });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request body'
      }), { headers, status: 400 });
    }
  }

  if (path === '/api/auth/register' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { email, password, name, userType } = body;

      // Mock registration - in production, this would save to a database
      if (email && password && name) {
        const token = generateMockJWT(email);
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            user: {
              id: `user_${Date.now()}`,
              email: email,
              name: name,
              role: 'user',
              userType: userType || 'NEW_ENTREPRENEUR',
              subscription_tier: 'basic',
              email_verified: false,
              created_at: new Date().toISOString()
            },
            token: token,
            expires_in: 3600
          }
        }), { headers, status: 201 });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields'
        }), { headers, status: 400 });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request body'
      }), { headers, status: 400 });
    }
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No authorization token provided'
      }), { headers, status: 401 });
    }

    const token = authHeader.substring(7);
    // Mock token validation - in production, this would verify the JWT
    if (token && token.length > 10) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'user_mock',
            email: 'user@example.com',
            name: 'Mock User',
            role: 'user',
            subscription_tier: 'basic',
            email_verified: true,
            created_at: new Date().toISOString()
          }
        }
      }), { headers, status: 200 });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token'
      }), { headers, status: 401 });
    }
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    // Mock logout - in production, this would invalidate the token
    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), { headers, status: 200 });
  }

  // Handle other auth endpoints with mock responses
  if (path === '/api/auth/refresh' && request.method === 'POST') {
    return new Response(JSON.stringify({
      success: true,
      data: {
        token: generateMockJWT('refresh@example.com'),
        expires_in: 3600
      }
    }), { headers, status: 200 });
  }

  if (path === '/api/auth/password-reset' && request.method === 'POST') {
    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset email sent'
    }), { headers, status: 200 });
  }

  if (path === '/api/auth/verify-email' && request.method === 'POST') {
    return new Response(JSON.stringify({
      success: true,
      message: 'Email verified successfully'
    }), { headers, status: 200 });
  }

  if (path === '/api/auth/google' && request.method === 'POST') {
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          id: 'user_google',
          email: 'google@example.com',
          name: 'Google User',
          role: 'user',
          subscription_tier: 'basic',
          email_verified: true,
          created_at: new Date().toISOString()
        },
        token: generateMockJWT('google@example.com'),
        expires_in: 3600
      }
    }), { headers, status: 200 });
  }

  return new Response(JSON.stringify({
    error: 'Not Found',
    message: 'Auth endpoint not found'
  }), { headers, status: 404 });
}

// Helper functions
function generateMockRestaurants(lat, lng, radius) {
  const restaurants = [];
  const count = 20;
  
  for (let i = 0; i < count; i++) {
    restaurants.push({
      id: `rest_${i + 1}`,
      name: `Restaurant ${i + 1}`,
      lat: parseFloat(lat) + (Math.random() - 0.5) * 0.01,
      lng: parseFloat(lng) + (Math.random() - 0.5) * 0.01,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      priceRange: ['฿', '฿฿', '฿฿฿'][Math.floor(Math.random() * 3)],
      cuisine: ['Thai', 'Italian', 'Japanese', 'Chinese', 'International'][Math.floor(Math.random() * 5)],
      distance: `${Math.floor(Math.random() * radius * 1000)}m`
    });
  }
  
  return restaurants;
}

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateMockJWT(email) {
  // Mock JWT token - in production, this would be a proper JWT
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }));
  const signature = btoa('mock_signature_' + Math.random().toString(36));
  
  return `${header}.${payload}.${signature}`;
}