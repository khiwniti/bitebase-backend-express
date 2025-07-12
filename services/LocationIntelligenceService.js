/**
 * Location Intelligence Service
 * Integrates all Foursquare services with caching and database persistence
 */

const { FoursquareClient } = require('./FoursquareClient');
const RestaurantDiscoveryService = require('./RestaurantDiscoveryService');
const FootTrafficAnalytics = require('./FootTrafficAnalytics');
const FoursquareCacheService = require('./FoursquareCacheService');

class LocationIntelligenceService {
  constructor(database = null) {
    // Initialize cache service
    this.cache = new FoursquareCacheService();
    
    // Initialize Foursquare client (still needed for Foursquare-specific services like events, traffic)
    this.foursquareClient = new FoursquareClient();
    
    // Initialize services
    // RestaurantDiscoveryService now manages its own client (FSQ or Google) based on ENV var
    this.restaurantDiscovery = new RestaurantDiscoveryService(database);
    // FootTrafficAnalytics currently remains Foursquare-specific
    this.trafficAnalytics = new FootTrafficAnalytics(this.foursquareClient, database);
    
    this.db = database;
    this.initialized = false;
  }

  /**
   * Initialize the service and all dependencies
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      console.log('🚀 Initializing Location Intelligence Service...');

      // Initialize cache connection
      const cacheConnected = await this.cache.connect();
      if (cacheConnected) {
        console.log('✅ Cache service initialized');
      } else {
        console.warn('⚠️ Cache service unavailable - continuing without cache');
      }

      // Test Restaurant Discovery Service's active data source connection
      const discoveryHealthCheck = await this.restaurantDiscovery.healthCheck();
      if (discoveryHealthCheck.status === 'healthy') {
        console.log(`✅ Restaurant Discovery's data source (${discoveryHealthCheck.client_source || 'unknown'}) connection verified`);
      } else {
        const clientSource = discoveryHealthCheck.client_source || 'configured discovery client';
        console.warn(`⚠️ Restaurant Discovery's data source (${clientSource}) health check failed:`, discoveryHealthCheck.error || discoveryHealthCheck.reason);
        throw new Error(`Primary data source (${clientSource}) for restaurant discovery is not accessible.`);
      }

      // Additionally, if Foursquare is used by other parts (like trafficAnalytics, getLocalEvents), check its health.
      // This is somewhat redundant if discovery service is also using Foursquare, but good for clarity if they diverge.
      if (this.trafficAnalytics || true) { // Assuming trafficAnalytics always needs Foursquare for now
          const foursquareSpecificHealth = await this.foursquareClient.healthCheck();
          if (foursquareSpecificHealth.status === 'healthy') {
              console.log('✅ Foursquare API connection verified (for auxiliary services like traffic/events).');
          } else {
              console.warn('⚠️ Foursquare API (for auxiliary services) health check failed:', foursquareSpecificHealth.error);
              // Depending on criticality, we might throw an error or just log a warning.
              // For now, let's consider it a warning as discovery might use Google.
          }
      }


      // Set database reference for services
      if (this.db) {
        this.restaurantDiscovery.setDatabase(this.db);
        this.trafficAnalytics.setDatabase(this.db);
      }

      this.initialized = true;
      console.log('✅ Location Intelligence Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Location Intelligence Service:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive location report for a restaurant
   */
  async generateLocationReport(restaurantId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`📊 Generating location report for restaurant: ${restaurantId}`);

      // Get restaurant data from database
      const restaurant = await this.getRestaurantById(restaurantId);
      if (!restaurant) {
        throw new Error(`Restaurant not found: ${restaurantId}`);
      }

      const location = {
        lat: restaurant.latitude,
        lng: restaurant.longitude
      };

      // Check for cached report
      const cacheKey = `report:${restaurantId}:${new Date().toDateString()}`;
      const cachedReport = await this.cache.redis?.get(cacheKey);
      
      if (cachedReport && !options.forceRefresh) {
        console.log('📋 Using cached location report');
        return JSON.parse(cachedReport);
      }

