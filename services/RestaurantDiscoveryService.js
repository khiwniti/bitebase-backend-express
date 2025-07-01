/**
 * Restaurant Discovery Service
 * Handles venue discovery, competitor analysis, and restaurant intelligence
 */

const { FoursquareClient } = require('./FoursquareClient');
const { foursquareConfig } = require('../config/foursquare');

class RestaurantDiscoveryService {
  constructor(foursquareClient = null, database = null) {
    this.foursquare = foursquareClient || new FoursquareClient();
    this.db = database; // Database pool will be injected
    
    // Category mappings for different restaurant types
    this.categoryMap = {
      'fast_food': ['13145', '13146'], // Quick Service, Fast Food
      'casual_dining': ['13065', '13066'], // Casual Dining, Family Restaurant  
      'fine_dining': ['13064'], // Fine Dining
      'cafe': ['13032', '13033'], // Café, Coffee Shop
      'pizza': ['13064'], // Pizza Place
      'asian': ['13072', '13073'], // Asian, Chinese
      'mexican': ['13074'], // Mexican
      'italian': ['13066'], // Italian
      'all_dining': ['13000'] // General Food and Dining
    };
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Find nearby restaurants using Foursquare API
   */
  async findNearbyRestaurants(searchParams) {
    const {
      location,
      radius = 1000,
      categories = this.categoryMap.all_dining,
      limit = 50,
      sort = 'popularity',
      chains = null,
      priceRange = null
    } = searchParams;

    if (!location || !location.lat || !location.lng) {
      throw new Error('Location with lat and lng is required');
    }

    try {
      // Use the Foursquare client's searchVenues method
      const venues = await this.foursquare.searchVenues({
        location,
        radius,
        categories: Array.isArray(categories) ? categories : [categories],
        limit,
        sort
      });

      // Filter and enhance the results
      let filteredVenues = venues;

      // Apply chain filter if specified
      if (chains && chains.length > 0) {
        filteredVenues = venues.filter(venue => 
          venue.chains && venue.chains.some(chain => 
            chains.includes(chain.name.toLowerCase())
          )
        );
      }

      // Apply price range filter if specified
      if (priceRange && priceRange.length === 2) {
        filteredVenues = filteredVenues.filter(venue => 
          venue.price >= priceRange[0] && venue.price <= priceRange[1]
        );
      }

      // Store venues in database for future reference
      if (this.db && filteredVenues.length > 0) {
        await this.storeVenuesInDatabase(filteredVenues);
      }

      return filteredVenues.map(venue => this.transformVenueData(venue));
    } catch (error) {
      console.error('❌ Error finding nearby restaurants:', error);
      throw new Error(`Failed to find nearby restaurants: ${error.message}`);
    }
  }

  /**
   * Get comprehensive competitor analysis for a restaurant location
   */
  async getCompetitorAnalysis(restaurantLocation, radius = 2000) {
    if (!restaurantLocation || !restaurantLocation.lat || !restaurantLocation.lng) {
      throw new Error('Restaurant location with lat and lng is required');
    }

    try {
      console.log(`🔍 Starting competitor analysis for location: ${restaurantLocation.lat}, ${restaurantLocation.lng}`);

      // Find all restaurants in the area
      const competitors = await this.findNearbyRestaurants({
        location: restaurantLocation,
        radius,
        limit: 50,
        sort: 'popularity'
      });

      // Get detailed information for top competitors
      const detailedCompetitors = await Promise.all(
        competitors.slice(0, 20).map(async (venue) => {
          try {
            const details = await this.getVenueDetails(venue.fsq_id);
            const visitStats = await this.getVenueVisitStats(venue.fsq_id);
            return { 
              ...venue, 
              details: details || {}, 
              visitStats: visitStats || {} 
            };
          } catch (error) {
            console.warn(`⚠️ Failed to get details for venue ${venue.fsq_id}:`, error.message);
            return venue; // Return basic venue data if detailed lookup fails
          }
        })
      );

      // Analyze the competitive landscape
      const analysis = this.analyzeCompetitors(detailedCompetitors, restaurantLocation);

      // Store analysis in database
      if (this.db) {
        await this.storeCompetitorAnalysis(restaurantLocation, analysis);
      }

      return analysis;
    } catch (error) {
      console.error('❌ Error in competitor analysis:', error);
      throw new Error(`Failed to analyze competitors: ${error.message}`);
    }
  }

  /**
   * Get detailed venue information
   */
  async getVenueDetails(venueId) {
    try {
      return await this.foursquare.getVenueDetails(venueId);
    } catch (error) {
      console.warn(`⚠️ Failed to get venue details for ${venueId}:`, error.message);
      return null;
    }
  }

  /**
   * Get venue visit statistics (requires premium API)
   */
  async getVenueVisitStats(venueId) {
    try {
      return await this.foursquare.getVenueStats(venueId);
    } catch (error) {
      console.warn(`⚠️ Failed to get venue stats for ${venueId}:`, error.message);
      return null;
    }
  }

  /**
   * Analyze competitors and generate insights
   */
  analyzeCompetitors(competitors, restaurantLocation) {
    const totalCompetitors = competitors.length;
    
    if (totalCompetitors === 0) {
      return {
        total_competitors: 0,
        competition_density: 0,
        market_analysis: {
          opportunity_level: 'high',
          message: 'Low competition area with good market opportunity'
        },
        nearby_competitors: [],
        competitive_advantages: ['First mover advantage', 'Low competition'],
        threats: [],
        opportunities: ['Market leadership potential', 'Brand establishment'],
        overall_score: 85
      };
    }

    // Calculate metrics
    const ratings = competitors.filter(c => c.rating).map(c => c.rating);
    const prices = competitors.filter(c => c.price).map(c => c.price);
    const popularityScores = competitors.filter(c => c.popularity).map(c => c.popularity);

    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : 0;
    const avgPopularity = popularityScores.length > 0 ? popularityScores.reduce((a, b) => a + b) / popularityScores.length : 0;

    // Calculate competition density (competitors per km²)
    const areaKm2 = Math.PI * Math.pow(2, 2); // 2km radius = π * 4 km²
    const competitionDensity = totalCompetitors / areaKm2;

    // Determine market positioning
    const marketAnalysis = this.analyzeMarketPosition(
      totalCompetitors, 
      avgRating, 
      avgPrice, 
      competitionDensity
    );

    // Identify top competitors
    const topCompetitors = competitors
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 5)
      .map(competitor => ({
        name: competitor.name,
        rating: competitor.rating || 0,
        price: competitor.price || 0,
        popularity: competitor.popularity || 0,
        distance: competitor.distance || 0,
        categories: competitor.categories || [],
        strengths: this.identifyCompetitorStrengths(competitor),
        weaknesses: this.identifyCompetitorWeaknesses(competitor)
      }));

    // Generate insights
    const competitiveAdvantages = this.identifyCompetitiveAdvantages(avgRating, avgPrice, avgPopularity);
    const threats = this.identifyThreats(competitors, avgRating, avgPrice);
    const opportunities = this.identifyOpportunities(competitors, marketAnalysis);

    // Calculate overall competition score (0-100, lower = more favorable)
    const overallScore = this.calculateCompetitionScore(
      competitionDensity,
      avgRating,
      avgPrice,
      avgPopularity
    );

    return {
      total_competitors: totalCompetitors,
      competition_density: parseFloat(competitionDensity.toFixed(2)),
      avg_competitor_rating: parseFloat(avgRating.toFixed(1)),
      avg_competitor_price: parseFloat(avgPrice.toFixed(1)),
      avg_competitor_popularity: parseInt(avgPopularity),
      market_analysis: marketAnalysis,
      top_competitors: topCompetitors,
      competitive_advantages: competitiveAdvantages,
      threats: threats,
      opportunities: opportunities,
      overall_competition_score: overallScore,
      analysis_date: new Date().toISOString(),
      radius_analyzed: 2000
    };
  }

