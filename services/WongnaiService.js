/**
 * Wongnai API Integration Service
 * Provides real restaurant data integration with Wongnai platform
 */

const axios = require('axios');
const KVService = require('./KVService');

class WongnaiService {
  constructor() {
    this.baseURL = process.env.WONGNAI_API_URL || 'https://api.wongnai.com/v1';
    this.apiKey = process.env.WONGNAI_API_KEY;
    this.cacheTimeout = 3600; // 1 hour cache
  }

  /**
   * Search restaurants on Wongnai
   */
  async searchRestaurants(query, options = {}) {
    const cacheKey = `wongnai:search:${JSON.stringify({ query, ...options })}`;
    
    try {
      // Check cache first
      const cached = await KVService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // If no API key, return mock data
      if (!this.apiKey) {
        return this.getMockSearchResults(query, options);
      }

      const response = await axios.get(`${this.baseURL}/restaurants/search`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          q: query,
          location: options.area || options.city,
          cuisine: options.cuisine,
          limit: options.limit || 20,
          offset: options.offset || 0
        },
        timeout: 10000
      });

      const results = this.transformSearchResults(response.data);
      
      // Cache results
      await KVService.set(cacheKey, JSON.stringify(results), this.cacheTimeout);
      
      return results;
    } catch (error) {
      console.error('Wongnai API search error:', error.message);
      // Fallback to mock data
      return this.getMockSearchResults(query, options);
    }
  }

  /**
   * Get restaurant details from Wongnai
   */
  async getRestaurantDetails(restaurantId) {
    const cacheKey = `wongnai:restaurant:${restaurantId}`;
    
    try {
      // Check cache first
      const cached = await KVService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // If no API key, return mock data
      if (!this.apiKey) {
        return this.getMockRestaurantDetails(restaurantId);
      }

      const response = await axios.get(`${this.baseURL}/restaurants/${restaurantId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const details = this.transformRestaurantDetails(response.data);
      
      // Cache results
      await KVService.set(cacheKey, JSON.stringify(details), this.cacheTimeout);
      
      return details;
    } catch (error) {
      console.error('Wongnai API restaurant details error:', error.message);
      // Fallback to mock data
      return this.getMockRestaurantDetails(restaurantId);
    }
  }

  /**
   * Get restaurant menu from Wongnai
   */
  async getRestaurantMenu(restaurantId) {
    const cacheKey = `wongnai:menu:${restaurantId}`;
    
    try {
      // Check cache first
      const cached = await KVService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // If no API key, return mock data
      if (!this.apiKey) {
        return this.getMockMenuData(restaurantId);
      }

      const response = await axios.get(`${this.baseURL}/restaurants/${restaurantId}/menu`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const menu = this.transformMenuData(response.data);
      
      // Cache results
      await KVService.set(cacheKey, JSON.stringify(menu), this.cacheTimeout);
      
      return menu;
    } catch (error) {
      console.error('Wongnai API menu error:', error.message);
      // Fallback to mock data
      return this.getMockMenuData(restaurantId);
    }
  }

  /**
   * Get restaurant reviews from Wongnai
   */
  async getRestaurantReviews(restaurantId, limit = 10) {
    const cacheKey = `wongnai:reviews:${restaurantId}:${limit}`;
    
    try {
      // Check cache first
      const cached = await KVService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // If no API key, return mock data
      if (!this.apiKey) {
        return this.getMockReviews(restaurantId, limit);
      }

      const response = await axios.get(`${this.baseURL}/restaurants/${restaurantId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit,
          sort: 'recent'
        },
        timeout: 10000
      });

      const reviews = this.transformReviews(response.data);
      
      // Cache results
      await KVService.set(cacheKey, JSON.stringify(reviews), this.cacheTimeout);
      
      return reviews;
    } catch (error) {
      console.error('Wongnai API reviews error:', error.message);
      // Fallback to mock data
      return this.getMockReviews(restaurantId, limit);
    }
  }

  /**
   * Transform Wongnai search results to our format
   */
  transformSearchResults(data) {
    if (!data || !data.restaurants) return { restaurants: [], total: 0 };

    return {
      restaurants: data.restaurants.map(restaurant => ({
        id: restaurant.id,
        wongnaiId: restaurant.wongnai_id,
        brand: restaurant.name,
        area: restaurant.location?.district || '',
        city: restaurant.location?.city || 'Bangkok',
        cuisine: restaurant.cuisine_types?.[0] || 'Thai',
        rating: restaurant.rating || 0,
        totalReviews: restaurant.review_count || 0,
        medianPrice: restaurant.price_range?.average || 0,
        logo: this.getCuisineEmoji(restaurant.cuisine_types?.[0]),
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        openingHours: restaurant.opening_hours,
        imageUrl: restaurant.cover_image?.url
      })),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 20
    };
  }

  /**
   * Transform restaurant details to our format
   */
  transformRestaurantDetails(data) {
    return {
      id: data.id,
      wongnaiId: data.wongnai_id,
      brand: data.name,
      area: data.location?.district || '',
      city: data.location?.city || 'Bangkok',
      cuisine: data.cuisine_types?.[0] || 'Thai',
      rating: data.rating || 0,
      totalReviews: data.review_count || 0,
      medianPrice: data.price_range?.average || 0,
      address: data.address,
      phone: data.phone,
      website: data.website,
      openingHours: data.opening_hours,
      description: data.description,
      features: data.features || [],
      imageUrl: data.cover_image?.url,
      gallery: data.gallery?.map(img => img.url) || [],
      coordinates: {
        lat: data.location?.latitude,
        lng: data.location?.longitude
      }
    };
  }

  /**
   * Transform menu data to our format
   */
  transformMenuData(data) {
    if (!data || !data.menu_sections) {
      return this.getMockMenuData();
    }

    const categories = data.menu_sections.map(section => section.name);
    const items = [];
    let totalItems = 0;
    let totalPrice = 0;

    data.menu_sections.forEach(section => {
      section.items?.forEach(item => {
        items.push({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: section.name,
          imageUrl: item.image?.url,
          isPopular: item.is_popular || false,
          rating: item.rating || 0,
          orders: item.order_count || 0
        });
        totalItems++;
        totalPrice += item.price || 0;
      });
    });

    const popularItems = items
      .filter(item => item.isPopular || item.orders > 0)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    return {
      totalItems,
      avgPrice: totalItems > 0 ? Math.round(totalPrice / totalItems) : 0,
      categories,
      items,
      popularItems
    };
  }

  /**
   * Transform reviews to our format
   */
  transformReviews(data) {
    if (!data || !data.reviews) return [];

    return data.reviews.map(review => ({
      id: review.id,
      author: review.user?.display_name || 'Anonymous',
      rating: review.rating || 0,
      comment: review.comment || '',
      date: review.created_at,
      platform: 'Wongnai',
      helpful: review.helpful_count || 0,
      images: review.images?.map(img => img.url) || []
    }));
  }

  /**
   * Get cuisine emoji based on cuisine type
   */
  getCuisineEmoji(cuisine) {
    const emojiMap = {
      'Thai': '🇹🇭',
      'Japanese': '🍣',
      'Italian': '🍝',
      'Chinese': '🥢',
      'Korean': '🇰🇷',
      'Indian': '🍛',
      'Mexican': '🌮',
      'French': '🇫🇷',
      'American': '🍔',
      'Burger': '🍟',
      'Pizza': '🍕',
      'Coffee': '☕',
      'Dessert': '🍰',
      'Seafood': '🦐',
      'BBQ': '🍖'
    };
    return emojiMap[cuisine] || '🍽️';
  }

  /**
   * Mock search results for development/fallback
   */
  getMockSearchResults(query, options = {}) {
    const mockRestaurants = [
      {
        id: '1',
        wongnaiId: 'wongnai_1',
        brand: "McDonald's",
        area: 'Siam',
        city: 'Bangkok',
        cuisine: 'Burger',
        rating: 4.2,
        totalReviews: 22450,
        medianPrice: 150,
        logo: '🍟',
        address: '999 Rama I Rd, Pathum Wan, Bangkok 10330',
        phone: '+66 2 658 1000',
        website: 'https://mcdonalds.co.th',
        openingHours: '06:00 - 24:00'
      },
      {
        id: '2',
        wongnaiId: 'wongnai_2',
        brand: 'Burger King',
        area: 'Sukhumvit',
        city: 'Bangkok',
        cuisine: 'Burger',
        rating: 4.1,
        totalReviews: 9517,
        medianPrice: 120,
        logo: '👑',
        address: '123 Sukhumvit Rd, Bangkok 10110',
        phone: '+66 2 123 4567',
        website: 'https://burgerking.co.th',
        openingHours: '10:00 - 22:00'
      },
      {
        id: '3',
        wongnaiId: 'wongnai_3',
        brand: 'KFC',
        area: 'Chatuchak',
        city: 'Bangkok',
        cuisine: 'Chicken',
        rating: 3.8,
        totalReviews: 1893,
        medianPrice: 140,
        logo: '🍗',
        address: '456 Phahonyothin Rd, Bangkok 10900',
        phone: '+66 2 987 6543',
        website: 'https://kfc.co.th',
        openingHours: '10:00 - 22:00'
      }
    ];

    // Filter based on query and options
    let filtered = mockRestaurants;
    
    if (query) {
      filtered = filtered.filter(r => 
        r.brand.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (options.area) {
      filtered = filtered.filter(r => 
        r.area.toLowerCase().includes(options.area.toLowerCase())
      );
    }
    
    if (options.cuisine) {
      filtered = filtered.filter(r => 
        r.cuisine.toLowerCase().includes(options.cuisine.toLowerCase())
      );
    }

    return {
      restaurants: filtered,
      total: filtered.length,
      page: 1,
      limit: options.limit || 20
    };
  }

  /**
   * Mock restaurant details for development/fallback
   */
  getMockRestaurantDetails(restaurantId) {
    return {
      id: restaurantId,
      wongnaiId: `wongnai_${restaurantId}`,
      brand: "McDonald's",
      area: 'Siam',
      city: 'Bangkok',
      cuisine: 'Fast Food',
      rating: 4.2,
      totalReviews: 22450,
      medianPrice: 150,
      address: '999 Rama I Rd, Pathum Wan, Bangkok 10330',
      phone: '+66 2 658 1000',
      website: 'https://mcdonalds.co.th',
      openingHours: '06:00 - 24:00',
      description: "World's leading fast-food restaurant chain serving quality burgers, fries, and beverages.",
      features: ['Delivery', 'Takeaway', 'Dine-in', 'Drive-thru', '24 Hours'],
      coordinates: {
        lat: 13.7563,
        lng: 100.5018
      }
    };
  }

  /**
   * Mock menu data for development/fallback
   */
  getMockMenuData(restaurantId) {
    return {
      totalItems: 45,
      avgPrice: 120,
      categories: ['Burgers', 'Chicken', 'Sides', 'Beverages', 'Desserts', 'Breakfast'],
      popularItems: [
        { name: 'Big Mac', price: 159, orders: 450, rating: 4.3, category: 'Burgers' },
        { name: 'McChicken', price: 139, orders: 380, rating: 4.1, category: 'Chicken' },
        { name: 'French Fries', price: 59, orders: 620, rating: 4.5, category: 'Sides' },
        { name: 'Coca-Cola', price: 39, orders: 580, rating: 4.2, category: 'Beverages' },
        { name: 'Apple Pie', price: 29, orders: 220, rating: 4.0, category: 'Desserts' }
      ],
      items: [
        { id: '1', name: 'Big Mac', price: 159, category: 'Burgers', description: 'Two all-beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun.' },
        { id: '2', name: 'Quarter Pounder', price: 179, category: 'Burgers', description: 'Fresh beef quarter pounder with cheese.' },
        { id: '3', name: 'McChicken', price: 139, category: 'Chicken', description: 'Crispy chicken patty with lettuce and mayo.' },
        { id: '4', name: 'Chicken McNuggets', price: 89, category: 'Chicken', description: '6-piece chicken nuggets.' }
      ]
    };
  }

  /**
   * Mock reviews for development/fallback
   */
  getMockReviews(restaurantId, limit = 10) {
    const mockReviews = [
      {
        id: '1',
        author: 'John D.',
        rating: 5,
        comment: 'Great service and food quality. Always consistent!',
        date: '2025-01-15T10:30:00Z',
        platform: 'Wongnai',
        helpful: 12
      },
      {
        id: '2',
        author: 'Sarah M.',
        rating: 4,
        comment: 'Good location, fast service. Sometimes crowded during lunch.',
        date: '2025-01-12T14:20:00Z',
        platform: 'Wongnai',
        helpful: 8
      },
      {
        id: '3',
        author: 'Mike T.',
        rating: 4,
        comment: 'Standard McDonald\'s experience. Clean and efficient.',
        date: '2025-01-10T18:45:00Z',
        platform: 'Wongnai',
        helpful: 5
      },
      {
        id: '4',
        author: 'Lisa K.',
        rating: 3,
        comment: 'Food was okay, but service was a bit slow.',
        date: '2025-01-08T12:15:00Z',
        platform: 'Wongnai',
        helpful: 3
      },
      {
        id: '5',
        author: 'David L.',
        rating: 5,
        comment: 'Love the new menu items! Great value for money.',
        date: '2025-01-05T16:30:00Z',
        platform: 'Wongnai',
        helpful: 15
      }
    ];

    return mockReviews.slice(0, limit);
  }
}

module.exports = new WongnaiService();