      // Run parallel analysis
      console.log('🔄 Running parallel location analysis...');
      const [
        competitorAnalysis,
        areaTraffic,
        events
      ] = await Promise.all([
        this.getCompetitorAnalysisWithCache(location, options.radius || 2000),
        this.getAreaTrafficWithCache(location, options.radius || 1000),
        this.getLocalEventsWithCache(location, 5, 30) // 5km, 30 days
      ]);

      // Generate integrated insights
      const locationScore = this.calculateLocationScore(areaTraffic, competitorAnalysis);
      const recommendations = this.generateLocationRecommendations(
        areaTraffic, 
        competitorAnalysis, 
        events, 
        restaurant
      );

      const report = {
        restaurant_id: restaurantId,
        restaurant_name: restaurant.name,
        location: {
          latitude: location.lat,
          longitude: location.lng,
          address: restaurant.address || 'Address not available'
        },
        generated_at: new Date().toISOString(),
        location_score: locationScore,
        competitor_analysis: competitorAnalysis,
        foot_traffic: areaTraffic,
        local_events: {
          total_events: events.length,
          high_impact_events: events.filter(e => e.traffic_impact_score > 70),
          upcoming_events: events.slice(0, 5)
        },
        recommendations: recommendations,
        data_freshness: {
          competitor_data: competitorAnalysis.analysis_date,
          traffic_data: areaTraffic.analysis_date,
          events_data: new Date().toISOString()
        },
        cache_info: {
          cached_at: new Date().toISOString(),
          expires_in_hours: 6
        }
      };

      // Cache the report for 6 hours
      if (this.cache.isAvailable()) {
        await this.cache.redis.setEx(cacheKey, 21600, JSON.stringify(report));
      }

      // Store report in database
      await this.storeLocationReport(report);

