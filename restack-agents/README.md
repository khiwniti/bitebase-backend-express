# BiteBase Restack AI Agents

This directory contains the Restack.io AI agents integration for the BiteBase restaurant intelligence platform. The agents provide enhanced AI capabilities for market analysis, restaurant analytics, and intelligent chat interactions.

## 🏗️ Architecture

### Hybrid Integration
- **Express.js Backend**: Continues to serve as the main API layer
- **Restack Agents**: Handle AI-intensive workflows with state persistence
- **Fallback System**: Automatic fallback to existing AI services when Restack is unavailable

### Agent Types

#### 1. Market Intelligence Agent
- **Purpose**: Comprehensive market analysis for restaurant locations
- **Features**: 
  - Competitor analysis with real-time data
  - Demographic insights and foot traffic analysis
  - AI-powered market recommendations
  - Risk assessment and opportunity scoring
- **Workflow**: `marketAnalysisWorkflow`

#### 2. Restaurant Analytics Agent
- **Purpose**: Performance monitoring and business intelligence
- **Features**:
  - Revenue trend analysis with predictions
  - Customer behavior pattern recognition
  - Operational efficiency recommendations
  - Benchmarking against industry standards
- **Workflow**: `restaurantAnalyticsWorkflow`

#### 3. Chat Intelligence Agent
- **Purpose**: Conversational AI with context awareness
- **Features**:
  - Multi-turn conversation management
  - Intent recognition and entity extraction
  - Context-aware restaurant recommendations
  - Personalized business insights delivery
- **Workflow**: `chatIntelligenceWorkflow`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (for local deployment)
- Restack account (for cloud deployment)

### Installation

1. **Install dependencies**:
   ```bash
   cd restack-agents
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Build TypeScript**:
   ```bash
   npm run build
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Restack Configuration
RESTACK_ENVIRONMENT=local
RESTACK_API_URL=http://localhost:5233
RESTACK_API_KEY=your_restack_api_key_here

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Database Connection
DATABASE_URL=postgresql://localhost:5432/bitebase
BACKEND_API_URL=http://localhost:56222

# External APIs
GOOGLE_PLACES_API_KEY=your_google_places_api_key
MAPBOX_API_KEY=your_mapbox_api_key
```

## 📦 Deployment

### Local Development
```bash
# Start with Docker Compose
docker-compose up -d

# Or use the deployment script
./deploy.sh development local
```

### Cloud Deployment
```bash
# Deploy to Restack Cloud
./deploy.sh production cloud

# Or deploy to staging
./deploy.sh staging cloud
```

## 🔧 Configuration

### Restack Configuration (`restack.config.json`)
The configuration file defines:
- Agent settings and timeouts
- Workflow retry policies
- Deployment options
- Security settings
- Integration configurations

### Docker Configuration (`docker-compose.yml`)
Includes services for:
- BiteBase AI Agents
- Restack Server
- Redis (for state management)
- PostgreSQL (optional)

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### Health Check
```bash
curl http://localhost:5234/health
```

## 📊 Monitoring

### Restack UI
Access the Restack web interface at:
- Local: `http://localhost:8080`
- Cloud: Provided in deployment output

### Agent Metrics
- Workflow execution times
- Success/failure rates
- Agent performance metrics
- Error tracking

### Logs
```bash
# View agent logs
docker-compose logs -f bitebase-agents

# View Restack server logs
docker-compose logs -f restack-server
```

## 🔌 API Integration

### Express.js Integration
The main backend integrates with Restack agents through the `RestackClient` service:

```javascript
const RestackClient = require('./services/RestackClient');

const restackClient = new RestackClient({
  restackApiUrl: process.env.RESTACK_API_URL,
  apiKey: process.env.RESTACK_API_KEY,
  fallbackEnabled: true
});

// Execute market analysis
const result = await restackClient.executeMarketAnalysis({
  latitude: 40.7128,
  longitude: -74.0060,
  businessType: 'restaurant',
  radius: 1000
});
```

### New API Endpoints

#### Market Analysis
```bash
POST /api/ai/market-analysis
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "businessType": "restaurant",
  "radius": 1000,
  "restaurantId": "optional"
}
```

#### Restaurant Analytics
```bash
POST /api/ai/restaurant-analytics
Content-Type: application/json

{
  "restaurantId": "restaurant_123",
  "dateRange": "30d",
  "metrics": ["revenue", "customers", "avgOrderValue"]
}
```

#### Chat Intelligence
```bash
POST /api/ai/chat
Content-Type: application/json

{
  "message": "How can I improve my restaurant's performance?",
  "context": {
    "restaurantId": "restaurant_123",
    "conversationId": "conv_456",
    "language": "en"
  }
}
```

#### Health Check
```bash
GET /api/ai/health
```

## 🛠️ Development

### Project Structure
```
restack-agents/
├── src/
│   ├── agents/           # AI agent implementations
│   ├── workflows/        # Workflow definitions
│   ├── services/         # Utility services
│   ├── types/           # TypeScript definitions
│   └── utils/           # Helper utilities
├── dist/                # Built JavaScript files
├── tests/               # Test files
├── docker-compose.yml   # Docker services
├── Dockerfile          # Agent container
├── restack.config.json # Restack configuration
└── deploy.sh           # Deployment script
```

### Adding New Agents

1. **Create Agent Class**: Extend base agent functionality
2. **Define Workflow**: Create workflow orchestration
3. **Add Types**: Define TypeScript interfaces
4. **Update Configuration**: Add to `restack.config.json`
5. **Add API Endpoint**: Create Express.js route

### Agent Development Pattern
```typescript
export class MyAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.config = {
      name: "MyAgent",
      version: "1.0.0",
      maxRetries: 3,
      timeout: 60000,
      enableLogging: true,
      fallbackEnabled: true
    };
  }

  async initialize(): Promise<void> {
    // Initialize agent
  }

  async processInput(input: MyInput): Promise<MyOutput> {
    // Process input and return output
  }
}
```

## 🔒 Security

### Authentication
- API key authentication for Restack access
- Rate limiting on API endpoints
- Request validation and sanitization

### Data Protection
- Encryption in transit and at rest
- Secure environment variable management
- Input validation and sanitization

## 🚨 Troubleshooting

### Common Issues

1. **Agent Connection Failed**:
   - Check `RESTACK_API_URL` and `RESTACK_API_KEY`
   - Verify Restack server is running
   - Check network connectivity

2. **Workflow Timeout**:
   - Increase timeout in `restack.config.json`
   - Check agent performance metrics
   - Verify external API availability

3. **Fallback Activated**:
   - Expected behavior when Restack is unavailable
   - Check Restack health status
   - Verify fallback services are working

### Debug Commands
```bash
# Check agent health
curl http://localhost:5234/health

# View workflow status
curl http://localhost:5233/workflows/{workflow_id}/status

# Check Restack server logs
docker-compose logs restack-server

# Check agent logs
docker-compose logs bitebase-agents
```

## 📈 Performance Optimization

### Scaling
- Horizontal scaling with multiple agent instances
- Load balancing with Docker Swarm or Kubernetes
- Auto-scaling based on CPU/memory usage

### Caching
- Redis for conversation state
- Database connection pooling
- API response caching

### Monitoring
- Real-time performance metrics
- Error rate monitoring
- Resource utilization tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and support:
- Check the troubleshooting guide
- Review Restack documentation
- Contact the development team

---

**Built with ❤️ by the BiteBase Team**