  /**
   * Analyze market position based on competition metrics
   */
  analyzeMarketPosition(totalCompetitors, avgRating, avgPrice, density) {
    let opportunityLevel, message;

    if (density < 2) {
      opportunityLevel = 'high';
      message = 'Low competition density creates excellent market opportunity';
    } else if (density < 5) {
      opportunityLevel = 'medium';
      message = 'Moderate competition with room for differentiation';
    } else {
      opportunityLevel = 'low';
      message = 'High competition requires strong differentiation strategy';
    }

    return {
      opportunity_level: opportunityLevel,
      message: message,
      competition_density_level: density < 2 ? 'low' : density < 5 ? 'medium' : 'high',
      average_market_rating: avgRating,
      average_market_price: avgPrice,
      recommendations: this.generateMarketRecommendations(density, avgRating, avgPrice)
    };
  }

  /**
   * Generate market-specific recommendations
   */
  generateMarketRecommendations(density, avgRating, avgPrice) {
    const recommendations = [];

    if (density < 2) {
      recommendations.push('Consider premium positioning due to low competition');
      recommendations.push('Focus on building brand awareness in the area');
    } else if (density >= 5) {
      recommendations.push('Strong differentiation strategy required');
      recommendations.push('Consider unique cuisine or dining experience');
    }

    if (avgRating < 3.5) {
      recommendations.push('Opportunity to lead with superior service quality');
    } else if (avgRating > 4.2) {
      recommendations.push('High-quality competition requires excellence in execution');
    }

    if (avgPrice < 2) {
      recommendations.push('Opportunity for mid-range or premium positioning');
    } else if (avgPrice > 3) {
      recommendations.push('Consider value positioning or unique value proposition');
    }

    return recommendations;
  }

