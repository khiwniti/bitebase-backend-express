/**
 * Restaurant Data Service - Phase 2A Implementation
 * Comprehensive restaurant data integration with external APIs and database storage
 */

const { Pool } = require('pg');
const { GooglePlacesClient } = require('./GooglePlacesClient');
const { FoursquareClient } = require('./FoursquareClient');

class RestaurantDataService {
  constructor(dbPool) {
    this.db = dbPool;
    this.googlePlaces = new GooglePlacesClient();
    this.foursquare = new FoursquareClient();
    this.requestCount = 0;
    this.cacheHits = 0;
    this.lastSyncTime = null;
  }

  /**
   * Search restaurants with geospatial filtering and external API integration
   */
  async searchRestaurants(searchParams) {
    const {
      latitude,
      longitude,
      radius = 1000, // meters
      cuisine = null,
      priceRange = null,
      rating = null,
      limit = 20,
      offset = 0,
      includeExternal = true,
      sortBy = 'distance'
    } = searchParams;

    try {
      console.log(`🔍 Restaurant search: lat=${latitude}, lng=${longitude}, radius=${radius}m`);

      // First, search local database with PostGIS
      const localSearchResult = await this.searchLocalRestaurants({
        latitude,
        longitude,
        radius,
        cuisine,
        priceRange,
        rating,
        limit,
        offset,
        sortBy
      });

      const localResults = localSearchResult.restaurants || [];
      console.log(`📍 Found ${localResults.length} restaurants in local database`);

      // If we need more results or want fresh data, query external APIs
      let externalResults = [];
      if (includeExternal && localResults.length < limit) {
        const remainingLimit = limit - localResults.length;
        externalResults = await this.searchExternalAPIs({
          latitude,
          longitude,
          radius,
          cuisine,
          limit: remainingLimit
        });

        // Store new restaurants in database for future queries
        if (externalResults.length > 0) {
          await this.storeRestaurants(externalResults);
        }
      }

      // Combine and deduplicate results
      const combinedResults = this.deduplicateRestaurants([...localResults, ...externalResults]);

      // Apply final sorting and limiting
      const finalResults = this.sortAndLimitResults(combinedResults, sortBy, limit);

      console.log(`✅ Returning ${finalResults.length} restaurants (${localResults.length} local, ${externalResults.length} external)`);

      return {
        restaurants: finalResults,
        total: finalResults.length,
        sources: {
          local: localResults.length,
          external: externalResults.length
        },
        searchParams: {
          latitude,
          longitude,
          radius,
          cuisine,
          priceRange,
          rating
        }
      };

    } catch (error) {
      console.error('❌ Restaurant search error:', error);
      throw new Error(`Restaurant search failed: ${error.message}`);
    }
  }

  /**
   * Search local database using PostGIS geospatial queries or SQLite distance calculations
   */
  async searchLocalRestaurants(params) {
    const {
      latitude,
      longitude,
      radius,
      cuisine,
      priceRange,
      rating,
      limit,
      offset,
      sortBy
    } = params;

    try {
      // Check if we're using SQLite or PostgreSQL
      const isSQLite = this.db.constructor.name === 'SQLiteAdapter';
      
      if (isSQLite) {
        return await this.searchLocalRestaurantsSQLite(params);
      } else {
        return await this.searchLocalRestaurantsPostGIS(params);
      }
    } catch (error) {
      console.error('❌ Local restaurant search error:', error);
      return { restaurants: [], total: 0 };
    }
  }

