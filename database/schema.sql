-- BiteBase Database Schema for Real Data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    rating DECIMAL(2, 1),
    user_ratings_total INTEGER DEFAULT 0,
    price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
    types JSONB,
    vicinity TEXT,
    business_status VARCHAR(50),
    phone VARCHAR(20),
    website VARCHAR(255),
    hours JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurants_place_id ON restaurants(place_id);
CREATE INDEX idx_restaurants_rating ON restaurants(rating DESC);

-- Sales transactions table
CREATE TABLE IF NOT EXISTS sales_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_id UUID,
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2),
    tip_amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    order_type VARCHAR(50), -- dine-in, takeout, delivery
    table_number INTEGER,
    server_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_restaurant_date ON sales_transactions(restaurant_id, transaction_date);
CREATE INDEX idx_sales_customer ON sales_transactions(customer_id);

-- Items/Menu table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    dietary_flags JSONB, -- vegetarian, vegan, gluten-free, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_items_restaurant ON items(restaurant_id);
CREATE INDEX idx_items_category ON items(category);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES sales_transactions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    modifiers JSONB,
    special_instructions TEXT
);

CREATE INDEX idx_order_items_transaction ON order_items(transaction_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    preferences JSONB,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    first_visit_date DATE,
    last_visit_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE UNIQUE INDEX idx_customers_restaurant_email ON customers(restaurant_id, email);

-- Foot traffic data table
CREATE TABLE IF NOT EXISTS foot_traffic_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    traffic_count INTEGER NOT NULL,
    weather_conditions JSONB,
    is_holiday BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_foot_traffic_location_date ON foot_traffic_data USING GIST(location) WHERE date > CURRENT_DATE - INTERVAL '90 days';
CREATE INDEX idx_foot_traffic_date_hour ON foot_traffic_data(date, hour);

-- Competitor analysis table
CREATE TABLE IF NOT EXISTS competitor_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    distance_meters DECIMAL(10, 2),
    similarity_score DECIMAL(3, 2), -- 0 to 1
    price_comparison VARCHAR(20), -- cheaper, similar, more_expensive
    rating_comparison VARCHAR(20), -- lower, similar, higher
    analysis_date DATE NOT NULL,
    insights JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competitor_restaurant ON competitor_analysis(restaurant_id);
CREATE INDEX idx_competitor_date ON competitor_analysis(analysis_date);

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(100), -- email, social, paid_ads, etc.
    start_date DATE NOT NULL,
    end_date DATE,
    budget DECIMAL(10, 2),
    target_audience JSONB,
    channels JSONB,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_restaurant ON marketing_campaigns(restaurant_id);
CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);

-- Campaign performance table
CREATE TABLE IF NOT EXISTS campaign_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    revenue_attributed DECIMAL(10, 2) DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0
);

CREATE INDEX idx_campaign_perf_campaign_date ON campaign_performance(campaign_id, date);

-- Reviews and sentiment table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    source VARCHAR(50), -- google, yelp, tripadvisor, etc.
    external_id VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    reviewer_name VARCHAR(255),
    review_date DATE,
    sentiment_score DECIMAL(3, 2), -- -1 to 1
    topics JSONB, -- extracted topics/keywords
    response_text TEXT,
    response_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX idx_reviews_date ON reviews(review_date DESC);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment_score);

-- Inventory tracking table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    current_quantity DECIMAL(10, 2),
    min_quantity DECIMAL(10, 2),
    max_quantity DECIMAL(10, 2),
    unit_cost DECIMAL(10, 2),
    supplier VARCHAR(255),
    last_ordered DATE,
    last_received DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_restaurant ON inventory(restaurant_id);
CREATE INDEX idx_inventory_low_stock ON inventory(restaurant_id) WHERE current_quantity <= min_quantity;

-- Staff/Employee table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE,
    hourly_rate DECIMAL(10, 2),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_staff_restaurant ON staff(restaurant_id);
CREATE INDEX idx_staff_active ON staff(restaurant_id) WHERE is_active = true;

-- Labor/Scheduling table
CREATE TABLE IF NOT EXISTS labor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    role VARCHAR(100),
    actual_start TIME,
    actual_end TIME,
    labor_cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_labor_restaurant_date ON labor_schedules(restaurant_id, shift_date);
CREATE INDEX idx_labor_staff ON labor_schedules(staff_id);

-- Financial metrics table
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    revenue DECIMAL(12, 2),
    food_cost DECIMAL(12, 2),
    labor_cost DECIMAL(12, 2),
    overhead_cost DECIMAL(12, 2),
    net_profit DECIMAL(12, 2),
    food_cost_percentage DECIMAL(5, 2),
    labor_cost_percentage DECIMAL(5, 2),
    prime_cost_percentage DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_financial_restaurant_date ON financial_metrics(restaurant_id, date);

