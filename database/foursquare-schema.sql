-- Foursquare Integration Schema Extension for BiteBase
-- This adds tables specifically for Foursquare venue data and analytics

-- Foursquare Venues Table
CREATE TABLE IF NOT EXISTS foursquare_venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fsq_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    formatted_address TEXT,
    locality VARCHAR(100),
    region VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100),
    categories JSONB,
    chains JSONB,
    rating DECIMAL(2, 1),
    price_level INTEGER CHECK (price_level BETWEEN 1 AND 4),
    popularity_score INTEGER,
    verified BOOLEAN DEFAULT false,
    hours JSONB,
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    social_media JSONB,
    stats JSONB,
    distance_meters INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_location ON foursquare_venues 
    USING GIST (ST_Point(longitude, latitude));

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_fsq_id ON foursquare_venues (fsq_id);
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_categories ON foursquare_venues USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_chains ON foursquare_venues USING GIN (chains);
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_popularity ON foursquare_venues (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_rating ON foursquare_venues (rating DESC);
CREATE INDEX IF NOT EXISTS idx_foursquare_venues_price ON foursquare_venues (price_level);

-- Venue Visit Statistics
CREATE TABLE IF NOT EXISTS venue_visit_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES foursquare_venues(id) ON DELETE CASCADE,
    fsq_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    visits_by_hour JSONB, -- Array of hourly visit data
    total_visits INTEGER DEFAULT 0,
    avg_duration_minutes INTEGER,
    demographic_breakdown JSONB,
    popularity_score INTEGER CHECK (popularity_score BETWEEN 0 AND 100),
    comparison_data JSONB, -- vs last week/month/year
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fsq_id, date)
);

