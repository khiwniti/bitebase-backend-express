/**
 * Restaurant Discovery Service
 * Handles venue discovery, competitor analysis, and restaurant intelligence.
 * Can use either Foursquare or Google Places as a data source.
 */

require('dotenv').config(); // To access LOCATION_DATA_SOURCE

// FoursquareClient removed - using mock implementation
// foursquareConfig removed - using mock config
const { GooglePlacesClient, GooglePlacesAPIStatus } = require('./GooglePlacesClient');
const { googlePlacesConfig } = require('../config/googlePlaces');

const LOCATION_SOURCE_FOURSQUARE = 'foursquare';
const LOCATION_SOURCE_GOOGLE = 'google';

class RestaurantDiscoveryService {
  constructor(database = null, locationSource = process.env.LOCATION_DATA_SOURCE || LOCATION_SOURCE_FOURSQUARE) {
    this.db = database; // Database pool will be injected
    this.locationSource = locationSource;

    if (this.locationSource === LOCATION_SOURCE_GOOGLE) {
      this.locationClient = new GooglePlacesClient();
      console.log('📍 RestaurantDiscoveryService initialized with Google Places API.');
    } else if (this.locationSource === LOCATION_SOURCE_FOURSQUARE) {
      // Mock Foursquare client (service removed)
      this.locationClient = this.createMockFoursquareClient();
      console.log('📍 RestaurantDiscoveryService initialized with Mock Foursquare API.');
    } else {
      console.warn(`⚠️ Unknown LOCATION_DATA_SOURCE: "${this.locationSource}". Defaulting to Google Places.`);
      this.locationClient = new GooglePlacesClient();
      this.locationSource = LOCATION_SOURCE_GOOGLE;
    }
    
    // Category mappings for different restaurant types (primarily for Foursquare)
    // Google Places uses type keywords like 'restaurant', 'cafe', etc.
    this.foursquareCategoryMap = {
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

  // Mock Foursquare client to replace removed service
  createMockFoursquareClient() {
    return {
      searchVenues: async () => ({ results: [] }),
      getVenueDetails: async () => ({ venue: null }),
      getVenueVisitStats: async () => ({ visits: [] }),
      healthCheck: async () => ({ status: 'disabled' })
    };
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Transforms a Google Place object to the standard venue format.
   * @param {object} place - Google Place object.
   * @returns {object} Standardized venue object.
   */
  _transformGooglePlaceToStandardFormat(place) {
    // Basic mapping, needs refinement based on actual data fields
    return {
      id: place.place_id, // Use place_id as the primary identifier
      fsq_id: place.place_id, // For compatibility with DB schema expecting fsq_id
      name: place.name,
      location: {
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        address: place.vicinity || place.formatted_address, // Vicinity is often shorter, formatted_address more complete
        formatted_address: place.formatted_address,
        // Google doesn't break down address components as richly as Foursquare in Nearby Search.
        // Place Details would be needed for locality, region, postcode, country.
        // For now, these might be null or derived if possible.
        locality: place.address_components?.find(c => c.types.includes('locality'))?.long_name || null,
        region: place.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.short_name || null,
        postcode: place.address_components?.find(c => c.types.includes('postal_code'))?.long_name || null,
        country: place.address_components?.find(c => c.types.includes('country'))?.short_name || null,
      },
      categories: place.types?.map(type => ({ name: type, id: type })) || [], // Google types are strings
      chains: [], // Google API (Nearby/Details) doesn't directly provide chain info like Foursquare
      distance: place.distance_meters || null, // If calculated and added externally, or from a Directions API call. Not directly in Place object.
      popularity: place.user_ratings_total, // user_ratings_total can serve as a proxy for popularity
      rating: place.rating,
      price: place.price_level, // Typically 0-4
      hours: place.opening_hours ? { open_now: place.opening_hours.open_now } : null, // Basic open_now status
      website: place.website,
      tel: place.formatted_phone_number,
      email: null, // Not typically provided by Google Places API
      social_media: null, // Not typically provided
      verified: place.business_status === 'OPERATIONAL', // A guess, Google doesn't have a direct 'verified' like Foursquare
      stats: {
          user_ratings_total: place.user_ratings_total,
          // Other stats might require different API calls or aren't available
      },
      source: LOCATION_SOURCE_GOOGLE // Add source for clarity
    };
  }

  /**
   * Transforms a Foursquare venue object to the standard venue format.
   * This is the original transformVenueData method.
   * @param {object} venue - Foursquare venue object.
   * @returns {object} Standardized venue object.
   */
  _transformFoursquareVenueToStandardFormat(venue) {
    return {
      id: venue.fsq_id,
      fsq_id: venue.fsq_id,
      name: venue.name,
      location: {
        latitude: venue.location?.latitude || venue.geocodes?.main?.latitude,
        longitude: venue.location?.longitude || venue.geocodes?.main?.longitude,
        address: venue.location?.formatted_address || venue.location?.address,
        formatted_address: venue.location?.formatted_address,
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
      stats: venue.stats || {},
      source: LOCATION_SOURCE_FOURSQUARE
    };
  }


  /**
   * Find nearby restaurants using the configured location client.
   */
  async findNearbyRestaurants(searchParams) {
    const {
      location, // {lat, lng}
      radius = 1000,
      // 'categories' for Foursquare (IDs), 'type' or 'keyword' for Google
      categories, // Foursquare category IDs
      type,       // Google Place type (e.g., 'restaurant')
      keyword,    // Google keyword search
      limit = 20, // Google Nearby Search default is 20, max is 60 with pagination. Foursquare default 10, max 50.
      sort = 'popularity', // Foursquare specific. Google has 'prominence' (default) or 'distance' (req. keyword/type)
      chains = null, // Foursquare specific
      priceRange = null // Foursquare specific for filtering, Google has price_level output
    } = searchParams;

    if (!location || !location.lat || !location.lng) {
      throw new Error('Location with lat and lng is required');
    }

    try {
      let rawVenues = [];
      let transformedVenues = [];

      if (this.locationSource === LOCATION_SOURCE_GOOGLE) {
        // Google Specific parameters
        const googleRadius = radius;
        const googleType = type || 'restaurant'; // Default to restaurant if not specified
        const googleKeyword = keyword; // Can be cuisine, name, etc.
        // Google's Nearby Search doesn't have a direct 'limit' like Foursquare in a single call (max 20 per page)
        // and sort is 'prominence' or 'distance'.

        const response = await this.locationClient.searchNearbyRestaurants(
          location.lat,
          location.lng,
          googleRadius,
          googleKeyword,
          googleType
        );
        rawVenues = response.results || []; // Google API returns results in 'results' array
        transformedVenues = rawVenues.map(place => this._transformGooglePlaceToStandardFormat(place));

      } else { // Foursquare (default)
        const fsqCategories = categories || this.foursquareCategoryMap.all_dining;
        const fsqLimit = Math.min(limit, 50);
        const fsqSort = sort;

        rawVenues = await this.locationClient.searchVenues({
          location,
          radius,
          categories: Array.isArray(fsqCategories) ? fsqCategories : [fsqCategories],
          limit: fsqLimit,
          sort: fsqSort
        });
        transformedVenues = rawVenues.map(venue => this._transformFoursquareVenueToStandardFormat(venue));
      }

      // Common post-processing (filtering if applicable, though some filters are source-specific)
      // Foursquare-specific filters (chains, priceRange) might not apply well to Google results here
      // without fetching more details or having different logic.
      // For now, these filters will effectively only apply if the source is Foursquare.
      let filteredVenues = transformedVenues;
      if (this.locationSource === LOCATION_SOURCE_FOURSQUARE) {
        if (chains && chains.length > 0) {
          filteredVenues = filteredVenues.filter(venue =>
            venue.chains && venue.chains.some(chainInfo =>
              chains.includes(chainInfo.name?.toLowerCase())
            )
          );
        }
        if (priceRange && priceRange.length === 2) {
           filteredVenues = filteredVenues.filter(venue =>
            venue.price >= priceRange[0] && venue.price <= priceRange[1]
          );
        }
      }

      // Store venues in database (consider source for ID conflicts)
      if (this.db && filteredVenues.length > 0) {
        // The ID used for storage will be venue.id, which is mapped from fsq_id or place_id
        await this.storeVenuesInDatabase(filteredVenues);
      }

      return filteredVenues.slice(0, limit); // Apply limit after transformation & filtering

    } catch (error) {
      console.error(`❌ Error finding nearby restaurants (source: ${this.locationSource}):`, error.message);
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
      console.log(`🔍 Starting competitor analysis for location: ${restaurantLocation.lat}, ${restaurantLocation.lng} (source: ${this.locationSource})`);

      // Find all restaurants in the area
      // For Google, we might need to adjust parameters for findNearbyRestaurants,
      // e.g., using 'keyword' or specific 'type' if 'categories' logic differs.
      const searchParams = {
        location: restaurantLocation,
        radius,
        limit: 50, // This limit is applied post-fetch in findNearbyRestaurants
      };
      if (this.locationSource === LOCATION_SOURCE_GOOGLE) {
        searchParams.type = 'restaurant'; // Generic type for restaurants
        // Google's 'sort' is prominence or distance, not popularity directly.
        // The current findNearbyRestaurants doesn't pass sort to Google.
      } else {
        searchParams.categories = this.foursquareCategoryMap.all_dining;
        searchParams.sort = 'popularity';
      }
      const competitors = await this.findNearbyRestaurants(searchParams);

      // Get detailed information for top competitors
      const detailedCompetitors = await Promise.all(
        competitors.slice(0, 20).map(async (venue) => { // venue.id is the unified ID
          try {
            // venue.id is already the correct ID (fsq_id or place_id)
            const details = await this.getVenueDetails(venue.id);
            // getVenueVisitStats is Foursquare specific.
            const visitStats = await this.getVenueVisitStats(venue.id);
            return { 
              ...venue, 
              details: details || {}, // details from getVenueDetails is already standardized
              visitStats: visitStats || {} 
            };
          } catch (error) {
            console.warn(`⚠️ Failed to get details/stats for venue ${venue.id} (source: ${this.locationSource}):`, error.message);
            return venue; // Return basic venue data if detailed lookup fails
          }
        })
      );

      // Analyze the competitive landscape
      const analysis = this.analyzeCompetitors(detailedCompetitors, restaurantLocation);

      // Store analysis in database
      if (this.db) {
        // This part might need adjustment if analysis structure depends on source
        await this.storeCompetitorAnalysis(restaurantLocation, analysis);
      }

      return analysis;
    } catch (error) {
      console.error(`❌ Error in competitor analysis (source: ${this.locationSource}):`, error.message);
      throw new Error(`Failed to analyze competitors: ${error.message}`);
    }
  }

  /**
   * Get detailed venue information using the configured location client.
   * @param {string} venueId - The ID of the venue (fsq_id for Foursquare, place_id for Google).
   * @returns {Promise<object|null>} Standardized venue object or null if not found/error.
   */
  async getVenueDetails(venueId) {
    if (!venueId) {
      console.warn('⚠️ Venue ID is required for getVenueDetails.');
      return null;
    }
    try {
      let details;
      if (this.locationSource === LOCATION_SOURCE_GOOGLE) {
        const response = await this.locationClient.getPlaceDetails(venueId); // Fetches from Google
        // Google's getPlaceDetails returns { result: Place, ... }
        details = response.result ? this._transformGooglePlaceToStandardFormat(response.result) : null;
      } else {
        const rawDetails = await this.locationClient.getVenueDetails(venueId); // Fetches from Foursquare
        details = rawDetails ? this._transformFoursquareVenueToStandardFormat(rawDetails) : null;
      }
      return details;
    } catch (error) {
      console.warn(`⚠️ Failed to get venue details for ${venueId} (source: ${this.locationSource}):`, error.message);
      return null;
    }
  }

  /**
   * Get venue visit statistics. Currently Foursquare-specific.
   * @param {string} venueId - The Foursquare venue ID.
   * @returns {Promise<object|null>} Venue statistics object or null.
   */
  async getVenueVisitStats(venueId) {
    if (this.locationSource === LOCATION_SOURCE_GOOGLE) {
      console.warn(`⚠️ Venue visit stats are not available for Google Places source for venue ${venueId}.`);
      return null; // Google Places API doesn't offer direct Foursquare-like stats.
    }
    // Assuming Foursquare source if not Google
    try {
      // This method is specific to FoursquareClient
      return await this.locationClient.getVenueStats(venueId);
    } catch (error) {
      console.warn(`⚠️ Failed to get venue stats for ${venueId} (source: ${this.locationSource}):`, error.message);
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

  /**
   * Perform a health check on the currently active location client.
   * @returns {Promise<object>} Health status object from the active client.
   */
  async healthCheck() {
    if (this.locationClient && typeof this.locationClient.healthCheck === 'function') {
      try {
        const health = await this.locationClient.healthCheck();
        return {
          ...health, // Spread the original health check result
          client_source: this.locationSource // Add which client was checked
        };
      } catch (error) {
        console.error(`❌ Health check failed for ${this.locationSource} client:`, error.message);
        return {
          status: 'unhealthy',
          client_source: this.locationSource,
          error: error.message,
        };
      }
    } else {
      console.warn(`⚠️ Health check not available for the current location client: ${this.locationSource}`);
      return {
        status: 'unknown',
        client_source: this.locationSource,
        message: 'Health check method not implemented on the client.',
      };
    }
  }
}

module.exports = RestaurantDiscoveryService;