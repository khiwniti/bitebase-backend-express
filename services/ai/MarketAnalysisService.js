/**
 * Market Analysis Service
 * Provides AI-powered market intelligence and business insights
 */

const AnthropicClient = require('./AnthropicClient');
const { RestaurantDataService } = require('../RestaurantDataService');
const logger = require('../../utils/logger');

class MarketAnalysisService {
  constructor() {
    this.aiClient = new AnthropicClient();
    this.restaurantService = new RestaurantDataService();
  }

  /**
   * Generate comprehensive market analysis for a location
   */
  async generateMarketAnalysis(params) {
    try {
      const { latitude, longitude, businessType, radius = 1000 } = params;
      
      logger.info(`Generating market analysis for location: ${latitude}, ${longitude}`);
      
      // 1. Gather competitor data
      const competitors = await this.gatherCompetitorData(latitude, longitude, radius);
      
      // 2. Get demographic data (mock for now)
      const demographics = await this.getDemographicData(latitude, longitude);
      
      // 3. Prepare data for AI analysis
      const analysisData = {
        location: {
          latitude,
          longitude,
          address: `${latitude}, ${longitude}` // TODO: Reverse geocode
        },
        competitors,
        demographics,
        businessType: businessType || 'restaurant'
      };
      
      // 4. Generate AI insights
      const aiInsights = await this.aiClient.generateMarketAnalysis(analysisData);
      
      // 5. Enhance with additional metrics
      const enhancedAnalysis = await this.enhanceAnalysis(aiInsights, competitors, demographics);
      
      return {
        success: true,
        data: enhancedAnalysis,
        metadata: {
          location: { latitude, longitude },
          competitorCount: competitors.length,
          analysisRadius: radius,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error('Market analysis generation failed:', error);
      return {
        success: false,
        error: 'Failed to generate market analysis',
        details: error.message
      };
    }
  }

  /**
   * Gather competitor data from restaurant service
   */
  async gatherCompetitorData(latitude, longitude, radius) {
    try {
      const searchResult = await this.restaurantService.searchRestaurants({
        latitude,
        longitude,
        radius,
        limit: 20
      });
      
      if (searchResult.success) {
        return searchResult.data.restaurants || [];
      }
      
      logger.warn('No competitor data found, using mock data');
      return this.generateMockCompetitorData(latitude, longitude);
    } catch (error) {
      logger.error('Failed to gather competitor data:', error);
      // Return mock data instead of empty array
      logger.info('Using mock competitor data for analysis');
      return this.generateMockCompetitorData(latitude, longitude);
    }
  }

  /**
   * Generate mock competitor data for testing/demo purposes
   */
  generateMockCompetitorData(latitude, longitude) {
    const mockRestaurants = [
      {
        name: "Tony's Italian Bistro",
        latitude: latitude + 0.001,
        longitude: longitude + 0.001,
        cuisine: ['Italian'],
        priceRange: 3,
        rating: 4.2,
        reviewCount: 156
      },
      {
        name: "Burger Palace",
        latitude: latitude - 0.002,
        longitude: longitude + 0.002,
        cuisine: ['American'],
        priceRange: 2,
        rating: 3.8,
        reviewCount: 89
      },
      {
        name: "Sakura Sushi",
        latitude: latitude + 0.003,
        longitude: longitude - 0.001,
        cuisine: ['Japanese'],
        priceRange: 4,
        rating: 4.6,
        reviewCount: 203
      },
      {
        name: "Corner Cafe",
        latitude: latitude - 0.001,
        longitude: longitude - 0.002,
        cuisine: ['Cafe', 'American'],
        priceRange: 2,
        rating: 4.0,
        reviewCount: 67
      },
      {
        name: "Spice Garden",
        latitude: latitude + 0.002,
        longitude: longitude + 0.003,
        cuisine: ['Indian'],
        priceRange: 3,
        rating: 4.4,
        reviewCount: 134
      }
    ];

    logger.info(`Generated ${mockRestaurants.length} mock competitors for analysis`);
    return mockRestaurants;
  }

  /**
   * Get demographic data for location (mock implementation)
   */
  async getDemographicData(latitude, longitude) {
    // TODO: Integrate with census API or demographic data service
    return {
      population: 50000 + Math.random() * 100000,
      medianIncome: 45000 + Math.random() * 50000,
      ageGroups: {
        '18-24': 15 + Math.random() * 10,
        '25-34': 20 + Math.random() * 15,
        '35-44': 18 + Math.random() * 12,
        '45-54': 16 + Math.random() * 10,
        '55-64': 12 + Math.random() * 8,
        '65+': 10 + Math.random() * 8
      },
      educationLevel: {
        'high_school': 25 + Math.random() * 15,
        'some_college': 30 + Math.random() * 10,
        'bachelors': 25 + Math.random() * 15,
        'graduate': 15 + Math.random() * 10
      },
      householdTypes: {
        'single': 35 + Math.random() * 15,
        'couple': 25 + Math.random() * 10,
        'family_with_children': 30 + Math.random() * 15,
        'other': 10 + Math.random() * 5
      }
    };
  }

  /**
   * Enhance AI analysis with additional metrics
   */
  async enhanceAnalysis(aiInsights, competitors, demographics) {
    const enhanced = { ...aiInsights };
    
    // Add competitor analysis metrics
    enhanced.competitorMetrics = this.calculateCompetitorMetrics(competitors);
    
    // Add demographic insights
    enhanced.demographicInsights = this.analyzeDemographics(demographics);
    
    // Add location scoring
    enhanced.locationScore = this.calculateLocationScore(competitors, demographics);
    
    // Add market opportunity score
    enhanced.opportunityScore = this.calculateOpportunityScore(enhanced);
    
    return enhanced;
  }

  /**
   * Calculate competitor metrics
   */
  calculateCompetitorMetrics(competitors) {
    if (!competitors || competitors.length === 0) {
      return {
        totalCompetitors: 0,
        averageRating: 0,
        priceDistribution: {},
        cuisineDistribution: {},
        topCompetitors: []
      };
    }
    
    const ratings = competitors.map(c => c.rating).filter(r => r > 0);
    const averageRating = ratings.length > 0 ? 
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
    
    // Price distribution
    const priceDistribution = {};
    competitors.forEach(c => {
      const price = c.price_level || 1;
      priceDistribution[price] = (priceDistribution[price] || 0) + 1;
    });
    
    // Cuisine distribution
    const cuisineDistribution = {};
    competitors.forEach(c => {
      const cuisine = c.cuisine || 'unknown';
      cuisineDistribution[cuisine] = (cuisineDistribution[cuisine] || 0) + 1;
    });
    
    // Top competitors by rating
    const topCompetitors = competitors
      .filter(c => c.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        rating: c.rating,
        cuisine: c.cuisine,
        priceLevel: c.price_level
      }));
    
    return {
      totalCompetitors: competitors.length,
      averageRating: Math.round(averageRating * 10) / 10,
      priceDistribution,
      cuisineDistribution,
      topCompetitors
    };
  }