  /**
   * Identify competitive advantages based on market analysis
   */
  identifyCompetitiveAdvantages(avgRating, avgPrice, avgPopularity) {
    const advantages = [];

    if (avgRating < 4.0) {
      advantages.push('Service quality differentiation opportunity');
    }

    if (avgPrice > 2.5) {
      advantages.push('Value pricing opportunity');
    }

    if (avgPopularity < 70) {
      advantages.push('Marketing and brand awareness opportunity');
    }

    advantages.push('New entrant can leverage latest technology and trends');
    advantages.push('Opportunity to learn from competitor weaknesses');

    return advantages;
  }

  /**
   * Identify potential threats from competitors
   */
  identifyThreats(competitors, avgRating, avgPrice) {
    const threats = [];

    const highRatedCompetitors = competitors.filter(c => c.rating && c.rating >= 4.5);
    if (highRatedCompetitors.length > 0) {
      threats.push(`${highRatedCompetitors.length} high-rated competitors (4.5+ stars)`);
    }

    const lowPricedCompetitors = competitors.filter(c => c.price && c.price <= 1);
    if (lowPricedCompetitors.length > 0) {
      threats.push(`${lowPricedCompetitors.length} budget-friendly competitors`);
    }

    const chainCompetitors = competitors.filter(c => c.chains && c.chains.length > 0);
    if (chainCompetitors.length > 0) {
      threats.push(`${chainCompetitors.length} established chain restaurants`);
    }

    if (competitors.length > 10) {
      threats.push('Highly saturated market with intense competition');
    }

    return threats;
  }

  /**
   * Identify market opportunities
   */
  identifyOpportunities(competitors, marketAnalysis) {
    const opportunities = [];

    // Cuisine gap analysis
    const cuisineTypes = competitors.flatMap(c => 
      c.categories ? c.categories.map(cat => cat.name) : []
    );
    
    const cuisineCounts = cuisineTypes.reduce((acc, cuisine) => {
      acc[cuisine] = (acc[cuisine] || 0) + 1;
      return acc;
    }, {});

    // Identify underrepresented cuisines
    const underrepresented = Object.entries(cuisineCounts)
      .filter(([cuisine, count]) => count <= 2)
      .map(([cuisine]) => cuisine);

    if (underrepresented.length > 0) {
      opportunities.push(`Underrepresented cuisines: ${underrepresented.slice(0, 3).join(', ')}`);
    }

    // Price point opportunities
    const priceCounts = competitors.reduce((acc, c) => {
      if (c.price) acc[c.price] = (acc[c.price] || 0) + 1;
      return acc;
    }, {});

    if (!priceCounts[1] || priceCounts[1] < 3) {
      opportunities.push('Budget-friendly dining gap in market');
    }
    if (!priceCounts[4] || priceCounts[4] < 2) {
      opportunities.push('Premium dining opportunity');
    }

    // General opportunities
    if (marketAnalysis.opportunity_level === 'high') {
      opportunities.push('Low competition allows for market leadership');
    }

    opportunities.push('Opportunity to leverage social media and modern marketing');
    
    return opportunities;
  }

  /**
   * Calculate overall competition score (0-100, lower is better for new restaurants)
   */
  calculateCompetitionScore(density, avgRating, avgPrice, avgPopularity) {
    // Base score from competition density (40% weight)
    const densityScore = Math.min(density * 10, 40);
    
    // Quality competition penalty (30% weight)
    const qualityScore = avgRating > 4.0 ? 30 : avgRating > 3.5 ? 20 : 10;
    
    // Price competition factor (20% weight)
    const priceScore = avgPrice < 2 ? 20 : avgPrice < 3 ? 15 : 10;
    
    // Popularity factor (10% weight)
    const popularityScore = avgPopularity > 80 ? 10 : avgPopularity > 60 ? 7 : 5;
    
    return Math.min(Math.round(densityScore + qualityScore + priceScore + popularityScore), 100);
  }