-- Market trends table
CREATE TABLE IF NOT EXISTS market_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT, 4326),
    trend_date DATE NOT NULL,
    trend_type VARCHAR(100), -- cuisine, dietary, service_type, etc.
    trend_name VARCHAR(255),
    trend_score DECIMAL(5, 2), -- popularity/relevance score
    search_volume INTEGER,
    growth_rate DECIMAL(5, 2),
    data_source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trends_location_date ON market_trends USING GIST(location);
CREATE INDEX idx_trends_type ON market_trends(trend_type, trend_date DESC);

-- User activity log for analytics
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    activity_type VARCHAR(100),
    activity_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON user_activity_log(user_id);
CREATE INDEX idx_activity_restaurant ON user_activity_log(restaurant_id);
CREATE INDEX idx_activity_type_date ON user_activity_log(activity_type, created_at DESC);

-- Create views for common queries
CREATE OR REPLACE VIEW restaurant_performance AS
SELECT 
    r.id,
    r.name,
    r.rating,
    COUNT(DISTINCT st.id) as total_transactions,
    COUNT(DISTINCT st.customer_id) as unique_customers,
    SUM(st.total_amount) as total_revenue,
    AVG(st.total_amount) as avg_ticket,
    COUNT(DISTINCT DATE(st.transaction_date)) as days_active
FROM restaurants r
LEFT JOIN sales_transactions st ON r.id = st.restaurant_id
WHERE st.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY r.id, r.name, r.rating;

-- Create materialized view for competitor density
CREATE MATERIALIZED VIEW competitor_density_map AS
SELECT 
    ST_X(location::geometry) as lng,
    ST_Y(location::geometry) as lat,
    COUNT(*) FILTER (WHERE price_level = 1) as budget_count,
    COUNT(*) FILTER (WHERE price_level = 2) as moderate_count,
    COUNT(*) FILTER (WHERE price_level = 3) as upscale_count,
    COUNT(*) FILTER (WHERE price_level = 4) as fine_dining_count,
    AVG(rating) as avg_area_rating
FROM restaurants
GROUP BY ST_SnapToGrid(location::geometry, 0.01); -- ~1km grid

CREATE INDEX idx_competitor_density_location ON competitor_density_map(lng, lat);

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(
        ST_MakePoint(lng1, lat1)::geography,
        ST_MakePoint(lng2, lat2)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer metrics
CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET 
        total_spent = total_spent + NEW.total_amount,
        visit_count = visit_count + 1,
        last_visit_date = DATE(NEW.transaction_date)
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_metrics
AFTER INSERT ON sales_transactions
FOR EACH ROW
EXECUTE FUNCTION update_customer_metrics();

-- Trigger to update financial metrics
CREATE OR REPLACE FUNCTION calculate_daily_financials()
RETURNS TRIGGER AS $$
DECLARE
    v_food_cost DECIMAL;
    v_labor_cost DECIMAL;
    v_revenue DECIMAL;
BEGIN
    -- Calculate daily revenue
    SELECT SUM(total_amount) INTO v_revenue
    FROM sales_transactions
    WHERE restaurant_id = NEW.restaurant_id
    AND DATE(transaction_date) = DATE(NEW.transaction_date);
    
    -- Calculate food cost (simplified - would need actual COGS data)
    v_food_cost := v_revenue * 0.30; -- 30% food cost assumption
    
    -- Calculate labor cost for the day
    SELECT SUM(labor_cost) INTO v_labor_cost
    FROM labor_schedules
    WHERE restaurant_id = NEW.restaurant_id
    AND shift_date = DATE(NEW.transaction_date);
    
    -- Insert or update financial metrics
    INSERT INTO financial_metrics (
        restaurant_id, date, revenue, food_cost, labor_cost,
        food_cost_percentage, labor_cost_percentage
    ) VALUES (
        NEW.restaurant_id,
        DATE(NEW.transaction_date),
        v_revenue,
        v_food_cost,
        COALESCE(v_labor_cost, 0),
        (v_food_cost / NULLIF(v_revenue, 0)) * 100,
        (COALESCE(v_labor_cost, 0) / NULLIF(v_revenue, 0)) * 100
    )
    ON CONFLICT (restaurant_id, date) DO UPDATE
    SET 
        revenue = EXCLUDED.revenue,
        food_cost = EXCLUDED.food_cost,
        labor_cost = EXCLUDED.labor_cost,
        food_cost_percentage = EXCLUDED.food_cost_percentage,
        labor_cost_percentage = EXCLUDED.labor_cost_percentage;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_financials
AFTER INSERT ON sales_transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_daily_financials();