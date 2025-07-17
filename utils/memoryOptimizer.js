/**
 * Memory Optimization Utilities
 * Helps prevent memory leaks and optimize memory usage
 */

const os = require('os');

class MemoryOptimizer {
  constructor() {
    this.maxHeapUsage = 0.8; // 80% of heap
    this.maxSystemUsage = 0.7; // 70% of system memory
    this.gcThreshold = 0.75; // Trigger GC at 75% heap usage
    this.lastGC = Date.now();
    this.gcCooldown = 30000; // 30 seconds between forced GC
  }

  /**
   * Get current memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryStats() {
    const memory = process.memoryUsage();
    const totalSystemMemory = os.totalmem();
    
    return {
      heap: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        usage: memory.heapUsed / memory.heapTotal
      },
      system: {
        rss: memory.rss,
        total: totalSystemMemory,
        usage: memory.rss / totalSystemMemory
      },
      external: memory.external
    };
  }

  /**
   * Check if memory usage is within acceptable limits
   * @returns {Object} Memory status
   */
  checkMemoryLimits() {
    const stats = this.getMemoryStats();
    const warnings = [];
    const critical = [];

    if (stats.heap.usage > this.maxHeapUsage) {
      critical.push(`Heap usage critical: ${(stats.heap.usage * 100).toFixed(1)}%`);
    } else if (stats.heap.usage > this.gcThreshold) {
      warnings.push(`Heap usage high: ${(stats.heap.usage * 100).toFixed(1)}%`);
    }

    if (stats.system.usage > this.maxSystemUsage) {
      critical.push(`System memory usage critical: ${(stats.system.usage * 100).toFixed(1)}%`);
    } else if (stats.system.usage > 0.5) {
      warnings.push(`System memory usage elevated: ${(stats.system.usage * 100).toFixed(1)}%`);
    }

    return {
      status: critical.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok',
      warnings,
      critical,
      stats
    };
  }

  /**
   * Force garbage collection if available and needed
   * @returns {boolean} Whether GC was triggered
   */
  forceGarbageCollection() {
    const now = Date.now();
    const stats = this.getMemoryStats();

    // Only trigger GC if:
    // 1. GC is available
    // 2. Heap usage is above threshold
    // 3. Enough time has passed since last GC
    if (global.gc && 
        stats.heap.usage > this.gcThreshold && 
        (now - this.lastGC) > this.gcCooldown) {
      
      const beforeGC = process.memoryUsage();
      global.gc();
      const afterGC = process.memoryUsage();
      
      this.lastGC = now;
      
      const freed = beforeGC.heapUsed - afterGC.heapUsed;
      if (freed > 0) {
        console.log(`🗑️ Garbage collection freed ${Math.round(freed / 1024 / 1024)}MB`);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Optimize object for memory efficiency
   * @param {Object} obj - Object to optimize
   * @param {number} maxSize - Maximum size to keep
   * @returns {Object} Optimized object
   */
  optimizeObject(obj, maxSize = 1000) {
    if (Array.isArray(obj) && obj.length > maxSize) {
      return obj.slice(-maxSize);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      if (keys.length > maxSize) {
        const optimized = {};
        keys.slice(-maxSize).forEach(key => {
          optimized[key] = obj[key];
        });
        return optimized;
      }
    }
    
    return obj;
  }

  /**
   * Clean up large objects and arrays
   * @param {Object} target - Target object to clean
   * @param {Object} options - Cleanup options
   */
  cleanup(target, options = {}) {
    const {
      maxArraySize = 500,
      maxObjectSize = 100,
      maxStringLength = 10000
    } = options;

    const cleanupRecursive = (obj, depth = 0) => {
      if (depth > 10) return obj; // Prevent infinite recursion
      
      if (Array.isArray(obj)) {
        if (obj.length > maxArraySize) {
          obj.splice(0, obj.length - maxArraySize);
        }
        obj.forEach((item, index) => {
          obj[index] = cleanupRecursive(item, depth + 1);
        });
      } else if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj);
        if (keys.length > maxObjectSize) {
          // Keep only the most recent entries (assuming timestamp-based keys)
          const sortedKeys = keys.sort();
          const keysToDelete = sortedKeys.slice(0, keys.length - maxObjectSize);
          keysToDelete.forEach(key => delete obj[key]);
        }
        
        Object.keys(obj).forEach(key => {
          obj[key] = cleanupRecursive(obj[key], depth + 1);
        });
      } else if (typeof obj === 'string' && obj.length > maxStringLength) {
        return obj.substring(0, maxStringLength) + '...';
      }
      
      return obj;
    };

    return cleanupRecursive(target);
  }

  /**
   * Monitor memory usage and take action if needed
   * @returns {Object} Action taken
   */
  monitor() {
    const status = this.checkMemoryLimits();
    const actions = [];

    if (status.status === 'critical') {
      // Force garbage collection
      if (this.forceGarbageCollection()) {
        actions.push('garbage_collection');
      }
      
      // Log critical memory usage
      console.warn('🚨 Critical memory usage detected:', status.critical);
    } else if (status.status === 'warning') {
      // Try gentle garbage collection
      if (this.forceGarbageCollection()) {
        actions.push('gentle_gc');
      }
    }

    return {
      status: status.status,
      actions,
      stats: status.stats
    };
  }

  /**
   * Start periodic memory monitoring
   * @param {number} interval - Monitoring interval in milliseconds
   */
  startMonitoring(interval = 60000) { // Default: 1 minute
    this.monitoringInterval = setInterval(() => {
      this.monitor();
    }, interval);
    
    console.log('🧠 Memory optimizer started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🧠 Memory optimizer stopped');
    }
  }
}

// Create singleton instance
const memoryOptimizer = new MemoryOptimizer();

module.exports = memoryOptimizer;