      console.log('✅ Location report generated successfully');
      return report;
    } catch (error) {
      console.error('❌ Error generating location report:', error);
      throw new Error(`Failed to generate location report: ${error.message}`);
    }
  }

  /**
   * Get competitor analysis with caching
   */
  async getCompetitorAnalysisWithCache(location, radius = 2000) {
    // Check cache first
    const cached = await this.cache.getCachedCompetitorAnalysis(
      location.lat, 
      location.lng, 
      radius
    );

    if (cached) {
      return cached;
    }

    // Generate new analysis
    const analysis = await this.restaurantDiscovery.getCompetitorAnalysis(location, radius);
    
    // Cache the result
    await this.cache.setCachedCompetitorAnalysis(
      location.lat, 
      location.lng, 
      radius, 
      analysis
    );

    return analysis;
  }

  /**
   * Get area traffic analysis with caching
   */
  async getAreaTrafficWithCache(location, radius = 1000) {
    // Check cache first
    const cached = await this.cache.getCachedAreaAnalysis(
      location.lat, 
      location.lng, 
      radius
    );

    if (cached) {
      return cached;
    }

    // Generate new analysis
    const analysis = await this.trafficAnalytics.analyzeAreaTraffic(location, radius);
    
    // Cache the result
    await this.cache.setCachedAreaAnalysis(
      location.lat, 
      location.lng, 
      radius, 
      analysis
    );

    return analysis;
  }

  /**
   * Get local events with caching
   */
  async getLocalEventsWithCache(location, radiusKm = 5, daysAhead = 30) {
    // Check cache first
    const cached = await this.cache.getCachedEvents(
      location.lat, 
      location.lng, 
      radiusKm, 
      daysAhead
    );

    if (cached) {
      return cached.events || [];
    }

    // Get fresh events data
    const events = await this.foursquareClient.getLocalEvents(location, radiusKm, daysAhead);
    
    // Process and enhance events data
    const processedEvents = events.map(event => ({
      ...event,
      traffic_impact_score: this.calculateEventImpactScore(event, location),
      distance_km: this.calculateDistance(location, {
        lat: event.latitude || event.location?.latitude,
        lng: event.longitude || event.location?.longitude
      })
    }));

    // Cache the result
    await this.cache.setCachedEvents(
      location.lat, 
      location.lng, 
      radiusKm, 
      daysAhead, 
      processedEvents
    );

    return processedEvents;
  }

  /**
   * Calculate overall location score (0-100)
   */
  calculateLocationScore(areaTraffic, competitorAnalysis) {
    // Traffic score (40% weight)
    const trafficScore = Math.min(40, (areaTraffic.opportunity_score || 0) * 0.4);
    
    // Competition score (40% weight) - lower competition score is better
    const competitionScore = competitorAnalysis.overall_competition_score 
      ? Math.max(0, 40 - (competitorAnalysis.overall_competition_score * 0.4))
      : 20;
    
    // Market potential score (20% weight)
    const marketScore = this.calculateMarketPotential(areaTraffic, competitorAnalysis) * 0.2;
    
    return Math.round(trafficScore + competitionScore + marketScore);
  }

  /**
   * Calculate market potential score
   */
  calculateMarketPotential(areaTraffic, competitorAnalysis) {
    let potential = 50; // Base score

    // Adjust based on foot traffic
    if (areaTraffic.average_daily_visits > 200) potential += 20;
    else if (areaTraffic.average_daily_visits > 100) potential += 10;
    else if (areaTraffic.average_daily_visits < 50) potential -= 15;

    // Adjust based on competition
    if (competitorAnalysis.competition_density < 5) potential += 15;
    else if (competitorAnalysis.competition_density > 15) potential -= 15;

    // Adjust based on market opportunity
    if (competitorAnalysis.market_analysis?.opportunity_level === 'high') potential += 15;
    else if (competitorAnalysis.market_analysis?.opportunity_level === 'low') potential -= 10;

    return Math.max(0, Math.min(100, potential));
  }

  /**
   * Generate location-specific recommendations
   */
  generateLocationRecommendations(areaTraffic, competitorAnalysis, events, restaurant) {
    const recommendations = [];

    // Traffic-based recommendations
    if (areaTraffic.average_daily_visits < 100) {
      recommendations.push({
        category: 'marketing',
        priority: 'high',
        title: 'Boost Local Awareness',
        description: 'Low foot traffic area requires strong marketing and community engagement',
        expected_impact: 'Medium'
      });
    }

    // Peak hours recommendations
    if (areaTraffic.peak_hours?.length > 0) {
      const peakHourText = areaTraffic.peak_hours.map(h => `${h}:00`).join(', ');
      recommendations.push({
        category: 'operations',
        priority: 'medium',
        title: 'Optimize Staffing for Peak Hours',
        description: `Peak traffic hours are ${peakHourText}. Consider adjusting staff schedules and inventory`,
        expected_impact: 'High'
      });
    }

    // Competition-based recommendations
    if (competitorAnalysis.overall_competition_score > 70) {
      recommendations.push({
        category: 'strategy',
        priority: 'high',
        title: 'Strong Differentiation Required',
        description: 'High competition area requires unique value proposition and exceptional service',
        expected_impact: 'High'
      });
    }

    // Event-based recommendations
    const highImpactEvents = events.filter(e => e.traffic_impact_score > 70);
    if (highImpactEvents.length > 0) {
      recommendations.push({
        category: 'events',
        priority: 'medium',
        title: 'Leverage Local Events',
        description: `${highImpactEvents.length} high-impact events coming up. Consider event-specific promotions`,
        expected_impact: 'Medium'
      });
    }

    // Market opportunity recommendations
    if (competitorAnalysis.opportunities?.length > 0) {
      recommendations.push({
        category: 'opportunity',
        priority: 'medium',
        title: 'Market Gap Opportunities',
        description: competitorAnalysis.opportunities[0], // First opportunity
        expected_impact: 'Medium'
      });
    }

    return recommendations;
  }

  /**
   * Calculate event impact score
   */
  calculateEventImpactScore(event, restaurantLocation) {
    let score = 50; // Base score

    // Distance impact (closer = higher impact)
    const distance = this.calculateDistance(restaurantLocation, {
      lat: event.latitude || event.location?.latitude,
      lng: event.longitude || event.location?.longitude
    });

    if (distance < 0.5) score += 30; // Within 500m
    else if (distance < 1) score += 20; // Within 1km
    else if (distance < 2) score += 10; // Within 2km
    else if (distance > 5) score -= 20; // More than 5km

    // Attendance impact
    if (event.expected_attendance > 5000) score += 20;
    else if (event.expected_attendance > 1000) score += 10;
    else if (event.expected_attendance < 100) score -= 10;

    // Event type impact
    const eventType = event.category?.toLowerCase() || '';
    if (eventType.includes('food') || eventType.includes('festival')) score += 15;
    else if (eventType.includes('sports') || eventType.includes('concert')) score += 10;
    else if (eventType.includes('business') || eventType.includes('conference')) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate distance between two coordinates (in km)
   */
  calculateDistance(point1, point2) {
    if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
      return 999; // Return large distance for invalid coordinates
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRad(value) {
    return value * Math.PI / 180;
  }

  /**
   * Get restaurant by ID from database
   */
  async getRestaurantById(restaurantId) {
    if (!this.db) {
      // Return mock data if no database connection
      return {
        id: restaurantId,
        name: 'Demo Restaurant',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY'
      };
    }

    try {
      const query = `
        SELECT 
          id, name, 
          ST_Y(location) as latitude, 
          ST_X(location) as longitude,
          cuisine_types, price_range, rating
        FROM restaurants 
        WHERE id = $1 AND is_active = TRUE
      `;
      
      const result = await this.db.query(query, [restaurantId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error retrieving restaurant:', error);
      throw error;
    }
  }

  /**
   * Store location report in database
   */
  async storeLocationReport(report) {
    if (!this.db) return;

    try {
      const query = `
        INSERT INTO location_intelligence_reports (
          restaurant_id, report_type, location_score, insights, 
          recommendations, metrics, charts_data, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (restaurant_id, report_type) 
        WHERE DATE(generated_at) = CURRENT_DATE
        DO UPDATE SET
          location_score = EXCLUDED.location_score,
          insights = EXCLUDED.insights,
          recommendations = EXCLUDED.recommendations,
          metrics = EXCLUDED.metrics,
          charts_data = EXCLUDED.charts_data,
          expires_at = EXCLUDED.expires_at,
          generated_at = NOW()
      `;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6); // Expire in 6 hours

      await this.db.query(query, [
        report.restaurant_id,
        'comprehensive',
        report.location_score,
        JSON.stringify({
          traffic_insights: report.foot_traffic.insights,
          competitor_insights: report.competitor_analysis
        }),
        JSON.stringify(report.recommendations),
        JSON.stringify({
          foot_traffic: report.foot_traffic.average_daily_visits,
          competition_density: report.competitor_analysis.competition_density,
          opportunity_score: report.foot_traffic.opportunity_score
        }),
        JSON.stringify({
          hourly_traffic: report.foot_traffic.hourly_distribution,
          competitor_breakdown: report.competitor_analysis.top_competitors
        }),
        expiresAt
      ]);

      console.log('✅ Location report stored in database');
    } catch (error) {
      console.warn('⚠️ Error storing location report:', error.message);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const status = {
      service: 'LocationIntelligenceService',
      timestamp: new Date().toISOString(),
      initialized: this.initialized,
      components: {}
    };

    try {
      // Check Restaurant Discovery Service's active client
      const discoveryClientHealth = await this.restaurantDiscovery.healthCheck();
      const discoveryClientKey = `discovery_client_${discoveryClientHealth.client_source || 'unknown'}`;
      status.components[discoveryClientKey] = discoveryClientHealth;

      // Check Foursquare API (if used for other services like traffic/events)
      // We can label this more clearly if it's distinct from the discovery client
      const foursquareAuxHealth = await this.foursquareClient.healthCheck();
      status.components.foursquare_aux_services_api = {
        ...foursquareAuxHealth,
        purpose: "Used for traffic analytics and local events"
      };

      // Check cache
      const cacheStats = await this.cache.getCacheStats();
      status.components.cache = cacheStats;

      // Check database
      if (this.db) {
        try {
          await this.db.query('SELECT 1');
          status.components.database = { status: 'healthy', connected: true };
        } catch (error) {
          status.components.database = { status: 'unhealthy', error: error.message };
        }
      } else {
        status.components.database = { status: 'not_configured' };
      }

      // Overall status
      const allHealthy = Object.values(status.components).every(
        component => component.status === 'healthy' || component.connected === true
      );
      status.overall_status = allHealthy ? 'healthy' : 'degraded';

    } catch (error) {
      status.overall_status = 'unhealthy';
      status.error = error.message;
    }

    return status;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.cache.disconnect();
      console.log('✅ Location Intelligence Service cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

module.exports = LocationIntelligenceService;