  /**
   * Transform venue data to standardized format
   */
  transformVenueData(venue) {
    return {
      fsq_id: venue.fsq_id,
      name: venue.name,
      location: {
        latitude: venue.location?.latitude || venue.geocodes?.main?.latitude,
        longitude: venue.location?.longitude || venue.geocodes?.main?.longitude,
        address: venue.location?.formatted_address || venue.location?.address,
        locality: venue.location?.locality,
        region: venue.location?.region,
        postcode: venue.location?.postcode,
        country: venue.location?.country
      },
      categories: venue.categories || [],
      chains: venue.chains || [],
      distance: venue.distance,
      popularity: venue.popularity,
      rating: venue.rating,
      price: venue.price,
      hours: venue.hours,
      website: venue.website,
      tel: venue.tel,
      email: venue.email,
      social_media: venue.social_media,
      verified: venue.verified || false,
      stats: venue.stats || {}
    };
  }

  /**
   * Store venues in database for caching and future reference
   */
  async storeVenuesInDatabase(venues) {
    if (!this.db) return;

    try {
      for (const venue of venues) {
        const transformedVenue = this.transformVenueData(venue);
        
        const query = `
          INSERT INTO foursquare_venues (
            fsq_id, name, latitude, longitude, address, formatted_address,
            locality, region, postcode, country, categories, chains,
            rating, price_level, popularity_score, verified, hours,
            website, phone, email, social_media, stats, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
          ON CONFLICT (fsq_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            address = EXCLUDED.address,
            formatted_address = EXCLUDED.formatted_address,
            categories = EXCLUDED.categories,
            chains = EXCLUDED.chains,
            rating = EXCLUDED.rating,
            price_level = EXCLUDED.price_level,
            popularity_score = EXCLUDED.popularity_score,
            verified = EXCLUDED.verified,
            hours = EXCLUDED.hours,
            website = EXCLUDED.website,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            social_media = EXCLUDED.social_media,
            stats = EXCLUDED.stats,
            last_updated = NOW()
        `;

        const values = [
          transformedVenue.fsq_id,
          transformedVenue.name,
          transformedVenue.location?.latitude,
          transformedVenue.location?.longitude,
          transformedVenue.location?.address,
          transformedVenue.location?.formatted_address || transformedVenue.location?.address,
          transformedVenue.location?.locality,
          transformedVenue.location?.region,
          transformedVenue.location?.postcode,
          transformedVenue.location?.country,
          JSON.stringify(transformedVenue.categories),
          JSON.stringify(transformedVenue.chains),
          transformedVenue.rating,
          transformedVenue.price,
          transformedVenue.popularity,
          transformedVenue.verified,
          JSON.stringify(transformedVenue.hours),
          transformedVenue.website,
          transformedVenue.tel,
          transformedVenue.email,
          JSON.stringify(transformedVenue.social_media),
          JSON.stringify(transformedVenue.stats)
        ];

        await this.db.query(query, values);
      }

      console.log(`✅ Stored ${venues.length} venues in database`);
    } catch (error) {
      console.error('❌ Error storing venues in database:', error);
      // Don't throw error - this is non-critical functionality
    }
  }

  /**
   * Store competitor analysis in database
   */
  async storeCompetitorAnalysis(location, analysis) {
    if (!this.db) return;

    try {
      // This would typically be called with a restaurant_id
      // For now, we'll skip database storage or create a generic entry
      console.log('✅ Competitor analysis completed (database storage requires restaurant_id)');
    } catch (error) {
      console.error('❌ Error storing competitor analysis:', error);
    }
  }

  /**
   * Identify competitor strengths
   */
  identifyCompetitorStrengths(competitor) {
    const strengths = [];
    
    if (competitor.rating && competitor.rating >= 4.5) {
      strengths.push('Excellent customer ratings');
    }
    
    if (competitor.popularity && competitor.popularity >= 80) {
      strengths.push('High popularity and foot traffic');
    }
    
    if (competitor.chains && competitor.chains.length > 0) {
      strengths.push('Established brand recognition');
    }
    
    if (competitor.price && competitor.price <= 2) {
      strengths.push('Competitive pricing');
    }
    
    return strengths;
  }

  /**
   * Identify competitor weaknesses
   */
  identifyCompetitorWeaknesses(competitor) {
    const weaknesses = [];
    
    if (competitor.rating && competitor.rating < 3.5) {
      weaknesses.push('Below-average customer satisfaction');
    }
    
    if (competitor.popularity && competitor.popularity < 50) {
      weaknesses.push('Low customer traffic');
    }
    
    if (!competitor.website) {
      weaknesses.push('Limited online presence');
    }
    
    return weaknesses;
  }
}

module.exports = RestaurantDiscoveryService;