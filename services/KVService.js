/**
 * Cloudflare KV Service for BiteBase
 * Supports in-memory caching for development and Cloudflare KV for production
 */

class KVService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.kv = null;
    this.cache = new Map(); // In-memory cache for development
    this.ttlMap = new Map(); // TTL tracking for development
    this.init();
  }

  async init() {
    if (this.isProduction && process.env.KV_NAMESPACE_ID) {
      // Production: Use Cloudflare KV
      await this.initCloudflareKV();
    } else {
      // Development: Use in-memory cache
      await this.initInMemoryCache();
    }
  }

  async initCloudflareKV() {
    try {
      console.log('🌩️ Initializing Cloudflare KV namespace...');
      // In production, KV is available via the Cloudflare Workers runtime
      this.kv = global.KV_NAMESPACE || null;
      
      if (this.kv) {
        console.log('✅ Cloudflare KV namespace connected');
        // Test the connection
        await this.set('health_check', 'ok', 60);
        const test = await this.get('health_check');
        if (test === 'ok') {
          console.log('✅ Cloudflare KV health check passed');
        }
      } else {
        console.log('⚠️ Cloudflare KV not available, falling back to in-memory');
        await this.initInMemoryCache();
      }
    } catch (error) {
      console.error('❌ Cloudflare KV initialization failed:', error);
      await this.initInMemoryCache();
    }
  }

  async initInMemoryCache() {
    console.log('🧠 Initializing in-memory cache for development...');
    
    // Initialize with some sample cached data
    this.cache.set('restaurant_stats', JSON.stringify({
      totalRestaurants: 1250,
      averageRating: 4.2,
      topCuisines: ['Thai', 'Japanese', 'Italian', 'American', 'Chinese'],
      lastUpdated: new Date().toISOString()
    }));

    this.cache.set('location_insights', JSON.stringify({
      hotspots: [
        { area: 'Siam', score: 95, restaurants: 45 },
        { area: 'Sukhumvit', score: 88, restaurants: 38 },
        { area: 'Silom', score: 82, restaurants: 32 },
        { area: 'Chatuchak', score: 78, restaurants: 28 }
      ],
      lastUpdated: new Date().toISOString()
    }));

    this.cache.set('market_trends', JSON.stringify({
      trending: ['Plant-based', 'Korean BBQ', 'Bubble Tea', 'Healthy Bowls'],
      declining: ['Traditional Fast Food', 'Buffets'],
      priceChanges: {
        average: '+2.3%',
        fastFood: '+1.8%',
        fineDining: '+3.1%'
      },
      lastUpdated: new Date().toISOString()
    }));

    // Set up TTL cleanup
    this.startTTLCleanup();
    
    console.log('✅ In-memory cache initialized with sample data');
  }

  startTTLCleanup() {
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.ttlMap.entries()) {
        if (now > expiry) {
          this.cache.delete(key);
          this.ttlMap.delete(key);
        }
      }
    }, 60000);
  }

  // Get value from cache
  async get(key) {
    try {
      if (this.kv && this.isProduction) {
        // Cloudflare KV get
        const value = await this.kv.get(key);
        return value;
      } else {
        // In-memory cache get
        if (this.ttlMap.has(key) && Date.now() > this.ttlMap.get(key)) {
          // Expired
          this.cache.delete(key);
          this.ttlMap.delete(key);
          return null;
        }
        return this.cache.get(key) || null;
      }
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  // Set value in cache
  async set(key, value, ttlSeconds = 3600) {
    try {
      if (this.kv && this.isProduction) {
        // Cloudflare KV set
        await this.kv.put(key, value, { expirationTtl: ttlSeconds });
        return true;
      } else {
        // In-memory cache set
        this.cache.set(key, value);
        if (ttlSeconds > 0) {
          this.ttlMap.set(key, Date.now() + (ttlSeconds * 1000));
        }
        return true;
      }
    } catch (error) {
      console.error('KV set error:', error);
      return false;
    }
  }

  // Delete value from cache
  async delete(key) {
    try {
      if (this.kv && this.isProduction) {
        // Cloudflare KV delete
        await this.kv.delete(key);
        return true;
      } else {
        // In-memory cache delete
        this.cache.delete(key);
        this.ttlMap.delete(key);
        return true;
      }
    } catch (error) {
      console.error('KV delete error:', error);
      return false;
    }
  }

  // List keys with prefix
  async list(prefix = '') {
    try {
      if (this.kv && this.isProduction) {
        // Cloudflare KV list
        const result = await this.kv.list({ prefix });
        return result.keys.map(k => k.name);
      } else {
        // In-memory cache list
        const keys = Array.from(this.cache.keys());
        return prefix ? keys.filter(k => k.startsWith(prefix)) : keys;
      }
    } catch (error) {
      console.error('KV list error:', error);
      return [];
    }
  }

  // Get JSON value
  async getJSON(key) {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  // Set JSON value
  async setJSON(key, value, ttlSeconds = 3600) {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      console.error('JSON stringify error:', error);
      return false;
    }
  }

  // Cache restaurant data
  async cacheRestaurantData(restaurantId, data, ttlSeconds = 1800) {
    const key = `restaurant:${restaurantId}`;
    return await this.setJSON(key, data, ttlSeconds);
  }

  // Get cached restaurant data
  async getCachedRestaurantData(restaurantId) {
    const key = `restaurant:${restaurantId}`;
    return await this.getJSON(key);
  }

  // Cache search results
  async cacheSearchResults(query, results, ttlSeconds = 600) {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return await this.setJSON(key, results, ttlSeconds);
  }

  // Get cached search results
  async getCachedSearchResults(query) {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return await this.getJSON(key);
  }

  // Cache analytics data
  async cacheAnalytics(type, data, ttlSeconds = 3600) {
    const key = `analytics:${type}:${new Date().toISOString().split('T')[0]}`;
    return await this.setJSON(key, data, ttlSeconds);
  }

  // Get cached analytics
  async getCachedAnalytics(type) {
    const key = `analytics:${type}:${new Date().toISOString().split('T')[0]}`;
    return await this.getJSON(key);
  }

  // Cache location insights
  async cacheLocationInsights(area, insights, ttlSeconds = 7200) {
    const key = `location:${area.toLowerCase().replace(/\s+/g, '_')}`;
    return await this.setJSON(key, insights, ttlSeconds);
  }

  // Get cached location insights
  async getCachedLocationInsights(area) {
    const key = `location:${area.toLowerCase().replace(/\s+/g, '_')}`;
    return await this.getJSON(key);
  }

  // Health check
  async healthCheck() {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = 'ok';
      
      await this.set(testKey, testValue, 60);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);
      
      return {
        status: retrieved === testValue ? 'healthy' : 'error',
        service: this.isProduction ? 'cloudflare-kv' : 'in-memory',
        timestamp: new Date().toISOString(),
        cacheSize: this.isDevelopment ? this.cache.size : 'unknown'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get cache statistics
  async getStats() {
    if (this.isDevelopment) {
      return {
        totalKeys: this.cache.size,
        keysWithTTL: this.ttlMap.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };
    }

    // For production, we can't easily get KV stats
    return {
      service: 'cloudflare-kv',
      note: 'Statistics not available for Cloudflare KV'
    };
  }
}

module.exports = new KVService();