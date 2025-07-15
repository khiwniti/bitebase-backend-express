-- Migration 001: Initial BiteBase Schema
-- Created: 2025-07-15
-- Description: Initial database schema with PostGIS support

-- Enable PostGIS extension for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced Restaurant Schema
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