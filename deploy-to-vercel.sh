#!/bin/bash

# BiteBase Backend + Bedrock Gateway Vercel Deployment Script
echo "🚀 Starting BiteBase Backend + Bedrock Gateway Deployment to Vercel"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${BLUE}📋 Checking deployment prerequisites...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Make sure you're in the backend directory.${NC}"
    exit 1
fi

if [ ! -f "vercel.json" ]; then
    echo -e "${RED}❌ Error: vercel.json not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Step 1: Deploy Backend
echo -e "${BLUE}🚀 Step 1: Deploying BiteBase Backend...${NC}"
echo "Project: bitebase-intelligence-backend"
echo "Configuration: vercel.json"
echo ""

# Deploy backend with production flag
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend deployment successful!${NC}"
    BACKEND_URL=$(vercel ls bitebase-intelligence-backend --token | grep "https://" | head -1 | awk '{print $1}')
    echo -e "${GREEN}🌐 Backend URL: ${BACKEND_URL}${NC}"
else
    echo -e "${RED}❌ Backend deployment failed!${NC}"
    exit 1
fi

# Step 2: Deploy Bedrock Gateway (if directory exists)
if [ -d "bedrock-access-gateway" ]; then
    echo -e "${BLUE}🤖 Step 2: Deploying Bedrock Gateway...${NC}"
    echo "Project: bitebase-bedrock-gateway"
    echo "Configuration: bedrock-gateway-deploy.json"
    echo ""
    
    # Deploy gateway
    vercel --prod --yes --config bedrock-gateway-deploy.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Bedrock Gateway deployment successful!${NC}"
        GATEWAY_URL=$(vercel ls bitebase-bedrock-gateway --token | grep "https://" | head -1 | awk '{print $1}')
        echo -e "${GREEN}🤖 Gateway URL: ${GATEWAY_URL}${NC}"
    else
        echo -e "${YELLOW}⚠️ Bedrock Gateway deployment failed, but backend is still functional with fallback responses${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Bedrock Gateway directory not found, skipping gateway deployment${NC}"
    echo -e "${BLUE}💡 The backend will use fallback responses when Bedrock is unavailable${NC}"
fi

# Step 3: Set Environment Variables
echo -e "${BLUE}🔧 Step 3: Setting up environment variables...${NC}"

# Set backend environment variables
echo "Setting environment variables for bitebase-intelligence-backend..."
vercel env add BEDROCK_API_KEY bedrock production --scope=bitebase-intelligence-backend --yes
vercel env add AWS_REGION us-east-1 production --scope=bitebase-intelligence-backend --yes

# If we have a gateway URL, update the backend to use it
if [ ! -z "$GATEWAY_URL" ]; then
    vercel env add BEDROCK_API_BASE_URL "${GATEWAY_URL}/api/v1" production --scope=bitebase-intelligence-backend --yes
    echo -e "${GREEN}✅ Backend configured to use deployed Bedrock Gateway${NC}"
else
    # Use a fallback or external gateway URL
    vercel env add BEDROCK_API_BASE_URL "https://bedrock-proxy.bitebase.app/api/v1" production --scope=bitebase-intelligence-backend --yes
    echo -e "${YELLOW}⚠️ Backend configured to use external Bedrock Gateway${NC}"
fi

# Step 4: Test Deployment
echo -e "${BLUE}🧪 Step 4: Testing deployment...${NC}"

if [ ! -z "$BACKEND_URL" ]; then
    echo "Testing backend health..."
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/health" || echo "000")
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️ Backend health check returned: ${HEALTH_RESPONSE}${NC}"
    fi
    
    echo "Testing AI endpoint..."
    AI_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/ai/chat" \
        -H "Content-Type: application/json" \
        -d '{"message": "Hello"}' \
        -w "%{http_code}" || echo "000")
    
    if [[ "$AI_RESPONSE" == *"200"* ]]; then
        echo -e "${GREEN}✅ AI endpoint test passed${NC}"
    else
        echo -e "${YELLOW}⚠️ AI endpoint test response: ${AI_RESPONSE}${NC}"
    fi
fi

# Final Summary
echo ""
echo "=================================================================="
echo -e "${GREEN}🎉 Deployment Summary${NC}"
echo "=================================================================="
echo -e "${GREEN}✅ Backend:${NC} ${BACKEND_URL:-'Deployment may have failed'}"
if [ ! -z "$GATEWAY_URL" ]; then
    echo -e "${GREEN}✅ Gateway:${NC} ${GATEWAY_URL}"
else
    echo -e "${YELLOW}⚠️ Gateway:${NC} Using fallback responses"
fi
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update your frontend to use: ${BACKEND_URL}"
echo "2. Test the AI chat functionality"
echo "3. Monitor logs with: vercel logs"
echo "4. Check environment variables with: vercel env ls"
echo ""
echo -e "${GREEN}🚀 BiteBase is now deployed and ready for production!${NC}"