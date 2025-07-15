-- BiteBase SQLite Schema for Cloudflare D1 compatibility
-- This schema is compatible with both local SQLite and Cloudflare D1

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Restaurants table (simplified for SQLite/D1)
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    place_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    rating REAL CHECK (rating >= 0 AND rating <= 5),
    user_ratings_total INTEGER DEFAULT 0,
    price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
    types TEXT, -- JSON string
    vicinity TEXT,
    business_status TEXT,
    phone TEXT,
    website TEXT,
    hours TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_place_id ON restaurants(place_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(lat, lng);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'restaurant_owner',
    subscription_tier TEXT DEFAULT 'basic',
    subscription_expires_at DATETIME,
    preferences TEXT DEFAULT '{}', -- JSON string
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- User-Restaurant relationships
CREATE TABLE IF NOT EXISTS user_restaurants (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner',
    permissions TEXT DEFAULT '["read", "write"]', -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restaurant_id)
);

-- Sales transactions
CREATE TABLE IF NOT EXISTS sales_transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    transaction_date DATETIME NOT NULL,
    customer_id TEXT,
    total_amount REAL NOT NULL,
    tax_amount REAL,
    tip_amount REAL,
    payment_method TEXT,
    order_type TEXT, -- dine-in, takeout, delivery
    table_number INTEGER,
    server_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_restaurant_date ON sales_transactions(restaurant_id, transaction_date);

-- Menu items
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    cost REAL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Order items (junction table for transactions and items)
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transaction_id TEXT REFERENCES sales_transactions(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    first_visit_date DATE,
    last_visit_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    current_quantity REAL DEFAULT 0,
    min_quantity REAL DEFAULT 0,
    max_quantity REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    supplier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    department TEXT,
    hire_date DATE,
    hourly_rate REAL,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    source TEXT, -- google, yelp, tripadvisor
    external_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    reviewer_name TEXT,
    review_date DATETIME,
    sentiment_score REAL, -- -1 to 1
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for demo
INSERT OR IGNORE INTO restaurants (
    place_id, name, lat, lng, rating, 
    user_ratings_total, price_level, types, vicinity, 
    business_status, phone, website
) VALUES (
    'bitebase_demo_restaurant_001',
    'BiteBase Demo Restaurant',
    40.7128,
    -74.0060,
    4.5,
    1234,
    2,
    '["restaurant", "food", "establishment"]',
    '123 Broadway, New York, NY 10001',
    'OPERATIONAL',
    '+1-212-555-0123',
    'https://demo.bitebase.com'
);

-- Insert admin user (password: Libralytics1234!*)
INSERT OR IGNORE INTO users (
    email, password_hash, full_name, role, 
    subscription_tier, is_active, email_verified
) VALUES (
    'admin@bitebase.app',
    '$2b$10$rOzWKvQVQVQVQVQVQVQVQOzWKvQVQVQVQVQVQVQVQOzWKvQVQVQVQV', -- placeholder hash
    'BiteBase Administrator',
    'admin',
    'enterprise',
    TRUE,
    TRUE
);

-- Insert demo user (password: demo123)
INSERT OR IGNORE INTO users (
    email, password_hash, full_name, role, 
    subscription_tier, is_active, email_verified
) VALUES (
    'demo@bitebase.com',
    '$2b$10$demo.hash.placeholder.for.demo123.password.hash.value',
    'Demo User',
    'restaurant_owner',
    'pro',
    TRUE,
    TRUE
);