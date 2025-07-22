/**
 * BiteBase Backend - Cloudflare Worker
 * Lightweight version optimized for Cloudflare Workers
 */

// Simple CORS handler
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight
function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  return null;
}

// Add CORS headers to response
function addCORSHeaders(response) {
  Object.keys(corsHeaders).forEach(key => {
    response.headers.set(key, corsHeaders[key]);
  });
  return response;
}

// Mock data for quick responses
const mockRestaurants = [
  {
    id: '1',
    name: "McDonald's",
    cuisine: 'Fast Food',
    rating: 4.2,
    location: { lat: 13.7563, lng: 100.5018 },
    area: 'Siam',
    city: 'Bangkok'
  },
  {
    id: '2',
    name: 'Burger King',
    cuisine: 'Fast Food',
    rating: 4.1,
    location: { lat: 13.7563, lng: 100.5018 },
    area: 'Sukhumvit',
    city: 'Bangkok'
  }
];

const mockAnalytics = {
  revenue: { current: 45000, previous: 42000, change: '+7.1%' },
  customers: { current: 1250, previous: 1180, change: '+5.9%' },
  orders: { current: 890, previous: 820, change: '+8.5%' },
  avgOrderValue: { current: 50.56, previous: 51.22, change: '-1.3%' }
};

const mockInsights = [
  {
    type: 'market_trend',
    title: 'Growing Demand for Plant-Based Options',
    description: 'Plant-based menu items show 23% higher engagement',
    confidence: 0.87,
    impact: 'high'
  },
  {
    type: 'location_insight',
    title: 'Peak Hours Optimization',
    description: 'Consider extending hours during 2-4 PM for increased revenue',
    confidence: 0.92,
    impact: 'medium'
  }
];

// Route handlers
const routes = {
  // Health check
  '/health': () => new Response(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'bitebase-api'
  }), {
    headers: { 'Content-Type': 'application/json' }
  }),

  // AI insights
  '/api/ai/insights': () => new Response(JSON.stringify({
    success: true,
    data: mockInsights,
    metadata: { generatedAt: new Date().toISOString() }
  }), {
    headers: { 'Content-Type': 'application/json' }
  }),

  // Dashboard stats
  '/api/analytics/dashboard-stats': () => new Response(JSON.stringify({
    success: true,
    data: mockAnalytics,
    metadata: { generatedAt: new Date().toISOString() }
  }), {
    headers: { 'Content-Type': 'application/json' }
  }),

  // Market analyses
  '/api/analytics/market-analyses': () => new Response(JSON.stringify({
    success: true,
    data: [
      {
        id: 1,
        title: 'Bangkok Restaurant Market Q4 2024',
        location: 'Bangkok, Thailand',
        date: '2024-12-15',
        score: 85,
        insights: ['High demand for Asian fusion', 'Growing delivery market']
      }
    ],
    metadata: { generatedAt: new Date().toISOString() }
  }), {
    headers: { 'Content-Type': 'application/json' }
  }),

  // Restaurant search
  '/api/restaurants/search': (request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const filtered = mockRestaurants.filter(r => 
      r.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return new Response(JSON.stringify({
      success: true,
      data: filtered,
      metadata: { 
        total: filtered.length,
        query,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Restaurant details
  '/api/restaurants/:id': (request) => {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const restaurant = mockRestaurants.find(r => r.id === id);
    
    if (!restaurant) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Restaurant not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...restaurant,
        details: {
          address: '123 Main St, Bangkok',
          phone: '+66 2 123 4567',
          hours: '10:00 AM - 10:00 PM',
          website: 'https://example.com'
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Main request handler
async function handleRequest(request) {
  // Handle CORS preflight
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const path = url.pathname;

  // Find matching route
  let handler = routes[path];
  
  // Handle parameterized routes
  if (!handler) {
    for (const route in routes) {
      if (route.includes(':')) {
        const routePattern = route.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${routePattern}$`);
        if (regex.test(path)) {
          handler = routes[route];
          break;
        }
      }
    }
  }

  if (handler) {
    try {
      const response = await handler(request);
      return addCORSHeaders(response);
    } catch (error) {
      console.error('Handler error:', error);
      const errorResponse = new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return addCORSHeaders(errorResponse);
    }
  }

  // 404 for unknown routes
  const notFoundResponse = new Response(JSON.stringify({
    success: false,
    error: 'Route not found',
    path: path
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
  
  return addCORSHeaders(notFoundResponse);
}

// Export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};