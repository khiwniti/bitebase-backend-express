-- BiteBase Production Database Schema
-- Following IMPROVEMENTS.md Phase 4 requirements

-- Enable PostGIS extension for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced Restaurant Schema (from IMPROVEMENTS.md)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(POINT, 4326),
    cuisine_types TEXT[],
    price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    description TEXT,
    business_hours JSONB,
    amenities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_types ON restaurants USING GIN (cuisine_types);
CREATE INDEX IF NOT EXISTS idx_restaurants_price_range ON restaurants (price_range);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants (rating);

-- Customer Analytics Schema (from IMPROVEMENTS.md)
CREATE TABLE IF NOT EXISTS customer_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_segment VARCHAR(50),
    lifetime_value DECIMAL(10,2),
    churn_probability DECIMAL(3,2) CHECK (churn_probability >= 0 AND churn_probability <= 1),
    last_visit_date DATE,
    predicted_next_visit DATE,
    visit_frequency INTEGER DEFAULT 0,
    average_order_value DECIMAL(8,2),
    preferred_cuisine_types TEXT[],
    demographics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_analytics_restaurant_id ON customer_analytics (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_segment ON customer_analytics (customer_segment);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_churn ON customer_analytics (churn_probability);

-- Performance Metrics Schema (from IMPROVEMENTS.md)
CREATE TABLE IF NOT EXISTS restaurant_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    revenue DECIMAL(12,2) DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    average_order_value DECIMAL(8,2) DEFAULT 0,
    profit_margin DECIMAL(5,2),
    food_cost_percentage DECIMAL(5,2),
    labor_cost_percentage DECIMAL(5,2),
    weather_condition VARCHAR(50),
    local_events TEXT[],
    competitor_activity JSONB,
    marketing_spend DECIMAL(10,2) DEFAULT 0,
    promotional_offers TEXT[],
    staff_count INTEGER,
    operating_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_metrics_restaurant_date ON restaurant_metrics (restaurant_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_restaurant_metrics_date ON restaurant_metrics (metric_date);

-- AI Conversation History
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    user_id UUID,
    message_role VARCHAR(20) NOT NULL CHECK (message_role IN ('user', 'assistant')),
    message_content TEXT NOT NULL,
    intent VARCHAR(100),
    language VARCHAR(10),
    model_used VARCHAR(100),
    tokens_used INTEGER DEFAULT 0,
    data_source VARCHAR(50),
    suggestions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_conversation_id ON ai_conversations (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_restaurant_id ON ai_conversations (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations (created_at);

-- Menu Items and Performance
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(8,2) NOT NULL,
    cost DECIMAL(8,2),
    ingredients TEXT[],
    allergens TEXT[],
    nutritional_info JSONB,
    popularity_score DECIMAL(3,2) DEFAULT 0,
    profit_margin DECIMAL(5,2),
    preparation_time INTEGER, -- in minutes
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_popularity ON menu_items (popularity_score DESC);

-- Competitor Analysis Data
CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_location GEOMETRY(POINT, 4326),
    distance_km DECIMAL(8,2),
    cuisine_types TEXT[],
    price_range INTEGER,
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    average_wait_time INTEGER,
    popular_items TEXT[],
    pricing_data JSONB,
    social_media_presence JSONB,
    last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_restaurant_id ON competitors (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_competitors_location ON competitors USING GIST (competitor_location);
CREATE INDEX IF NOT EXISTS idx_competitors_distance ON competitors (distance_km);

-- Sales Forecasting Data
CREATE TABLE IF NOT EXISTS sales_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_revenue DECIMAL(12,2),
    confidence_interval_lower DECIMAL(12,2),
    confidence_interval_upper DECIMAL(12,2),
    predicted_customers INTEGER,
    weather_forecast JSONB,
    local_events TEXT[],
    model_version VARCHAR(50),
    model_accuracy DECIMAL(5,4),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_forecasts_restaurant_date ON sales_forecasts (restaurant_id, forecast_date);

-- User Management (Enhanced)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'restaurant_owner',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Restaurant Ownership/Access
CREATE TABLE IF NOT EXISTS user_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'owner',
    permissions TEXT[] DEFAULT ARRAY['read', 'write'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);

-- Audit Log for Compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- API Usage Tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage (endpoint);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_analytics_updated_at ON customer_analytics;
CREATE TRIGGER update_customer_analytics_updated_at 
    BEFORE UPDATE ON customer_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at 
    BEFORE UPDATE ON menu_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for demonstration (can be removed in production)
DO $$
BEGIN
    -- Insert sample restaurant only if no restaurants exist
    IF NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1) THEN
        INSERT INTO restaurants (
            name, 
            location, 
            cuisine_types, 
            price_range, 
            rating,
            description,
            business_hours
        ) VALUES (
            'Demo Restaurant',
            ST_GeomFromText('POINT(-74.0060 40.7128)', 4326), -- NYC coordinates
            ARRAY['American', 'Casual Dining'],
            2,
            4.2,
            'A demonstration restaurant for BiteBase analytics',
            '{"monday": "11:00-22:00", "tuesday": "11:00-22:00", "wednesday": "11:00-22:00", "thursday": "11:00-22:00", "friday": "11:00-23:00", "saturday": "10:00-23:00", "sunday": "10:00-22:00"}'::jsonb
        );
    END IF;
END $$;

-- Views for common queries
CREATE OR REPLACE VIEW restaurant_performance_summary AS
SELECT 
    r.id,
    r.name,
    r.cuisine_types,
    r.price_range,
    r.rating,
    COUNT(rm.id) as metrics_days,
    AVG(rm.revenue) as avg_daily_revenue,
    AVG(rm.customer_count) as avg_daily_customers,
    AVG(rm.average_order_value) as avg_order_value,
    AVG(rm.profit_margin) as avg_profit_margin,
    MAX(rm.metric_date) as last_metrics_date
FROM restaurants r
LEFT JOIN restaurant_metrics rm ON r.id = rm.restaurant_id
    AND rm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE r.is_active = TRUE
GROUP BY r.id, r.name, r.cuisine_types, r.price_range, r.rating;

-- Indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurant_metrics_revenue ON restaurant_metrics (revenue);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_price ON menu_items (price);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competitors_rating ON competitors (rating);

-- Grant permissions (adjust as needed for your environment)
GRANT USAGE ON SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;