CREATE INDEX IF NOT EXISTS idx_venue_visit_stats_venue_id ON venue_visit_stats (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_visit_stats_fsq_id ON venue_visit_stats (fsq_id);
CREATE INDEX IF NOT EXISTS idx_venue_visit_stats_date ON venue_visit_stats (date DESC);

-- Local Events tracking
CREATE TABLE IF NOT EXISTS local_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    venue_name VARCHAR(255),
    address TEXT,
    expected_attendance INTEGER,
    ticket_price_min DECIMAL(10, 2),
    ticket_price_max DECIMAL(10, 2),
    impact_radius INTEGER, -- meters
    traffic_impact_score INTEGER CHECK (traffic_impact_score BETWEEN 0 AND 100),
    source VARCHAR(50) DEFAULT 'foursquare',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for location-based event queries
CREATE INDEX IF NOT EXISTS idx_local_events_location ON local_events 
    USING GIST (ST_Point(longitude, latitude));

-- Time-based indexes for event queries
CREATE INDEX IF NOT EXISTS idx_local_events_time ON local_events (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_local_events_category ON local_events (category);
CREATE INDEX IF NOT EXISTS idx_local_events_impact_score ON local_events (traffic_impact_score DESC);

-- Competitor Analysis Results
CREATE TABLE IF NOT EXISTS competitor_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    radius_meters INTEGER DEFAULT 2000,
    total_competitors INTEGER DEFAULT 0,
    competition_density DECIMAL(5, 2), -- competitors per km²
    avg_competitor_rating DECIMAL(2, 1),
    avg_competitor_price DECIMAL(2, 1),
    market_share_estimate DECIMAL(5, 2), -- percentage
    competitive_advantages JSONB,
    threats JSONB,
    opportunities JSONB,
    nearby_venues JSONB, -- Array of competitor venue data
    overall_competition_score INTEGER CHECK (overall_competition_score BETWEEN 0 AND 100),
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_competitor_analysis_restaurant_id ON competitor_analysis (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_date ON competitor_analysis (analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_score ON competitor_analysis (overall_competition_score DESC);

-- Site Analysis for expansion planning
CREATE TABLE IF NOT EXISTS site_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_name VARCHAR(255),
    restaurant_chain_id UUID, -- Optional: link to restaurant chain
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    site_name VARCHAR(255),
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    foot_traffic_score INTEGER CHECK (foot_traffic_score BETWEEN 0 AND 100),
    competition_score INTEGER CHECK (competition_score BETWEEN 0 AND 100),
    demographic_match_score INTEGER CHECK (demographic_match_score BETWEEN 0 AND 100),
    accessibility_score INTEGER CHECK (accessibility_score BETWEEN 0 AND 100),
    cost_efficiency_score INTEGER CHECK (cost_efficiency_score BETWEEN 0 AND 100),
    estimated_annual_revenue DECIMAL(12, 2),
    estimated_setup_cost DECIMAL(12, 2),
    estimated_monthly_rent DECIMAL(10, 2),
    risk_factors JSONB,
    opportunities JSONB,
    recommendation VARCHAR(50) CHECK (recommendation IN ('highly_recommended', 'recommended', 'consider', 'not_recommended')),
    detailed_analysis JSONB, -- Full analysis data
    parameters_used JSONB, -- Analysis parameters for reference
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for site analysis
CREATE INDEX IF NOT EXISTS idx_site_analysis_location ON site_analysis 
    USING GIST (ST_Point(longitude, latitude));

CREATE INDEX IF NOT EXISTS idx_site_analysis_score ON site_analysis (overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_site_analysis_recommendation ON site_analysis (recommendation);
CREATE INDEX IF NOT EXISTS idx_site_analysis_date ON site_analysis (analyzed_at DESC);

-- Area Traffic Analysis Cache
CREATE TABLE IF NOT EXISTS area_traffic_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL,
    total_venues INTEGER DEFAULT 0,
    average_daily_visits DECIMAL(10, 2) DEFAULT 0,
    peak_hours INTEGER[],
    demographic_profile JSONB,
    seasonal_trends JSONB,
    competition_density DECIMAL(5, 2),
    opportunity_score INTEGER CHECK (opportunity_score BETWEEN 0 AND 100),
    venue_data JSONB, -- Cached venue data
    analysis_date DATE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(latitude, longitude, radius_meters, analysis_date)
);

-- Index for cached area analysis lookups
CREATE INDEX IF NOT EXISTS idx_area_traffic_analysis_location_radius ON area_traffic_analysis 
    (latitude, longitude, radius_meters);
CREATE INDEX IF NOT EXISTS idx_area_traffic_analysis_expires ON area_traffic_analysis (expires_at);

-- Event Impact Analysis
CREATE TABLE IF NOT EXISTS event_impact_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    event_id UUID REFERENCES local_events(id) ON DELETE CASCADE,
    distance_meters INTEGER,
    impact_level VARCHAR(20) CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    expected_traffic_increase DECIMAL(5, 2), -- percentage
    expected_revenue_impact DECIMAL(10, 2),
    recommended_actions JSONB,
    preparation_suggestions JSONB,
    analysis_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_impact_analysis_restaurant_id ON event_impact_analysis (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_event_impact_analysis_event_id ON event_impact_analysis (event_id);
CREATE INDEX IF NOT EXISTS idx_event_impact_analysis_impact_level ON event_impact_analysis (impact_level);

-- Foursquare API Usage Tracking
CREATE TABLE IF NOT EXISTS foursquare_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    cost_estimate DECIMAL(8, 4), -- Estimated cost in dollars
    cache_hit BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    request_params JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foursquare_api_usage_endpoint ON foursquare_api_usage (endpoint);
CREATE INDEX IF NOT EXISTS idx_foursquare_api_usage_created_at ON foursquare_api_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_foursquare_api_usage_cache_hit ON foursquare_api_usage (cache_hit);

-- Location Intelligence Reports (aggregated insights)
CREATE TABLE IF NOT EXISTS location_intelligence_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'comprehensive', 'competitor', 'site_selection', etc.
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_sources JSONB, -- Which APIs/sources were used
    location_score INTEGER CHECK (location_score BETWEEN 0 AND 100),
    insights JSONB, -- Main insights and findings
    recommendations JSONB, -- AI-generated recommendations
    metrics JSONB, -- Key metrics and KPIs
    charts_data JSONB, -- Data for frontend charts
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_intelligence_reports_restaurant_id ON location_intelligence_reports (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_location_intelligence_reports_type ON location_intelligence_reports (report_type);
CREATE INDEX IF NOT EXISTS idx_location_intelligence_reports_generated ON location_intelligence_reports (generated_at DESC);

-- Alert System for Real-time Notifications
CREATE TABLE IF NOT EXISTS location_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'competitor_opening', 'traffic_spike', 'event_detected', etc.
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional alert data
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_alerts_restaurant_id ON location_alerts (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_location_alerts_type ON location_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_location_alerts_severity ON location_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_location_alerts_status ON location_alerts (status);
CREATE INDEX IF NOT EXISTS idx_location_alerts_created_at ON location_alerts (created_at DESC);

-- Add foreign key to link Foursquare venues with our restaurants (optional)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS foursquare_venue_id UUID 
REFERENCES foursquare_venues(id) ON DELETE SET NULL;

-- Create a view for restaurant location intelligence summary
CREATE OR REPLACE VIEW restaurant_location_intelligence AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.location,
    ST_X(r.location) as longitude,
    ST_Y(r.location) as latitude,
    r.cuisine_types,
    r.price_range,
    r.rating,
    
    -- Latest competitor analysis
    ca.total_competitors,
    ca.competition_density,
    ca.avg_competitor_rating,
    ca.overall_competition_score,
    
    -- Latest area traffic analysis
    ata.average_daily_visits,
    ata.peak_hours,
    ata.opportunity_score,
    
    -- Event count in the area
    (SELECT COUNT(*) 
     FROM local_events le 
     WHERE ST_DWithin(
         ST_Point(le.longitude, le.latitude)::geography,
         r.location::geography,
         5000  -- 5km radius
     ) 
     AND le.start_time >= CURRENT_DATE
     AND le.start_time <= CURRENT_DATE + INTERVAL '30 days'
    ) as upcoming_events_count,
    
    -- Alert count
    (SELECT COUNT(*) 
     FROM location_alerts la 
     WHERE la.restaurant_id = r.id 
     AND la.status = 'active'
    ) as active_alerts_count

FROM restaurants r
LEFT JOIN competitor_analysis ca ON r.id = ca.restaurant_id 
    AND ca.analysis_date = (
        SELECT MAX(analysis_date) 
        FROM competitor_analysis ca2 
        WHERE ca2.restaurant_id = r.id
    )
LEFT JOIN area_traffic_analysis ata ON 
    ST_DWithin(
        ST_Point(ata.longitude, ata.latitude)::geography,
        r.location::geography,
        500  -- 500m for area traffic match
    )
    AND ata.analysis_date = (
        SELECT MAX(analysis_date)
        FROM area_traffic_analysis ata2
        WHERE ST_DWithin(
            ST_Point(ata2.longitude, ata2.latitude)::geography,
            r.location::geography,
            500
        )
    )
WHERE r.is_active = TRUE;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) 
RETURNS INTEGER AS $$
BEGIN
    RETURN ST_Distance(
        ST_Point(lon1, lat1)::geography,
        ST_Point(lon2, lat2)::geography
    )::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() 
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM area_traffic_analysis 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM location_intelligence_reports 
    WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_foursquare_venue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_foursquare_venues_timestamp ON foursquare_venues;
CREATE TRIGGER update_foursquare_venues_timestamp
    BEFORE UPDATE ON foursquare_venues
    FOR EACH ROW EXECUTE FUNCTION update_foursquare_venue_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;