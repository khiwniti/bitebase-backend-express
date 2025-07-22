#!/bin/bash

# BiteBase API - Cloudflare Worker Deployment Script
# Lightweight deployment for api.bitebase.app

set -e

echo "🚀 BiteBase API - Cloudflare Worker Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}📦 Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

# Check if user is authenticated
echo -e "${BLUE}🔐 Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}❌ Not authenticated. Please login to Cloudflare...${NC}"
    wrangler login
fi

# Validate worker.js exists
if [ ! -f "worker.js" ]; then
    echo -e "${RED}❌ worker.js not found. Please ensure the worker file exists.${NC}"
    exit 1
fi

# Validate wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}❌ wrangler.toml not found. Please ensure the configuration file exists.${NC}"
    exit 1
fi

# Deploy to Cloudflare Workers
echo -e "${BLUE}🚀 Deploying to Cloudflare Workers...${NC}"
wrangler deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Worker deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}📝 Deployment Details:${NC}"
    echo "🌐 API URL: https://api.bitebase.app"
    echo "🔧 Worker Name: bitebase-api"
    echo "📊 Environment: production"
    echo ""
    echo -e "${YELLOW}🔧 Available Endpoints:${NC}"
    echo "GET  /health                           - Health check"
    echo "GET  /api/ai/insights                  - AI insights"
    echo "GET  /api/analytics/dashboard-stats    - Dashboard statistics"
    echo "GET  /api/analytics/market-analyses    - Market analysis data"
    echo "GET  /api/restaurants/search           - Restaurant search"
    echo "GET  /api/restaurants/:id              - Restaurant details"
    echo ""
    echo -e "${BLUE}🔍 Testing Commands:${NC}"
    echo "curl https://api.bitebase.app/health"
    echo "curl https://api.bitebase.app/api/ai/insights"
    echo ""
    echo -e "${GREEN}🎉 Your API is now live at https://api.bitebase.app${NC}"
else
    echo -e "${RED}❌ Deployment failed. Please check the errors above.${NC}"
    exit 1
fi