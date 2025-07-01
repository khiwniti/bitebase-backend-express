# Quick Deployment Commands for BiteBase Backend

## 🚀 Deploy to Vercel (One-time setup)

### 1. Login to Vercel
```bash
npx vercel login
```

### 2. Deploy Backend
```bash
npx vercel --prod --yes
```

### 3. Set Environment Variables (if needed)
```bash
# Bedrock API configuration
npx vercel env add BEDROCK_API_KEY bedrock production
npx vercel env add AWS_REGION us-east-1 production

# Database (use your actual values)
npx vercel env add DATABASE_URL "your-database-url" production
npx vercel env add MAPBOX_API_KEY "your-mapbox-key" production
npx vercel env add FOURSQUARE_API_KEY "your-foursquare-key" production
```

## 🧪 Test Deployment

### Test Health Endpoint
```bash
curl https://your-backend-url.vercel.app/health
```

### Test AI Chat Endpoint
```bash
# English test
curl -X POST https://your-backend-url.vercel.app/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Thai test  
curl -X POST https://your-backend-url.vercel.app/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "สวัสดีครับ"}'
```

## 📋 Current Configuration

The `vercel.json` file is already configured with:

- ✅ **AWS Bedrock credentials** embedded for immediate deployment
- ✅ **Model configurations** for Claude 3 Haiku, Sonnet, and 7-Sonnet
- ✅ **Environment variables** for production deployment
- ✅ **CORS settings** configured for frontend at beta.bitebase.app
- ✅ **Function timeouts** set to 30 seconds
- ✅ **Auto-deployment** enabled from GitHub

## 🔄 Redeploy After Changes

```bash
# After making code changes
npx vercel --prod
```

## 🌐 Expected Result

After deployment, you'll get a URL like:
- **Backend**: `https://bitebase-intelligence-backend-xyz.vercel.app`
- **Health Check**: `https://your-url.vercel.app/health`
- **AI Chat**: `https://your-url.vercel.app/ai/chat`

## 🤖 AI Features Available

1. **Intelligent Model Selection**:
   - Fast model for greetings
   - Chat model for general questions
   - Reasoning model for complex analysis

2. **Fallback System**:
   - Works even when Bedrock gateway is unavailable
   - Provides intelligent fallback responses

3. **Bilingual Support**:
   - Thai and English language detection
   - Culturally appropriate responses

4. **Business Intelligence**:
   - Revenue analysis
   - Customer insights
   - Predictive analytics
   - Marketing recommendations