  /**
   * SQLite-compatible restaurant search using Haversine distance formula
   */
  async searchLocalRestaurantsSQLite(params) {
    const {
      latitude,
      longitude,
      radius,
      cuisine,
      priceRange,
      rating,
      limit,
      offset,
      sortBy
    } = params;

    try {
      // Simple SQLite query with distance calculation
      // Using Haversine formula approximation for distance filtering
      let query = `
        SELECT 
          id,
          name,
          lat as latitude,
          lng as longitude,
          vicinity as address,
          types as cuisine,
          price_level as priceRange,
          rating,
          user_ratings_total as reviewCount,
          phone,
          website,
          business_status,
          (
            6371000 * acos(
              cos(radians(${latitude})) * 
              cos(radians(lat)) * 
              cos(radians(lng) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(lat))
            )
          ) as distance,
          created_at,
          last_updated as updated_at
        FROM restaurants 
        WHERE (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(lat)) * 
            cos(radians(lng) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(lat))
          )
        ) <= ${radius}`;

      // Add filters
      const conditions = [];
      if (priceRange) {
        conditions.push(`price_level = ${priceRange}`);
      }
      if (rating) {
        conditions.push(`rating >= ${rating}`);
      }

      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      // Add sorting
      if (sortBy === 'rating') {
        query += ` ORDER BY rating DESC`;
      } else if (sortBy === 'name') {
        query += ` ORDER BY name ASC`;
      } else {
        query += ` ORDER BY distance ASC`;
      }

      // Add pagination
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      console.log('🔍 SQLite Query:', query);

      const result = await this.db.query(query);
      const restaurants = [];

      if (result.rows && result.rows.length > 0) {
        for (const row of result.rows) {
          // Parse the pipe-separated result from SQLite
          const fields = row.result.split('|');
          if (fields.length >= 8) {
            restaurants.push({
              id: fields[0],
              name: fields[1],
              latitude: parseFloat(fields[2]),
              longitude: parseFloat(fields[3]),
              address: fields[4] || '',
              cuisine: fields[5] ? fields[5].split(',') : ['restaurant'],
              priceRange: parseInt(fields[6]) || 2,
              rating: parseFloat(fields[7]) || 0,
              reviewCount: parseInt(fields[8]) || 0,
              phone: fields[9] || '',
              website: fields[10] || '',
              businessStatus: fields[11] || 'OPERATIONAL',
              distance: parseFloat(fields[12]) || 0,
              createdAt: fields[13],
              updatedAt: fields[14],
              dataSource: 'local'
            });
          }
        }
      }

      return {
        restaurants,
        total: restaurants.length,
        source: 'local_sqlite'
      };
    } catch (error) {
      console.error('❌ SQLite restaurant search error:', error);
      return { restaurants: [], total: 0 };
    }
  }

