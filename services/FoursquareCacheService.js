/**
 * Foursquare Cache Service
 * Redis-based caching for Foursquare API responses and analysis results
 */

const Redis = require('redis');
const { foursquareConfig } = require('../config/foursquare');

class FoursquareCacheService {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.defaultTTL = foursquareConfig.cache.venueDataTTL || 3600; // 1 hour
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = Redis.createClient({
        url: redisUrl,
        retry_strategy: (times) => {
          if (times >= this.retryAttempts) {
            console.error('❌ Redis connection failed after maximum retries');
            return null;
          }
          return Math.min(times * this.retryDelay, 3000);
        }
      });

      // Set up event listeners
      this.redis.on('connect', () => {
        console.log('🔗 Connecting to Redis...');
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis connected and ready');
        this.connected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis error:', error.message);
        this.connected = false;
      });

      this.redis.on('end', () => {
        console.log('🔌 Redis connection closed');
        this.connected = false;
      });

      // Connect to Redis
      await this.redis.connect();
      
      // Test the connection
      await this.redis.ping();
      console.log('🏓 Redis ping successful');

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      this.connected = false;
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redis && this.connected) {
      try {
        await this.redis.quit();
        console.log('✅ Redis disconnected gracefully');
      } catch (error) {
        console.error('❌ Error disconnecting from Redis:', error.message);
      }
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.connected && this.redis;
  }

  /**
   * Get cached venue data
   */
  async getCachedVenueData(venueId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `venue:${venueId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📋 Cache HIT for venue: ${venueId}`);
        return JSON.parse(cached);
      }
      
      console.log(`📭 Cache MISS for venue: ${venueId}`);
      return null;
    } catch (error) {
      console.warn('⚠️ Error retrieving cached venue data:', error.message);
      return null;
    }
  }

  /**
   * Cache venue data
   */
  async setCachedVenueData(venueId, data, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `venue:${venueId}`;
      const cacheData = {
        ...data,
        cached_at: new Date().toISOString(),
        cache_source: 'foursquare_api'
      };

      const ttlToUse = ttl || this.defaultTTL;
      await this.redis.setEx(key, ttlToUse, JSON.stringify(cacheData));
      
      console.log(`💾 Cached venue data for: ${venueId} (TTL: ${ttlToUse}s)`);
      return true;
    } catch (error) {
      console.warn('⚠️ Error caching venue data:', error.message);
      return false;
    }
  }

  /**
   * Get cached area analysis
   */
  async getCachedAreaAnalysis(lat, lng, radius) {
    if (!this.isAvailable()) return null;

    try {
      const key = `area:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📋 Cache HIT for area analysis: ${key}`);
        return JSON.parse(cached);
      }
      
      console.log(`📭 Cache MISS for area analysis: ${key}`);
      return null;
    } catch (error) {
      console.warn('⚠️ Error retrieving cached area analysis:', error.message);
      return null;
    }
  }

  /**
   * Cache area analysis
   */
  async setCachedAreaAnalysis(lat, lng, radius, data, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `area:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
      const cacheData = {
        ...data,
        cached_at: new Date().toISOString(),
        cache_source: 'area_analysis'
      };

      const ttlToUse = ttl || foursquareConfig.cache.trafficDataTTL || 1800; // 30 minutes
      await this.redis.setEx(key, ttlToUse, JSON.stringify(cacheData));
      
      console.log(`💾 Cached area analysis for: ${key} (TTL: ${ttlToUse}s)`);
      return true;
    } catch (error) {
      console.warn('⚠️ Error caching area analysis:', error.message);
      return false;
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(searchParams) {
    if (!this.isAvailable()) return null;

    try {
      const key = `search:${this.hashSearchParams(searchParams)}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📋 Cache HIT for search: ${key}`);
        return JSON.parse(cached);
      }
      
      console.log(`📭 Cache MISS for search: ${key}`);
      return null;
    } catch (error) {
      console.warn('⚠️ Error retrieving cached search results:', error.message);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async setCachedSearchResults(searchParams, results, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `search:${this.hashSearchParams(searchParams)}`;
      const cacheData = {
        results,
        search_params: searchParams,
        cached_at: new Date().toISOString(),
        cache_source: 'search_results'
      };

      const ttlToUse = ttl || foursquareConfig.cache.searchResultsTTL || 1800; // 30 minutes
      await this.redis.setEx(key, ttlToUse, JSON.stringify(cacheData));
      
      console.log(`💾 Cached search results for: ${key} (TTL: ${ttlToUse}s)`);
      return true;
    } catch (error) {
      console.warn('⚠️ Error caching search results:', error.message);
      return false;
    }
  }

  /**
   * Get cached competitor analysis
   */
  async getCachedCompetitorAnalysis(lat, lng, radius) {
    if (!this.isAvailable()) return null;

    try {
      const key = `competitor:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        // Check if data is still fresh (less than 24 hours old)
        const cacheAge = Date.now() - new Date(data.cached_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < maxAge) {
          console.log(`📋 Cache HIT for competitor analysis: ${key}`);
          return data;
        } else {
          console.log(`⏰ Cache EXPIRED for competitor analysis: ${key}`);
          await this.invalidateKey(key);
          return null;
        }
      }
      
      console.log(`📭 Cache MISS for competitor analysis: ${key}`);
      return null;
    } catch (error) {
      console.warn('⚠️ Error retrieving cached competitor analysis:', error.message);
      return null;
    }
  }

  /**
   * Cache competitor analysis
   */
  async setCachedCompetitorAnalysis(lat, lng, radius, data, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `competitor:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
      const cacheData = {
        ...data,
        cached_at: new Date().toISOString(),
        cache_source: 'competitor_analysis'
      };

      const ttlToUse = ttl || 86400; // 24 hours for competitor analysis
      await this.redis.setEx(key, ttlToUse, JSON.stringify(cacheData));
      
      console.log(`💾 Cached competitor analysis for: ${key} (TTL: ${ttlToUse}s)`);
      return true;
    } catch (error) {
      console.warn('⚠️ Error caching competitor analysis:', error.message);
      return false;
    }
  }

  /**
   * Get cached events data
   */
  async getCachedEvents(lat, lng, radiusKm, daysAhead) {
    if (!this.isAvailable()) return null;

    try {
      const key = `events:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusKm}:${daysAhead}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📋 Cache HIT for events: ${key}`);
        return JSON.parse(cached);
      }
      
      console.log(`📭 Cache MISS for events: ${key}`);
      return null;
    } catch (error) {
      console.warn('⚠️ Error retrieving cached events:', error.message);
      return null;
    }
  }

  /**
   * Cache events data
   */
  async setCachedEvents(lat, lng, radiusKm, daysAhead, events, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `events:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusKm}:${daysAhead}`;
      const cacheData = {
        events,
        location: { lat, lng },
        radius_km: radiusKm,
        days_ahead: daysAhead,
        cached_at: new Date().toISOString(),
        cache_source: 'events_api'
      };

      const ttlToUse = ttl || foursquareConfig.cache.eventDataTTL || 7200; // 2 hours
      await this.redis.setEx(key, ttlToUse, JSON.stringify(cacheData));
      
      console.log(`💾 Cached events data for: ${key} (TTL: ${ttlToUse}s)`);
      return true;
    } catch (error) {
      console.warn('⚠️ Error caching events data:', error.message);
      return false;
    }
  }

  /**
   * Invalidate cached data by key
   */
  async invalidateKey(key) {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.redis.del(key);
      if (result > 0) {
        console.log(`🗑️ Invalidated cache key: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Error invalidating cache key:', error.message);
      return false;
    }
  }

  /**
   * Invalidate venue cache
   */
  async invalidateVenueCache(venueId) {
    return await this.invalidateKey(`venue:${venueId}`);
  }

  /**
   * Invalidate all cache for a specific area
   */
  async invalidateAreaCache(lat, lng, radius) {
    if (!this.isAvailable()) return false;

    try {
      const patterns = [
        `area:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
        `competitor:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
        `events:${lat.toFixed(4)}:${lng.toFixed(4)}:*`
      ];

      let invalidatedCount = 0;

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // Handle wildcard patterns
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            const result = await this.redis.del(keys);
            invalidatedCount += result;
          }
        } else {
          // Handle exact keys
          const result = await this.redis.del(pattern);
          invalidatedCount += result;
        }
      }

      console.log(`🗑️ Invalidated ${invalidatedCount} cache entries for area: ${lat}, ${lng}`);
      return invalidatedCount > 0;
    } catch (error) {
      console.warn('⚠️ Error invalidating area cache:', error.message);
      return false;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache() {
    if (!this.isAvailable()) return false;

    try {
      // Redis automatically handles TTL expiration, but we can check for custom cleanup logic
      const info = await this.redis.info('keyspace');
      console.log('🧹 Cache cleanup check completed');
      return true;
    } catch (error) {
      console.warn('⚠️ Error during cache cleanup:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.isAvailable()) {
      return {
        connected: false,
        error: 'Redis not available'
      };
    }

    try {
      const info = await this.redis.info();
      const keyspace = await this.redis.info('keyspace');
      const memory = await this.redis.info('memory');

      // Parse keyspace info to get database stats
      const dbStats = {};
      const keyspaceLines = keyspace.split('\r\n');
      keyspaceLines.forEach(line => {
        if (line.startsWith('db')) {
          const [db, stats] = line.split(':');
          const statsMatch = stats.match(/keys=(\d+),expires=(\d+)/);
          if (statsMatch) {
            dbStats[db] = {
              keys: parseInt(statsMatch[1]),
              expires: parseInt(statsMatch[2])
            };
          }
        }
      });

      return {
        connected: true,
        uptime: this.parseRedisInfo(info, 'uptime_in_seconds'),
        total_connections: this.parseRedisInfo(info, 'total_connections_received'),
        used_memory: this.parseRedisInfo(memory, 'used_memory_human'),
        keyspace: dbStats,
        last_checked: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️ Error getting cache stats:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(info, key) {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(':')[1];
      }
    }
    return null;
  }

  /**
   * Hash search parameters for consistent cache keys
   */
  hashSearchParams(params) {
    // Create a consistent hash from search parameters
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    const paramString = JSON.stringify(sortedParams);
    return Buffer.from(paramString).toString('base64').substring(0, 32);
  }

  /**
   * Get cache metrics for monitoring
   */
  async getCacheMetrics() {
    if (!this.isAvailable()) {
      return {
        hit_rate: 0,
        miss_rate: 0,
        total_operations: 0
      };
    }

    try {
      // Get basic Redis stats
      const info = await this.redis.info('stats');
      
      const keyspaceHits = this.parseRedisInfo(info, 'keyspace_hits') || '0';
      const keyspaceMisses = this.parseRedisInfo(info, 'keyspace_misses') || '0';
      
      const hits = parseInt(keyspaceHits);
      const misses = parseInt(keyspaceMisses);
      const total = hits + misses;
      
      return {
        hit_rate: total > 0 ? (hits / total) * 100 : 0,
        miss_rate: total > 0 ? (misses / total) * 100 : 0,
        total_operations: total,
        hits: hits,
        misses: misses
      };
    } catch (error) {
      console.warn('⚠️ Error getting cache metrics:', error.message);
      return {
        hit_rate: 0,
        miss_rate: 0,
        total_operations: 0,
        error: error.message
      };
    }
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmUpCache(popularLocations = []) {
    if (!this.isAvailable()) return false;

    try {
      console.log('🔥 Starting cache warm-up...');
      
      // This would typically pre-load frequently accessed data
      // For now, we'll just log the intent
      console.log(`🔥 Cache warm-up planned for ${popularLocations.length} locations`);
      
      return true;
    } catch (error) {
      console.warn('⚠️ Error during cache warm-up:', error.message);
      return false;
    }
  }
}

module.exports = FoursquareCacheService;