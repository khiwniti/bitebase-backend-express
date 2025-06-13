# 🍽️ BiteBase Express.js Backend

A standalone Express.js backend API for the BiteBase restaurant discovery platform, deployed on Vercel.

## 🚀 Features

- **Restaurant Search**: Advanced search with filters (location, cuisine, price, rating)
- **Restaurant Details**: Detailed restaurant information with similar suggestions
- **Analytics Dashboard**: Real-time analytics and metrics
- **Database Management**: PostgreSQL integration with Neon
- **Health Monitoring**: Health check endpoints with database status

## 📡 API Endpoints

### Core Endpoints
- `GET /` - API information and available endpoints
- `GET /health` - Health check with database connectivity
- `GET /test` - Simple test endpoint

### Restaurant Endpoints
- `GET /restaurants/search` - Search restaurants with filters
- `GET /restaurants/:id` - Get restaurant details and similar restaurants

### Analytics Endpoints
- `GET /analytics/dashboard` - Analytics dashboard with metrics
- `POST /init-database` - Initialize database with test data

## 🔧 Query Parameters

### Restaurant Search (`/restaurants/search`)
- `location` - City, state, or address
- `cuisine` - Cuisine type (Italian, Japanese, Mexican, etc.)
- `price_range` - Maximum price range (1-4)
- `rating` - Minimum rating (0-5)
- `delivery` - Filter by delivery availability (true/false)
- `takeout` - Filter by takeout availability (true/false)
- `reservations` - Filter by reservation availability (true/false)
- `features` - Array of features (outdoor_seating, wine_bar, etc.)
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset (default: 0)

### Analytics Dashboard (`/analytics/dashboard`)
- `timeframe` - Time period (1d, 7d, 30d, 90d)

## 🗄️ Database

- **Provider**: Neon PostgreSQL
- **Database**: beta-bitebase-prod
- **Tables**: users, restaurants, user_sessions, analytics_events, user_favorites
- **Features**: Full-text search, indexing, analytics tracking

## 🔒 Security

- CORS enabled for beta.bitebase.app
- SQL injection protection with parameterized queries
- Input validation and sanitization
- Error handling without sensitive data exposure

## 🚀 Deployment

This backend is deployed as a separate Vercel project for optimal performance and scalability.

### Environment Variables Required:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `NODE_ENV` - Environment (production/development)

## 📊 Sample Responses

### Health Check
```json
{
  "status": "healthy",
  "timestamp": "2025-06-13T16:48:00.000Z",
  "service": "bitebase-backend-express",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "type": "postgresql",
    "provider": "neon"
  }
}
```

### Restaurant Search
```json
{
  "success": true,
  "data": {
    "restaurants": [...],
    "total": 5,
    "filters": {...},
    "pagination": {...}
  }
}
```

## 🛠️ Local Development

```bash
npm install
npm start
```

The server will run on port 3000 by default.

## 📝 Version

Current version: 1.0.0