  /**
   * Analyze demographics for business insights
   */
  analyzeDemographics(demographics) {
    const insights = [];
    
    // Income analysis
    if (demographics.medianIncome > 60000) {
      insights.push("Higher income area - premium pricing opportunities");
    } else if (demographics.medianIncome < 40000) {
      insights.push("Lower income area - focus on value pricing");
    } else {
      insights.push("Middle income area - balanced pricing strategy");
    }
    
    // Age group analysis
    const ageGroups = demographics.ageGroups || {};
    const youngProfessionals = (ageGroups['25-34'] || 0) + (ageGroups['35-44'] || 0);
    if (youngProfessionals > 35) {
      insights.push("High young professional population - target lunch and happy hour");
    }
    
    const families = ageGroups['35-44'] || 0;
    if (families > 20) {
      insights.push("Significant family population - consider family-friendly options");
    }
    
    // Education analysis
    const education = demographics.educationLevel || {};
    const highEducation = (education.bachelors || 0) + (education.graduate || 0);
    if (highEducation > 35) {
      insights.push("Highly educated population - quality and unique experiences valued");
    }
    
    return {
      insights,
      targetDemographics: this.identifyTargetDemographics(demographics),
      marketingRecommendations: this.getDemographicMarketingRecommendations(demographics)
    };
  }