  /**
   * PostgreSQL/PostGIS restaurant search (original implementation)
   */
  async searchLocalRestaurantsPostGIS(params) {
    const {
      latitude,
      longitude,
      radius,
      cuisine,
      priceRange,
      rating,
      limit,
      offset,
      sortBy
    } = params;

    try {
      let query = `
        SELECT 
          id,
          name,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          address,
          cuisine_types as cuisine,
          price_range,
          rating,
          total_reviews as review_count,
          phone,
          email,
          website,
          description,
          business_hours,
          amenities,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance_meters,
          created_at,
          updated_at,
          is_active
        FROM restaurants 
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      `;

      const queryParams = [longitude, latitude, radius];
      let paramIndex = 4;

      // Add cuisine filter
      if (cuisine && cuisine.length > 0) {
        const cuisineArray = Array.isArray(cuisine) ? cuisine : [cuisine];
        query += ` AND cuisine_types && $${paramIndex}`;
        queryParams.push(cuisineArray);
        paramIndex++;
      }

      // Add price range filter
      if (priceRange) {
        query += ` AND price_range = $${paramIndex}`;
        queryParams.push(priceRange);
        paramIndex++;
      }

      // Add rating filter
      if (rating) {
        query += ` AND rating >= $${paramIndex}`;
        queryParams.push(rating);
        paramIndex++;
      }

      // Add sorting
      switch (sortBy) {
        case 'rating':
          query += ' ORDER BY rating DESC, distance_meters ASC';
          break;
        case 'price_low':
          query += ' ORDER BY price_range ASC, distance_meters ASC';
          break;
        case 'price_high':
          query += ' ORDER BY price_range DESC, distance_meters ASC';
          break;
        case 'popularity':
          query += ' ORDER BY total_reviews DESC, rating DESC, distance_meters ASC';
          break;
        default: // distance
          query += ' ORDER BY distance_meters ASC';
      }

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await this.db.query(query, queryParams);
      
      const restaurants = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address,
        cuisine: row.cuisine,
        priceRange: row.price_range,
        rating: row.rating,
        reviewCount: row.review_count,
        phone: row.phone,
        email: row.email,
        website: row.website,
        description: row.description,
        businessHours: row.business_hours,
        amenities: row.amenities,
        distance: Math.round(row.distance_meters),
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        dataSource: 'local'
      }));

      return {
        restaurants,
        total: restaurants.length,
        source: 'local_postgis'
      };

    } catch (error) {
      console.error('❌ PostGIS restaurant search error:', error);
      return { restaurants: [], total: 0 };
    }
  }

  /**
   * Search external APIs (Google Places and Foursquare)
   */
  async searchExternalAPIs(params) {
    const { latitude, longitude, radius, cuisine, limit } = params;
    
    try {
      const promises = [];

      // Google Places search
      if (this.googlePlaces.config.apiKey) {
        promises.push(
          this.searchGooglePlaces(latitude, longitude, radius, cuisine, Math.ceil(limit / 2))
            .catch(error => {
              console.warn('⚠️ Google Places search failed:', error.message);
              return [];
            })
        );
      }

      // Foursquare search - disabled (credits exhausted)
      // Using Google Places as primary external data source

      const results = await Promise.all(promises);
      const combinedResults = results.flat();

      console.log(`🌐 External API results: ${combinedResults.length} restaurants`);
      
      return combinedResults.slice(0, limit);

    } catch (error) {
      console.error('❌ External API search error:', error);
      return [];
    }
  }

  /**
   * Search Google Places API
   */
  async searchGooglePlaces(latitude, longitude, radius, cuisine, limit) {
    try {
      this.requestCount++;
      
      const keyword = cuisine ? `${cuisine} restaurant` : 'restaurant';
      const response = await this.googlePlaces.searchNearbyRestaurants(
        latitude,
        longitude,
        radius,
        keyword,
        'restaurant'
      );

      if (!response.results || response.results.length === 0) {
        return [];
      }

      return response.results.slice(0, limit).map(place => ({
        externalId: place.place_id,
        name: place.name,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        address: place.vicinity || place.formatted_address || '',
        cuisine: this.extractCuisineFromTypes(place.types),
        priceRange: place.price_level || 2,
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        metadata: {
          googlePlaceId: place.place_id,
          types: place.types,
          businessStatus: place.business_status,
          openNow: place.opening_hours?.open_now,
          photos: place.photos?.map(photo => ({
            reference: photo.photo_reference,
            width: photo.width,
            height: photo.height
          })) || []
        },
        dataSource: 'google_places'
      }));

    } catch (error) {
      console.error('❌ Google Places API error:', error);
      throw error;
    }
  }

  /**
   * Search Foursquare API
   */
  async searchFoursquare(latitude, longitude, radius, cuisine, limit) {
    try {
      this.requestCount++;

      const searchParams = {
        location: { lat: latitude, lng: longitude },
        radius,
        limit,
        categories: this.foursquare.config.defaults.categories.food_and_dining
      };

      const venues = await this.foursquare.searchVenues(searchParams);

      if (!venues || venues.length === 0) {
        return [];
      }

      return venues.slice(0, limit).map(venue => ({
        externalId: venue.fsq_id,
        name: venue.name,
        latitude: venue.location.latitude,
        longitude: venue.location.longitude,
        address: venue.location.formatted_address || '',
        cuisine: this.extractCuisineFromCategories(venue.categories),
        priceRange: venue.price || 2,
        rating: venue.rating || 0,
        reviewCount: 0, // Foursquare doesn't provide review count in basic search
        metadata: {
          foursquareId: venue.fsq_id,
          categories: venue.categories,
          chains: venue.chains,
          website: venue.website,
          tel: venue.tel,
          verified: venue.verified,
          popularity: venue.popularity
        },
        dataSource: 'foursquare'
      }));

    } catch (error) {
      console.error('❌ Foursquare API error:', error);
      throw error;
    }
  }

  /**
   * Store restaurants in database
   */
  async storeRestaurants(restaurants) {
    if (!restaurants || restaurants.length === 0) {
      return;
    }

    try {
      const query = `
        INSERT INTO restaurants (
          name, location, address, cuisine_types, price_range, rating, total_reviews, website, phone, description
        ) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (name) DO UPDATE SET
          rating = EXCLUDED.rating,
          total_reviews = EXCLUDED.total_reviews,
          updated_at = NOW()
        RETURNING id
      `;

      const storedCount = 0;
      
      for (const restaurant of restaurants) {
        try {
          await this.db.query(query, [
            restaurant.name,
            restaurant.longitude,
            restaurant.latitude,
            JSON.stringify({ formatted_address: restaurant.address }),
            restaurant.cuisine,
            restaurant.priceRange,
            restaurant.rating,
            restaurant.reviewCount,
            restaurant.metadata?.website || null,
            restaurant.metadata?.tel || null,
            `Restaurant sourced from ${restaurant.dataSource}`
          ]);
          // storedCount++; // Uncomment if you want to track stored count
        } catch (error) {
          // Skip duplicates or constraint violations
          if (!error.message.includes('duplicate') && !error.message.includes('conflict')) {
            console.warn('⚠️ Failed to store restaurant:', restaurant.name, error.message);
          }
        }
      }

      console.log(`💾 Processed ${restaurants.length} restaurants for storage`);

    } catch (error) {
      console.error('❌ Restaurant storage error:', error);
      throw error;
    }
  }

  /**
   * Deduplicate restaurants based on name and location proximity
   */
  deduplicateRestaurants(restaurants) {
    const seen = new Map();
    const deduplicated = [];

    for (const restaurant of restaurants) {
      const key = `${restaurant.name.toLowerCase()}_${Math.round(restaurant.latitude * 1000)}_${Math.round(restaurant.longitude * 1000)}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(restaurant);
      }
    }

    return deduplicated;
  }

  /**
   * Sort and limit results
   */
  sortAndLimitResults(restaurants, sortBy, limit) {
    let sorted = [...restaurants];

    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_low':
        sorted.sort((a, b) => (a.priceRange || 2) - (b.priceRange || 2));
        break;
      case 'price_high':
        sorted.sort((a, b) => (b.priceRange || 2) - (a.priceRange || 2));
        break;
      case 'popularity':
        sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      default: // distance
        sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return sorted.slice(0, limit);
  }

  /**
   * Extract cuisine from Google Places types
   */
  extractCuisineFromTypes(types) {
    if (!types || !Array.isArray(types)) return ['restaurant'];

    const cuisineMap = {
      'chinese_restaurant': ['chinese'],
      'japanese_restaurant': ['japanese'],
      'korean_restaurant': ['korean'],
      'thai_restaurant': ['thai'],
      'vietnamese_restaurant': ['vietnamese'],
      'indian_restaurant': ['indian'],
      'italian_restaurant': ['italian'],
      'mexican_restaurant': ['mexican'],
      'american_restaurant': ['american'],
      'french_restaurant': ['french'],
      'mediterranean_restaurant': ['mediterranean'],
      'pizza_restaurant': ['pizza'],
      'seafood_restaurant': ['seafood'],
      'steakhouse': ['steakhouse'],
      'vegetarian_restaurant': ['vegetarian'],
      'fast_food_restaurant': ['fast_food'],
      'cafe': ['cafe'],
      'bakery': ['bakery']
    };

    for (const type of types) {
      if (cuisineMap[type]) {
        return cuisineMap[type];
      }
    }

    return ['restaurant'];
  }

  /**
   * Extract cuisine from Foursquare categories
   */
  extractCuisineFromCategories(categories) {
    if (!categories || !Array.isArray(categories)) return ['restaurant'];

    const cuisineMap = {
      'chinese': ['chinese'],
      'japanese': ['japanese'],
      'korean': ['korean'],
      'thai': ['thai'],
      'vietnamese': ['vietnamese'],
      'indian': ['indian'],
      'italian': ['italian'],
      'mexican': ['mexican'],
      'american': ['american'],
      'french': ['french'],
      'mediterranean': ['mediterranean'],
      'pizza': ['pizza'],
      'seafood': ['seafood'],
      'steakhouse': ['steakhouse'],
      'vegetarian': ['vegetarian'],
      'fast food': ['fast_food'],
      'cafe': ['cafe'],
      'bakery': ['bakery']
    };

    for (const category of categories) {
      const categoryName = category.name?.toLowerCase() || '';
      for (const [key, value] of Object.entries(cuisineMap)) {
        if (categoryName.includes(key)) {
          return value;
        }
      }
    }

    return ['restaurant'];
  }

  /**
   * Get restaurant details by ID
   */
  async getRestaurantById(id) {
    try {
      const query = `
        SELECT 
          id,
          name,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          address,
          cuisine_types as cuisine,
          price_range,
          rating,
          total_reviews as review_count,
          phone,
          email,
          website,
          description,
          business_hours,
          amenities,
          created_at,
          updated_at,
          is_active
        FROM restaurants 
        WHERE id = $1
      `;

      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address,
        cuisine: row.cuisine,
        priceRange: row.price_range,
        rating: row.rating,
        reviewCount: row.review_count,
        phone: row.phone,
        email: row.email,
        website: row.website,
        description: row.description,
        businessHours: row.business_hours,
        amenities: row.amenities,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      console.error('❌ Get restaurant by ID error:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      lastSyncTime: this.lastSyncTime,
      googlePlacesStats: this.googlePlaces.getUsageStats(),
      foursquareStats: { status: 'disabled', requests: 0, errors: 0 }
    };
  }

  /**
   * Health check for all services
   */
  async healthCheck() {
    try {
      const [dbHealth, googleHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.googlePlaces.healthCheck()
      ]);

      return {
        status: 'healthy',
        database: dbHealth,
        googlePlaces: googleHealth,
        foursquare: { status: 'disabled', reason: 'Using Google Places as primary data source' },
        stats: this.getStats()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        stats: this.getStats()
      };
    }
  }

  /**
   * Check database connectivity
   */
  async checkDatabaseHealth() {
    try {
      const result = await this.db.query('SELECT COUNT(*) as count FROM restaurants');
      return {
        status: 'healthy',
        restaurantCount: parseInt(result.rows[0].count),
        connected: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false
      };
    }
  }
}

module.exports = { RestaurantDataService };