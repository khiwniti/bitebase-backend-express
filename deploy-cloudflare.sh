#!/bin/bash

echo "🚀 BiteBase Backend - Cloudflare Workers Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler CLI is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}📦 Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

# Check authentication
echo -e "${BLUE}🔐 Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}❌ Not authenticated. Please login to Cloudflare...${NC}"
    wrangler login
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Create necessary Cloudflare resources
echo -e "${BLUE}🏗️  Setting up Cloudflare resources...${NC}"

# Check if KV namespace exists
echo -e "${YELLOW}📊 Checking KV namespace...${NC}"
if ! wrangler kv:namespace list | grep -q "CACHE"; then
    echo -e "${YELLOW}Creating KV namespace for caching...${NC}"
    wrangler kv:namespace create "CACHE"
    wrangler kv:namespace create "CACHE" --preview
    echo -e "${YELLOW}⚠️  Please update wrangler.toml with the KV namespace IDs shown above${NC}"
fi

# Set up environment secrets
echo -e "${BLUE}🔐 Setting up environment secrets...${NC}"

# Function to set secret if not exists
set_secret_if_needed() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -e "${YELLOW}Setting $description...${NC}"
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | wrangler secret put "$secret_name"
    else
        echo -e "${YELLOW}Please enter $description:${NC}"
        wrangler secret put "$secret_name"
    fi
}

# Set required secrets
set_secret_if_needed "GOOGLE_PLACES_API_KEY" "AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk" "Google Places API Key"
set_secret_if_needed "JWT_SECRET" "" "JWT Secret (generate a secure random string)"

# Optional secrets
echo -e "${BLUE}🔧 Optional secrets (press Enter to skip):${NC}"
echo -e "${YELLOW}Foursquare API Key (optional):${NC}"
read -r foursquare_key
if [ -n "$foursquare_key" ]; then
    echo "$foursquare_key" | wrangler secret put "FOURSQUARE_API_KEY"
fi

echo -e "${YELLOW}Database URL (optional):${NC}"
read -r database_url
if [ -n "$database_url" ]; then
    echo "$database_url" | wrangler secret put "DATABASE_URL"
fi

# Deploy to Cloudflare Workers
echo -e "${BLUE}🚀 Deploying to Cloudflare Workers...${NC}"
wrangler deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "1. Note your Worker URL from the output above"
    echo "2. Update frontend NEXT_PUBLIC_API_URL with your Worker URL"
    echo "3. Set CORS_ORIGIN secret with your frontend domain"
    echo "4. Test your API endpoints"
    echo ""
    echo -e "${YELLOW}🔧 Update CORS Origin:${NC}"
    echo "wrangler secret put CORS_ORIGIN"
    echo "Enter your frontend URL (e.g., https://your-app.vercel.app)"
    echo ""
    echo -e "${YELLOW}🧪 Test your deployment:${NC}"
    echo "curl https://your-worker.workers.dev/api/health"
else
    echo -e "${RED}❌ Deployment failed. Please check the errors above.${NC}"
    exit 1
fi