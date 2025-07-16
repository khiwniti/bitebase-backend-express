const axios = require('axios');
const logger = require('../utils/logger');

class ExternalMenuProvider {
  constructor(config = {}) {
    // Configurable API endpoints - can be changed via environment variables
    this.businessAPI = process.env.MENU_BUSINESS_API || 'https://www.wongnai.com/_api/businesses';
    this.menuAPI = process.env.MENU_DATA_API || 'https://www.wongnai.com/_api/restaurants';
    this.providerName = process.env.MENU_PROVIDER_NAME || 'ThirdPartyMenuAPI';
    
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
        ...config.headers
      }
    });
  }

  /**
   * Fetch businesses from external menu data provider
   * @param {Object} params - Search parameters
   * @param {number} params.lat - Latitude
   * @param {number} params.lng - Longitude
   * @param {number} params.radius - Search radius in meters
   * @param {string} params.keyword - Search keyword
   * @param {number} params.page - Page number
   * @param {number} params.limit - Results per page
   * @returns {Promise<Object>} Business data
   */
  async fetchBusinesses(params = {}) {
    try {
      const {
        lat = 13.7563,
        lng = 100.5018,
        radius = 5000,
        keyword = '',
        page = 1,
        limit = 20
      } = params;

      const response = await this.axiosInstance.get(this.businessAPI, {
        params: {
          lat,
          lng,
          radius,
          keyword,
          page,
          limit,
          type: 'restaurant'
        }
      });

      logger.info(`Fetched ${response.data?.data?.length || 0} businesses from ${this.providerName}`);
      return {
        success: true,
        data: response.data,
        businesses: response.data?.data || []
      };
    } catch (error) {
      logger.error(`Error fetching businesses from ${this.providerName}:`, error.message);
      return {
        success: false,
        error: error.message,
        businesses: []
      };
    }
  }

  /**
   * Fetch delivery menu for a specific restaurant
   * @param {string} publicId - Restaurant public ID from external provider
   * @returns {Promise<Object>} Menu data
   */
  async fetchDeliveryMenu(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const menuEndpoint = `${this.menuAPI}/${publicId}/delivery-menu`;
      const response = await this.axiosInstance.get(menuEndpoint);
      
      const menuData = response.data;
      logger.info(`Fetched menu data for restaurant ${publicId} from ${this.providerName}`);
      
      return {
        success: true,
        publicId,
        menu: menuData,
        categories: this.parseMenuCategories(menuData),
        items: this.parseMenuItems(menuData),
        insights: this.generateMenuInsights(menuData)
      };
    } catch (error) {
      logger.error(`Error fetching menu for restaurant ${publicId} from ${this.providerName}:`, error.message);
      return {
        success: false,
        error: error.message,
        publicId,
        menu: null
      };
    }
  }

  /**
   * Parse menu categories from raw menu data
   * @param {Object} menuData - Raw menu data from API
   * @returns {Array} Parsed categories
   */
  parseMenuCategories(menuData) {
    try {
      if (!menuData || !menuData.categories) return [];
      
      return menuData.categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        itemCount: category.items?.length || 0,
        averagePrice: this.calculateAveragePrice(category.items || []),
        isPopular: category.isPopular || false
      }));
    } catch (error) {
      logger.error('Error parsing menu categories:', error.message);
      return [];
    }
  }

  /**
   * Parse menu items from raw menu data
   * @param {Object} menuData - Raw menu data from API
   * @returns {Array} Parsed menu items
   */
  parseMenuItems(menuData) {
    try {
      if (!menuData || !menuData.categories) return [];
      
      const items = [];
      
      menuData.categories.forEach(category => {
        if (category.items) {
          category.items.forEach(item => {
            items.push({
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price || 0,
              originalPrice: item.originalPrice || item.price || 0,
              discount: item.discount || 0,
              categoryId: category.id,
              categoryName: category.name,
              imageUrl: item.imageUrl || item.image || '',
              isPopular: item.isPopular || false,
              isRecommended: item.isRecommended || false,
              rating: item.rating || 0,
              reviewCount: item.reviewCount || 0,
              tags: item.tags || [],
              allergens: item.allergens || [],
              spicyLevel: item.spicyLevel || 0,
              preparationTime: item.preparationTime || 0
            });
          });
        }
      });
      
      return items;
    } catch (error) {
      logger.error('Error parsing menu items:', error.message);
      return [];
    }
  }

  /**
   * Generate menu insights from parsed data
   * @param {Object} menuData - Raw menu data
   * @returns {Object} Menu insights
   */
  generateMenuInsights(menuData) {
    try {
      const items = this.parseMenuItems(menuData);
      const categories = this.parseMenuCategories(menuData);
      
      return {
        totalItems: items.length,
        totalCategories: categories.length,
        averagePrice: this.calculateAveragePrice(items),
        priceRange: this.calculatePriceRange(items),
        popularItems: items.filter(item => item.isPopular).slice(0, 10),
        recommendedItems: items.filter(item => item.isRecommended).slice(0, 10),
        topRatedItems: items
          .filter(item => item.rating > 0)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10),
        categoryDistribution: this.calculateCategoryDistribution(categories),
        pricingStrategy: this.analyzePricingStrategy(items),
        competitiveAnalysis: this.generateCompetitiveInsights(items)
      };
    } catch (error) {
      logger.error('Error generating menu insights:', error.message);
      return {};
    }
  }

  /**
   * Calculate average price from items array
   * @param {Array} items - Array of menu items
   * @returns {number} Average price
   */
  calculateAveragePrice(items) {
    if (!items || items.length === 0) return 0;
    
    const validPrices = items
      .map(item => item.price || 0)
      .filter(price => price > 0);
    
    if (validPrices.length === 0) return 0;
    
    return Math.round(validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length);
  }

  /**
   * Calculate price range from items
   * @param {Array} items - Array of menu items
   * @returns {Object} Price range object
   */
  calculatePriceRange(items) {
    if (!items || items.length === 0) {
      return { min: 0, max: 0, median: 0 };
    }
    
    const validPrices = items
      .map(item => item.price || 0)
      .filter(price => price > 0)
      .sort((a, b) => a - b);
    
    if (validPrices.length === 0) {
      return { min: 0, max: 0, median: 0 };
    }
    
    const median = validPrices.length % 2 === 0
      ? (validPrices[validPrices.length / 2 - 1] + validPrices[validPrices.length / 2]) / 2
      : validPrices[Math.floor(validPrices.length / 2)];
    
    return {
      min: validPrices[0],
      max: validPrices[validPrices.length - 1],
      median: Math.round(median)
    };
  }

  /**
   * Calculate category distribution
   * @param {Array} categories - Array of categories
   * @returns {Array} Category distribution
   */
  calculateCategoryDistribution(categories) {
    return categories.map(category => ({
      name: category.name,
      itemCount: category.itemCount,
      averagePrice: category.averagePrice,
      percentage: categories.length > 0 
        ? Math.round((category.itemCount / categories.reduce((sum, cat) => sum + cat.itemCount, 0)) * 100)
        : 0
    }));
  }

  /**
   * Analyze pricing strategy
   * @param {Array} items - Array of menu items
   * @returns {Object} Pricing strategy analysis
   */
  analyzePricingStrategy(items) {
    const validItems = items.filter(item => item.price > 0);
    
    if (validItems.length === 0) {
      return {
        strategy: 'unknown',
        confidence: 0,
        recommendations: []
      };
    }
    
    const prices = validItems.map(item => item.price).sort((a, b) => a - b);
    const q1 = prices[Math.floor(prices.length * 0.25)];
    const q3 = prices[Math.floor(prices.length * 0.75)];
    const median = prices[Math.floor(prices.length * 0.5)];
    
    // Analyze pricing distribution
    const lowPriceItems = validItems.filter(item => item.price <= q1).length;
    const midPriceItems = validItems.filter(item => item.price > q1 && item.price <= q3).length;
    const highPriceItems = validItems.filter(item => item.price > q3).length;
    
    let strategy = 'balanced';
    let confidence = 0.7;
    const recommendations = [];
    
    if (lowPriceItems > midPriceItems && lowPriceItems > highPriceItems) {
      strategy = 'value-focused';
      confidence = 0.8;
      recommendations.push('Consider adding premium items to increase average order value');
    } else if (highPriceItems > midPriceItems && highPriceItems > lowPriceItems) {
      strategy = 'premium-focused';
      confidence = 0.8;
      recommendations.push('Consider adding budget-friendly options to attract price-sensitive customers');
    }
    
    return {
      strategy,
      confidence,
      priceDistribution: {
        low: lowPriceItems,
        mid: midPriceItems,
        high: highPriceItems
      },
      quartiles: { q1, median, q3 },
      recommendations
    };
  }

  /**
   * Generate competitive insights
   * @param {Array} items - Array of menu items
   * @returns {Object} Competitive analysis
   */
  generateCompetitiveInsights(items) {
    const insights = {
      strengths: [],
      opportunities: [],
      threats: [],
      recommendations: []
    };
    
    const popularItems = items.filter(item => item.isPopular);
    const highRatedItems = items.filter(item => item.rating >= 4.0);
    const discountedItems = items.filter(item => item.discount > 0);
    
    // Analyze strengths
    if (popularItems.length > items.length * 0.3) {
      insights.strengths.push('High number of popular menu items');
    }
    
    if (highRatedItems.length > items.length * 0.4) {
      insights.strengths.push('Strong customer satisfaction with menu items');
    }
    
    // Identify opportunities
    if (discountedItems.length < items.length * 0.1) {
      insights.opportunities.push('Limited promotional pricing - opportunity for strategic discounts');
    }
    
    const categoryCount = new Set(items.map(item => item.categoryId)).size;
    if (categoryCount < 5) {
      insights.opportunities.push('Limited menu variety - opportunity to expand categories');
    }
    
    // Generate recommendations
    insights.recommendations.push('Monitor competitor pricing for similar items');
    insights.recommendations.push('Focus on promoting high-rated items');
    insights.recommendations.push('Consider seasonal menu updates based on trends');
    
    return insights;
  }

  /**
   * Batch fetch menu data for multiple restaurants
   * @param {Array} publicIds - Array of restaurant public IDs
   * @returns {Promise<Array>} Array of menu data results
   */
  async batchFetchMenus(publicIds) {
    const results = [];
    const batchSize = 5; // Process 5 restaurants at a time to avoid rate limiting
    
    for (let i = 0; i < publicIds.length; i += batchSize) {
      const batch = publicIds.slice(i, i + batchSize);
      const batchPromises = batch.map(publicId => this.fetchDeliveryMenu(publicId));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
        ));
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < publicIds.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        logger.error(`Error processing batch ${i / batchSize + 1}:`, error.message);
      }
    }
    
    return results;
  }
}

module.exports = ExternalMenuProvider;