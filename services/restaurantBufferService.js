const geolib = require('geolib');

class RestaurantBufferService {
  constructor() {
    // Base location (Bangkok city center)
    this.baseLocation = {
      latitude: 13.7563,
      longitude: 100.5018,
      name: "Bangkok City Center"
    };
    
    // Default buffer radius in meters
    this.defaultRadius = 5000; // 5km
    
    // Restaurant reference data with coordinates
    this.restaurantDatabase = [
      {
        id: 'rest_001',
        name: 'Bella Vista Bistro',
        place_id: 'ChIJ123456789',
        coordinates: { lat: 13.7563, lng: 100.5018 },
        address: '123 Sukhumvit Road, Watthana, Bangkok 10110',
        cuisine: ['Thai', 'International'],
        rating: 4.6,
        price_level: 2,
        phone: '+66-2-123-4567',
        website: 'https://bellavista.com',
        opening_hours: {
          monday: '10:00-22:00',
          tuesday: '10:00-22:00',
          wednesday: '10:00-22:00',
          thursday: '10:00-22:00',
          friday: '10:00-23:00',
          saturday: '10:00-23:00',
          sunday: '10:00-22:00'
        },
        features: ['delivery', 'takeout', 'dine_in', 'wifi', 'parking'],
        wongnai_id: '12345',
        distance_from_base: 0
      },
      {
        id: 'rest_002',
        name: 'Spice Garden Thai',
        place_id: 'ChIJ987654321',
        coordinates: { lat: 13.7244, lng: 100.5347 },
        address: '456 Silom Road, Bang Rak, Bangkok 10500',
        cuisine: ['Thai', 'Street Food'],
        rating: 4.4,
        price_level: 1,
        phone: '+66-2-987-6543',
        website: 'https://spicegarden.com',
        opening_hours: {
          monday: '11:00-21:00',
          tuesday: '11:00-21:00',
          wednesday: '11:00-21:00',
          thursday: '11:00-21:00',
          friday: '11:00-22:00',
          saturday: '11:00-22:00',
          sunday: '11:00-21:00'
        },
        features: ['delivery', 'takeout', 'dine_in'],
        wongnai_id: '67890',
        distance_from_base: 3500
      },
      {
        id: 'rest_003',
        name: 'Bangkok Kitchen',
        place_id: 'ChIJ456789123',
        coordinates: { lat: 13.7650, lng: 100.5380 },
        address: '789 Ploenchit Road, Lumpini, Bangkok 10330',
        cuisine: ['Thai', 'Asian Fusion'],
        rating: 4.5,
        price_level: 3,
        phone: '+66-2-456-7890',
        website: 'https://bangkokkitchen.com',
        opening_hours: {
          monday: '09:00-23:00',
          tuesday: '09:00-23:00',
          wednesday: '09:00-23:00',
          thursday: '09:00-23:00',
          friday: '09:00-24:00',
          saturday: '09:00-24:00',
          sunday: '09:00-23:00'
        },
        features: ['delivery', 'takeout', 'dine_in', 'wifi', 'parking', 'outdoor_seating'],
        wongnai_id: '11111',
        distance_from_base: 4200
      },
      {
        id: 'rest_004',
        name: 'Street Food Paradise',
        place_id: 'ChIJ789123456',
        coordinates: { lat: 13.7470, lng: 100.4850 },
        address: '321 Khao San Road, Phra Nakhon, Bangkok 10200',
        cuisine: ['Thai', 'Street Food', 'Local'],
        rating: 4.2,
        price_level: 1,
        phone: '+66-2-321-6547',
        website: null,
        opening_hours: {
          monday: '17:00-02:00',
          tuesday: '17:00-02:00',
          wednesday: '17:00-02:00',
          thursday: '17:00-02:00',
          friday: '17:00-03:00',
          saturday: '17:00-03:00',
          sunday: '17:00-02:00'
        },
        features: ['takeout', 'dine_in'],
        wongnai_id: '22222',
        distance_from_base: 6800
      },
      {
        id: 'rest_005',
        name: 'Modern Thai Cuisine',
        place_id: 'ChIJ147258369',
        coordinates: { lat: 13.7800, lng: 100.5200 },
        address: '654 Ratchadamri Road, Pathum Wan, Bangkok 10330',
        cuisine: ['Thai', 'Fine Dining', 'Modern'],
        rating: 4.8,
        price_level: 4,
        phone: '+66-2-654-9870',
        website: 'https://modernthai.com',
        opening_hours: {
          monday: '18:00-23:00',
          tuesday: '18:00-23:00',
          wednesday: '18:00-23:00',
          thursday: '18:00-23:00',
          friday: '18:00-24:00',
          saturday: '18:00-24:00',
          sunday: '18:00-23:00'
        },
        features: ['dine_in', 'wifi', 'parking', 'valet', 'private_dining'],
        wongnai_id: '33333',
        distance_from_base: 2800
      },
      {
        id: 'rest_006',
        name: 'Riverside Thai Restaurant',
        place_id: 'ChIJ369147258',
        coordinates: { lat: 13.7200, lng: 100.4900 },
        address: '987 Chao Phraya River, Thon Buri, Bangkok 10600',
        cuisine: ['Thai', 'Seafood', 'River View'],
        rating: 4.3,
        price_level: 3,
        phone: '+66-2-987-1234',
        website: 'https://riverside-thai.com',
        opening_hours: {
          monday: '11:00-22:00',
          tuesday: '11:00-22:00',
          wednesday: '11:00-22:00',
          thursday: '11:00-22:00',
          friday: '11:00-23:00',
          saturday: '11:00-23:00',
          sunday: '11:00-22:00'
        },
        features: ['dine_in', 'wifi', 'parking', 'river_view', 'outdoor_seating'],
        wongnai_id: '44444',
        distance_from_base: 7200
      }
    ];

    // Calculate distances from base location
    this.calculateDistances();
  }

