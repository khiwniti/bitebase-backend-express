/**
 * Simple Logger Utility
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

const logger = {
  error: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
};

module.exports = logger;