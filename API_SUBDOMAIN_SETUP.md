# 🌐 API Subdomain Setup Guide - api.bitebase.app

## 📋 Overview

This guide will help you deploy the BiteBase backend to `api.bitebase.app` subdomain for a clean, professional API endpoint.

## 🚀 Deployment Steps

### 1. Deploy to Vercel

1. **Import Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import: `khiwniti/bitebase-backend-express`
   - Project name: `bitebase-api`

2. **Configure Environment Variables**:
   ```
   DATABASE_URL=postgresql://bitebase_db_admin:npg_sAvDzUnR40CV@ep-late-sun-a5x0yvpb-pooler.us-east-2.aws.neon.tech/beta-bitebase-prod?sslmode=require
   NODE_ENV=production
   ```

3. **Deploy**: Click "Deploy" and wait for completion

### 2. Configure Custom Domain

1. **In Vercel Dashboard**:
   - Go to your `bitebase-api` project
   - Navigate to "Settings" → "Domains"
   - Click "Add Domain"
   - Enter: `api.bitebase.app`

2. **DNS Configuration**:
   Vercel will provide DNS instructions. You'll need to add a CNAME record:
   ```
   Type: CNAME
   Name: api
   Value: cname.vercel-dns.com
   ```

3. **Verify Domain**:
   - Wait for DNS propagation (5-30 minutes)
   - Vercel will automatically verify and issue SSL certificate

### 3. Test API Endpoints

Once deployed at `https://api.bitebase.app`, test:

```bash
# Health check
curl https://api.bitebase.app/health

# API documentation
curl https://api.bitebase.app/

# Test endpoint
curl https://api.bitebase.app/test

# Initialize database
curl -X POST https://api.bitebase.app/init-database
```

### 4. Update Frontend

The frontend is already configured to use `api.bitebase.app`. No changes needed!

## 🔧 API Endpoints

### Available at https://api.bitebase.app

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API documentation and info |
| `/health` | GET | Health check with database status |
| `/test` | GET | Simple test endpoint |
| `/restaurants/search` | GET | Search restaurants with filters |
| `/restaurants/:id` | GET | Get restaurant details |
| `/analytics/dashboard` | GET | Analytics dashboard |
| `/init-database` | POST | Initialize database with test data |

### Example Requests

**Restaurant Search**:
```bash
curl "https://api.bitebase.app/restaurants/search?cuisine=Italian&limit=5"
```

**Restaurant Details**:
```bash
curl "https://api.bitebase.app/restaurants/123e4567-e89b-12d3-a456-426614174000"
```

**Analytics Dashboard**:
```bash
curl "https://api.bitebase.app/analytics/dashboard?timeframe=7d"
```

## 🗄️ Database Initialization

After deployment, initialize the database:

```bash
curl -X POST https://api.bitebase.app/init-database
```

This creates:
- ✅ 5 test restaurants (Italian, Japanese, Mexican, French, American)
- ✅ 5 test users (admin, restaurant owner, regular users)
- ✅ Database tables and indexes
- ✅ Analytics tracking setup

## 🔒 Security Features

- ✅ **CORS**: Configured for bitebase.app domains
- ✅ **SSL**: Automatic HTTPS with Vercel
- ✅ **SQL Injection Protection**: Parameterized queries
- ✅ **Input Validation**: All endpoints validated
- ✅ **Error Handling**: Clean error responses

## 📊 Expected Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2025-06-13T17:00:00.000Z"
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-06-13T17:00:00.000Z"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Domain not working**:
   - Check DNS propagation: `nslookup api.bitebase.app`
   - Verify CNAME record is correct
   - Wait up to 30 minutes for propagation

2. **SSL Certificate issues**:
   - Vercel automatically provisions SSL
   - May take 5-10 minutes after domain verification

3. **Database connection errors**:
   - Verify `DATABASE_URL` environment variable
   - Check Neon PostgreSQL status

4. **CORS errors**:
   - Ensure frontend domain is in CORS configuration
   - Check browser developer tools for specific errors

### Debug Commands

```bash
# Check domain resolution
nslookup api.bitebase.app

# Test API health
curl -v https://api.bitebase.app/health

# Check SSL certificate
openssl s_client -connect api.bitebase.app:443 -servername api.bitebase.app
```

## 📈 Performance Monitoring

Monitor your API performance:

1. **Vercel Analytics**: Built-in performance monitoring
2. **Health Endpoint**: Regular health checks
3. **Database Metrics**: Connection pooling and query performance
4. **Error Tracking**: Automatic error logging

## 🎯 Success Checklist

- [ ] Backend deployed to Vercel successfully
- [ ] Custom domain `api.bitebase.app` configured
- [ ] SSL certificate active (HTTPS working)
- [ ] Environment variables set correctly
- [ ] Database initialized with test data
- [ ] All API endpoints responding correctly
- [ ] Frontend connecting without CORS errors
- [ ] Health check returns "healthy" status

## 🔗 Useful Links

- **API URL**: https://api.bitebase.app
- **Backend Repository**: https://github.com/khiwniti/bitebase-backend-express
- **Vercel Dashboard**: https://vercel.com/dashboard
- **DNS Checker**: https://dnschecker.org

---

**Status**: 🟢 Ready for deployment  
**Estimated Setup Time**: 15-20 minutes  
**Result**: Professional API at https://api.bitebase.app