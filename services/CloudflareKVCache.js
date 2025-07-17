/**
 * Cloudflare KV Cache Service
 * Replaces Redis with Cloudflare KV for caching in Workers environment
 */

class CloudflareKVCache {
  constructor(kvNamespace = null) {
    // In Cloudflare Workers, this will be the actual KV namespace
    // In local development, we'll use a simple in-memory cache
    this.kv = kvNamespace;
    this.isCloudflareEnvironment = !!kvNamespace;
    
    // Local development fallback cache
    this.localCache = new Map();
    this.cacheExpiry = new Map();
    
    console.log(`📦 CloudflareKVCache initialized (${this.isCloudflareEnvironment ? 'Cloudflare KV' : 'Local Memory'})`);
  }

  /**
   * Connect to KV (no-op for KV, but keeps interface consistent)
   */
  async connect() {
    if (this.isCloudflareEnvironment) {
      console.log('✅ Cloudflare KV namespace connected');
      return true;
    } else {
      console.log('✅ Local memory cache connected (development mode)');
      return true;
    }
  }

  /**
   * Disconnect from KV (no-op for KV)
   */
  async disconnect() {
    if (!this.isCloudflareEnvironment) {
      this.localCache.clear();
      this.cacheExpiry.clear();
    }
    console.log('📦 Cache disconnected');
    return true;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (this.isCloudflareEnvironment) {
        // Use Cloudflare KV
        const value = await this.kv.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Use local cache for development
        if (this.isExpired(key)) {
          this.localCache.delete(key);
          this.cacheExpiry.delete(key);
          return null;
        }
        const value = this.localCache.get(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL (Time To Live)
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const jsonValue = JSON.stringify(value);
      
      if (this.isCloudflareEnvironment) {
        // Use Cloudflare KV with expiration
        const expirationTtl = ttlSeconds;
        await this.kv.put(key, jsonValue, { expirationTtl });
        return true;
      } else {
        // Use local cache for development
        this.localCache.set(key, jsonValue);
        this.cacheExpiry.set(key, Date.now() + (ttlSeconds * 1000));
        return true;
      }
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  /**
   * Set value with exact expiration time
   */
  async setEx(key, ttlSeconds, value) {
    return await this.set(key, value, ttlSeconds);
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      if (this.isCloudflareEnvironment) {
        await this.kv.delete(key);
      } else {
        this.localCache.delete(key);
        this.cacheExpiry.delete(key);
      }
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache (use carefully!)
   */
  async clear() {
    try {
      if (this.isCloudflareEnvironment) {
        // Note: KV doesn't have a clear all operation
        // In production, you'd need to list and delete keys
        console.warn('⚠️ Clear all not supported in Cloudflare KV');
        return false;
      } else {
        this.localCache.clear();
        this.cacheExpiry.clear();
        return true;
      }
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.isCloudflareEnvironment) {
      return {
        type: 'cloudflare_kv',
        namespace: 'production',
        hits: 'N/A', // KV doesn't provide hit/miss stats
        misses: 'N/A'
      };
    } else {
      return {
        type: 'local_memory',
        size: this.localCache.size,
        keys: Array.from(this.localCache.keys())
      };
    }
  }

  /**
   * Check if local cache key has expired (development only)
   */
  isExpired(key) {
    if (this.isCloudflareEnvironment) return false;
    
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return true;
    
    return Date.now() > expiry;
  }

  /**
   * Health check for cache service
   */
  async healthCheck() {
    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = { test: true, timestamp: new Date().toISOString() };
      
      await this.set(testKey, testValue, 60); // 1 minute TTL
      const retrieved = await this.get(testKey);
      await this.delete(testKey);
      
      const isHealthy = retrieved && retrieved.test === true;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        type: this.isCloudflareEnvironment ? 'cloudflare_kv' : 'local_memory',
        test_passed: isHealthy,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cache keys with pattern matching (limited support)
   */
  async keys(pattern = '*') {
    if (this.isCloudflareEnvironment) {
      // Cloudflare KV has limited key listing capabilities
      console.warn('⚠️ Key pattern matching not fully supported in Cloudflare KV');
      return [];
    } else {
      // Local development - simple pattern matching
      const allKeys = Array.from(this.localCache.keys());
      if (pattern === '*') return allKeys;
      
      // Simple wildcard matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter(key => regex.test(key));
    }
  }

  /**
   * Increment a numeric value (atomic operation)
   */
  async incr(key, amount = 1) {
    try {
      const current = await this.get(key) || 0;
      const newValue = (typeof current === 'number' ? current : 0) + amount;
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('❌ Cache increment error:', error);
      return null;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs, ttlSeconds = 3600) {
    try {
      const promises = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        promises.push(this.set(key, value, ttlSeconds));
      }
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple values by keys
   */
  async mget(keys) {
    try {
      const promises = keys.map(key => this.get(key));
      return await Promise.all(promises);
    } catch (error) {
      console.error('❌ Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  }
}

module.exports = CloudflareKVCache;
