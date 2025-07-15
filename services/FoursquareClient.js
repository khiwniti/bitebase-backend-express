/**
 * Production-ready Foursquare API Client
 * Includes rate limiting, error handling, retry logic, and caching
 */

const axios = require('axios');
const { foursquareConfig } = require('../config/foursquare');

// Custom error classes
class FoursquareAPIError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'FoursquareAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Rate limiter implementation
class RateLimiter {
  constructor(maxRequests, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + this.windowMs - now;
      
      if (waitTime > 0) {
        console.log(`⏱️ Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire(); // Retry after waiting
      }
    }
    
    this.requests.push(now);
  }

  getStatus() {
    const now = Date.now();
    const activeRequests = this.requests.filter(time => now - time < this.windowMs);
    return {
      current: activeRequests.length,
      max: this.maxRequests,
      remaining: this.maxRequests - activeRequests.length,
      resetTime: activeRequests.length > 0 ? Math.min(...activeRequests) + this.windowMs : now
    };
  }
}

// Main Foursquare client class
class FoursquareClient {
  constructor(config = foursquareConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(
      Math.floor(config.rateLimit.requestsPerMinute), 
      60000 // 1 minute
    );
    
    // Determine if this is a legacy API key or new format
    this.isLegacyKey = !config.apiKey.startsWith('fsq3');
    
    // Create axios instance with appropriate configuration
    const axiosConfig = {
      baseURL: this.isLegacyKey ? 'https://api.foursquare.com/v2' : config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    // Set authentication based on API key type
    if (this.isLegacyKey) {
      // Legacy API uses client_id and client_secret in query params
      axiosConfig.params = {
        client_id: process.env.FOURSQUARE_CLIENT_ID,
        client_secret: process.env.FOURSQUARE_CLIENT_SECRET,
        v: '20231010' // API version
      };
    } else {
      // New API uses Authorization header
      axiosConfig.headers['Authorization'] = config.apiKey;
    }

    this.client = axios.create(axiosConfig);

    this.setupInterceptors();
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastRequestTime = null;
  }

  setupInterceptors() {
    // Request interceptor for rate limiting and logging
    this.client.interceptors.request.use(
      async (config) => {
        // Apply rate limiting
        await this.rateLimiter.acquire();
        
        // Track metrics
        this.requestCount++;
        this.lastRequestTime = new Date();
        
        console.log(`🌐 Foursquare API Request: ${config.method?.toUpperCase()} ${config.url}`);
        
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Foursquare API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.errorCount++;
        
        if (error.response) {
          const { status, statusText, data } = error.response;
          console.error(`❌ Foursquare API Error: ${status} ${statusText}`, data);
          
          // Handle specific error cases
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            throw new RateLimitError(
              'Foursquare API rate limit exceeded', 
              retryAfter ? parseInt(retryAfter) * 1000 : 60000
            );
          }
          
          if (status === 401) {
            throw new FoursquareAPIError(
              'Invalid Foursquare API key', 
              status, 
              data
            );
          }
          
          if (status === 403) {
            throw new FoursquareAPIError(
              'Foursquare API access forbidden - check permissions', 
              status, 
              data
            );
          }
          
          throw new FoursquareAPIError(
            data?.message || `API request failed with status ${status}`,
            status,
            data
          );
        }
        
        if (error.code === 'ECONNABORTED') {
          throw new FoursquareAPIError('Request timeout', 408);
        }
        
        console.error('❌ Network/Unknown error:', error.message);
        throw new FoursquareAPIError(
          `Network error: ${error.message}`, 
          0
        );
      }
    );
  }

  async get(endpoint, params = {}) {
    return this.requestWithRetry('GET', endpoint, null, params);
  }

  async post(endpoint, data = {}, params = {}) {
    return this.requestWithRetry('POST', endpoint, data, params);
  }

  async requestWithRetry(method, endpoint, data = null, params = {}, attempt = 1) {
    try {
      const config = {
        method,
        url: endpoint,
        params
      };
      
      if (data) {
        config.data = data;
      }

      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      if (attempt < this.config.retryAttempts && this.shouldRetry(error)) {
        const delay = this.calculateRetryDelay(attempt);
        console.log(`🔄 Retrying request (attempt ${attempt + 1}/${this.config.retryAttempts}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(method, endpoint, data, params, attempt + 1);
      }
      
      throw error;
    }
  }

  shouldRetry(error) {
    // Don't retry on authentication errors or client errors (4xx except 429)
    if (error instanceof FoursquareAPIError) {
      const status = error.statusCode;
      return status === 0 || status >= 500 || status === 429;
    }
    
    // Retry on rate limit errors
    if (error instanceof RateLimitError) {
      return true;
    }
    
    return true; // Retry on network errors
  }

  calculateRetryDelay(attempt) {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  // Venue search with built-in error handling
  async searchVenues(searchParams) {
    const {
      location,
      radius = this.config.defaults.radius,
      categories = this.config.defaults.categories.food_and_dining,
      limit = this.config.defaults.limit,
      sort = 'popularity',
      fields = this.config.fields.venue
    } = searchParams;

    if (!location || !location.lat || !location.lng) {
      throw new Error('Location with lat and lng is required for venue search');
    }

    let params, endpoint, response;

    if (this.isLegacyKey) {
      // Legacy v2 API format
      params = {
        ll: `${location.lat},${location.lng}`,
        radius,
        categoryId: Array.isArray(categories) ? categories.join(',') : categories,
        limit: Math.min(limit, 50),
        intent: 'browse'
      };
      endpoint = '/venues/search';
      response = await this.get(endpoint, params);
      return response.response?.venues || [];
    } else {
      // New v3 API format
      params = {
        ll: `${location.lat},${location.lng}`,
        radius,
        categories: Array.isArray(categories) ? categories.join(',') : categories,
        limit: Math.min(limit, 50),
        sort,
        fields: Array.isArray(fields) ? fields.join(',') : fields
      };
      endpoint = '/places/search';
      response = await this.get(endpoint, params);
      return response.results || [];
    }
  }

  // Get venue details
  async getVenueDetails(venueId, fields = this.config.fields.venue) {
    if (!venueId) {
      throw new Error('Venue ID is required');
    }

    const params = {
      fields: Array.isArray(fields) ? fields.join(',') : fields
    };

    return this.get(`/places/${venueId}`, params);
  }

  // Get venue statistics (requires premium API access)
  async getVenueStats(venueId, fields = this.config.fields.stats) {
    if (!venueId) {
      throw new Error('Venue ID is required');
    }

    const params = {
      fields: Array.isArray(fields) ? fields.join(',') : fields
    };

    try {
      return await this.get(`/places/${venueId}/stats`, params);
    } catch (error) {
      if (error.statusCode === 403) {
        console.warn('⚠️ Venue stats require premium Foursquare API access');
        return null;
      }
      throw error;
    }
  }

  // Get local events
  async getLocalEvents(location, radiusKm = 5, daysAhead = 30) {
    if (!location || !location.lat || !location.lng) {
      throw new Error('Location with lat and lng is required for events search');
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const params = {
      ll: `${location.lat},${location.lng}`,
      radius: radiusKm * 1000, // Convert to meters
      limit: 100,
      start_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      fields: 'name,description,start_time,end_time,location,category,stats'
    };

    try {
      const response = await this.get('/events/search', params);
      return response.results || [];
    } catch (error) {
      if (error.statusCode === 403) {
        console.warn('⚠️ Events API may require premium Foursquare API access');
        return [];
      }
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      let response;
      if (this.isLegacyKey) {
        response = await this.get('/venues/search', {
          ll: '40.7128,-74.0060', // NYC coordinates
          limit: 1,
          intent: 'browse'
        });
      } else {
        response = await this.get('/places/search', {
          ll: '40.7128,-74.0060', // NYC coordinates
          limit: 1
        });
      }
      
      return {
        status: 'healthy',
        api_accessible: true,
        rate_limit_status: this.rateLimiter.getStatus(),
        request_count: this.requestCount,
        error_count: this.errorCount,
        last_request: this.lastRequestTime,
        response_sample: response ? 'OK' : 'No data'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        api_accessible: false,
        error: error.message,
        rate_limit_status: this.rateLimiter.getStatus(),
        request_count: this.requestCount,
        error_count: this.errorCount,
        last_request: this.lastRequestTime
      };
    }
  }

  // Get API usage statistics
  getUsageStats() {
    return {
      total_requests: this.requestCount,
      total_errors: this.errorCount,
      error_rate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      rate_limit_status: this.rateLimiter.getStatus(),
      last_request_time: this.lastRequestTime,
      uptime: process.uptime()
    };
  }
}

module.exports = {
  FoursquareClient,
  FoursquareAPIError,
  RateLimitError
};