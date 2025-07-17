# BiteBase Backend API

🍽️ **Advanced Restaurant Intelligence Platform Backend**

A comprehensive Express.js backend service providing AI-powered analytics, real-time data processing, and restaurant intelligence features for the BiteBase platform.

## 🚀 Features

### Core Services
- **Restaurant Search & Discovery** - Real-time restaurant data with geospatial search
- **AI Analytics** - Predictive analytics, sentiment analysis, market segmentation
- **Location Intelligence** - Real-time location tracking and geospatial analysis
- **Market Research** - Economic indicators, competitive analysis, foot traffic data
- **Enterprise Monitoring** - Performance metrics, security status, scalability monitoring

### Advanced Capabilities
- **Multi-Platform Integration** - Foursquare, Wongnai, Google Places APIs
- **Real-Time Data Streaming** - WebSocket support for live updates
- **Advanced AI Models** - Machine learning for predictions and recommendations
- **Beta Testing Management** - Comprehensive feedback and user analytics
- **Enterprise Security** - JWT authentication, rate limiting, CORS protection

## 🛠️ Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- PostgreSQL 13+ (optional - uses mock data by default)

### Installation

```bash
# Clone the repository
git clone https://github.com/khiwniti/bitebase-backend-express.git
cd bitebase-backend-express

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.development

# Start development server
npm run dev
```

The server will start on `http://localhost:3001`

### Environment Configuration

Copy `.env.example` to `.env.development` and configure:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:12000
DATABASE_URL=postgresql://localhost:5432/bitebase
MAPBOX_API_KEY=pk.your_mapbox_token_here
FOURSQUARE_API_KEY=your_foursquare_key_here
```

## 📖 API Documentation

### Core Endpoints

#### Health & Status
- `GET /health` - Service health check with database status
- `GET /ai` - AI service status and capabilities
- `GET /test` - Simple connectivity test

#### Restaurant Services
- `GET /restaurants/search` - Search restaurants with geospatial filters
- `GET /restaurants/featured` - Get featured restaurants
- `GET /restaurants/:id` - Get detailed restaurant information
- `POST /restaurants/search/realtime` - Real-time restaurant search with auto-radius

#### AI Analytics (Restack-Powered)
- `POST /api/ai/market-analysis` - Comprehensive market analysis with competitor insights
- `POST /api/ai/restaurant-analytics` - Performance monitoring and business intelligence
- `POST /api/ai/chat` - Intelligent conversational AI with context persistence
- `GET /api/ai/health` - AI services health check with Restack status
- `POST /ai/predictive-analytics` - Generate revenue and demand forecasts
- `POST /ai/market-segmentation` - Customer segmentation analysis
- `POST /ai/sales-prediction` - Sales forecasting with ML models
- `POST /ai/seasonal-analysis` - Seasonal trends and patterns
- `POST /ai/sentiment-analysis` - Review sentiment analysis
- `GET /ai/model-performance` - AI model performance metrics

#### Data Integration
- `GET /data/economic-indicators/thailand` - Thai economic data
- `GET /data/social-sentiment/:restaurantId` - Social media sentiment
- `GET /data/foot-traffic/:locationId` - Foot traffic analytics
- `GET /data/etl/status` - Data pipeline status
- `GET /data/quality/metrics` - Data quality metrics

#### Enterprise Features
- `GET /enterprise/security/status` - Security monitoring
- `GET /enterprise/performance/metrics` - Performance analytics
- `GET /enterprise/scalability/status` - Infrastructure scaling status

#### Beta Testing
- `POST /beta/feedback/submit` - Submit user feedback
- `GET /beta/users/analytics` - Beta user analytics
- `GET /beta/users/:userId` - Individual user details

### Location Services
- `POST /user/location/update` - Update user location
- `POST /user/location/stream` - Real-time location streaming

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.21+
- **Database**: PostgreSQL with connection pooling
- **AI Engine**: Restack.io with TypeScript agents
- **APIs**: Foursquare, Mapbox, Google Places, Anthropic Claude
- **Security**: CORS, rate limiting, input validation

### Data Flow
```
Frontend App → API Gateway → Express Routes → Business Logic → External APIs
                                         ↓
Database ← Data Processing ← AI Models ← Response Formatting
```

### Key Components
- **Router Layer** - Express.js route handlers
- **Service Layer** - Business logic and data processing
- **Integration Layer** - External API connections
- **Data Layer** - Database operations and caching

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm start           # Start production server
npm run build       # Build for production
npm run test        # Run test suite
npm run lint        # Run ESLint
npm run clean       # Clean build artifacts

# Restack AI Agents
cd restack-agents
npm run dev          # Start Restack agents in development
npm run build        # Build TypeScript agents
npm start           # Start agents in production
./deploy.sh development local  # Deploy locally with Docker
```

### Development Workflow

1. **Setup Environment**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your configuration
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Test API Endpoints**
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/restaurants/search
   ```

### Code Structure
```
backend/
├── index.js                 # Main application entry point
├── package.json            # Dependencies and scripts
├── .env.example           # Environment template
├── .env.development       # Development configuration
├── vercel.json           # Vercel deployment config
└── docs/                 # Additional documentation
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Prepare for deployment**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard:
   - `NODE_ENV=production`
   - `DATABASE_URL=your_production_db_url`
   - `MAPBOX_API_KEY=your_production_mapbox_key`
   - `FRONTEND_URL=https://your-frontend-domain.com`

### Other Platforms

**Heroku**
```bash
git push heroku main
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your_db_url
```

**Railway**
```bash
railway deploy
```

**DigitalOcean App Platform**
- Connect GitHub repository
- Configure environment variables
- Deploy automatically

## 🔒 Security

### Features
- **CORS Protection** - Configurable cross-origin resource sharing
- **Rate Limiting** - Request throttling to prevent abuse
- **Input Validation** - Comprehensive request validation
- **Environment Security** - Secure environment variable handling
- **Error Handling** - Safe error responses without sensitive data

### Best Practices
- Keep environment variables secure
- Use HTTPS in production
- Regularly update dependencies
- Monitor for security vulnerabilities
- Implement proper logging and monitoring

## 🧪 Testing

### Integration Testing
```bash
# Test all endpoints
npm test

# Test specific functionality
curl -X POST http://localhost:3001/ai/predictive-analytics \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "test_123"}'
```

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test endpoint performance
ab -n 1000 -c 10 http://localhost:3001/restaurants/search
```

## 📊 Monitoring

### Health Checks
- Service health: `GET /health`
- Database connectivity: Included in health check
- External API status: `GET /ai` and data endpoints

### Performance Metrics
- Response times per endpoint
- Request volume and patterns
- Error rates and types
- Resource utilization

### Logging
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Security events

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api-reference.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

### Issues and Support
- GitHub Issues: [Report bugs or request features](https://github.com/khiwniti/bitebase-backend-express/issues)
- Email: support@bitebase.app

### Community
- Discord: [Join our community](https://discord.gg/bitebase)
- Twitter: [@BiteBasePlatform](https://twitter.com/BiteBasePlatform)

---

**BiteBase Backend** - Powering the future of restaurant intelligence 🚀

Made with ❤️ by the BiteBase Team