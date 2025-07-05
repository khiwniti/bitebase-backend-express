-- BiteBase D1 Database Schema (SQLite compatible)
-- Adapted from production-schema.sql for Cloudflare D1

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    cuisine_types TEXT, -- JSON array as text
    price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
    rating REAL CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    phone TEXT,
    email TEXT,
    website TEXT,
    description TEXT,
    business_hours TEXT, -- JSON as text
    amenities TEXT, -- JSON array as text
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1
);

-- Create indexes for restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_price_range ON restaurants (price_range);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants (rating);

-- Customer Analytics table
CREATE TABLE IF NOT EXISTS customer_analytics (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_segment TEXT,
    lifetime_value REAL,
    churn_probability REAL CHECK (churn_probability >= 0 AND churn_probability <= 1),
    last_visit_date TEXT,
    predicted_next_visit TEXT,
    visit_frequency INTEGER DEFAULT 0,
    average_order_value REAL,
    preferred_cuisine_types TEXT, -- JSON array as text
    demographics TEXT, -- JSON as text
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customer_analytics_restaurant_id ON customer_analytics (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_segment ON customer_analytics (customer_segment);

-- Restaurant Metrics table
CREATE TABLE IF NOT EXISTS restaurant_metrics (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_date TEXT NOT NULL,
    revenue REAL DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    average_order_value REAL DEFAULT 0,
    profit_margin REAL,
    food_cost_percentage REAL,
    labor_cost_percentage REAL,
    weather_condition TEXT,
    local_events TEXT, -- JSON array as text
    competitor_activity TEXT, -- JSON as text
    marketing_spend REAL DEFAULT 0,
    promotional_offers TEXT, -- JSON array as text
    staff_count INTEGER,
    operating_hours INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_restaurant_metrics_restaurant_date ON restaurant_metrics (restaurant_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_restaurant_metrics_date ON restaurant_metrics (metric_date);

-- AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE SET NULL,
    user_id TEXT,
    message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
    message_content TEXT NOT NULL,
    intent TEXT,
    language TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    data_source TEXT,
    suggestions TEXT, -- JSON array as text
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_conversation_id ON ai_conversations (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_restaurant_id ON ai_conversations (restaurant_id);

-- Menu Items table
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price REAL NOT NULL,
    cost REAL,
    ingredients TEXT, -- JSON array as text
    allergens TEXT, -- JSON array as text
    nutritional_info TEXT, -- JSON as text
    popularity_score REAL DEFAULT 0,
    profit_margin REAL,
    preparation_time INTEGER, -- in minutes
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'restaurant_owner',
    subscription_tier TEXT DEFAULT 'basic',
    subscription_expires_at TEXT,
    preferences TEXT DEFAULT '{}', -- JSON as text
    last_login TEXT,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- User Restaurants relationship table
CREATE TABLE IF NOT EXISTS user_restaurants (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner',
    permissions TEXT DEFAULT '["read", "write"]', -- JSON array as text
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, restaurant_id)
);

-- API Usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage (created_at);

-- Insert sample data for demonstration
INSERT OR IGNORE INTO restaurants (
    id, name, latitude, longitude, cuisine_types, price_range, rating, description, business_hours
) VALUES (
    'rest_demo_001',
    'Gaggan Progressive Indian',
    13.7300,
    100.5400,
    '["Indian", "Progressive", "Fine Dining"]',
    4,
    4.8,
    'World-renowned progressive Indian cuisine restaurant in Bangkok',
    '{"monday": "18:00-23:00", "tuesday": "18:00-23:00", "wednesday": "18:00-23:00", "thursday": "18:00-23:00", "friday": "18:00-23:00", "saturday": "18:00-23:00", "sunday": "closed"}'
);

INSERT OR IGNORE INTO restaurants (
    id, name, latitude, longitude, cuisine_types, price_range, rating, description, business_hours
) VALUES (
    'rest_demo_002',
    'Jay Fai',
    13.7600,
    100.5100,
    '["Thai", "Street Food"]',
    2,
    4.7,
    'Michelin-starred street food stall famous for crab omelets',
    '{"monday": "14:00-19:00", "tuesday": "14:00-19:00", "wednesday": "closed", "thursday": "14:00-19:00", "friday": "14:00-19:00", "saturday": "14:00-19:00", "sunday": "14:00-19:00"}'
);

INSERT OR IGNORE INTO restaurants (
    id, name, latitude, longitude, cuisine_types, price_range, rating, description, business_hours
) VALUES (
    'rest_demo_003',
    'Thip Samai Pad Thai',
    13.7563,
    100.5018,
    '["Thai", "Street Food", "Noodles"]',
    1,
    4.4,
    'Famous for the best Pad Thai in Bangkok since 1966',
    '{"monday": "17:00-02:00", "tuesday": "17:00-02:00", "wednesday": "17:00-02:00", "thursday": "17:00-02:00", "friday": "17:00-02:00", "saturday": "17:00-02:00", "sunday": "17:00-02:00"}'
);

-- Insert sample metrics data
INSERT OR IGNORE INTO restaurant_metrics (
    id, restaurant_id, metric_date, revenue, customer_count, average_order_value
) VALUES 
    ('metric_001', 'rest_demo_001', '2025-07-01', 15000.00, 45, 333.33),
    ('metric_002', 'rest_demo_002', '2025-07-01', 2800.00, 120, 23.33),
    ('metric_003', 'rest_demo_003', '2025-07-01', 1850.00, 185, 10.00);

-- Insert admin user
INSERT OR IGNORE INTO users (
    id, email, full_name, role, is_active, email_verified
) VALUES (
    'user_admin',
    'admin@bitebase.app',
    'Admin User',
    'admin',
    1,
    1
);