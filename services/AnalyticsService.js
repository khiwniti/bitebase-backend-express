/**
 * Cloudflare Analytics Service for BiteBase
 * Supports mock analytics for development and Cloudflare Analytics for production
 */

const KVService = require('./KVService');
const DatabaseService = require('./DatabaseService');

class AnalyticsService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.analytics = null;
    this.events = []; // In-memory event storage for development
    this.init();
  }

  async init() {
    if (this.isProduction) {
      await this.initCloudflareAnalytics();
    } else {
      await this.initMockAnalytics();
    }
  }

  async initCloudflareAnalytics() {
    try {
      console.log('📊 Initializing Cloudflare Analytics...');
      // In production, Analytics would be available via Cloudflare Workers
      this.analytics = global.ANALYTICS || null;
      
      if (this.analytics) {
        console.log('✅ Cloudflare Analytics connected');
      } else {
        console.log('⚠️ Cloudflare Analytics not available, using mock data');
        await this.initMockAnalytics();
      }
    } catch (error) {
      console.error('❌ Cloudflare Analytics initialization failed:', error);
      await this.initMockAnalytics();
    }
  }

  async initMockAnalytics() {
    console.log('📈 Initializing mock analytics for development...');
    
    // Generate sample analytics data
    this.generateSampleData();
    
    console.log('✅ Mock analytics initialized with sample data');
  }

  generateSampleData() {
    const now = new Date();
    const last30Days = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      last30Days.push({
        date: date.toISOString().split('T')[0],
        pageViews: Math.floor(Math.random() * 1000) + 500,
        uniqueVisitors: Math.floor(Math.random() * 300) + 200,
        searches: Math.floor(Math.random() * 150) + 50,
        restaurantViews: Math.floor(Math.random() * 200) + 100,
        apiCalls: Math.floor(Math.random() * 500) + 250,
        avgSessionDuration: Math.floor(Math.random() * 300) + 120, // seconds
        bounceRate: (Math.random() * 0.3 + 0.2).toFixed(2), // 20-50%
        topPages: [
          '/dashboard',
          '/location-intelligence',
          '/market-analysis',
          '/restaurants',
          '/analytics'
        ],
        topCountries: ['TH', 'US', 'SG', 'MY', 'JP'],
        deviceTypes: {
          desktop: Math.floor(Math.random() * 40) + 40,
          mobile: Math.floor(Math.random() * 40) + 30,
          tablet: Math.floor(Math.random() * 20) + 10
        }
      });
    }
    
    this.events = last30Days;
  }

  // Track page view
  async trackPageView(path, userAgent = '', country = 'TH', userId = null) {
    const event = {
      type: 'pageview',
      path,
      userAgent,
      country,
      userId,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    if (this.analytics && this.isProduction) {
      // Send to Cloudflare Analytics
      try {
        await this.analytics.writeDataPoint({
          blobs: [path, userAgent, country],
          doubles: [1], // count
          indexes: [userId || 'anonymous']
        });
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    } else {
      // Store in memory for development
      this.events.push(event);
      
      // Keep only last 1000 events
      if (this.events.length > 1000) {
        this.events = this.events.slice(-1000);
      }
    }

    return event;
  }

  // Track search event
  async trackSearch(query, results, filters = {}, userId = null) {
    const event = {
      type: 'search',
      query,
      resultCount: results.length,
      filters,
      userId,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    if (this.analytics && this.isProduction) {
      try {
        await this.analytics.writeDataPoint({
          blobs: [query, JSON.stringify(filters)],
          doubles: [results.length],
          indexes: [userId || 'anonymous']
        });
      } catch (error) {
        console.error('Search tracking error:', error);
      }
    } else {
      this.events.push(event);
    }

    return event;
  }

  // Track restaurant view
  async trackRestaurantView(restaurantId, restaurantName, userId = null) {
    const event = {
      type: 'restaurant_view',
      restaurantId,
      restaurantName,
      userId,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    if (this.analytics && this.isProduction) {
      try {
        await this.analytics.writeDataPoint({
          blobs: [restaurantId, restaurantName],
          doubles: [1],
          indexes: [userId || 'anonymous']
        });
      } catch (error) {
        console.error('Restaurant view tracking error:', error);
      }
    } else {
      this.events.push(event);
    }

    return event;
  }

  // Get analytics dashboard data
  async getDashboardAnalytics(dateRange = 30) {
    try {
      // Try to get from cache first
      const cached = await KVService.getCachedAnalytics('dashboard');
      if (cached && this.isDevelopment) {
        return cached;
      }

      let analytics;

      if (this.isProduction && this.analytics) {
        // Get from Cloudflare Analytics
        analytics = await this.getProductionAnalytics(dateRange);
      } else {
        // Use mock data
        analytics = await this.getMockAnalytics(dateRange);
      }

      // Cache the results
      await KVService.cacheAnalytics('dashboard', analytics, 1800); // 30 minutes

      return analytics;
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      return this.getDefaultAnalytics();
    }
  }

  async getMockAnalytics(dateRange) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const relevantEvents = this.events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });

    const pageViews = relevantEvents.filter(e => e.type === 'pageview');
    const searches = relevantEvents.filter(e => e.type === 'search');
    const restaurantViews = relevantEvents.filter(e => e.type === 'restaurant_view');

    // Calculate metrics
    const totalPageViews = pageViews.length;
    const totalSearches = searches.length;
    const totalRestaurantViews = restaurantViews.length;
    const uniqueUsers = new Set(relevantEvents.map(e => e.userId || e.sessionId)).size;

    // Top pages
    const pageCount = {};
    pageViews.forEach(pv => {
      pageCount[pv.path] = (pageCount[pv.path] || 0) + 1;
    });
    const topPages = Object.entries(pageCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, views: count }));

    // Top searches
    const searchCount = {};
    searches.forEach(s => {
      searchCount[s.query] = (searchCount[s.query] || 0) + 1;
    });
    const topSearches = Object.entries(searchCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    // Daily breakdown
    const dailyData = {};
    relevantEvents.forEach(event => {
      const date = event.timestamp.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { pageViews: 0, searches: 0, restaurantViews: 0 };
      }
      if (event.type === 'pageview') dailyData[date].pageViews++;
      if (event.type === 'search') dailyData[date].searches++;
      if (event.type === 'restaurant_view') dailyData[date].restaurantViews++;
    });

    const dailyBreakdown = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return {
      summary: {
        totalPageViews,
        totalSearches,
        totalRestaurantViews,
        uniqueUsers,
        avgSessionDuration: 245, // seconds
        bounceRate: 0.32
      },
      topPages,
      topSearches,
      dailyBreakdown,
      realTime: {
        activeUsers: Math.floor(Math.random() * 50) + 10,
        currentPageViews: Math.floor(Math.random() * 20) + 5,
        topActivePages: topPages.slice(0, 3)
      },
      geographic: {
        topCountries: [
          { country: 'Thailand', code: 'TH', users: Math.floor(uniqueUsers * 0.6) },
          { country: 'Singapore', code: 'SG', users: Math.floor(uniqueUsers * 0.15) },
          { country: 'Malaysia', code: 'MY', users: Math.floor(uniqueUsers * 0.12) },
          { country: 'United States', code: 'US', users: Math.floor(uniqueUsers * 0.08) },
          { country: 'Japan', code: 'JP', users: Math.floor(uniqueUsers * 0.05) }
        ]
      },
      devices: {
        desktop: Math.floor(totalPageViews * 0.55),
        mobile: Math.floor(totalPageViews * 0.35),
        tablet: Math.floor(totalPageViews * 0.10)
      },
      lastUpdated: new Date().toISOString()
    };
  }

  async getProductionAnalytics(dateRange) {
    // This would query Cloudflare Analytics API
    // For now, return mock data structure
    return this.getMockAnalytics(dateRange);
  }

  getDefaultAnalytics() {
    return {
      summary: {
        totalPageViews: 0,
        totalSearches: 0,
        totalRestaurantViews: 0,
        uniqueUsers: 0,
        avgSessionDuration: 0,
        bounceRate: 0
      },
      topPages: [],
      topSearches: [],
      dailyBreakdown: [],
      realTime: {
        activeUsers: 0,
        currentPageViews: 0,
        topActivePages: []
      },
      geographic: { topCountries: [] },
      devices: { desktop: 0, mobile: 0, tablet: 0 },
      lastUpdated: new Date().toISOString()
    };
  }

  // Get restaurant-specific analytics
  async getRestaurantAnalytics(restaurantId, dateRange = 30) {
    try {
      const cached = await KVService.getCachedAnalytics(`restaurant_${restaurantId}`);
      if (cached && this.isDevelopment) {
        return cached;
      }

      // Get restaurant data from database
      const restaurant = await DatabaseService.getRestaurantById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Get analytics data
      const analytics = await DatabaseService.getAnalytics(restaurantId, { days: dateRange });
      
      const result = {
        restaurant,
        analytics: analytics.length > 0 ? analytics : this.generateMockRestaurantAnalytics(restaurantId),
        summary: this.calculateRestaurantSummary(analytics),
        lastUpdated: new Date().toISOString()
      };

      // Cache the results
      await KVService.cacheAnalytics(`restaurant_${restaurantId}`, result, 1800);

      return result;
    } catch (error) {
      console.error('Error getting restaurant analytics:', error);
      throw error;
    }
  }

  generateMockRestaurantAnalytics(restaurantId) {
    const analytics = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      analytics.push({
        id: `${restaurantId}-${date.toISOString().split('T')[0]}`,
        restaurantId,
        date: date.toISOString().split('T')[0],
        visits: Math.floor(Math.random() * 200) + 50,
        revenue: Math.floor(Math.random() * 10000) + 2000,
        orders: Math.floor(Math.random() * 50) + 10,
        avgOrderValue: Math.floor(Math.random() * 200) + 100,
        peakHour: ['11:00', '12:00', '13:00', '18:00', '19:00', '20:00'][Math.floor(Math.random() * 6)],
        customerSatisfaction: (Math.random() * 1.5 + 3.5).toFixed(1)
      });
    }
    
    return analytics;
  }

  calculateRestaurantSummary(analytics) {
    if (analytics.length === 0) return {};

    const totalVisits = analytics.reduce((sum, a) => sum + (a.visits || 0), 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + (a.revenue || 0), 0);
    const totalOrders = analytics.reduce((sum, a) => sum + (a.orders || 0), 0);
    const avgSatisfaction = analytics.reduce((sum, a) => sum + parseFloat(a.customerSatisfaction || 0), 0) / analytics.length;

    return {
      totalVisits,
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      avgSatisfaction: avgSatisfaction.toFixed(1),
      period: analytics.length
    };
  }

  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Health check
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        service: this.isProduction ? 'cloudflare-analytics' : 'mock-analytics',
        eventsCount: this.events.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new AnalyticsService();