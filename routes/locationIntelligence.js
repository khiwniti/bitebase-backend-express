/**
 * Location Intelligence API Routes
 * Provides restaurant search, analytics, and location-based insights
 */

const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/DatabaseService');
const KVService = require('../services/KVService');
const AnalyticsService = require('../services/AnalyticsService');
const WongnaiService = require('../services/WongnaiService');

// Search restaurants with filters
router.get('/search', async (req, res) => {
  try {
    const {
      searchBy = 'brand',
      query = '',
      area = '',
      cuisine = '',
      exactMatch = 'false',
      excludeItem = 'false',
      page = 1,
      limit = 50
    } = req.query;

    // Track search event
    await AnalyticsService.trackSearch(query, [], {
      searchBy,
      area,
      cuisine,
      exactMatch: exactMatch === 'true',
      excludeItem: excludeItem === 'true'
    });

    // Check cache first
    const cacheKey = `search:${JSON.stringify(req.query)}`;
    const cached = await KVService.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Build filters
    const filters = {};
    
    if (query) {
      if (searchBy === 'brand') {
        filters.brand = query;
      } else if (searchBy === 'branch') {
        filters.area = query;
      } else if (searchBy === 'item') {
        filters.cuisine = query;
      }
    }
    
    if (area) filters.area = area;
    if (cuisine) filters.cuisine = cuisine;

    // Get restaurants from database and Wongnai
    const [dbRestaurants, wongnaiResults] = await Promise.all([
      DatabaseService.getRestaurants(filters),
      WongnaiService.searchRestaurants(query, { area, cuisine, limit: parseInt(limit) * 2 })
    ]);
    
    // Merge and deduplicate results
    const allRestaurants = [...dbRestaurants];
    
    // Add Wongnai restaurants that aren't already in our database
    wongnaiResults.restaurants.forEach(wongnaiRestaurant => {
      const exists = dbRestaurants.find(db => 
        db.brand.toLowerCase() === wongnaiRestaurant.brand.toLowerCase() &&
        db.area.toLowerCase() === wongnaiRestaurant.area.toLowerCase()
      );
      
      if (!exists) {
        allRestaurants.push({
          ...wongnaiRestaurant,
          source: 'wongnai'
        });
      }
    });
    
    // Apply additional filtering
    let filteredRestaurants = allRestaurants;
    
    if (query && exactMatch === 'true') {
      filteredRestaurants = allRestaurants.filter(restaurant => {
        const searchField = searchBy === 'brand' ? restaurant.brand : 
                           searchBy === 'branch' ? restaurant.area : 
                           restaurant.cuisine;
        return searchField.toLowerCase() === query.toLowerCase();
      });
    }

    if (excludeItem === 'true' && query) {
      filteredRestaurants = filteredRestaurants.filter(restaurant => {
        const searchField = searchBy === 'brand' ? restaurant.brand : 
                           searchBy === 'branch' ? restaurant.area : 
                           restaurant.cuisine;
        return !searchField.toLowerCase().includes(query.toLowerCase());
      });
    }

    // Calculate statistics
    const stats = {
      averagePrice: filteredRestaurants.length > 0 
        ? filteredRestaurants.reduce((sum, r) => sum + (r.medianPrice || 0), 0) / filteredRestaurants.length
        : 0,
      totalBrands: new Set(filteredRestaurants.map(r => r.brand)).size,
      totalItems: filteredRestaurants.length
    };

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = filteredRestaurants.slice(startIndex, endIndex);

    const result = {
      restaurants: paginatedResults,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredRestaurants.length,
        totalPages: Math.ceil(filteredRestaurants.length / parseInt(limit))
      },
      filters: {
        searchBy,
        query,
        area,
        cuisine,
        exactMatch: exactMatch === 'true',
        excludeItem: excludeItem === 'true'
      }
    };

    // Cache the result for 10 minutes
    await KVService.set(cacheKey, JSON.stringify(result), 600);

    res.json(result);
  } catch (error) {
    console.error('Location intelligence search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Get location insights for a specific area
router.get('/insights/:area', async (req, res) => {
  try {
    const { area } = req.params;
    
    // Check cache first
    const cached = await KVService.getCachedLocationInsights(area);
    if (cached) {
      return res.json(cached);
    }

    // Get restaurants in the area
    const restaurants = await DatabaseService.getRestaurants({ area });
    
    // Calculate insights
    const insights = {
      area,
      totalRestaurants: restaurants.length,
      averageRating: restaurants.length > 0 
        ? restaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / restaurants.length
        : 0,
      averagePrice: restaurants.length > 0 
        ? restaurants.reduce((sum, r) => sum + (r.medianPrice || 0), 0) / restaurants.length
        : 0,
      topCuisines: this.getTopCuisines(restaurants),
      competitorDensity: this.calculateCompetitorDensity(restaurants),
      marketPotential: this.calculateMarketPotential(restaurants),
      recommendations: this.generateRecommendations(restaurants),
      lastUpdated: new Date().toISOString()
    };

    // Cache for 2 hours
    await KVService.cacheLocationInsights(area, insights, 7200);

    res.json(insights);
  } catch (error) {
    console.error('Location insights error:', error);
    res.status(500).json({
      error: 'Failed to get location insights',
      message: error.message
    });
  }
});

// Get market analysis data
router.get('/market-analysis', async (req, res) => {
  try {
    const { city = 'Bangkok', timeframe = '30d' } = req.query;
    
    // Check cache
    const cacheKey = `market_analysis:${city}:${timeframe}`;
    const cached = await KVService.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Get all restaurants in the city
    const restaurants = await DatabaseService.getRestaurants({ city });
    
    // Analyze market trends
    const analysis = {
      city,
      timeframe,
      overview: {
        totalRestaurants: restaurants.length,
        averageRating: restaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / restaurants.length,
        priceRange: {
          min: Math.min(...restaurants.map(r => r.medianPrice || 0)),
          max: Math.max(...restaurants.map(r => r.medianPrice || 0)),
          average: restaurants.reduce((sum, r) => sum + (r.medianPrice || 0), 0) / restaurants.length
        }
      },
      cuisineDistribution: this.getCuisineDistribution(restaurants),
      areaAnalysis: this.getAreaAnalysis(restaurants),
      competitiveAnalysis: this.getCompetitiveAnalysis(restaurants),
      trends: this.getMarketTrends(restaurants),
      opportunities: this.identifyOpportunities(restaurants),
      lastUpdated: new Date().toISOString()
    };

    // Cache for 1 hour
    await KVService.set(cacheKey, JSON.stringify(analysis), 3600);

    res.json(analysis);
  } catch (error) {
    console.error('Market analysis error:', error);
    res.status(500).json({
      error: 'Failed to get market analysis',
      message: error.message
    });
  }
});

// Get restaurant details with Wongnai integration
router.get('/restaurant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Track restaurant view
    const restaurant = await DatabaseService.getRestaurantById(id);
    if (restaurant) {
      await AnalyticsService.trackRestaurantView(id, restaurant.brand);
    }

    // Check cache
    const cached = await KVService.getCachedRestaurantData(id);
    if (cached) {
      return res.json(cached);
    }

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get additional data with real Wongnai integration
    const [wongnaiDetails, wongnaiMenu, wongnaiReviews, analytics] = await Promise.all([
      WongnaiService.getRestaurantDetails(restaurant.wongnaiId || id),
      WongnaiService.getRestaurantMenu(restaurant.wongnaiId || id),
      WongnaiService.getRestaurantReviews(restaurant.wongnaiId || id, 10),
      AnalyticsService.getRestaurantAnalytics(id)
    ]);

    const enhancedData = {
      ...restaurant,
      // Merge Wongnai data with database data
      ...wongnaiDetails,
      menuAnalysis: wongnaiMenu,
      reviews: wongnaiReviews,
      analytics,
      nearbyCompetitors: await this.getNearbyCompetitors(restaurant),
      marketPosition: await this.getMarketPosition(restaurant),
      locationInsights: {
        footTraffic: 8.5,
        competitorDensity: 7.2,
        demographicScore: 9.1,
        accessibilityScore: 9.8
      },
      weeklyStats: {
        totalVisits: 1240,
        totalRevenue: 186000,
        avgOrderValue: 150,
        growthRate: 12.5
      },
      lastUpdated: new Date().toISOString()
    };

    // Cache for 30 minutes
    await KVService.cacheRestaurantData(id, enhancedData, 1800);

    res.json(enhancedData);
  } catch (error) {
    console.error('Restaurant details error:', error);
    res.status(500).json({
      error: 'Failed to get restaurant details',
      message: error.message
    });
  }
});

// Helper methods
router.getTopCuisines = function(restaurants) {
  const cuisineCount = {};
  restaurants.forEach(r => {
    cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
  });
  
  return Object.entries(cuisineCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([cuisine, count]) => ({ cuisine, count, percentage: (count / restaurants.length * 100).toFixed(1) }));
};

router.calculateCompetitorDensity = function(restaurants) {
  // Mock calculation - in real implementation, this would use geographic data
  return {
    score: Math.min(100, restaurants.length * 2),
    level: restaurants.length > 20 ? 'High' : restaurants.length > 10 ? 'Medium' : 'Low',
    description: `${restaurants.length} restaurants in this area`
  };
};

router.calculateMarketPotential = function(restaurants) {
  const avgRating = restaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / restaurants.length;
  const score = Math.min(100, (avgRating * 20) + (restaurants.length > 15 ? 10 : 20));
  
  return {
    score: Math.round(score),
    level: score > 80 ? 'High' : score > 60 ? 'Medium' : 'Low',
    factors: [
      'Customer satisfaction levels',
      'Competition density',
      'Market saturation',
      'Growth potential'
    ]
  };
};

router.generateRecommendations = function(restaurants) {
  const recommendations = [];
  
  if (restaurants.length < 5) {
    recommendations.push({
      type: 'opportunity',
      title: 'Low Competition Area',
      description: 'This area has relatively few restaurants, presenting a good opportunity for new establishments.'
    });
  }
  
  const avgRating = restaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / restaurants.length;
  if (avgRating < 4.0) {
    recommendations.push({
      type: 'improvement',
      title: 'Service Quality Gap',
      description: 'Average ratings in this area are below 4.0, indicating potential for quality improvement.'
    });
  }
  
  return recommendations;
};

router.getCuisineDistribution = function(restaurants) {
  const distribution = {};
  restaurants.forEach(r => {
    distribution[r.cuisine] = (distribution[r.cuisine] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .map(([cuisine, count]) => ({
      cuisine,
      count,
      percentage: (count / restaurants.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count);
};

router.getAreaAnalysis = function(restaurants) {
  const areas = {};
  restaurants.forEach(r => {
    if (!areas[r.area]) {
      areas[r.area] = { count: 0, totalRating: 0, totalPrice: 0 };
    }
    areas[r.area].count++;
    areas[r.area].totalRating += r.rating || 0;
    areas[r.area].totalPrice += r.medianPrice || 0;
  });
  
  return Object.entries(areas)
    .map(([area, data]) => ({
      area,
      restaurantCount: data.count,
      averageRating: (data.totalRating / data.count).toFixed(1),
      averagePrice: Math.round(data.totalPrice / data.count),
      marketShare: (data.count / restaurants.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.restaurantCount - a.restaurantCount);
};

router.getCompetitiveAnalysis = function(restaurants) {
  const brands = {};
  restaurants.forEach(r => {
    if (!brands[r.brand]) {
      brands[r.brand] = { count: 0, totalRating: 0, totalReviews: 0 };
    }
    brands[r.brand].count++;
    brands[r.brand].totalRating += r.rating || 0;
    brands[r.brand].totalReviews += r.totalReviews || 0;
  });
  
  return Object.entries(brands)
    .map(([brand, data]) => ({
      brand,
      locations: data.count,
      averageRating: (data.totalRating / data.count).toFixed(1),
      totalReviews: data.totalReviews,
      marketShare: (data.count / restaurants.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.locations - a.locations)
    .slice(0, 10);
};

router.getMarketTrends = function(restaurants) {
  // Mock trends - in real implementation, this would analyze historical data
  return {
    growing: ['Plant-based options', 'Delivery-focused', 'Health-conscious'],
    declining: ['Traditional fast food', 'Buffet-style'],
    emerging: ['Ghost kitchens', 'Fusion cuisine', 'Sustainable dining'],
    priceChanges: {
      overall: '+2.3%',
      byCategory: {
        'Fast Food': '+1.8%',
        'Casual Dining': '+2.5%',
        'Fine Dining': '+3.1%'
      }
    }
  };
};

router.identifyOpportunities = function(restaurants) {
  const opportunities = [];
  
  // Analyze cuisine gaps
  const cuisines = new Set(restaurants.map(r => r.cuisine));
  const popularCuisines = ['Thai', 'Japanese', 'Italian', 'Chinese', 'Korean', 'Indian'];
  
  popularCuisines.forEach(cuisine => {
    if (!cuisines.has(cuisine)) {
      opportunities.push({
        type: 'cuisine_gap',
        title: `${cuisine} Cuisine Opportunity`,
        description: `No ${cuisine} restaurants found in this analysis area`,
        potential: 'High'
      });
    }
  });
  
  // Price point analysis
  const avgPrice = restaurants.reduce((sum, r) => sum + (r.medianPrice || 0), 0) / restaurants.length;
  if (avgPrice > 200) {
    opportunities.push({
      type: 'price_gap',
      title: 'Affordable Dining Gap',
      description: 'Area lacks affordable dining options under ฿150',
      potential: 'Medium'
    });
  }
  
  return opportunities;
};

router.getWongnaiData = async function(restaurant) {
  // Mock Wongnai integration - in real implementation, this would call Wongnai API
  return {
    wongnaiId: `wongnai_${restaurant.id}`,
    wongnaiRating: restaurant.rating + (Math.random() * 0.2 - 0.1),
    wongnaiReviews: restaurant.totalReviews + Math.floor(Math.random() * 100),
    popularDishes: [
      'Signature Burger',
      'Crispy Fries',
      'Chocolate Shake'
    ],
    priceRange: '฿100-250',
    openingHours: '10:00 - 22:00',
    features: ['Delivery', 'Takeaway', 'Dine-in'],
    lastUpdated: new Date().toISOString()
  };
};

router.getNearbyCompetitors = async function(restaurant) {
  // Mock nearby competitors - in real implementation, this would use geolocation
  const competitors = await DatabaseService.getRestaurants({ 
    area: restaurant.area,
    cuisine: restaurant.cuisine 
  });
  
  return competitors
    .filter(c => c.id !== restaurant.id)
    .slice(0, 5)
    .map(c => ({
      ...c,
      distance: (Math.random() * 2 + 0.1).toFixed(1) + ' km'
    }));
};

router.getMarketPosition = async function(restaurant) {
  const areaRestaurants = await DatabaseService.getRestaurants({ area: restaurant.area });
  const cuisineRestaurants = await DatabaseService.getRestaurants({ cuisine: restaurant.cuisine });
  
  const areaRank = areaRestaurants
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .findIndex(r => r.id === restaurant.id) + 1;
    
  const cuisineRank = cuisineRestaurants
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .findIndex(r => r.id === restaurant.id) + 1;
  
  return {
    areaRank,
    areaTotal: areaRestaurants.length,
    cuisineRank,
    cuisineTotal: cuisineRestaurants.length,
    percentile: {
      area: Math.round((1 - areaRank / areaRestaurants.length) * 100),
      cuisine: Math.round((1 - cuisineRank / cuisineRestaurants.length) * 100)
    }
  };
};

module.exports = router;