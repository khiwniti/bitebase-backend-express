# Manual Cloudflare Workers Deployment Guide

## Prerequisites

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

## Step 1: Create Clean Deployment Directory

```bash
# Create a new directory for Cloudflare deployment
mkdir -p cloudflare-deploy
cd cloudflare-deploy

# Copy only the necessary files
cp ../src/worker.js ./worker.js
cp ../wrangler.toml ./wrangler.toml
```

## Step 2: Create Minimal package.json

Create a `package.json` with only Cloudflare dependencies:

```json
{
  "name": "bitebase-backend-cf",
  "version": "2.0.0",
  "private": true,
  "main": "worker.js",
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev",
    "tail": "wrangler tail"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

## Step 3: Update wrangler.toml

Make sure your `wrangler.toml` is configured correctly:

```toml
name = "bitebase-backend-prod"
main = "worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# Account ID (get from Cloudflare dashboard)
account_id = "YOUR_ACCOUNT_ID"

# Routes (optional - can be configured in dashboard)
routes = [
  { pattern = "api.bitebase.com/*", zone_name = "bitebase.com" }
]

# Environment variables
[vars]
ENVIRONMENT = "production"
GOOGLE_MAPS_API_KEY = "AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk"

# KV Namespaces (optional)
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"

# D1 Database (optional)
[[d1_databases]]
binding = "DB"
database_name = "bitebase-db"
database_id = "YOUR_D1_DATABASE_ID"

# R2 Storage (optional)
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "bitebase-storage"
```

## Step 4: Deploy Commands

### Development Testing
```bash
# Test locally
wrangler dev

# View logs
wrangler tail
```

### Production Deployment
```bash
# Deploy to production
wrangler deploy

# Or deploy to specific environment
wrangler deploy --env production
```

## Step 5: Set Secrets (if needed)

```bash
# Set secret environment variables
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
wrangler secret put REDIS_URL
```

## Step 6: Verify Deployment

After deployment, you'll get a URL like:
- `https://bitebase-backend-prod.YOUR-SUBDOMAIN.workers.dev`

Test the endpoints:
```bash
# Health check
curl https://bitebase-backend-prod.YOUR-SUBDOMAIN.workers.dev/health

# Location API
curl https://bitebase-backend-prod.YOUR-SUBDOMAIN.workers.dev/api/location/nearby?lat=13.7563&lng=100.5018

# Analytics API
curl https://bitebase-backend-prod.YOUR-SUBDOMAIN.workers.dev/api/analytics/dashboard
```

## Troubleshooting

1. **Authentication Issues**
   - Run `wrangler whoami` to check login status
   - Run `wrangler login` if not authenticated

2. **Account ID**
   - Find in Cloudflare Dashboard → Right sidebar
   - Or run `wrangler whoami`

3. **Build Errors**
   - Make sure you're in the clean directory
   - Only worker.js and wrangler.toml should be present
   - No node_modules or other dependencies

4. **Route Issues**
   - Routes can be configured in Cloudflare Dashboard
   - Workers → Your Worker → Triggers → Add Route

## Alternative: Direct Dashboard Upload

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Create new Worker
4. Paste the content of worker.js
5. Save and Deploy
6. Configure routes and environment variables in settings