  /**
   * Identify target demographics
   */
  identifyTargetDemographics(demographics) {
    const targets = [];
    const ageGroups = demographics.ageGroups || {};
    
    if ((ageGroups['25-34'] || 0) > 20) {
      targets.push({
        segment: "Young Professionals",
        size: ageGroups['25-34'],
        characteristics: ["Tech-savvy", "Time-conscious", "Quality-focused"]
      });
    }
    
    if ((ageGroups['35-44'] || 0) > 18) {
      targets.push({
        segment: "Established Professionals",
        size: ageGroups['35-44'],
        characteristics: ["Higher disposable income", "Family-oriented", "Experience-focused"]
      });
    }
    
    const households = demographics.householdTypes || {};
    if ((households.family_with_children || 0) > 25) {
      targets.push({
        segment: "Families",
        size: households.family_with_children,
        characteristics: ["Value-conscious", "Kid-friendly needs", "Weekend dining"]
      });
    }
    
    return targets;
  }

  /**
   * Get demographic-based marketing recommendations
   */
  getDemographicMarketingRecommendations(demographics) {
    const recommendations = [];
    const ageGroups = demographics.ageGroups || {};
    
    if ((ageGroups['25-34'] || 0) > 20) {
      recommendations.push("Focus on social media marketing (Instagram, TikTok)");
      recommendations.push("Offer online ordering and delivery options");
    }
    
    if ((ageGroups['35-44'] || 0) > 18) {
      recommendations.push("Emphasize quality and experience in marketing");
      recommendations.push("Consider loyalty programs and email marketing");
    }
    
    const households = demographics.householdTypes || {};
    if ((households.family_with_children || 0) > 25) {
      recommendations.push("Develop family-friendly promotions and kids menu");
      recommendations.push("Partner with local schools and family events");
    }
    
    return recommendations;
  }

  /**
   * Calculate location score (1-100)
   */
  calculateLocationScore(competitors, demographics) {
    let score = 50; // Base score
    
    // Competition factor (fewer competitors = higher score)
    const competitorCount = competitors.length;
    if (competitorCount < 5) {
      score += 20;
    } else if (competitorCount < 10) {
      score += 10;
    } else if (competitorCount > 15) {
      score -= 15;
    }
    
    // Demographics factor
    if (demographics.medianIncome > 60000) {
      score += 15;
    } else if (demographics.medianIncome < 35000) {
      score -= 10;
    }
    
    // Population density factor
    if (demographics.population > 75000) {
      score += 10;
    } else if (demographics.population < 25000) {
      score -= 5;
    }
    
    return Math.max(1, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate market opportunity score (1-100)
   */
  calculateOpportunityScore(analysis) {
    let score = 50; // Base score
    
    // Market saturation factor
    if (analysis.marketSaturation < 5) {
      score += 25;
    } else if (analysis.marketSaturation < 7) {
      score += 15;
    } else if (analysis.marketSaturation > 8) {
      score -= 20;
    }
    
    // Success probability factor
    if (analysis.successProbability > 80) {
      score += 20;
    } else if (analysis.successProbability > 60) {
      score += 10;
    } else if (analysis.successProbability < 40) {
      score -= 15;
    }
    
    // Opportunities vs threats
    const opportunityCount = analysis.opportunities?.length || 0;
    const threatCount = analysis.threats?.length || 0;
    score += (opportunityCount - threatCount) * 5;
    
    return Math.max(1, Math.min(100, Math.round(score)));
  }

  /**
   * Health check for market analysis service
   */
  async healthCheck() {
    try {
      const aiHealth = await this.aiClient.healthCheck();
      return {
        service: 'Market Analysis Service',
        status: 'operational',
        aiClient: aiHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'Market Analysis Service',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = MarketAnalysisService;