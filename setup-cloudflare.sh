#!/bin/bash

# Cloudflare Resources Setup Script
# This script helps create and configure KV, D1, and R2 resources

echo "🚀 BiteBase Cloudflare Setup Script"
echo "===================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if logged in
echo "📝 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare:"
    wrangler login
fi

echo ""
echo "✅ Authenticated with Cloudflare"
echo ""

# Create KV namespace
echo "📦 Creating KV namespace for caching..."
KV_OUTPUT=$(wrangler kv:namespace create "CACHE" 2>&1)
echo "$KV_OUTPUT"

# Extract KV ID
KV_ID=$(echo "$KV_OUTPUT" awk -F'"' '/id = / {print $2}')
if [ -z "$KV_ID" ]; then
    KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')
fi

echo ""
echo "📦 Creating preview KV namespace..."
KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "CACHE" --preview 2>&1)
echo "$KV_PREVIEW_OUTPUT"

# Extract preview KV ID
KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | awk -F'"' '/id = / {print $2}')
if [ -z "$KV_PREVIEW_ID" ]; then
    KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+')
fi

echo ""

# Create D1 database
echo "🗄️  Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create bitebase-db 2>&1)
echo "$D1_OUTPUT"

# Extract D1 ID
D1_ID=$(echo "$D1_OUTPUT" | awk -F'"' '/database_id = / {print $2}')
if [ -z "$D1_ID" ]; then
    D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+')
fi

echo ""

# Create R2 bucket
echo "🪣 Creating R2 bucket..."
R2_OUTPUT=$(wrangler r2 bucket create bitebase-storage 2>&1)
echo "$R2_OUTPUT"

echo ""

# Create database schema
echo "📋 Creating database schema..."
cat > /tmp/bitebase-schema.sql << 'EOF'
-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL,
    longitude REAL,
    cuisine_type TEXT,
    rating REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics data
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id TEXT,
    metric_type TEXT,
    value REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- User sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MCP tool executions
CREATE TABLE IF NOT EXISTS mcp_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    input_data TEXT,
    output_data TEXT,
    status TEXT,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX idx_analytics_restaurant ON analytics(restaurant_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_mcp_tool ON mcp_executions(tool_name);
EOF

# Initialize D1 database
if [ ! -z "$D1_ID" ]; then
    echo "🔧 Initializing D1 database schema..."
    wrangler d1 execute bitebase-db --file=/tmp/bitebase-schema.sql
fi

echo ""

# Create updated wrangler.toml
echo "📝 Creating updated wrangler.toml..."
cat > wrangler.toml.new << EOF
name = "bitebase-backend-prod"
main = "src/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[build]
command = ""

# KV Namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "${KV_ID:-YOUR_KV_NAMESPACE_ID}"
preview_id = "${KV_PREVIEW_ID:-YOUR_KV_PREVIEW_ID}"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "bitebase-db"
database_id = "${D1_ID:-YOUR_D1_DATABASE_ID}"

# R2 Storage
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "bitebase-storage"

# Environment variables
[vars]
NODE_ENV = "production"
GOOGLE_MAPS_API_KEY = "AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk"

[env.production]
name = "bitebase-backend-prod"

[env.staging]
name = "bitebase-backend-staging"

# Secrets (set these via wrangler secret)
# wrangler secret put DATABASE_URL
# wrangler secret put REDIS_URL
# wrangler secret put JWT_SECRET
# wrangler secret put AWS_ACCESS_KEY_ID
# wrangler secret put AWS_SECRET_ACCESS_KEY
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Summary:"
echo "==========="
if [ ! -z "$KV_ID" ]; then
    echo "✅ KV Namespace ID: $KV_ID"
else
    echo "❌ KV Namespace creation may have failed"
fi

if [ ! -z "$KV_PREVIEW_ID" ]; then
    echo "✅ KV Preview ID: $KV_PREVIEW_ID"
fi

if [ ! -z "$D1_ID" ]; then
    echo "✅ D1 Database ID: $D1_ID"
else
    echo "❌ D1 Database creation may have failed"
fi

echo "✅ R2 Bucket: bitebase-storage"
echo ""
echo "📝 Next steps:"
echo "1. Review the generated wrangler.toml.new file"
echo "2. If all IDs were captured correctly, replace your wrangler.toml:"
echo "   mv wrangler.toml.new wrangler.toml"
echo "3. Set secrets:"
echo "   wrangler secret put JWT_SECRET"
echo "   wrangler secret put DATABASE_URL"
echo "   wrangler secret put REDIS_URL"
echo "4. Deploy:"
echo "   wrangler deploy"
echo ""
echo "🔍 To verify resources:"
echo "   wrangler kv:key put --binding=CACHE test-key test-value"
echo "   wrangler d1 execute bitebase-db --command='SELECT 1'"
echo "   wrangler r2 object list bitebase-storage"