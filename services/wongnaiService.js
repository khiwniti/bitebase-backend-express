const axios = require('axios');

class WongnaiService {
  constructor() {
    this.baseURL = 'https://www.wongnai.com/_api';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
      'Referer': 'https://www.wongnai.com/',
    };
  }

  /**
   * Get restaurant menu data from Wongnai
   * @param {string} publicId - Restaurant public ID from Wongnai
   * @returns {Promise<Object>} Menu data
   */
  async getRestaurantMenu(publicId) {
    try {
      console.log(`🍽️ Fetching menu for restaurant: ${publicId}`);
      
      // In production, this would make actual API calls to Wongnai
      // For now, we'll return mock data that matches Wongnai's structure
      const mockMenuData = {
        restaurant: {
          id: publicId,
          name: "Bella Vista Bistro",
          rating: 4.6,
          reviewCount: 1250,
          priceRange: "$$",
          cuisine: ["Thai", "Asian"],
          location: {
            address: "123 Sukhumvit Road, Bangkok",
            district: "Watthana",
            province: "Bangkok"
          }
        },
        menu: {
          categories: [
            {
              id: "thai-dishes",
              name: "Thai Dishes",
              items: [
                {
                  id: "pad-thai",
                  name: "Pad Thai",
                  description: "Traditional Thai stir-fried noodles with shrimp, tofu, and peanuts",
                  price: 180,
                  rating: 4.8,
                  reviewCount: 450,
                  popularity: 95,
                  ingredients: ["Rice noodles", "Shrimp", "Tofu", "Bean sprouts", "Peanuts", "Lime"],
                  preparationTime: 12,
                  isAvailable: true,
                  image: null,
                  nutritionInfo: {
                    calories: 520,
                    protein: 25,
                    carbs: 65,
                    fat: 18
                  }
                },
                {
                  id: "green-curry",
                  name: "Green Curry",
                  description: "Spicy green curry with chicken and Thai basil",
                  price: 220,
                  rating: 4.6,
                  reviewCount: 320,
                  popularity: 87,
                  ingredients: ["Chicken", "Green curry paste", "Coconut milk", "Thai basil", "Eggplant"],
                  preparationTime: 15,
                  isAvailable: true,
                  image: null,
                  nutritionInfo: {
                    calories: 680,
                    protein: 35,
                    carbs: 25,
                    fat: 45
                  }
                },
                {
                  id: "tom-yum",
                  name: "Tom Yum Soup",
                  description: "Hot and sour soup with shrimp and mushrooms",
                  price: 160,
                  rating: 4.5,
                  reviewCount: 280,
                  popularity: 78,
                  ingredients: ["Shrimp", "Mushrooms", "Lemongrass", "Lime leaves", "Chili"],
                  preparationTime: 10,
                  isAvailable: true,
                  image: null,
                  nutritionInfo: {
                    calories: 180,
                    protein: 20,
                    carbs: 8,
                    fat: 8
                  }
                }
              ]
            },
            {
              id: "desserts",
              name: "Desserts",
              items: [
                {
                  id: "mango-sticky-rice",
                  name: "Mango Sticky Rice",
                  description: "Sweet sticky rice with fresh mango and coconut milk",
                  price: 120,
                  rating: 4.7,
                  reviewCount: 180,
                  popularity: 65,
                  ingredients: ["Sticky rice", "Mango", "Coconut milk", "Sugar"],
                  preparationTime: 5,
                  isAvailable: true,
                  image: null,
                  nutritionInfo: {
                    calories: 420,
                    protein: 8,
                    carbs: 85,
                    fat: 12
                  }
                }
              ]
            }
          ]
        },
        analytics: {
          totalOrders: 5680,
          totalRevenue: 1168000,
          avgOrderValue: 205,
          topSellingItems: ["pad-thai", "green-curry", "tom-yum"],
          peakHours: ["12:00-14:00", "18:00-21:00"],
          customerDemographics: {
            ageGroups: {
              "18-25": 25,
              "26-35": 35,
              "36-45": 25,
              "46-55": 10,
              "55+": 5
            },
            genderSplit: {
              male: 45,
              female: 55
            }
          }
        }
      };

      return mockMenuData;
    } catch (error) {
      console.error('❌ Error fetching Wongnai menu:', error.message);
      throw new Error(`Failed to fetch menu data: ${error.message}`);
    }
  }

  /**
   * Search for restaurants on Wongnai
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Restaurant search results
   */
  async searchRestaurants(params = {}) {
    try {
      const { query, location, cuisine, priceRange, rating } = params;
      
      console.log('🔍 Searching Wongnai restaurants:', params);
      
      // Mock search results
      const mockResults = [
        {
          publicId: "12345",
          name: "Bella Vista Bistro",
          rating: 4.6,
          reviewCount: 1250,
          priceRange: "$$",
          cuisine: ["Thai", "Asian"],
          location: {
            address: "123 Sukhumvit Road, Bangkok",
            district: "Watthana",
            lat: 13.7563,
            lng: 100.5018
          },
          image: null,
          isOpen: true,
          deliveryAvailable: true
        },
        {
          publicId: "67890",
          name: "Spice Garden",
          rating: 4.4,
          reviewCount: 890,
          priceRange: "$",
          cuisine: ["Thai", "Street Food"],
          location: {
            address: "456 Silom Road, Bangkok",
            district: "Bang Rak",
            lat: 13.7244,
            lng: 100.5347
          },
          image: null,
          isOpen: true,
          deliveryAvailable: false
        }
      ];

      return mockResults;
    } catch (error) {
      console.error('❌ Error searching Wongnai restaurants:', error.message);
      throw new Error(`Failed to search restaurants: ${error.message}`);
    }
  }

  /**
   * Get restaurant reviews from Wongnai
   * @param {string} publicId - Restaurant public ID
   * @param {number} limit - Number of reviews to fetch
   * @returns {Promise<Array>} Reviews data
   */
  async getRestaurantReviews(publicId, limit = 10) {
    try {
      console.log(`📝 Fetching reviews for restaurant: ${publicId}`);
      
      // Mock reviews data
      const mockReviews = [
        {
          id: "review1",
          rating: 5,
          comment: "Amazing Pad Thai! Best I've had in Bangkok. The flavors are perfectly balanced.",
          author: {
            name: "FoodLover123",
            reviewCount: 45
          },
          date: "2024-01-10",
          helpful: 12,
          images: []
        },
        {
          id: "review2",
          rating: 4,
          comment: "Great atmosphere and good food. The green curry was a bit too spicy for me but still delicious.",
          author: {
            name: "BangkokEater",
            reviewCount: 23
          },
          date: "2024-01-08",
          helpful: 8,
          images: []
        },
        {
          id: "review3",
          rating: 5,
          comment: "Excellent service and authentic Thai flavors. Will definitely come back!",
          author: {
            name: "ThaiFood_Fan",
            reviewCount: 67
          },
          date: "2024-01-05",
          helpful: 15,
          images: []
        }
      ];

      return mockReviews.slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching Wongnai reviews:', error.message);
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }
  }

  /**
   * Get trending dishes from Wongnai
   * @param {string} location - Location filter
   * @returns {Promise<Array>} Trending dishes
   */
  async getTrendingDishes(location = 'bangkok') {
    try {
      console.log(`📈 Fetching trending dishes for: ${location}`);
      
      // Mock trending dishes
      const mockTrending = [
        {
          id: "trending1",
          name: "Pad Thai",
          category: "Thai",
          popularity: 95,
          orderCount: 2500,
          avgRating: 4.8,
          priceRange: "150-200",
          restaurants: 45
        },
        {
          id: "trending2",
          name: "Green Curry",
          category: "Thai",
          popularity: 87,
          orderCount: 1800,
          avgRating: 4.6,
          priceRange: "200-250",
          restaurants: 38
        },
        {
          id: "trending3",
          name: "Tom Yum Soup",
          category: "Thai",
          popularity: 78,
          orderCount: 1200,
          avgRating: 4.5,
          priceRange: "120-180",
          restaurants: 52
        }
      ];

      return mockTrending;
    } catch (error) {
      console.error('❌ Error fetching trending dishes:', error.message);
      throw new Error(`Failed to fetch trending dishes: ${error.message}`);
    }
  }

  /**
   * Get market insights from Wongnai data
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Market insights
   */
  async getMarketInsights(params = {}) {
    try {
      const { location, cuisine, timeframe } = params;
      
      console.log('📊 Generating market insights:', params);
      
      // Mock market insights
      const mockInsights = {
        marketSize: {
          totalRestaurants: 1250,
          totalOrders: 45000,
          totalRevenue: 9200000,
          growthRate: 12.5
        },
        competition: {
          averageRating: 4.3,
          averagePrice: 185,
          topCompetitors: [
            { name: "Thai Garden", rating: 4.8, orders: 2100 },
            { name: "Spice House", rating: 4.6, orders: 1850 },
            { name: "Bangkok Kitchen", rating: 4.5, orders: 1650 }
          ]
        },
        trends: {
          popularCuisines: ["Thai", "Japanese", "Italian", "Chinese"],
          peakHours: ["12:00-14:00", "18:00-21:00"],
          seasonalTrends: {
            summer: ["Cold noodles", "Fruit desserts", "Iced drinks"],
            winter: ["Hot soups", "Curry dishes", "Warm beverages"]
          }
        },
        opportunities: [
          {
            type: "cuisine_gap",
            description: "Mexican cuisine is underrepresented in this area",
            potential: "high"
          },
          {
            type: "price_point",
            description: "Premium dining options are limited",
            potential: "medium"
          }
        ]
      };

      return mockInsights;
    } catch (error) {
      console.error('❌ Error generating market insights:', error.message);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }
}

module.exports = new WongnaiService();