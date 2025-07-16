const cron = require('node-cron');
const ExternalMenuProvider = require('../services/ExternalMenuProvider');
const MenuDataService = require('../services/MenuDataService');
const logger = require('../utils/logger');

class MenuUpdateScheduler {
  constructor() {
    this.menuProvider = new ExternalMenuProvider();
    this.menuDataService = new MenuDataService();
    this.isRunning = false;
    this.currentJob = null;
  }

  /**
   * Start the menu update scheduler
   * Runs every day at 2 AM to check for pending updates
   */
  start() {
    if (this.currentJob) {
      logger.warn('Menu update scheduler is already running');
      return;
    }

    // Schedule to run daily at 2:00 AM
    this.currentJob = cron.schedule('0 2 * * *', async () => {
      await this.processScheduledUpdates();
    }, {
      scheduled: true,
      timezone: 'Asia/Bangkok'
    });

    logger.info('Menu update scheduler started - will run daily at 2:00 AM');
  }

  /**
   * Stop the menu update scheduler
   */
  stop() {
    if (this.currentJob) {
      this.currentJob.stop();
      this.currentJob = null;
      logger.info('Menu update scheduler stopped');
    }
  }

  /**
   * Process all scheduled menu updates
   */
  async processScheduledUpdates() {
    if (this.isRunning) {
      logger.warn('Menu update process is already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    logger.info('Starting scheduled menu updates process');

    try {
      const pendingUpdates = this.menuDataService.getRestaurantsForUpdate();
      
      if (pendingUpdates.length === 0) {
        logger.info('No restaurants pending menu updates');
        return;
      }

      logger.info(`Processing ${pendingUpdates.length} restaurants for menu updates`);

      // Process updates in batches to avoid overwhelming the external API
      const batchSize = 5;
      let processed = 0;
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < pendingUpdates.length; i += batchSize) {
        const batch = pendingUpdates.slice(i, i + batchSize);
        
        logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingUpdates.length / batchSize)}`);

        const batchPromises = batch.map(restaurant => 
          this.updateRestaurantMenu(restaurant)
        );

        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result, index) => {
          processed++;
          if (result.status === 'fulfilled' && result.value.success) {
            successful++;
          } else {
            failed++;
            const restaurant = batch[index];
            const error = result.status === 'rejected' ? result.reason : result.value.error;
            logger.error(`Failed to update menu for ${restaurant.restaurant_id}: ${error}`);
            
            // Mark as failed in database
            this.menuDataService.markUpdateFailed(restaurant.restaurant_id, error);
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < pendingUpdates.length) {
          await this.delay(3000); // 3 second delay between batches
        }
      }

      logger.info(`Menu update process completed: ${processed} processed, ${successful} successful, ${failed} failed`);

    } catch (error) {
      logger.error('Error in scheduled menu updates process:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update menu for a single restaurant
   * @param {Object} restaurant - Restaurant update record
   * @returns {Promise<Object>} Update result
   */
  async updateRestaurantMenu(restaurant) {
    try {
      logger.info(`Updating menu for restaurant ${restaurant.restaurant_id} (${restaurant.public_id})`);

      // Mark as processing
      const updateProcessingQuery = `
        UPDATE menu_update_schedule 
        SET status = 'processing' 
        WHERE restaurant_id = ?
      `;
      this.menuDataService.db.prepare(updateProcessingQuery).run(restaurant.restaurant_id);

      // Fetch fresh menu data
      const menuResult = await this.menuProvider.fetchDeliveryMenu(restaurant.public_id);

      if (!menuResult.success) {
        throw new Error(menuResult.error || 'Failed to fetch menu data');
      }

      // Save to database
      const saveResult = await this.menuDataService.saveMenuData(
        restaurant.restaurant_id,
        restaurant.public_id,
        menuResult
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save menu data');
      }

      // Update schedule for next update
      this.menuDataService.updateSchedule(
        restaurant.restaurant_id,
        restaurant.public_id,
        restaurant.update_frequency
      );

      logger.info(`Successfully updated menu for restaurant ${restaurant.restaurant_id}`);
      
      return {
        success: true,
        restaurantId: restaurant.restaurant_id,
        itemsCount: menuResult.items?.length || 0,
        categoriesCount: menuResult.categories?.length || 0
      };

    } catch (error) {
      logger.error(`Error updating menu for restaurant ${restaurant.restaurant_id}:`, error.message);
      return {
        success: false,
        restaurantId: restaurant.restaurant_id,
        error: error.message
      };
    }
  }

  /**
   * Manually trigger menu update for specific restaurants
   * @param {Array} restaurantIds - Array of restaurant IDs to update
   * @returns {Promise<Object>} Update results
   */
  async manualUpdate(restaurantIds = []) {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Scheduled update process is currently running'
      };
    }

    logger.info(`Manual menu update triggered for ${restaurantIds.length} restaurants`);

    try {
      const results = [];
      
      for (const restaurantId of restaurantIds) {
        // Get restaurant schedule info
        const scheduleQuery = this.menuDataService.db.prepare(`
          SELECT * FROM menu_update_schedule WHERE restaurant_id = ?
        `);
        const restaurant = scheduleQuery.get(restaurantId);

        if (!restaurant) {
          results.push({
            success: false,
            restaurantId,
            error: 'Restaurant not found in update schedule'
          });
          continue;
        }

        const result = await this.updateRestaurantMenu(restaurant);
        results.push(result);

        // Add small delay between updates
        await this.delay(1000);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      return {
        success: true,
        results,
        summary: {
          total: results.length,
          successful,
          failed
        }
      };

    } catch (error) {
      logger.error('Error in manual menu update:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add restaurants to update schedule
   * @param {Array} restaurants - Array of restaurant objects with id and publicId
   * @param {string} frequency - Update frequency ('daily', 'weekly', 'bi-weekly', 'monthly')
   * @returns {Object} Result
   */
  async addToSchedule(restaurants, frequency = 'bi-weekly') {
    try {
      const validFrequencies = ['daily', 'weekly', 'bi-weekly', 'monthly'];
      if (!validFrequencies.includes(frequency)) {
        throw new Error(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
      }

      let added = 0;
      let skipped = 0;

      for (const restaurant of restaurants) {
        if (!restaurant.id || !restaurant.publicId) {
          skipped++;
          continue;
        }

        try {
          this.menuDataService.updateSchedule(restaurant.id, restaurant.publicId, frequency);
          added++;
          logger.info(`Added restaurant ${restaurant.id} to ${frequency} update schedule`);
        } catch (error) {
          logger.error(`Failed to add restaurant ${restaurant.id} to schedule:`, error.message);
          skipped++;
        }
      }

      return {
        success: true,
        summary: {
          total: restaurants.length,
          added,
          skipped
        },
        frequency
      };

    } catch (error) {
      logger.error('Error adding restaurants to schedule:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get scheduler status and statistics
   * @returns {Object} Scheduler status
   */
  getStatus() {
    const pendingUpdates = this.menuDataService.getRestaurantsForUpdate();
    
    // Get update statistics
    const statsQuery = this.menuDataService.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        update_frequency
      FROM menu_update_schedule 
      GROUP BY status, update_frequency
    `);
    const stats = statsQuery.all();

    // Get recent updates
    const recentQuery = this.menuDataService.db.prepare(`
      SELECT restaurant_id, last_update, status, error_message
      FROM menu_update_schedule 
      WHERE last_update IS NOT NULL
      ORDER BY last_update DESC 
      LIMIT 10
    `);
    const recentUpdates = recentQuery.all();

    return {
      isRunning: this.isRunning,
      schedulerActive: !!this.currentJob,
      pendingUpdates: pendingUpdates.length,
      statistics: stats,
      recentUpdates,
      nextScheduledRun: this.currentJob ? '2:00 AM daily' : 'Not scheduled'
    };
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old menu data and failed updates
   */
  async cleanup() {
    try {
      // Remove menu data older than 30 days
      const cleanupQuery = this.menuDataService.db.prepare(`
        DELETE FROM restaurant_menus 
        WHERE last_updated < datetime('now', '-30 days')
      `);
      const result = cleanupQuery.run();
      
      if (result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} old menu records`);
      }

      // Reset failed updates older than 7 days to pending
      const resetFailedQuery = this.menuDataService.db.prepare(`
        UPDATE menu_update_schedule 
        SET status = 'pending', error_message = NULL
        WHERE status = 'failed' 
        AND last_update < datetime('now', '-7 days')
      `);
      const resetResult = resetFailedQuery.run();
      
      if (resetResult.changes > 0) {
        logger.info(`Reset ${resetResult.changes} failed updates to pending`);
      }

    } catch (error) {
      logger.error('Error during cleanup:', error.message);
    }
  }
}

// Create singleton instance
const menuUpdateScheduler = new MenuUpdateScheduler();

module.exports = menuUpdateScheduler;