  /**
   * Calculate distances from base location for all restaurants
   */
  calculateDistances() {
    this.restaurantDatabase.forEach(restaurant => {
      restaurant.distance_from_base = geolib.getDistance(
        this.baseLocation,
        restaurant.coordinates
      );
    });
  }

  /**
   * Get restaurants within buffer radius
   * @param {number} radius - Buffer radius in meters (default: 5000m)
   * @param {Object} centerPoint - Custom center point {latitude, longitude}
   * @returns {Array} Restaurants within radius
   */
  getRestaurantsInBuffer(radius = this.defaultRadius, centerPoint = null) {
    const center = centerPoint || this.baseLocation;
    
    console.log(`🎯 Finding restaurants within ${radius}m of ${center.name || 'custom location'}`);
    
    const restaurantsInBuffer = this.restaurantDatabase.filter(restaurant => {
      const distance = geolib.getDistance(center, restaurant.coordinates);
      return distance <= radius;
    }).map(restaurant => {
      // Recalculate distance from the specified center
      const distance = geolib.getDistance(center, restaurant.coordinates);
      return {
        ...restaurant,
        distance_from_center: distance,
        distance_km: (distance / 1000).toFixed(2)
      };
    }).sort((a, b) => a.distance_from_center - b.distance_from_center);

    console.log(`📍 Found ${restaurantsInBuffer.length} restaurants within ${radius}m radius`);
    return restaurantsInBuffer;
  }

  /**
   * Get restaurant by ID
   * @param {string} restaurantId - Restaurant ID
   * @returns {Object|null} Restaurant data
   */
  getRestaurantById(restaurantId) {
    const restaurant = this.restaurantDatabase.find(r => r.id === restaurantId);
    if (restaurant) {
      console.log(`🍽️ Retrieved restaurant: ${restaurant.name}`);
      return {
        ...restaurant,
        distance_km: (restaurant.distance_from_base / 1000).toFixed(2)
      };
    }
    console.log(`❌ Restaurant not found: ${restaurantId}`);
    return null;
  }

