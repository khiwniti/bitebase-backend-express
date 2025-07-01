#!/bin/bash

# Start Bedrock Access Gateway for BiteBase Backend
echo "🚀 Starting AWS Bedrock Access Gateway..."

# Check if we're in the correct directory
if [ ! -d "bedrock-access-gateway" ]; then
    echo "❌ bedrock-access-gateway directory not found!"
    echo "Please run this script from the backend directory"
    exit 1
fi

# Change to the gateway directory
cd bedrock-access-gateway/src

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed or not in PATH"
    echo "Please install Python 3.8+ to run the Bedrock gateway"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed or not in PATH"
    echo "Please install pip3 to install dependencies"
    exit 1
fi

# Install dependencies if not already installed
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Set environment variables for the gateway
export AWS_REGION=${AWS_REGION:-us-west-2}
export API_ROUTE_PREFIX=${API_ROUTE_PREFIX:-/api/v1}
export DEBUG=${DEBUG:-true}
export DEFAULT_MODEL=${BEDROCK_CHAT_MODEL:-anthropic.claude-3-sonnet-20240229-v1:0}
export DEFAULT_EMBEDDING_MODEL=${BEDROCK_EMBEDDING_MODEL:-cohere.embed-multilingual-v3}
export ENABLE_CROSS_REGION_INFERENCE=${ENABLE_CROSS_REGION_INFERENCE:-true}
export ENABLE_APPLICATION_INFERENCE_PROFILES=${ENABLE_APPLICATION_INFERENCE_PROFILES:-true}

echo "🌐 Gateway will be available at: http://localhost:8000/api/v1"
echo "🔧 Default model: $DEFAULT_MODEL"
echo "🌍 AWS Region: $AWS_REGION"
echo ""
echo "📋 Available endpoints:"
echo "   • POST /api/v1/chat/completions"
echo "   • POST /api/v1/embeddings"
echo "   • GET  /api/v1/models"
echo "   • GET  /health"
echo ""
echo "🚀 Starting gateway server..."

# Start the server
python3 -m uvicorn api.app:app --host 0.0.0.0 --port 8000 --reload