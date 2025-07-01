#!/bin/bash

# BiteBase Backend Deployment Script
# This script prepares and deploys the backend to various platforms

set -e

echo "🍽️ BiteBase Backend Deployment Script"
echo "======================================"

# Check if required tools are installed
check_tools() {
    echo "📋 Checking required tools..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    echo "✅ All required tools are available"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    npm test
    echo "✅ Tests passed"
}

# Build for production
build_production() {
    echo "🏗️ Building for production..."
    npm run build
    echo "✅ Production build complete"
}

# Deploy to Vercel
deploy_vercel() {
    echo "🚀 Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        echo "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    echo "Deploying to production..."
    vercel --prod --yes
    echo "✅ Deployed to Vercel"
}

# Deploy to Heroku
deploy_heroku() {
    echo "🚀 Deploying to Heroku..."
    
    if ! command -v heroku &> /dev/null; then
        echo "❌ Heroku CLI is not installed"
        echo "Please install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    echo "Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku" || echo "No changes to commit"
    git push heroku main
    echo "✅ Deployed to Heroku"
}

# Deploy to Railway
deploy_railway() {
    echo "🚀 Deploying to Railway..."
    
    if ! command -v railway &> /dev/null; then
        echo "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    echo "Deploying to Railway..."
    railway deploy
    echo "✅ Deployed to Railway"
}

# Main deployment function
deploy() {
    local platform=$1
    
    echo "Starting deployment to $platform..."
    
    check_tools
    install_dependencies
    run_tests
    build_production
    
    case $platform in
        vercel)
            deploy_vercel
            ;;
        heroku)
            deploy_heroku
            ;;
        railway)
            deploy_railway
            ;;
        *)
            echo "❌ Unknown platform: $platform"
            echo "Supported platforms: vercel, heroku, railway"
            exit 1
            ;;
    esac
    
    echo "🎉 Deployment complete!"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [platform]"
    echo ""
    echo "Platforms:"
    echo "  vercel   - Deploy to Vercel (recommended)"
    echo "  heroku   - Deploy to Heroku"
    echo "  railway  - Deploy to Railway"
    echo ""
    echo "Examples:"
    echo "  $0 vercel"
    echo "  $0 heroku"
    echo "  $0 railway"
}

# Main script execution
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

deploy $1