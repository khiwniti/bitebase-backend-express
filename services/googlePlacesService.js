const axios = require('axios');

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk';
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  // Search for places within radius for customer analysis
  async searchPlacesInRadius(lat, lng, radius = 5000, type = 'restaurant') {
    try {
      // If no API key, return mock data
      if (!this.apiKey || this.apiKey === 'AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk') {
        return this.getMockPlacesData(type, radius);
      }

      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius: radius,
          type: type,
          key: this.apiKey
        }
      });

      return {
        success: true,
        data: response.data.results,
        total: response.data.results.length
      };
    } catch (error) {
      console.error('Google Places API error:', error.message);
      // Return mock data on error
      return this.getMockPlacesData(type, radius);
    }
  }

  // Mock data generator for development
  getMockPlacesData(type, radius) {
    const mockData = {
      'restaurant': [
        { name: 'Bangkok Bistro', rating: 4.5, user_ratings_total: 120, price_level: 2 },
        { name: 'Street Food Corner', rating: 4.2, user_ratings_total: 89, price_level: 1 },
        { name: 'Fine Dining Palace', rating: 4.8, user_ratings_total: 200, price_level: 4 },
        { name: 'Local Thai Kitchen', rating: 4.3, user_ratings_total: 156, price_level: 2 },
        { name: 'International Cuisine', rating: 4.1, user_ratings_total: 78, price_level: 3 }
      ],
      'shopping_mall': [
        { name: 'Central World', rating: 4.4, user_ratings_total: 1500 },
        { name: 'MBK Center', rating: 4.2, user_ratings_total: 980 },
        { name: 'Siam Paragon', rating: 4.6, user_ratings_total: 2100 }
      ],
      'university': [
        { name: 'Chulalongkorn University', rating: 4.5, user_ratings_total: 500 },
        { name: 'Thammasat University', rating: 4.3, user_ratings_total: 350 }
      ],
      'school': [
        { name: 'Bangkok International School', rating: 4.4, user_ratings_total: 120 },
        { name: 'Local Primary School', rating: 4.1, user_ratings_total: 45 },
        { name: 'Secondary School', rating: 4.2, user_ratings_total: 67 }
      ],
      'hospital': [
        { name: 'Bangkok Hospital', rating: 4.3, user_ratings_total: 800 },
        { name: 'Bumrungrad Hospital', rating: 4.5, user_ratings_total: 1200 }
      ],
      'gym': [
        { name: 'Fitness First', rating: 4.2, user_ratings_total: 300 },
        { name: 'Virgin Active', rating: 4.4, user_ratings_total: 250 },
        { name: 'Local Gym', rating: 4.0, user_ratings_total: 89 }
      ],
      'bank': [
        { name: 'Bangkok Bank', rating: 4.1, user_ratings_total: 200 },
        { name: 'Kasikorn Bank', rating: 4.2, user_ratings_total: 180 },
        { name: 'SCB Bank', rating: 4.0, user_ratings_total: 150 },
        { name: 'Krung Thai Bank', rating: 3.9, user_ratings_total: 120 }
      ],
      'tourist_attraction': [
        { name: 'Grand Palace', rating: 4.6, user_ratings_total: 5000 },
        { name: 'Wat Pho Temple', rating: 4.5, user_ratings_total: 3200 }
      ],
      'park': [
        { name: 'Lumpini Park', rating: 4.4, user_ratings_total: 800 },
        { name: 'Chatuchak Park', rating: 4.2, user_ratings_total: 400 }
      ],
      'night_club': [
        { name: 'RCA Club', rating: 4.1, user_ratings_total: 150 },
        { name: 'Thonglor Nightclub', rating: 4.3, user_ratings_total: 200 }
      ],
      'bar': [
        { name: 'Sky Bar', rating: 4.5, user_ratings_total: 800 },
        { name: 'Rooftop Lounge', rating: 4.3, user_ratings_total: 400 },
        { name: 'Local Sports Bar', rating: 4.0, user_ratings_total: 120 }
      ]
    };

    const places = mockData[type] || [];
    return {
      success: true,
      data: places,
      total: places.length
    };
  }

  // Get detailed place information for customer demographics analysis
  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,price_level,types,geometry,formatted_address,reviews,opening_hours,photos',
          key: this.apiKey
        }
      });

      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      console.error('Google Places Details API error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Analyze customer demographics based on nearby places
  async analyzeCustomerDemographics(lat, lng, radius = 5000) {
    try {
      // Search for different types of places that indicate customer demographics
      const placeTypes = [
        'shopping_mall',
        'school',
        'university',
        'hospital',
        'gym',
        'bank',
        'subway_station',
        'bus_station',
        'tourist_attraction',
        'park',
        'movie_theater',
        'night_club',
        'bar'
      ];

      const demographicData = {};
      
      for (const type of placeTypes) {
        const places = await this.searchPlacesInRadius(lat, lng, radius, type);
        demographicData[type] = {
          count: places.data.length,
          places: places.data.slice(0, 5) // Top 5 places for each type
        };
      }

      // Analyze demographic patterns
      const analysis = this.analyzeDemographicPatterns(demographicData);

      return {
        success: true,
        data: {
          demographics: demographicData,
          analysis: analysis,
          location: { lat, lng, radius }
        }
      };
    } catch (error) {
      console.error('Customer demographics analysis error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Analyze patterns from demographic data
  analyzeDemographicPatterns(demographicData) {
    const analysis = {
      customerSegments: [],
      trafficPatterns: {},
      competitorDensity: 0,
      marketOpportunities: []
    };

    // Analyze customer segments based on nearby places
    if (demographicData.university?.count > 2) {
      analysis.customerSegments.push({
        segment: 'Students',
        confidence: 'high',
        indicators: ['Multiple universities nearby'],
        characteristics: ['Price-sensitive', 'Late-night dining', 'Group dining']
      });
    }

    if (demographicData.shopping_mall?.count > 1) {
      analysis.customerSegments.push({
        segment: 'Shoppers & Families',
        confidence: 'high',
        indicators: ['Shopping centers nearby'],
        characteristics: ['Weekend traffic', 'Family dining', 'Convenience-focused']
      });
    }

    if (demographicData.bank?.count > 3 || demographicData.hospital?.count > 1) {
      analysis.customerSegments.push({
        segment: 'Working Professionals',
        confidence: 'medium',
        indicators: ['Business district indicators'],
        characteristics: ['Lunch rush', 'Quick service', 'Higher spending power']
      });
    }

    if (demographicData.tourist_attraction?.count > 0) {
      analysis.customerSegments.push({
        segment: 'Tourists',
        confidence: 'medium',
        indicators: ['Tourist attractions nearby'],
        characteristics: ['Authentic experience seekers', 'Photo-friendly', 'Cultural cuisine interest']
      });
    }

    // Analyze traffic patterns
    analysis.trafficPatterns = {
      peakHours: this.predictPeakHours(demographicData),
      weekendTraffic: this.predictWeekendTraffic(demographicData),
      seasonalTrends: this.predictSeasonalTrends(demographicData)
    };

    // Calculate competitor density
    const restaurantCount = demographicData.restaurant?.count || 0;
    analysis.competitorDensity = restaurantCount;

    // Identify market opportunities
    if (demographicData.gym?.count > 2 && restaurantCount < 5) {
      analysis.marketOpportunities.push({
        opportunity: 'Healthy Food Market',
        description: 'High gym density suggests health-conscious customers',
        potential: 'high'
      });
    }

    if (demographicData.night_club?.count > 1 && demographicData.bar?.count > 2) {
      analysis.marketOpportunities.push({
        opportunity: 'Late Night Dining',
        description: 'Active nightlife suggests late-night food demand',
        potential: 'medium'
      });
    }

    return analysis;
  }

  predictPeakHours(demographicData) {
    const patterns = [];
    
    if (demographicData.school?.count > 0 || demographicData.university?.count > 0) {
      patterns.push('12:00-14:00 (Lunch break)');
      patterns.push('18:00-20:00 (After classes)');
    }
    
    if (demographicData.bank?.count > 2) {
      patterns.push('12:00-13:00 (Business lunch)');
      patterns.push('18:30-19:30 (After work)');
    }
    
    if (demographicData.shopping_mall?.count > 0) {
      patterns.push('12:00-15:00 (Shopping break)');
      patterns.push('19:00-21:00 (Dinner after shopping)');
    }

    return patterns.length > 0 ? patterns : ['12:00-14:00', '18:00-20:00'];
  }

  predictWeekendTraffic(demographicData) {
    if (demographicData.shopping_mall?.count > 1 || demographicData.tourist_attraction?.count > 0) {
      return 'high';
    } else if (demographicData.park?.count > 1) {
      return 'medium';
    }
    return 'low';
  }

  predictSeasonalTrends(demographicData) {
    const trends = [];
    
    if (demographicData.tourist_attraction?.count > 0) {
      trends.push('Peak during tourist season');
    }
    
    if (demographicData.university?.count > 0) {
      trends.push('Lower during university breaks');
    }
    
    if (demographicData.park?.count > 1) {
      trends.push('Higher during good weather');
    }

    return trends.length > 0 ? trends : ['Consistent year-round'];
  }

  // Get customer insights for specific location
  async getCustomerInsights(lat, lng, radius = 5000) {
    try {
      const demographics = await this.analyzeCustomerDemographics(lat, lng, radius);
      const nearbyRestaurants = await this.searchPlacesInRadius(lat, lng, radius, 'restaurant');
      
      // Calculate market metrics
      const marketMetrics = {
        competitorCount: nearbyRestaurants.data.length,
        averageRating: this.calculateAverageRating(nearbyRestaurants.data),
        priceDistribution: this.analyzePriceDistribution(nearbyRestaurants.data),
        marketSaturation: this.calculateMarketSaturation(nearbyRestaurants.data, radius)
      };

      return {
        success: true,
        data: {
          demographics: demographics.data,
          marketMetrics: marketMetrics,
          recommendations: this.generateRecommendations(demographics.data, marketMetrics)
        }
      };
    } catch (error) {
      console.error('Customer insights error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  calculateAverageRating(restaurants) {
    if (!restaurants.length) return 0;
    const totalRating = restaurants.reduce((sum, r) => sum + (r.rating || 0), 0);
    return (totalRating / restaurants.length).toFixed(1);
  }

  analyzePriceDistribution(restaurants) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, unknown: 0 };
    
    restaurants.forEach(restaurant => {
      const priceLevel = restaurant.price_level;
      if (priceLevel >= 1 && priceLevel <= 4) {
        distribution[priceLevel]++;
      } else {
        distribution.unknown++;
      }
    });

    return distribution;
  }

  calculateMarketSaturation(restaurants, radius) {
    // Calculate restaurants per square km
    const areaKm2 = Math.PI * Math.pow(radius / 1000, 2);
    const density = restaurants.length / areaKm2;
    
    if (density > 50) return 'high';
    if (density > 20) return 'medium';
    return 'low';
  }

  generateRecommendations(demographics, marketMetrics) {
    const recommendations = [];

    if (demographics?.analysis?.customerSegments?.some(s => s.segment === 'Students')) {
      recommendations.push({
        type: 'pricing',
        title: 'Student-Friendly Pricing',
        description: 'Consider student discounts and affordable meal options',
        priority: 'high'
      });
    }

    if (marketMetrics.competitorCount < 5) {
      recommendations.push({
        type: 'expansion',
        title: 'Market Opportunity',
        description: 'Low competition suggests good expansion potential',
        priority: 'high'
      });
    }

    if (parseFloat(marketMetrics.averageRating) < 4.0) {
      recommendations.push({
        type: 'quality',
        title: 'Quality Differentiation',
        description: 'Focus on quality to stand out from lower-rated competitors',
        priority: 'medium'
      });
    }

    return recommendations;
  }
}

module.exports = GooglePlacesService;