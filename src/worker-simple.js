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