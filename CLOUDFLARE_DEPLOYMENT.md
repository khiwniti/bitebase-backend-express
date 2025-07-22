# 🚀 BiteBase API - Cloudflare Workers Deployment Guide

## Overview

**UPDATED**: Lightweight worker deployment optimized for production performance at `api.bitebase.app`.

This guide explains how to deploy the optimized BiteBase backend to Cloudflare Workers for global edge deployment with automatic scaling.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Installed via npm (already added to package.json)
3. **API Keys**: Google Maps, AWS credentials, etc.

## Step 1: Cloudflare Setup

### 1.1 Login to Cloudflare

```bash
npx wrangler login
```

### 1.2 Create KV Namespaces

```bash
# Create KV namespace for caching
npx wrangler kv:namespace create "CACHE"
npx wrangler kv:namespace create "CACHE" --preview

# Note the IDs returned and update wrangler.toml
```

### 1.3 Create D1 Database (Optional)

```bash
# Create D1 database for edge data
npx wrangler d1 create bitebase-db

# Note the database_id and update wrangler.toml
```

### 1.4 Create R2 Bucket (Optional)

```bash
# Create R2 bucket for file storage
npx wrangler r2 bucket create bitebase-storage
```

## Step 2: Configure Secrets

Set sensitive environment variables as secrets:

```bash
# Database URL (external PostgreSQL)
npx wrangler secret put DATABASE_URL
# Enter: postgresql://user:pass@host:5432/bitebase_db

# Redis URL (external Redis)
npx wrangler secret put REDIS_URL
# Enter: redis://user:pass@host:6379

# JWT Secret
npx wrangler secret put JWT_SECRET
# Enter: your-256-bit-secret-key

# AWS Credentials
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY

# API Keys
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put SENDGRID_API_KEY
```

## Step 3: Update Configuration

### 3.1 Update wrangler.toml

```toml
name = "bitebase-backend"
main = "src/worker.js"
compatibility_date = "2024-01-01"
node_compat = true

[env.production]
name = "bitebase-backend-production"
routes = [
  { pattern = "api.bitebase.com/*", zone_name = "bitebase.com" }
]

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "bitebase-db"
database_id = "your-d1-database-id"

[vars]
NODE_ENV = "production"
GOOGLE_MAPS_API_KEY = "AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk"
```

### 3.2 Update DNS Records

In Cloudflare Dashboard:
1. Go to DNS settings
2. Add CNAME record:
   - Name: `api`
   - Target: `bitebase-backend.workers.dev`
   - Proxy: Enabled (orange cloud)

## Step 4: Deploy

### 4.1 Development Deployment

```bash
# Test locally
npm run dev:cf

# Deploy to workers.dev subdomain
npm run deploy
```

### 4.2 Production Deployment

```bash
# Deploy to production
npm run deploy:production

# Monitor logs
npm run tail
```

## Step 5: Database Migration

Since Cloudflare Workers can't directly run PostgreSQL, you have two options:

### Option A: External PostgreSQL (Recommended)

Use a managed PostgreSQL service:
- **Neon**: [neon.tech](https://neon.tech) - Serverless PostgreSQL
- **Supabase**: [supabase.com](https://supabase.com)
- **PlanetScale**: [planetscale.com](https://planetscale.com)

### Option B: D1 Database (SQLite)

Convert schema for D1:

```sql
-- Create tables in D1
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  rating REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Run migration
npx wrangler d1 execute bitebase-db --file=./database/d1-schema.sql
```

## Step 6: Connect External Services

### 6.1 PostgreSQL Connection

```javascript
// Use connection pooling service
const { Client } = require('pg');

async function getDBConnection(env) {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}
```

### 6.2 Redis Connection

For Redis in Workers, use Upstash:

```javascript
import { Redis } from '@upstash/redis/cloudflare';

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});
```

## Step 7: Monitoring

### 7.1 Enable Logpush

```bash
# Configure log delivery to external service
npx wrangler logpush create \
  --dataset workers_trace_events \
  --destination "s3://your-bucket/logs"
```

### 7.2 Analytics

View in Cloudflare Dashboard:
- Workers Analytics
- Real-time logs
- Error rates
- Request geography

## Step 8: Performance Optimization

### 8.1 Cache Strategy

```javascript
// Use KV for caching
async function getCachedData(key, env) {
  const cached = await env.CACHE.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

async function setCachedData(key, data, env, ttl = 3600) {
  await env.CACHE.put(key, JSON.stringify(data), {
    expirationTtl: ttl
  });
}
```

### 8.2 Edge Locations

Cloudflare Workers run in 300+ locations globally. No configuration needed.

## Step 9: Custom Domain

### 9.1 Add Custom Domain

```bash
# Add custom domain route
npx wrangler route add api.bitebase.com/*
```

### 9.2 SSL Certificate

Automatic SSL is provided by Cloudflare.

## Step 10: CI/CD Integration

### 10.1 GitHub Actions

Create `.github/workflows/deploy-cloudflare.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
        
      - name: Deploy to Cloudflare
        working-directory: ./backend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npm run deploy:production
```

### 10.2 Get API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Custom Token
3. Permissions:
   - Account: Cloudflare Workers Scripts:Edit
   - Zone: Zone:Read, DNS:Edit
4. Add token to GitHub Secrets

## Troubleshooting

### Common Issues

1. **Bundle Size**: Keep under 10MB compressed
   ```bash
   npm run build:cf
   ls -lh dist/worker.js
   ```

2. **CPU Limits**: Workers have 10ms CPU time limit
   - Use streaming responses
   - Offload heavy computation

3. **Subrequest Limits**: Max 50 subrequests per request
   - Batch API calls
   - Use caching

### Debug Commands

```bash
# View real-time logs
npx wrangler tail

# Check deployment
npx wrangler deployments list

# Test specific route
curl https://api.bitebase.com/health
```

## Production Checklist

- [ ] All secrets configured
- [ ] Custom domain setup
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Error alerting configured
- [ ] Backup external services configured
- [ ] Rate limiting implemented
- [ ] CORS properly configured

## Cost Estimation

Cloudflare Workers Pricing:
- **Free**: 100,000 requests/day
- **Paid**: $5/month + $0.50 per million requests
- **KV Storage**: Free tier + $0.50/million reads
- **D1 Database**: Free tier + usage-based pricing

## Support

- Cloudflare Docs: [developers.cloudflare.com](https://developers.cloudflare.com)
- Wrangler CLI: [github.com/cloudflare/wrangler](https://github.com/cloudflare/wrangler)
- Community: [community.cloudflare.com](https://community.cloudflare.com)