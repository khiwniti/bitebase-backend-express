# AWS Bedrock Integration Setup Guide

This guide explains how to replace the OpenRouter AI integration with AWS Bedrock AI using the bedrock-access-gateway.

## 🔄 What Changed

- **Before**: Used OpenRouter AI with DeepSeek models
- **After**: Uses AWS Bedrock with Claude models via bedrock-access-gateway
- **Benefits**: More reliable, better models, AWS infrastructure, cost-effective

## 📋 Prerequisites

1. **Python 3.8+** (for bedrock-access-gateway)
2. **AWS Account** with Bedrock access
3. **Node.js 18+** (for backend)
4. **AWS CLI** configured (optional for production)

## 🚀 Quick Setup

### 1. Start the Bedrock Gateway

```bash
# Make sure you're in the backend directory
cd backend

# Start the gateway (this will install Python dependencies)
./start-bedrock-gateway.sh
```

The gateway will be available at: `http://localhost:8000`

### 2. Configure Environment Variables

Copy the Bedrock configuration to your `.env` file:

```bash
# Copy Bedrock config
cat .env.bedrock >> .env
```

Or manually add these variables to your `.env` file:

```env
# AWS Bedrock Configuration
BEDROCK_API_BASE_URL=http://localhost:8000/api/v1
BEDROCK_API_KEY=bedrock

# Model Configuration
BEDROCK_CHAT_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REASONING_MODEL=anthropic.claude-3-7-sonnet-20241202-v1:0
BEDROCK_FAST_MODEL=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_EMBEDDING_MODEL=cohere.embed-multilingual-v3

# AWS Configuration (for production)
AWS_REGION=us-west-2
# AWS_ACCESS_KEY_ID=your-access-key-here
# AWS_SECRET_ACCESS_KEY=your-secret-key-here
```

### 3. Test the Integration

```bash
# Test Bedrock AI integration
npm run test-bedrock

# Test the enhanced server with Bedrock
npm run test-ai
```

### 4. Start the Backend

```bash
# Start the enhanced server (recommended)
npm run dev-enhanced

# Or start the main server
npm run dev
```

## 🧪 Testing the Integration

### Manual Testing

```bash
# Test AI chat endpoint
curl -X POST http://localhost:12001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, analyze my restaurant revenue"}'

# Test in Thai
curl -X POST http://localhost:12001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "สวัสดีครับ วิเคราะห์รายได้ร้านผมหน่อย"}'
```

### Automated Testing

```bash
# Run Bedrock integration tests
npm run test-bedrock

# Run enhanced AI tests
npm run test-ai
```

## 🏗️ Architecture

```
Frontend → Backend → Bedrock AI → AWS Bedrock Gateway → AWS Bedrock Models
```

### Components

1. **Backend (index.js/enhanced-server.js)**: Main application server
2. **BedrockAI (bedrock-ai.js)**: AI service using Bedrock gateway
3. **Bedrock Gateway**: OpenAI-compatible API for AWS Bedrock
4. **AWS Bedrock**: Managed AI service with Claude models

### Model Selection

- **Fast Model** (Claude 3 Haiku): Greetings, simple questions
- **Chat Model** (Claude 3 Sonnet): General conversations, analysis
- **Reasoning Model** (Claude 3.7 Sonnet): Complex analytics, predictions

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BEDROCK_API_BASE_URL` | `http://localhost:8000/api/v1` | Gateway URL |
| `BEDROCK_API_KEY` | `bedrock` | API key for gateway |
| `BEDROCK_CHAT_MODEL` | `anthropic.claude-3-sonnet-20240229-v1:0` | Default chat model |
| `BEDROCK_REASONING_MODEL` | `anthropic.claude-3-7-sonnet-20241202-v1:0` | Complex analysis model |
| `BEDROCK_FAST_MODEL` | `anthropic.claude-3-haiku-20240307-v1:0` | Fast response model |
| `AWS_REGION` | `us-west-2` | AWS region for Bedrock |

### Gateway Configuration

The gateway configuration is in `bedrock-access-gateway/src/api/setting.py`:

- **API Route Prefix**: `/api/v1`
- **Default Model**: Claude 3 Sonnet
- **Cross-Region Inference**: Enabled
- **Application Inference Profiles**: Enabled

## 🚀 Production Deployment

### 1. Deploy Bedrock Gateway

**Option A: AWS Lambda + ALB**
```bash
# Use the CloudFormation template
# https://console.aws.amazon.com/cloudformation/home?#/stacks/quickcreate?templateURL=https://aws-gcr-solutions.s3.amazonaws.com/bedrock-access-gateway/latest/BedrockProxy.template
```

**Option B: AWS Fargate**
```bash
# Use the Fargate CloudFormation template
# https://console.aws.amazon.com/cloudformation/home?#/stacks/quickcreate?templateURL=https://aws-gcr-solutions.s3.amazonaws.com/bedrock-access-gateway/latest/BedrockProxyFargate.template
```

### 2. Update Environment Variables

```env
# Production Gateway URL
BEDROCK_API_BASE_URL=https://your-gateway-url.elb.amazonaws.com/api/v1
BEDROCK_API_KEY=your-secure-api-key

# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 3. Configure AWS Credentials

**Option A: IAM Roles (Recommended)**
- Attach IAM role with Bedrock permissions to your EC2/Fargate instance

**Option B: Environment Variables**
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Option C: AWS CLI**
```bash
aws configure
```

## 🔍 Troubleshooting

### Gateway Not Starting

```bash
# Check Python version
python3 --version

# Install dependencies manually
cd bedrock-access-gateway/src
pip3 install -r requirements.txt

# Start manually
python3 -m uvicorn api.app:app --host 0.0.0.0 --port 8000
```

### AWS Credentials Issues

```bash
# Test AWS credentials
aws sts get-caller-identity

# Check Bedrock access
aws bedrock list-foundation-models --region us-west-2
```

### Backend Connection Issues

1. Check if gateway is running: `curl http://localhost:8000/health`
2. Check backend logs for Bedrock AI initialization
3. Verify environment variables are loaded
4. Test with fallback responses

### Model Access Issues

1. Ensure Bedrock model access is enabled in AWS Console
2. Check AWS region supports the requested models
3. Verify IAM permissions for Bedrock access

## 📊 Monitoring

### Gateway Health

```bash
# Check gateway health
curl http://localhost:8000/health

# List available models
curl http://localhost:8000/api/v1/models \
  -H "Authorization: Bearer bedrock"
```

### Backend Metrics

The backend logs will show:
- Model selection for each request
- Token usage
- Response times
- Fallback usage

## 🔄 Migration Checklist

- [x] ✅ Clone bedrock-access-gateway repository
- [x] ✅ Create BedrockAI service class
- [x] ✅ Replace OpenRouterAI with BedrockAI in enhanced-server.js
- [x] ✅ Add BedrockAI to main index.js
- [x] ✅ Create environment configuration
- [x] ✅ Add npm scripts for Bedrock operations
- [x] ✅ Create test scripts
- [ ] 🔄 Test local integration
- [ ] 🔄 Deploy to production
- [ ] 🔄 Configure AWS credentials
- [ ] 🔄 Monitor performance

## 🆘 Support

If you encounter issues:

1. Check the [Bedrock Access Gateway Documentation](https://github.com/aws-samples/bedrock-access-gateway)
2. Review AWS Bedrock model access in the AWS Console
3. Check gateway logs and backend logs
4. Test with fallback responses to isolate issues

## 📚 Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Bedrock Access Gateway](https://github.com/aws-samples/bedrock-access-gateway)
- [Claude Models on Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)