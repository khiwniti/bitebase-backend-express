const { Pool } = require('pg');
const axios = require('axios');
const { Client } = require('@googlemaps/google-maps-services-js');
const Redis = require('redis');

class RealDataService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.googleMapsClient = new Client({});
    
    // Only create Redis client if Redis URL is provided
    if (process.env.REDIS_URL) {
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL
      });
      this.initializeConnections();
    } else {
      console.log('⚠️ No Redis URL provided, continuing without caching...');
      this.redisClient = null;
    }
  }

  async initializeConnections() {
    try {
      await this.redisClient.connect();
      console.log('✅ Redis connected for real-time caching');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      console.log('⚠️ Continuing without Redis caching...');
      this.redisClient = null; // Disable Redis if connection fails
    }
  }

  // Real Google Places API integration
  async getRestaurantData(location, radius = 5000) {
    const cacheKey = `restaurants:${location.lat}:${location.lng}:${radius}`;
    
    // Check cache first (if Redis is available)
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('❌ Redis cache read error:', error);
      }
    }

    try {
      const response = await this.googleMapsClient.placesNearby({
        params: {
          location: `${location.lat},${location.lng}`,
          radius: radius,
          type: 'restaurant',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      const restaurants = response.data.results.map(place => ({
        id: place.place_id,
        name: place.name,
        location: place.geometry.location,
        rating: place.rating || 0,
        userRatingsTotal: place.user_ratings_total || 0,
        priceLevel: place.price_level || 0,
        types: place.types,
        vicinity: place.vicinity,
        businessStatus: place.business_status,
        photos: place.photos ? place.photos.slice(0, 3) : []
      }));

      // Cache for 1 hour (if Redis is available)
      if (this.redisClient) {
        try {
          await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(restaurants));
        } catch (error) {
          console.error('❌ Redis cache write error:', error);
        }
      }
      
      // Store in database for historical analysis
      await this.storeRestaurantData(restaurants);

      return restaurants;
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      throw error;
    }
  }

  // Store restaurant data in PostgreSQL
  async storeRestaurantData(restaurants) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const restaurant of restaurants) {
        await client.query(`
          INSERT INTO restaurants (
            place_id, name, lat, lng, rating, 
            user_ratings_total, price_level, types, 
            vicinity, business_status, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (place_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            user_ratings_total = EXCLUDED.user_ratings_total,
            business_status = EXCLUDED.business_status,
            last_updated = NOW()
        `, [
          restaurant.id,
          restaurant.name,
          restaurant.location.lat,
          restaurant.location.lng,
          restaurant.rating,
          restaurant.userRatingsTotal,
          restaurant.priceLevel,
          JSON.stringify(restaurant.types),
          restaurant.vicinity,
          restaurant.businessStatus
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Real demographic data from Census API or similar
  async getDemographicData(location, radius) {
    const cacheKey = `demographics:${location.lat}:${location.lng}:${radius}`;
    
    // Check cache first (if Redis is available)
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('❌ Redis cache read error:', error);
      }
    }

    try {
      // For production, integrate with real Census API
      // This is a placeholder for real API integration
      const demographics = await this.fetchCensusData(location, radius);
      
      // Cache for 24 hours (if Redis is available)
      if (this.redisClient) {
        try {
          await this.redisClient.setEx(cacheKey, 86400, JSON.stringify(demographics));
        } catch (error) {
          console.error('❌ Redis cache write error:', error);
        }
      }
      
      return demographics;
    } catch (error) {
      console.error('Error fetching demographic data:', error);
      throw error;
    }
  }

  // Real foot traffic data integration
  async getFootTrafficData(location, timeRange) {
    try {
      // Integrate with real foot traffic providers like:
      // - SafeGraph
      // - Placer.ai
      // - Foursquare
      
      const response = await this.fetchFootTrafficFromProvider(location, timeRange);
      
      // Process and normalize the data
      const processedData = this.processFootTrafficData(response);
      
      // Store for historical analysis
      await this.storeFootTrafficData(location, processedData);
      
      return processedData;
    } catch (error) {
      console.error('Error fetching foot traffic data:', error);
      throw error;
    }
  }

  // Real competitor analysis
  async getCompetitorAnalysis(location, radius, businessType) {
    const competitors = await this.getRestaurantData(location, radius);
    
    // Filter by business type if specified
    const filtered = businessType 
      ? competitors.filter(c => c.types.includes(businessType))
      : competitors;

    // Analyze competitor metrics
    const analysis = {
      totalCompetitors: filtered.length,
      averageRating: this.calculateAverage(filtered.map(c => c.rating)),
      priceDistribution: this.analyzePriceDistribution(filtered),
      topCompetitors: filtered
        .sort((a, b) => b.rating * b.userRatingsTotal - a.rating * a.userRatingsTotal)
        .slice(0, 10),
      marketGaps: await this.identifyMarketGaps(location, filtered),
      competitiveDensity: filtered.length / (Math.PI * Math.pow(radius / 1000, 2))
    };

    return analysis;
  }

  // Real sales data integration
  async getSalesMetrics(restaurantId, timeRange) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('day', transaction_date) as date,
          COUNT(*) as transaction_count,
          SUM(total_amount) as revenue,
          AVG(total_amount) as avg_ticket,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM sales_transactions
        WHERE restaurant_id = $1
          AND transaction_date BETWEEN $2 AND $3
        GROUP BY DATE_TRUNC('day', transaction_date)
        ORDER BY date
      `;

      const result = await this.pool.query(query, [
        restaurantId,
        timeRange.start,
        timeRange.end
      ]);

      return {
        daily: result.rows,
        summary: this.calculateSalesSummary(result.rows),
        trends: this.analyzeSalesTrends(result.rows)
      };
    } catch (error) {
      console.error('Error fetching sales metrics:', error);
      throw error;
    }
  }

  // Real customer behavior data
  async getCustomerBehavior(restaurantId, timeRange) {
    try {
      const queries = {
        visitFrequency: `
          SELECT 
            customer_id,
            COUNT(*) as visit_count,
            AVG(total_amount) as avg_spend,
            MAX(transaction_date) as last_visit
          FROM sales_transactions
          WHERE restaurant_id = $1
            AND transaction_date BETWEEN $2 AND $3
          GROUP BY customer_id
        `,
        
        peakHours: `
          SELECT 
            EXTRACT(HOUR FROM transaction_date) as hour,
            COUNT(*) as transaction_count,
            SUM(total_amount) as revenue
          FROM sales_transactions
          WHERE restaurant_id = $1
            AND transaction_date BETWEEN $2 AND $3
          GROUP BY EXTRACT(HOUR FROM transaction_date)
          ORDER BY hour
        `,
        
        popularItems: `
          SELECT 
            i.item_name,
            COUNT(*) as order_count,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.price * oi.quantity) as revenue
          FROM order_items oi
          JOIN items i ON oi.item_id = i.id
          JOIN sales_transactions st ON oi.transaction_id = st.id
          WHERE st.restaurant_id = $1
            AND st.transaction_date BETWEEN $2 AND $3
          GROUP BY i.item_name
          ORDER BY order_count DESC
          LIMIT 20
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.pool.query(query, [restaurantId, timeRange.start, timeRange.end]);
        results[key] = result.rows;
      }

      return {
        visitFrequency: this.analyzeVisitFrequency(results.visitFrequency),
        peakHours: results.peakHours,
        popularItems: results.popularItems,
        customerSegments: this.segmentCustomers(results.visitFrequency)
      };
    } catch (error) {
      console.error('Error fetching customer behavior:', error);
      throw error;
    }
  }

  // Real market trends from external APIs
  async getMarketTrends(industry, location) {
    try {
      // Integrate with real market data providers:
      // - Yelp Fusion API
      // - Google Trends API
      // - Industry reports APIs
      
      const trends = await Promise.all([
        this.fetchYelpTrends(location),
        this.fetchGoogleTrends(industry, location),
        this.fetchIndustryReports(industry)
      ]);

      return {
        localTrends: trends[0],
        searchTrends: trends[1],
        industryInsights: trends[2],
        recommendations: this.generateTrendRecommendations(trends)
      };
    } catch (error) {
      console.error('Error fetching market trends:', error);
      throw error;
    }
  }

  // Helper methods
  calculateAverage(numbers) {
    return numbers.length > 0 
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length 
      : 0;
  }

  analyzePriceDistribution(restaurants) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    restaurants.forEach(r => {
      if (r.priceLevel) distribution[r.priceLevel]++;
    });
    return distribution;
  }

  async identifyMarketGaps(location, existingRestaurants) {
    // Analyze what types of restaurants are missing
    const allTypes = [
      'italian', 'mexican', 'chinese', 'japanese', 'indian',
      'thai', 'vietnamese', 'american', 'french', 'mediterranean'
    ];

    const existingTypes = new Set();
    existingRestaurants.forEach(r => {
      r.types.forEach(t => existingTypes.add(t));
    });

    const gaps = allTypes.filter(type => !existingTypes.has(type));
    
    return {
      missingCuisines: gaps,
      underservedPricePoints: this.identifyPriceGaps(existingRestaurants),
      recommendations: gaps.slice(0, 3).map(cuisine => ({
        type: cuisine,
        estimatedDemand: 'high',
        competitionLevel: 'low'
      }))
    };
  }

  identifyPriceGaps(restaurants) {
    const priceCount = this.analyzePriceDistribution(restaurants);
    const gaps = [];
    
    [1, 2, 3, 4].forEach(level => {
      if (priceCount[level] < restaurants.length * 0.15) {
        gaps.push({
          priceLevel: level,
          count: priceCount[level],
          opportunity: 'high'
        });
      }
    });
    
    return gaps;
  }

  calculateSalesSummary(dailyData) {
    return {
      totalRevenue: dailyData.reduce((sum, d) => sum + parseFloat(d.revenue), 0),
      totalTransactions: dailyData.reduce((sum, d) => sum + parseInt(d.transaction_count), 0),
      averageDailyRevenue: this.calculateAverage(dailyData.map(d => parseFloat(d.revenue))),
      averageTicket: this.calculateAverage(dailyData.map(d => parseFloat(d.avg_ticket))),
      totalCustomers: dailyData.reduce((sum, d) => sum + parseInt(d.unique_customers), 0)
    };
  }

  analyzeSalesTrends(dailyData) {
    if (dailyData.length < 2) return { trend: 'insufficient_data' };

    const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
    const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));

    const firstHalfAvg = this.calculateAverage(firstHalf.map(d => parseFloat(d.revenue)));
    const secondHalfAvg = this.calculateAverage(secondHalf.map(d => parseFloat(d.revenue)));

    const growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return {
      trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
      growthRate: growthRate.toFixed(2) + '%',
      projection: this.projectFutureSales(dailyData)
    };
  }

  projectFutureSales(historicalData) {
    // Simple linear projection
    const recentDays = historicalData.slice(-7);
    const avgDailyGrowth = this.calculateDailyGrowthRate(recentDays);
    const lastRevenue = parseFloat(recentDays[recentDays.length - 1].revenue);

    return {
      next7Days: lastRevenue * Math.pow(1 + avgDailyGrowth, 7),
      next30Days: lastRevenue * Math.pow(1 + avgDailyGrowth, 30),
      confidence: 'medium'
    };
  }

  calculateDailyGrowthRate(data) {
    if (data.length < 2) return 0;
    
    let totalGrowth = 0;
    for (let i = 1; i < data.length; i++) {
      const growth = (parseFloat(data[i].revenue) - parseFloat(data[i-1].revenue)) / parseFloat(data[i-1].revenue);
      totalGrowth += growth;
    }
    
    return totalGrowth / (data.length - 1);
  }

  analyzeVisitFrequency(customerData) {
    const segments = {
      vip: customerData.filter(c => c.visit_count >= 10),
      regular: customerData.filter(c => c.visit_count >= 4 && c.visit_count < 10),
      occasional: customerData.filter(c => c.visit_count >= 2 && c.visit_count < 4),
      new: customerData.filter(c => c.visit_count === 1)
    };

    return {
      distribution: {
        vip: segments.vip.length,
        regular: segments.regular.length,
        occasional: segments.occasional.length,
        new: segments.new.length
      },
      avgSpendBySegment: {
        vip: this.calculateAverage(segments.vip.map(c => parseFloat(c.avg_spend))),
        regular: this.calculateAverage(segments.regular.map(c => parseFloat(c.avg_spend))),
        occasional: this.calculateAverage(segments.occasional.map(c => parseFloat(c.avg_spend))),
        new: this.calculateAverage(segments.new.map(c => parseFloat(c.avg_spend)))
      }
    };
  }

  segmentCustomers(customerData) {
    return customerData.map(customer => {
      const visitCount = parseInt(customer.visit_count);
      const avgSpend = parseFloat(customer.avg_spend);
      
      let segment = 'new';
      if (visitCount >= 10) segment = 'vip';
      else if (visitCount >= 4) segment = 'regular';
      else if (visitCount >= 2) segment = 'occasional';
      
      let spendLevel = 'low';
      if (avgSpend > 50) spendLevel = 'high';
      else if (avgSpend > 25) spendLevel = 'medium';
      
      return {
        ...customer,
        segment,
        spendLevel,
        lifetime_value: visitCount * avgSpend
      };
    }).sort((a, b) => b.lifetime_value - a.lifetime_value);
  }

  // Placeholder methods for external API integrations
  async fetchCensusData(location, radius) {
    // Integrate with real Census API
    // For now, return structured placeholder
    return {
      population: 50000,
      medianAge: 35,
      medianIncome: 65000,
      householdSize: 2.5,
      education: {
        highSchool: 0.85,
        bachelors: 0.35,
        graduate: 0.15
      }
    };
  }

  async fetchFootTrafficFromProvider(location, timeRange) {
    // Integrate with SafeGraph, Placer.ai, etc.
    return {
      hourly: Array(24).fill(0).map((_, hour) => ({
        hour,
        traffic: Math.floor(Math.random() * 1000 * Math.sin((hour - 6) * Math.PI / 12) + 100)
      }))
    };
  }

  processFootTrafficData(rawData) {
    return {
      hourly: rawData.hourly,
      daily: rawData.hourly.reduce((sum, h) => sum + h.traffic, 0),
      peak: Math.max(...rawData.hourly.map(h => h.traffic)),
      patterns: this.identifyTrafficPatterns(rawData.hourly)
    };
  }

  identifyTrafficPatterns(hourlyData) {
    const patterns = [];
    
    // Find peak hours
    const sortedHours = [...hourlyData].sort((a, b) => b.traffic - a.traffic);
    patterns.push({
      type: 'peak_hours',
      hours: sortedHours.slice(0, 3).map(h => h.hour),
      description: 'Highest traffic periods'
    });
    
    // Find quiet hours
    patterns.push({
      type: 'quiet_hours',
      hours: sortedHours.slice(-3).map(h => h.hour),
      description: 'Lowest traffic periods'
    });
    
    return patterns;
  }

  async storeFootTrafficData(location, data) {
    try {
      await this.pool.query(`
        INSERT INTO foot_traffic_data (
          lat, lng, date, hourly_data, daily_total, peak_traffic
        ) VALUES ($1, $2, NOW(), $3, $4, $5)
      `, [
        location.lat,
        location.lng,
        JSON.stringify(data.hourly),
        data.daily,
        data.peak
      ]);
    } catch (error) {
      console.error('Error storing foot traffic data:', error);
    }
  }

  async fetchYelpTrends(location) {
    // Integrate with Yelp Fusion API
    return {
      trendingCategories: ['plant-based', 'fusion', 'craft-cocktails'],
      risingSearches: ['vegan options', 'outdoor seating', 'delivery']
    };
  }

  async fetchGoogleTrends(industry, location) {
    // Integrate with Google Trends API
    return {
      searchVolume: {
        'restaurant near me': 100,
        'food delivery': 85,
        'dine in': 60
      },
      trending: ['ghost kitchen', 'meal kit', 'contactless dining']
    };
  }

  async fetchIndustryReports(industry) {
    // Integrate with industry report APIs
    return {
      growth: '5.2%',
      challenges: ['labor shortage', 'supply chain', 'inflation'],
      opportunities: ['technology adoption', 'delivery expansion', 'loyalty programs']
    };
  }

  generateTrendRecommendations(trends) {
    const recommendations = [];
    
    // Based on local trends
    if (trends[0].trendingCategories.includes('plant-based')) {
      recommendations.push({
        type: 'menu',
        action: 'Add plant-based options',
        priority: 'high',
        impact: 'Capture growing vegan/vegetarian market'
      });
    }
    
    // Based on search trends
    if (trends[1].searchVolume['food delivery'] > 80) {
      recommendations.push({
        type: 'operations',
        action: 'Optimize delivery operations',
        priority: 'high',
        impact: 'Meet high delivery demand'
      });
    }
    
    // Based on industry insights
    trends[2].opportunities.forEach(opp => {
      recommendations.push({
        type: 'strategic',
        action: `Invest in ${opp}`,
        priority: 'medium',
        impact: 'Stay competitive in evolving market'
      });
    });
    
    return recommendations;
  }
}

module.exports = RealDataService;