#!/bin/bash

# BiteBase Restack AI Agents Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="bitebase-ai-agents"
ENVIRONMENT=${1:-development}
DEPLOY_TYPE=${2:-cloud}

echo -e "${BLUE}🚀 Starting BiteBase Restack AI Agents deployment...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Deploy Type: ${DEPLOY_TYPE}${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Must be: development, staging, or production${NC}"
    exit 1
fi

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        echo -e "${RED}❌ Node.js version $REQUIRED_VERSION or higher is required. Current: $NODE_VERSION${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to setup environment
setup_environment() {
    echo -e "${YELLOW}🔧 Setting up environment...${NC}"
    
    # Copy environment file if it doesn't exist
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            echo -e "${YELLOW}⚠️ Created .env from .env.example. Please update with your values.${NC}"
        else
            echo -e "${RED}❌ No .env.example file found${NC}"
            exit 1
        fi
    fi
    
    # Validate required environment variables
    source .env
    REQUIRED_VARS=(
        "ANTHROPIC_API_KEY"
        "RESTACK_API_URL"
        "BACKEND_API_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            echo -e "${RED}❌ Required environment variable $var is not set${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Environment setup completed${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    npm ci
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
}

# Function to build the project
build_project() {
    echo -e "${YELLOW}🔨 Building project...${NC}"
    
    npm run build
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Project built successfully${NC}"
    else
        echo -e "${RED}❌ Failed to build project${NC}"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    
    if npm run test &> /dev/null; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️ Tests not configured or failed${NC}"
    fi
}

# Function to deploy to Restack Cloud
deploy_to_cloud() {
    echo -e "${YELLOW}☁️ Deploying to Restack Cloud...${NC}"
    
    # Check if Restack CLI is installed
    if ! command -v restack &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Restack CLI...${NC}"
        npm install -g @restackio/cli
    fi
    
    # Login to Restack (if not already logged in)
    if [[ -n "$RESTACK_API_KEY" ]]; then
        echo -e "${YELLOW}🔑 Authenticating with Restack...${NC}"
        restack auth login --api-key "$RESTACK_API_KEY"
    fi
    
    # Deploy agents
    case $ENVIRONMENT in
        "development")
            restack deploy --env development
            ;;
        "staging")
            restack deploy --env staging --wait
            ;;
        "production")
            restack deploy --env production --wait --confirm
            ;;
    esac
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Successfully deployed to Restack Cloud${NC}"
    else
        echo -e "${RED}❌ Failed to deploy to Restack Cloud${NC}"
        exit 1
    fi
}

# Function to deploy locally with Docker
deploy_locally() {
    echo -e "${YELLOW}🐳 Deploying locally with Docker...${NC}"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
    
    # Build and start services
    docker-compose -f docker-compose.yml up --build -d
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Successfully deployed locally with Docker${NC}"
        echo -e "${BLUE}🌐 Restack UI: http://localhost:8080${NC}"
        echo -e "${BLUE}🤖 Agents API: http://localhost:5234${NC}"
    else
        echo -e "${RED}❌ Failed to deploy locally${NC}"
        exit 1
    fi
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    if [[ "$DEPLOY_TYPE" == "local" ]]; then
        # Wait for services to be ready
        sleep 10
        
        # Check if Restack server is running
        if curl -f http://localhost:5233/health &> /dev/null; then
            echo -e "${GREEN}✅ Restack server is healthy${NC}"
        else
            echo -e "${RED}❌ Restack server is not responding${NC}"
            exit 1
        fi
        
        # Check if agents are running
        if curl -f http://localhost:5234/health &> /dev/null; then
            echo -e "${GREEN}✅ AI Agents are healthy${NC}"
        else
            echo -e "${RED}❌ AI Agents are not responding${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⏳ Waiting for cloud deployment to be ready...${NC}"
        sleep 30
        
        # Check deployment status via Restack CLI
        if restack status &> /dev/null; then
            echo -e "${GREEN}✅ Cloud deployment is healthy${NC}"
        else
            echo -e "${YELLOW}⚠️ Unable to verify cloud deployment status${NC}"
        fi
    fi
}

# Function to show deployment information
show_deployment_info() {
    echo -e "${BLUE}📋 Deployment Information:${NC}"
    echo -e "${BLUE}=========================${NC}"
    echo -e "Project: $PROJECT_NAME"
    echo -e "Environment: $ENVIRONMENT"
    echo -e "Deploy Type: $DEPLOY_TYPE"
    echo -e "Timestamp: $(date)"
    
    if [[ "$DEPLOY_TYPE" == "local" ]]; then
        echo -e "${BLUE}🔗 Local URLs:${NC}"
        echo -e "  Restack UI: http://localhost:8080"
        echo -e "  Agents API: http://localhost:5234"
        echo -e "  Restack API: http://localhost:5233"
        echo -e "${BLUE}📝 Logs:${NC}"
        echo -e "  docker-compose logs -f bitebase-agents"
        echo -e "  docker-compose logs -f restack-server"
    fi
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Main deployment flow
main() {
    check_prerequisites
    setup_environment
    install_dependencies
    build_project
    run_tests
    
    if [[ "$DEPLOY_TYPE" == "cloud" ]]; then
        deploy_to_cloud
    else
        deploy_locally
    fi
    
    verify_deployment
    show_deployment_info
}

# Error handling
trap 'echo -e "${RED}❌ Deployment failed${NC}"; exit 1' ERR

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo -e "${BLUE}Usage: $0 <environment> [deploy_type]${NC}"
    echo -e "${BLUE}Environments: development, staging, production${NC}"
    echo -e "${BLUE}Deploy Types: cloud (default), local${NC}"
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  $0 development local"
    echo -e "  $0 staging cloud"
    echo -e "  $0 production cloud"
    exit 1
fi

# Run main function
main