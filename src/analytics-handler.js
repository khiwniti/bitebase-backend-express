import { Hono } from 'hono';

export function createAnalyticsHandler() {
  const analytics = new Hono();

  // Real-time analytics endpoint
  analytics.get('/realtime', async (c) => {
    const { range = 'today', restaurantId } = c.req.query();
    
    try {
      // Use KV for caching
      const cacheKey = `analytics:realtime:${restaurantId}:${range}`;
      const cached = await c.env.CACHE.get(cacheKey, 'json');
      
      if (cached) {
        return c.json(cached);
      }

      // Generate analytics data (simplified for Cloudflare Workers)
      const data = await generateRealtimeAnalytics(restaurantId, range, c.env);
      
      // Cache for 1 minute
      await c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 });
      
      return c.json(data);
    } catch (error) {
      console.error('Analytics error:', error);
      return c.json({ error: 'Failed to fetch analytics' }, 500);
    }
  });

  // Customer behavior endpoint
  analytics.get('/customer-behavior/:restaurantId', async (c) => {
    const { restaurantId } = c.req.param();
    const { startDate, endDate } = c.req.query();
    
    try {
      const data = await getCustomerBehavior(restaurantId, startDate, endDate, c.env);
      return c.json(data);
    } catch (error) {
      return c.json({ error: 'Failed to fetch customer behavior' }, 500);
    }
  });

  // Sales metrics endpoint
  analytics.get('/sales/:restaurantId', async (c) => {
    const { restaurantId } = c.req.param();
    const { startDate, endDate } = c.req.query();
    
    try {
      const data = await getSalesMetrics(restaurantId, startDate, endDate, c.env);
      return c.json(data);
    } catch (error) {
      return c.json({ error: 'Failed to fetch sales data' }, 500);
    }
  });

  // Market trends endpoint
  analytics.get('/market-trends', async (c) => {
    const { industry = 'restaurant', lat, lng } = c.req.query();
    
    try {
      const data = await getMarketTrends(industry, { lat, lng }, c.env);
      return c.json(data);
    } catch (error) {
      return c.json({ error: 'Failed to fetch market trends' }, 500);
    }
  });

  return analytics;
}

// Helper functions adapted for Cloudflare Workers
async function generateRealtimeAnalytics(restaurantId, range, env) {
  // In production, this would query D1 database or external API
  // For now, return structured sample data
  
  const baseMetrics = {
    revenue: { current: 15420, previous: 14200, change: 8.6 },
    customers: { current: 234, previous: 210, change: 11.4 },
    orders: { current: 312, previous: 285, change: 9.5 },
    avgTicket: { current: 49.42, previous: 49.82, change: -0.8 }
  };

  const salesTrend = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    orders: Math.floor(Math.random() * 50) + 10,
    revenue: Math.floor(Math.random() * 2000) + 500
  }));

  const customerSegments = [
    { segment: 'VIP', count: 45, avgSpend: 125.50, frequency: 12.3 },
    { segment: 'Regular', count: 89, avgSpend: 65.20, frequency: 5.6 },
    { segment: 'Occasional', count: 156, avgSpend: 42.30, frequency: 2.1 },
    { segment: 'New', count: 234, avgSpend: 38.90, frequency: 1.0 }
  ];

  const peakHours = Array.from({ length: 14 }, (_, i) => ({
    hour: `${i + 10}:00`,
    traffic: Math.floor(Math.random() * 100) + 20,
    sales: Math.floor(Math.random() * 3000) + 1000
  }));

  const popularItems = [
    { name: 'Grilled Salmon', category: 'Main', price: 28.99, quantity: 45, revenue: 1304.55, growth: 12 },
    { name: 'Caesar Salad', category: 'Appetizer', price: 12.99, quantity: 38, revenue: 493.62, growth: 8 },
    { name: 'Ribeye Steak', category: 'Main', price: 45.99, quantity: 32, revenue: 1471.68, growth: 15 },
    { name: 'Tiramisu', category: 'Dessert', price: 8.99, quantity: 28, revenue: 251.72, growth: 5 }
  ];

  const competitors = [
    { metric: 'Price', yours: 85, average: 75, topCompetitor: 90 },
    { metric: 'Quality', yours: 90, average: 80, topCompetitor: 95 },
    { metric: 'Service', yours: 88, average: 78, topCompetitor: 92 },
    { metric: 'Location', yours: 75, average: 70, topCompetitor: 85 },
    { metric: 'Reviews', yours: 82, average: 75, topCompetitor: 88 }
  ];

  return {
    metrics: baseMetrics,
    salesTrend,
    customerSegments,
    peakHours,
    popularItems,
    competitors,
    lastUpdated: new Date().toISOString()
  };
}

async function getCustomerBehavior(restaurantId, startDate, endDate, env) {
  // Simplified customer behavior data
  return {
    visitFrequency: {
      distribution: { vip: 45, regular: 89, occasional: 156, new: 234 },
      avgSpendBySegment: { vip: 125.50, regular: 65.20, occasional: 42.30, new: 38.90 }
    },
    peakHours: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      traffic: Math.floor(Math.random() * 100 * Math.sin((hour - 6) * Math.PI / 12) + 10)
    })),
    popularItems: [
      { name: 'Grilled Salmon', orderCount: 145, revenue: 4205.55 },
      { name: 'Caesar Salad', orderCount: 132, revenue: 1714.68 },
      { name: 'Ribeye Steak', orderCount: 98, revenue: 4507.02 }
    ]
  };
}

async function getSalesMetrics(restaurantId, startDate, endDate, env) {
  // Simplified sales metrics
  const days = 30;
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    return {
      date: date.toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 5000) + 10000,
      transactions: Math.floor(Math.random() * 200) + 100,
      avgTicket: Math.floor(Math.random() * 20) + 40
    };
  });

  return {
    daily,
    summary: {
      totalRevenue: daily.reduce((sum, d) => sum + d.revenue, 0),
      totalTransactions: daily.reduce((sum, d) => sum + d.transactions, 0),
      averageTicket: 52.34,
      growthRate: 8.5
    }
  };
}

async function getMarketTrends(industry, location, env) {
  // Simplified market trends
  return {
    localTrends: {
      trendingCategories: ['plant-based', 'fusion', 'craft-cocktails'],
      risingSearches: ['vegan options', 'outdoor seating', 'delivery']
    },
    searchTrends: {
      'restaurant near me': 100,
      'food delivery': 85,
      'dine in': 60
    },
    industryInsights: {
      growth: '5.2%',
      challenges: ['labor shortage', 'supply chain', 'inflation'],
      opportunities: ['technology adoption', 'delivery expansion', 'loyalty programs']
    },
    recommendations: [
      {
        type: 'menu',
        action: 'Add plant-based options',
        priority: 'high',
        impact: 'Capture growing vegan/vegetarian market'
      },
      {
        type: 'operations',
        action: 'Optimize delivery operations',
        priority: 'high',
        impact: 'Meet high delivery demand'
      }
    ]
  };
}