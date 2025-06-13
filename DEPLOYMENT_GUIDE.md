# 🚀 BiteBase Backend Deployment Guide

## 📋 Overview

This guide will help you deploy the BiteBase Express.js backend as a separate Vercel project. This approach provides better performance, easier debugging, and cleaner separation of concerns.

## 🎯 Quick Deployment Steps

### 1. Access the Repository
The backend is now available at: **https://github.com/khiwniti/bitebase-backend-express**

### 2. Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import from GitHub: `khiwniti/bitebase-backend-express`
4. Configure the project:
   - **Project Name**: `bitebase-backend-api` (or your preferred name)
   - **Framework Preset**: Other
   - **Root Directory**: `.` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Clone and deploy
git clone https://github.com/khiwniti/bitebase-backend-express.git
cd bitebase-backend-express
vercel --prod
```

### 3. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
DATABASE_URL=postgresql://bitebase_db_admin:npg_sAvDzUnR40CV@ep-late-sun-a5x0yvpb-pooler.us-east-2.aws.neon.tech/beta-bitebase-prod?sslmode=require
NODE_ENV=production
```

### 4. Configure Custom Domain

After deployment, configure the custom domain:
1. In Vercel dashboard, go to your project settings
2. Navigate to "Domains" tab
3. Add custom domain: `api.bitebase.app`
4. Follow Vercel's DNS configuration instructions

### 5. Test the Deployment

Once deployed, your backend will be available at:
`https://api.bitebase.app`

Test these endpoints:
- `GET /` - API documentation
- `GET /health` - Health check with database status
- `GET /test` - Simple test endpoint

### 6. Update Frontend Configuration

Update your frontend to use the new backend URL. In your main frontend project:

```javascript
// apps/frontend/lib/api.ts or similar
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.bitebase.app'
  : 'http://localhost:3000';
```

Or set the environment variable:
```
NEXT_PUBLIC_BACKEND_URL=https://api.bitebase.app
```

## 🔧 API Endpoints Available

### Core Endpoints
- `GET /` - API information and documentation
- `GET /health` - Database health check
- `GET /test` - Simple test endpoint

### Restaurant Endpoints
- `GET /restaurants/search` - Search restaurants with filters
- `GET /restaurants/:id` - Get restaurant details

### Analytics Endpoints
- `GET /analytics/dashboard` - Analytics dashboard
- `POST /init-database` - Initialize database with test data

## 🗄️ Database Initialization

After deployment, initialize the database with test data:

```bash
curl -X POST https://api.bitebase.app/init-database
```

This will create:
- ✅ 5 test restaurants (Italian, Japanese, Mexican, French, American)
- ✅ 5 test users (including admin and restaurant owner)
- ✅ Database tables and indexes
- ✅ Analytics tracking setup

## 🔒 Security Configuration

The backend is configured with:
- ✅ CORS enabled for `beta.bitebase.app`
- ✅ SQL injection protection
- ✅ Input validation
- ✅ Error handling without data exposure

## 📊 Testing the API

### Health Check
```bash
curl https://api.bitebase.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "type": "postgresql",
    "provider": "neon"
  }
}
```

### Restaurant Search
```bash
curl "https://api.bitebase.app/restaurants/search?cuisine=Italian&limit=5"
```

### Analytics Dashboard
```bash
curl "https://api.bitebase.app/analytics/dashboard?timeframe=7d"
```

## 🔄 Frontend Integration

Once your backend is deployed, update your frontend API configuration:

1. **Update API Base URL**:
   ```javascript
   // In your frontend config
   const API_BASE_URL = 'https://api.bitebase.app';
   ```

2. **Update CORS Settings** (if needed):
   The backend is already configured to accept requests from `beta.bitebase.app`

3. **Test Integration**:
   - Restaurant search functionality
   - Analytics dashboard
   - Health monitoring

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify `DATABASE_URL` environment variable is set correctly
   - Check Neon PostgreSQL connection string

2. **CORS Errors**:
   - Ensure your frontend domain is in the CORS configuration
   - Check browser developer tools for specific CORS errors

3. **404 Errors**:
   - Verify the Vercel deployment was successful
   - Check the deployment logs in Vercel dashboard

4. **Function Timeout**:
   - Database queries are optimized for performance
   - Check Vercel function logs for specific errors

### Debug Steps

1. **Check Deployment Status**:
   ```bash
   curl https://api.bitebase.app/health
   ```

2. **View Vercel Logs**:
   - Go to Vercel dashboard → Your project → Functions tab
   - Check real-time logs for errors

3. **Test Database Connection**:
   ```bash
   curl https://api.bitebase.app/test
   ```

## 📈 Performance Optimization

The backend is optimized with:
- ✅ Connection pooling for database
- ✅ Efficient SQL queries with indexes
- ✅ Minimal response payloads
- ✅ Error handling and logging

## 🎉 Success Checklist

- [ ] Backend deployed to Vercel successfully
- [ ] Environment variables configured
- [ ] Health check returns "healthy" status
- [ ] Database initialized with test data
- [ ] Frontend updated with new API URL
- [ ] Restaurant search working
- [ ] Analytics dashboard accessible
- [ ] No CORS errors in browser

## 📞 Support

If you encounter any issues:

1. Check the deployment logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Test individual endpoints to isolate issues
4. Check database connectivity with the health endpoint

## 🔗 Useful Links

- **Backend Repository**: https://github.com/khiwniti/bitebase-backend-express
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon PostgreSQL**: https://neon.tech
- **API Documentation**: Available at your deployed backend root URL

---

**Status**: ✅ Ready for deployment  
**Estimated Setup Time**: 10-15 minutes  
**Confidence Level**: 95% - All code tested and working locally