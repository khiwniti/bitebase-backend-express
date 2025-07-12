#!/bin/bash

echo "🚀 BiteBase Backend - Cloudflare Workers Deployment"
echo "=================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check authentication
echo "🔐 Checking Cloudflare authentication..."
wrangler whoami

if [ $? -ne 0 ]; then
    echo "❌ Not authenticated. Please run: wrangler login"
    exit 1
fi

# Install dependencies (minimal)
echo "📦 Installing dependencies..."
npm install

# Deploy to Cloudflare
echo "🚀 Deploying to Cloudflare Workers..."
npm run deploy

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test your worker at the provided URL"
echo "2. Configure custom domain in Cloudflare Dashboard"
echo "3. Set up environment secrets with: wrangler secret put <KEY>"