  /**
   * Search restaurants by criteria within buffer
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching restaurants
   */
  searchRestaurants(criteria = {}) {
    const {
      query,
      cuisine,
      rating_min,
      price_level,
      features,
      radius = this.defaultRadius,
      center = null
    } = criteria;

    console.log('🔍 Searching restaurants with criteria:', criteria);

    let results = this.getRestaurantsInBuffer(radius, center);

    // Filter by query (name or cuisine)
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(restaurant => 
        restaurant.name.toLowerCase().includes(searchTerm) ||
        restaurant.cuisine.some(c => c.toLowerCase().includes(searchTerm)) ||
        restaurant.address.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by cuisine
    if (cuisine) {
      results = results.filter(restaurant => 
        restaurant.cuisine.some(c => c.toLowerCase().includes(cuisine.toLowerCase()))
      );
    }

    // Filter by minimum rating
    if (rating_min) {
      results = results.filter(restaurant => restaurant.rating >= rating_min);
    }

    // Filter by price level
    if (price_level) {
      results = results.filter(restaurant => restaurant.price_level === price_level);
    }

    // Filter by features
    if (features && features.length > 0) {
      results = results.filter(restaurant => 
        features.every(feature => restaurant.features.includes(feature))
      );
    }

    console.log(`📊 Search returned ${results.length} restaurants`);
    return results;
  }

  /**
   * Get restaurants by cuisine type within buffer
   * @param {string} cuisineType - Cuisine type
   * @param {number} radius - Buffer radius
   * @returns {Array} Restaurants of specified cuisine
   */
  getRestaurantsByCuisine(cuisineType, radius = this.defaultRadius) {
    return this.searchRestaurants({ cuisine: cuisineType, radius });
  }

  /**
   * Get nearby competitors for a specific restaurant
   * @param {string} restaurantId - Target restaurant ID
   * @param {number} radius - Competition radius in meters
   * @returns {Array} Competitor restaurants
   */
  getNearbyCompetitors(restaurantId, radius = 2000) {
    const targetRestaurant = this.getRestaurantById(restaurantId);
    if (!targetRestaurant) {
      return [];
    }

    console.log(`🏪 Finding competitors within ${radius}m of ${targetRestaurant.name}`);

    const competitors = this.restaurantDatabase
      .filter(restaurant => restaurant.id !== restaurantId)
      .filter(restaurant => {
        const distance = geolib.getDistance(
          targetRestaurant.coordinates,
          restaurant.coordinates
        );
        return distance <= radius;
      })
      .map(restaurant => {
        const distance = geolib.getDistance(
          targetRestaurant.coordinates,
          restaurant.coordinates
        );
        return {
          ...restaurant,
          distance_from_target: distance,
          distance_km: (distance / 1000).toFixed(2),
          cuisine_overlap: restaurant.cuisine.filter(c => 
            targetRestaurant.cuisine.includes(c)
          ).length
        };
      })
      .sort((a, b) => a.distance_from_target - b.distance_from_target);

    console.log(`🎯 Found ${competitors.length} competitors`);
    return competitors;
  }

  /**
   * Get market density analysis for an area
   * @param {Object} center - Center point {latitude, longitude}
   * @param {number} radius - Analysis radius
   * @returns {Object} Market density data
   */
  getMarketDensity(center = this.baseLocation, radius = this.defaultRadius) {
    const restaurants = this.getRestaurantsInBuffer(radius, center);
    
    const analysis = {
      total_restaurants: restaurants.length,
      density_per_km2: (restaurants.length / (Math.PI * Math.pow(radius / 1000, 2))).toFixed(2),
      cuisine_breakdown: {},
      price_level_breakdown: {},
      rating_distribution: {
        excellent: 0, // 4.5+
        good: 0,      // 4.0-4.4
        average: 0,   // 3.5-3.9
        below_average: 0 // <3.5
      },
      feature_analysis: {},
      area_info: {
        center: center,
        radius_km: (radius / 1000).toFixed(2),
        coverage_area_km2: (Math.PI * Math.pow(radius / 1000, 2)).toFixed(2)
      }
    };

    // Analyze cuisine types
    restaurants.forEach(restaurant => {
      restaurant.cuisine.forEach(cuisine => {
        analysis.cuisine_breakdown[cuisine] = (analysis.cuisine_breakdown[cuisine] || 0) + 1;
      });

      // Price level analysis
      const priceKey = `level_${restaurant.price_level}`;
      analysis.price_level_breakdown[priceKey] = (analysis.price_level_breakdown[priceKey] || 0) + 1;

      // Rating distribution
      if (restaurant.rating >= 4.5) analysis.rating_distribution.excellent++;
      else if (restaurant.rating >= 4.0) analysis.rating_distribution.good++;
      else if (restaurant.rating >= 3.5) analysis.rating_distribution.average++;
      else analysis.rating_distribution.below_average++;

      // Feature analysis
      restaurant.features.forEach(feature => {
        analysis.feature_analysis[feature] = (analysis.feature_analysis[feature] || 0) + 1;
      });
    });

    console.log(`📈 Market density analysis completed for ${radius}m radius`);
    return analysis;
  }

  /**
   * Update base location
   * @param {number} latitude - New latitude
   * @param {number} longitude - New longitude
   * @param {string} name - Location name
   * @returns {Object} Updated base location
   */
  updateBaseLocation(latitude, longitude, name = 'Updated Location') {
    this.baseLocation = {
      latitude,
      longitude,
      name
    };
    this.calculateDistances();
    console.log(`📍 Base location updated to: ${name} (${latitude}, ${longitude})`);
    return this.baseLocation;
  }

  /**
   * Get market density analysis with grid-based analysis
   * @param {number} radius - Analysis radius in meters
   * @param {number} gridSize - Grid cell size in meters
   * @returns {Object} Market density analysis
   */
  getMarketDensityAnalysis(radius = this.defaultRadius, gridSize = 1000) {
    const restaurants = this.getRestaurantsInBuffer(radius);
    
    // Create grid analysis
    const gridCells = [];
    const cellsPerSide = Math.ceil((radius * 2) / gridSize);
    
    for (let x = 0; x < cellsPerSide; x++) {
      for (let y = 0; y < cellsPerSide; y++) {
        const cellCenterLat = this.baseLocation.latitude + 
          ((x - cellsPerSide/2) * gridSize / 111000); // Rough conversion to degrees
        const cellCenterLng = this.baseLocation.longitude + 
          ((y - cellsPerSide/2) * gridSize / (111000 * Math.cos(this.baseLocation.latitude * Math.PI / 180)));
        
        const cellRestaurants = restaurants.filter(restaurant => {
          const distance = geolib.getDistance(
            { latitude: cellCenterLat, longitude: cellCenterLng },
            restaurant.coordinates
          );
          return distance <= gridSize / 2;
        });
        
        if (cellRestaurants.length > 0 || 
            geolib.getDistance(this.baseLocation, { latitude: cellCenterLat, longitude: cellCenterLng }) <= radius) {
          gridCells.push({
            grid_id: `${x}_${y}`,
            center: { latitude: cellCenterLat, longitude: cellCenterLng },
            restaurant_count: cellRestaurants.length,
            avg_rating: cellRestaurants.length > 0 ? 
              (cellRestaurants.reduce((sum, r) => sum + r.rating, 0) / cellRestaurants.length).toFixed(2) : 0,
            dominant_cuisine: this.getDominantCuisine(cellRestaurants),
            density_score: (cellRestaurants.length / (Math.PI * Math.pow(gridSize / 2 / 1000, 2))).toFixed(2)
          });
        }
      }
    }
    
    const analysis = {
      total_restaurants: restaurants.length,
      analysis_radius_km: (radius / 1000).toFixed(2),
      grid_size_km: (gridSize / 1000).toFixed(2),
      total_grid_cells: gridCells.length,
      occupied_cells: gridCells.filter(cell => cell.restaurant_count > 0).length,
      average_density_per_km2: (restaurants.length / (Math.PI * Math.pow(radius / 1000, 2))).toFixed(2),
      grid_analysis: gridCells,
      hotspots: gridCells
        .filter(cell => cell.restaurant_count >= 3)
        .sort((a, b) => b.restaurant_count - a.restaurant_count)
        .slice(0, 10),
      opportunity_zones: gridCells
        .filter(cell => cell.restaurant_count === 0)
        .slice(0, 10)
    };
    
    console.log(`📊 Market density analysis completed: ${analysis.total_restaurants} restaurants in ${analysis.total_grid_cells} grid cells`);
    return analysis;
  }

  /**
   * Get dominant cuisine type in a set of restaurants
   * @param {Array} restaurants - Array of restaurants
   * @returns {string} Dominant cuisine type
   */
  getDominantCuisine(restaurants) {
    if (restaurants.length === 0) return 'None';
    
    const cuisineCount = {};
    restaurants.forEach(restaurant => {
      restaurant.cuisine.forEach(cuisine => {
        cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
      });
    });
    
    return Object.keys(cuisineCount).reduce((a, b) => 
      cuisineCount[a] > cuisineCount[b] ? a : b
    ) || 'Mixed';
  }

  /**
   * Add new restaurant to database
   * @param {Object} restaurantData - Restaurant data
   */
  addRestaurant(restaurantData) {
    const newRestaurant = {
      ...restaurantData,
      id: restaurantData.id || `rest_${Date.now()}`,
      distance_from_base: geolib.getDistance(this.baseLocation, restaurantData.coordinates)
    };
    
    this.restaurantDatabase.push(newRestaurant);
    console.log(`➕ Added restaurant: ${newRestaurant.name}`);
    return newRestaurant;
  }

  /**
   * Get all restaurants with their distances
   * @returns {Array} All restaurants with distance data
   */
  getAllRestaurants() {
    return this.restaurantDatabase.map(restaurant => ({
      ...restaurant,
      distance_km: (restaurant.distance_from_base / 1000).toFixed(2)
    }));
  }

  /**
   * Get buffer statistics
   * @returns {Object} Buffer system statistics
   */
  getBufferStats() {
    const stats = {
      base_location: this.baseLocation,
      default_radius_km: (this.defaultRadius / 1000).toFixed(2),
      total_restaurants: this.restaurantDatabase.length,
      restaurants_in_default_buffer: this.getRestaurantsInBuffer().length,
      coverage_area_km2: (Math.PI * Math.pow(this.defaultRadius / 1000, 2)).toFixed(2),
      average_distance_km: (
        this.restaurantDatabase.reduce((sum, r) => sum + r.distance_from_base, 0) / 
        this.restaurantDatabase.length / 1000
      ).toFixed(2)
    };

    console.log('📊 Buffer system statistics generated');
    return stats;
  }
}

module.exports = new RestaurantBufferService();