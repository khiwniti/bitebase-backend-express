# BiteBase Backend Express API

Ultra-clean Express.js backend API for the BiteBase restaurant platform, optimized for Vercel deployment.

## 🚀 Features

- **Restaurant Management**: CRUD operations for restaurants
- **User Authentication**: Secure user registration and login  
- **Search & Filtering**: Advanced restaurant search with filters
- **Reviews System**: User reviews and ratings
- **PostgreSQL Database**: Robust data storage
- **CORS Enabled**: Environment-based CORS configuration
- **Vercel Ready**: Serverless deployment optimized

## 📦 Minimal Dependencies

```json
{
  "express": "^4.18.2",    // Web framework
  "cors": "^2.8.5",        // Cross-origin resource sharing
  "pg": "^8.16.0",         // PostgreSQL client
  "uuid": "^9.0.1"         // UUID generation
}
```

## 🛠️ Quick Start

```bash
# Clone and install
git clone https://github.com/khiwniti/bitebase-backend-express.git
cd bitebase-backend-express
npm install

# Configure environment
cp .env.example .env
# Add your DATABASE_URL

# Start server
npm run dev  # Port 12001
```

## 🌐 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/restaurants` - List restaurants
- `GET /api/restaurants/search` - Search with filters
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `POST /api/reviews` - Create reviews

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Set `DATABASE_URL` in environment variables
3. Deploy automatically

### Environment Setup
```env
DATABASE_URL=postgres://user:pass@host:port/db?sslmode=require
NODE_ENV=production
```

## 🔒 Security

- PBKDF2 password hashing
- Environment-based CORS
- SQL injection prevention
- No hardcoded credentials

## 📊 Live API

**Production**: `https://api.bitebase.app`
**Status**: ✅ Healthy & Optimized

---
*Ultra-clean architecture with minimal dependencies*