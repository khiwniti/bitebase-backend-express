# BiteBase Intelligence - Deployment Guide

This guide covers deploying the BiteBase Intelligence platform to Vercel using separate repositories for frontend and backend.

## 🏗️ Architecture Overview

- **Frontend**: Next.js 15.3.4 application with Radix UI components
- **Backend**: Express.js 5.1.0 API with PostgreSQL database
- **Deployment**: Vercel for both frontend and backend
- **Database**: PostgreSQL (Vercel Postgres or external provider)

## 📦 Repository Structure

### Separate Repositories for Deployment:
- **Frontend**: https://github.com/khiwniti/beta-bitebase-app.git
- **Backend**: https://github.com/khiwniti/bitebase-backend-express.git

## 🚀 Deployment Steps

### 1. Backend Deployment (Deploy First)

#### Prerequisites:
- PostgreSQL database (Vercel Postgres recommended)
- OpenAI API key
- All API keys from the configuration below

#### Steps:
1. **Clone and prepare backend repository:**
   ```bash
   git clone https://github.com/khiwniti/bitebase-backend-express.git
   cd bitebase-backend-express
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables in Vercel Dashboard:**
   Go to your Vercel project settings and add these environment variables:

   ```env
   # Database
   DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Mapbox
   MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoia2hpd25pdGkiLCJhIjoiY205eDFwMzl0MHY1YzJscjB3bm4xcnh5ZyJ9.ANGVE0tiA9NslBn8ft_9fQ
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_your_secret_key_here
   
   # Foursquare
   FOURSQUARE_CLIENT_SECRET=W4LHPBI1PVAKU4BLVQJ1YA2XNPZGVNNV44LCBQNRKJZHYDNZ
   FOURSQUARE_API_KEY=fsq3Ciis2M5OLrAUQqL2V5z+bsUMKpCCdQe1ULDMN23ISSo=
   
   # Google Places
   GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
   
   # JWT
   JWT_SECRET=your_jwt_secret_here
   
   # CORS
   CORS_ORIGIN=https://beta.bitebase.app
   ```

4. **Note the backend URL** (e.g., `https://your-backend.vercel.app`)

### 2. Frontend Deployment

#### Steps:
1. **Clone and prepare frontend repository:**
   ```bash
   git clone https://github.com/khiwniti/beta-bitebase-app.git
   cd beta-bitebase-app
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables in Vercel Dashboard:**
   ```env
   # API Configuration
   NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
   
   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51QXx6jBnlMK6rCAQRtEMwxV3fvYjCfSl1X61xY1M75yRZGY5eu8Y0Bq4VkUSEgbyXt4pkMLiaO2UqXUXR43TBH4C00iVaAHEJv
   
   # Foursquare
   NEXT_PUBLIC_FOURSQUARE_CLIENT_ID=UFEXNGODOGBQRX35NGIP0ZU0XDT2GJMIV0LGNGBMLU5RBVAN
   NEXT_PUBLIC_FOURSQUARE_API_KEY=fsq3Ciis2M5OLrAUQqL2V5z+bsUMKpCCdQe1ULDMN23ISSo=
   
   # Google Places
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
   
   # Mapbox
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoia2hpd25pdGkiLCJhIjoiY205eDFwMzl0MHY1YzJscjB3bm4xcnh5ZyJ9.ANGVE0tiA9NslBn8ft_9fQ
   
   # Feature Flags
   NEXT_PUBLIC_ENABLE_MAPS=true
   NEXT_PUBLIC_ENABLE_REAL_DATA=true
   NEXT_PUBLIC_ENABLE_AI_CHAT=true
   
   # App Configuration
   NEXT_PUBLIC_ENVIRONMENT=production
   NEXT_PUBLIC_APP_NAME=BiteBase Intelligence
   ```

## 🔧 Configuration Details

### API Keys Provided:

#### Stripe:
- **Publishable Key**: `pk_live_51QXx6jBnlMK6rCAQRtEMwxV3fvYjCfSl1X61xY1M75yRZGY5eu8Y0Bq4VkUSEgbyXt4pkMLiaO2UqXUXR43TBH4C00iVaAHEJv`
- **Secret Key**: You'll need to provide this

#### Foursquare:
- **Client ID**: `UFEXNGODOGBQRX35NGIP0ZU0XDT2GJMIV0LGNGBMLU5RBVAN`
- **Client Secret**: `W4LHPBI1PVAKU4BLVQJ1YA2XNPZGVNNV44LCBQNRKJZHYDNZ`
- **API Key**: `fsq3Ciis2M5OLrAUQqL2V5z+bsUMKpCCdQe1ULDMN23ISSo=`

#### Google Places API:
- **Base URL**: `https://places.googleapis.com/v1/places/`
- **API Key**: You'll need to provide this

### Required Additional Keys:
1. **OpenAI API Key** - For AI features
2. **Google Places API Key** - For location services
3. **Stripe Secret Key** - For payment processing
4. **PostgreSQL Database URL** - For data storage

## 🗄️ Database Setup

### Option 1: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Navigate to Storage tab
3. Create a new Postgres database
4. Copy the connection string to `DATABASE_URL`

### Option 2: External PostgreSQL
Use any PostgreSQL provider (AWS RDS, Railway, Supabase, etc.)

## 🔒 Security Considerations

1. **Environment Variables**: Never commit API keys to repositories
2. **CORS Configuration**: Update CORS origins in backend configuration
3. **Domain Configuration**: Update allowed domains in Vercel settings
4. **SSL/TLS**: Ensure all API communications use HTTPS

## 📊 Monitoring & Analytics

### Vercel Analytics
- Enable Vercel Analytics in project settings
- Monitor performance and usage

### Error Tracking
- Consider integrating Sentry or similar service
- Monitor API errors and frontend crashes

## 🚀 Post-Deployment Checklist

- [ ] Backend API is accessible and responding
- [ ] Frontend loads without errors
- [ ] Database connections are working
- [ ] All API integrations are functional
- [ ] Maps are loading correctly
- [ ] Stripe payments are working (test mode first)
- [ ] AI chat features are operational
- [ ] Mobile responsiveness is working
- [ ] Performance metrics are acceptable

## 🔄 Continuous Deployment

### Automatic Deployments:
- Vercel automatically deploys on git push to main branch
- Configure branch protection rules
- Set up staging environments for testing

### Manual Deployments:
```bash
# Deploy specific branch
vercel --prod --branch feature-branch

# Deploy with specific environment
vercel --prod --env production
```

## 🆘 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs in Vercel dashboard

2. **API Connection Issues**:
   - Verify CORS configuration
   - Check environment variables
   - Ensure backend is deployed and accessible

3. **Database Connection**:
   - Verify DATABASE_URL format
   - Check database permissions
   - Ensure SSL mode is configured correctly

### Support Resources:
- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Express.js Documentation: https://expressjs.com/

## 📞 Contact

For deployment support or issues, please contact the development team or create an issue in the respective repositories.