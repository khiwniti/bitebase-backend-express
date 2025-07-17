const Database = require('better-sqlite3');
const path = require('path');

// Create data directory if it doesn't exist
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database
const dbPath = path.join(dataDir, 'bitebase.db');
console.log('🚀 Creating SQLite database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Create tables matching MenuDataService.js schema
  db.exec(`
    -- Restaurant menu metadata table
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
      avg_price REAL DEFAULT 0.0,
      has_pricing BOOLEAN DEFAULT 1,
      rating REAL DEFAULT 0.0
    );

    -- Menu categories table
    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      item_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_menus(restaurant_id)
    );

    -- Menu items table
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price REAL,
      currency TEXT DEFAULT 'USD',
      is_popular BOOLEAN DEFAULT 0,
      rating REAL DEFAULT 0.0,
      image_url TEXT,
      tags TEXT, -- JSON array of tags
      allergens TEXT, -- JSON array of allergens
      spice_level INTEGER DEFAULT 0,
      preparation_time INTEGER, -- in minutes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_menus(restaurant_id),
      FOREIGN KEY (category_id) REFERENCES menu_categories(id)
    );

    -- Menu insights table for AI-generated insights
    CREATE TABLE IF NOT EXISTS menu_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL,
      insight_type TEXT NOT NULL,
      insight_data TEXT NOT NULL, -- JSON string
      confidence_score REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_menus(restaurant_id)
    );

    -- Menu update schedule table
    CREATE TABLE IF NOT EXISTS menu_update_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL,
      public_id TEXT NOT NULL,
      last_update DATETIME,
      next_update DATETIME,
      update_frequency TEXT DEFAULT 'bi-weekly',
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurant_menus(restaurant_id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_restaurant_menus_restaurant_id ON restaurant_menus(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_popular ON menu_items(is_popular);
    CREATE INDEX IF NOT EXISTS idx_menu_insights_restaurant ON menu_insights(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_schedule_next_update ON menu_update_schedule(next_update);
  `);
  
  console.log('✅ Database created successfully with full schema');
  db.close();
} catch (error) {
  console.error('❌ Database creation failed:', error);
  process.exit(1);
}
