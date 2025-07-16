const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

class MenuDataService {
  constructor() {
    const dbPath = path.join(__dirname, '../data/bitebase.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  /**
   * Initialize menu-related database tables
   */
  initializeTables() {
    try {
      // Restaurant menu metadata table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS restaurant_menus (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id TEXT NOT NULL,
          public_id TEXT UNIQUE NOT NULL,
          name TEXT,
          address TEXT,
          latitude REAL,
          longitude REAL,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          menu_data TEXT, -- JSON string of full menu data
          total_items INTEGER DEFAULT 0,
          total_categories INTEGER DEFAULT 0,
          average_price REAL DEFAULT 0,
          price_range_min REAL DEFAULT 0,
          price_range_max REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Menu categories table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS menu_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          item_count INTEGER DEFAULT 0,
          average_price REAL DEFAULT 0,
          is_popular BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(restaurant_id, category_id)
        )
      `);

      // Menu items table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          category_id TEXT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL DEFAULT 0,
          original_price REAL DEFAULT 0,
          discount REAL DEFAULT 0,
          image_url TEXT,
          is_popular BOOLEAN DEFAULT FALSE,
          is_recommended BOOLEAN DEFAULT FALSE,
          rating REAL DEFAULT 0,
          review_count INTEGER DEFAULT 0,
          tags TEXT, -- JSON array as string
          allergens TEXT, -- JSON array as string
          spicy_level INTEGER DEFAULT 0,
          preparation_time INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(restaurant_id, item_id)
        )
      `);

      // Menu insights table for analytics
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS menu_insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id TEXT NOT NULL,
          insight_type TEXT NOT NULL, -- 'pricing', 'popularity', 'competitive', etc.
          insight_data TEXT NOT NULL, -- JSON string
          confidence_score REAL DEFAULT 0,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          UNIQUE(restaurant_id, insight_type)
        )
      `);

      // Menu update schedule table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS menu_update_schedule (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id TEXT NOT NULL,
          public_id TEXT NOT NULL,
          last_update DATETIME,
          next_update DATETIME,
          update_frequency TEXT DEFAULT 'bi-weekly', -- 'daily', 'weekly', 'bi-weekly', 'monthly'
          status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(restaurant_id)
        )
      `);

      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_restaurant_menus_public_id ON restaurant_menus(public_id);
        CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
        CREATE INDEX IF NOT EXISTS idx_menu_items_popular ON menu_items(is_popular);
        CREATE INDEX IF NOT EXISTS idx_menu_insights_restaurant ON menu_insights(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_menu_schedule_next_update ON menu_update_schedule(next_update);
      `);

      logger.info('Menu database tables initialized successfully');
    } catch (error) {
      logger.error('Error initializing menu database tables:', error.message);
      throw error;
    }
  }

  /**
   * Save restaurant menu data to database
   * @param {string} restaurantId - Restaurant identifier
   * @param {string} publicId - Public ID from external API
   * @param {Object} menuData - Complete menu data
   * @returns {Promise<Object>} Save result
   */
  async saveMenuData(restaurantId, publicId, menuData) {
    try {
      const transaction = this.db.transaction(() => {
        // Save restaurant menu metadata
        const menuInsert = this.db.prepare(`
          INSERT OR REPLACE INTO restaurant_menus 
          (restaurant_id, public_id, name, address, latitude, longitude, menu_data, 
           total_items, total_categories, average_price, price_range_min, price_range_max, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        menuInsert.run(
          restaurantId,
          publicId,
          menuData.restaurant?.name || '',
          menuData.restaurant?.address || '',
          menuData.restaurant?.latitude || 0,
          menuData.restaurant?.longitude || 0,
          JSON.stringify(menuData.menu),
          menuData.items?.length || 0,
          menuData.categories?.length || 0,
          menuData.insights?.averagePrice || 0,
          menuData.insights?.priceRange?.min || 0,
          menuData.insights?.priceRange?.max || 0
        );

        // Clear existing categories and items for this restaurant
        this.db.prepare('DELETE FROM menu_categories WHERE restaurant_id = ?').run(restaurantId);
        this.db.prepare('DELETE FROM menu_items WHERE restaurant_id = ?').run(restaurantId);

        // Save categories
        if (menuData.categories && menuData.categories.length > 0) {
          const categoryInsert = this.db.prepare(`
            INSERT INTO menu_categories 
            (restaurant_id, category_id, name, description, item_count, average_price, is_popular)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          menuData.categories.forEach(category => {
            categoryInsert.run(
              restaurantId,
              category.id,
              category.name,
              category.description || '',
              category.itemCount || 0,
              category.averagePrice || 0,
              category.isPopular || false
            );
          });
        }

        // Save menu items
        if (menuData.items && menuData.items.length > 0) {
          const itemInsert = this.db.prepare(`
            INSERT INTO menu_items 
            (restaurant_id, item_id, category_id, name, description, price, original_price, 
             discount, image_url, is_popular, is_recommended, rating, review_count, 
             tags, allergens, spicy_level, preparation_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          menuData.items.forEach(item => {
            itemInsert.run(
              restaurantId,
              item.id,
              item.categoryId,
              item.name,
              item.description || '',
              item.price || 0,
              item.originalPrice || 0,
              item.discount || 0,
              item.imageUrl || '',
              item.isPopular || false,
              item.isRecommended || false,
              item.rating || 0,
              item.reviewCount || 0,
              JSON.stringify(item.tags || []),
              JSON.stringify(item.allergens || []),
              item.spicyLevel || 0,
              item.preparationTime || 0
            );
          });
        }

        // Save insights
        if (menuData.insights) {
          const insightInsert = this.db.prepare(`
            INSERT OR REPLACE INTO menu_insights 
            (restaurant_id, insight_type, insight_data, confidence_score, expires_at)
            VALUES (?, ?, ?, ?, datetime('now', '+14 days'))
          `);

          // Save different types of insights
          const insightTypes = ['pricing', 'popularity', 'competitive', 'category_distribution'];
          insightTypes.forEach(type => {
            if (menuData.insights[type] || menuData.insights[type.replace('_', '')]) {
              insightInsert.run(
                restaurantId,
                type,
                JSON.stringify(menuData.insights[type] || menuData.insights[type.replace('_', '')]),
                0.8
              );
            }
          });
        }

        // Update schedule
        this.updateSchedule(restaurantId, publicId);
      });

      transaction();

      logger.info(`Menu data saved for restaurant ${restaurantId} (${publicId})`);
      return { success: true, restaurantId, publicId };
    } catch (error) {
      logger.error(`Error saving menu data for ${restaurantId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get menu data for a restaurant
   * @param {string} restaurantId - Restaurant identifier
   * @returns {Object} Menu data
   */
  getMenuData(restaurantId) {
    try {
      const menuQuery = this.db.prepare(`
        SELECT * FROM restaurant_menus WHERE restaurant_id = ?
      `);
      const menu = menuQuery.get(restaurantId);

      if (!menu) {
        return { success: false, error: 'Menu not found' };
      }

      const categoriesQuery = this.db.prepare(`
        SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY name
      `);
      const categories = categoriesQuery.all(restaurantId);

      const itemsQuery = this.db.prepare(`
        SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category_id, name
      `);
      const items = itemsQuery.all(restaurantId);

      const insightsQuery = this.db.prepare(`
        SELECT * FROM menu_insights WHERE restaurant_id = ? AND expires_at > datetime('now')
      `);
      const insights = insightsQuery.all(restaurantId);

      return {
        success: true,
        menu: {
          ...menu,
          menu_data: menu.menu_data ? JSON.parse(menu.menu_data) : null
        },
        categories,
        items: items.map(item => ({
          ...item,
          tags: item.tags ? JSON.parse(item.tags) : [],
          allergens: item.allergens ? JSON.parse(item.allergens) : []
        })),
        insights: insights.reduce((acc, insight) => {
          acc[insight.insight_type] = JSON.parse(insight.insight_data);
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error(`Error getting menu data for ${restaurantId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get restaurants that need menu updates
   * @returns {Array} Restaurants needing updates
   */
  getRestaurantsForUpdate() {
    try {
      const query = this.db.prepare(`
        SELECT * FROM menu_update_schedule 
        WHERE next_update <= datetime('now') 
        AND status IN ('pending', 'failed')
        ORDER BY next_update ASC
        LIMIT 50
      `);
      
      return query.all();
    } catch (error) {
      logger.error('Error getting restaurants for update:', error.message);
      return [];
    }
  }

  /**
   * Update schedule for a restaurant
   * @param {string} restaurantId - Restaurant identifier
   * @param {string} publicId - Public ID
   * @param {string} frequency - Update frequency
   */
  updateSchedule(restaurantId, publicId, frequency = 'bi-weekly') {
    try {
      const nextUpdate = this.calculateNextUpdate(frequency);
      
      const scheduleInsert = this.db.prepare(`
        INSERT OR REPLACE INTO menu_update_schedule 
        (restaurant_id, public_id, last_update, next_update, update_frequency, status)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'completed')
      `);

      scheduleInsert.run(restaurantId, publicId, nextUpdate, frequency);
    } catch (error) {
      logger.error(`Error updating schedule for ${restaurantId}:`, error.message);
    }
  }

  /**
   * Calculate next update time based on frequency
   * @param {string} frequency - Update frequency
   * @returns {string} Next update datetime
   */
  calculateNextUpdate(frequency) {
    const intervals = {
      'daily': '+1 day',
      'weekly': '+7 days',
      'bi-weekly': '+14 days',
      'monthly': '+30 days'
    };

    const interval = intervals[frequency] || '+14 days';
    return `datetime('now', '${interval}')`;
  }

  /**
   * Mark update as failed
   * @param {string} restaurantId - Restaurant identifier
   * @param {string} errorMessage - Error message
   */
  markUpdateFailed(restaurantId, errorMessage) {
    try {
      const updateQuery = this.db.prepare(`
        UPDATE menu_update_schedule 
        SET status = 'failed', error_message = ?
        WHERE restaurant_id = ?
      `);

      updateQuery.run(errorMessage, restaurantId);
    } catch (error) {
      logger.error(`Error marking update as failed for ${restaurantId}:`, error.message);
    }
  }

  /**
   * Get menu analytics for multiple restaurants
   * @param {Array} restaurantIds - Array of restaurant IDs
   * @returns {Object} Analytics data
   */
  getMenuAnalytics(restaurantIds = []) {
    try {
      let whereClause = '';
      let params = [];

      if (restaurantIds.length > 0) {
        whereClause = `WHERE restaurant_id IN (${restaurantIds.map(() => '?').join(',')})`;
        params = restaurantIds;
      }

      // Get overall statistics
      const statsQuery = this.db.prepare(`
        SELECT 
          COUNT(*) as total_restaurants,
          AVG(total_items) as avg_items_per_restaurant,
          AVG(total_categories) as avg_categories_per_restaurant,
          AVG(average_price) as overall_avg_price,
          MIN(price_range_min) as lowest_price,
          MAX(price_range_max) as highest_price
        FROM restaurant_menus ${whereClause}
      `);

      const stats = statsQuery.get(...params);

      // Get popular items across restaurants
      const popularItemsQuery = this.db.prepare(`
        SELECT name, COUNT(*) as frequency, AVG(price) as avg_price
        FROM menu_items 
        ${whereClause ? whereClause.replace('restaurant_menus', 'menu_items') + ' AND' : 'WHERE'} is_popular = 1
        GROUP BY name
        ORDER BY frequency DESC, avg_price ASC
        LIMIT 20
      `);

      const popularItems = popularItemsQuery.all(...params);

      // Get category distribution
      const categoryQuery = this.db.prepare(`
        SELECT name, COUNT(*) as restaurant_count, AVG(average_price) as avg_price
        FROM menu_categories 
        ${whereClause ? whereClause.replace('restaurant_menus', 'menu_categories') : ''}
        GROUP BY name
        ORDER BY restaurant_count DESC
        LIMIT 15
      `);

      const categories = categoryQuery.all(...params);

      return {
        success: true,
        statistics: stats,
        popularItems,
        categoryDistribution: categories,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting menu analytics:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search menu items across restaurants
   * @param {Object} searchParams - Search parameters
   * @returns {Array} Search results
   */
  searchMenuItems(searchParams = {}) {
    try {
      const {
        query = '',
        category = '',
        minPrice = 0,
        maxPrice = 999999,
        isPopular = null,
        restaurantIds = [],
        limit = 50
      } = searchParams;

      let whereConditions = ['mi.price >= ? AND mi.price <= ?'];
      let params = [minPrice, maxPrice];

      if (query) {
        whereConditions.push('(mi.name LIKE ? OR mi.description LIKE ?)');
        params.push(`%${query}%`, `%${query}%`);
      }

      if (category) {
        whereConditions.push('mi.category_id = ?');
        params.push(category);
      }

      if (isPopular !== null) {
        whereConditions.push('mi.is_popular = ?');
        params.push(isPopular ? 1 : 0);
      }

      if (restaurantIds.length > 0) {
        whereConditions.push(`mi.restaurant_id IN (${restaurantIds.map(() => '?').join(',')})`);
        params.push(...restaurantIds);
      }

      params.push(limit);

      const searchQuery = this.db.prepare(`
        SELECT mi.*, rm.name as restaurant_name
        FROM menu_items mi
        JOIN restaurant_menus rm ON mi.restaurant_id = rm.restaurant_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY mi.rating DESC, mi.is_popular DESC, mi.price ASC
        LIMIT ?
      `);

      const results = searchQuery.all(...params);

      return {
        success: true,
        results: results.map(item => ({
          ...item,
          tags: item.tags ? JSON.parse(item.tags) : [],
          allergens: item.allergens ? JSON.parse(item.allergens) : []
        })),
        total: results.length
      };
    } catch (error) {
      logger.error('Error searching menu items:', error.message);
      return { success: false, error: error.message, results: [] };
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = MenuDataService;