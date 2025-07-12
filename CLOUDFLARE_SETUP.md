# Cloudflare Workers Setup Guide

## Prerequisites
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

## Manual Setup Steps

### 1. Create Required Resources

Before deploying, you need to create the following resources in your Cloudflare account:

#### Option A: Using Cloudflare Dashboard

1. **KV Namespace (for caching)**
   - Go to Workers & Pages > KV
   - Click "Create namespace"
   - Name: `bitebase-cache`
   - Copy the namespace ID

2. **D1 Database (for data storage)**
   - Go to Workers & Pages > D1
   - Click "Create database"
   - Name: `bitebase-db`
   - Copy the database ID

3. **R2 Bucket (for file storage)**
   - Go to R2 > Create bucket
   - Name: `bitebase-storage`
   - Region: Choose your preferred region

#### Option B: Using Wrangler CLI

```bash
# Create KV namespace
wrangler kv:namespace create "CACHE"
# Output: { binding = "CACHE", id = "xxxx" }

# Create D1 database
wrangler d1 create bitebase-db
# Output: database_id = "yyyy"

# Create R2 bucket
wrangler r2 bucket create bitebase-storage
```

### 2. Update wrangler.toml

After creating the resources, update the `wrangler.toml` file with the actual IDs:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-actual-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "bitebase-db"
database_id = "your-actual-d1-database-id"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "bitebase-storage"
```

### 3. Set Secrets

Set the required secrets using wrangler:

```bash
# Database URL (if using external database)
wrangler secret put DATABASE_URL

# Redis URL (if using external Redis)
wrangler secret put REDIS_URL

# JWT Secret for authentication
wrangler secret put JWT_SECRET

# AWS credentials (if needed)
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
```

### 4. Deploy

Deploy to Cloudflare Workers:

```bash
# Deploy to production
wrangler deploy --env production

# Or deploy to staging
wrangler deploy --env staging
```

## Alternative: Deploy Without Bindings

If you want to deploy quickly without setting up KV, D1, or R2:

1. Use the current `wrangler.toml` (already configured without bindings)
2. Deploy directly:
   ```bash
   wrangler deploy
   ```

The worker will function with in-memory storage and mock data.

## Custom Domain Setup

1. Go to Workers & Pages > your-worker > Settings > Domains & Routes
2. Add custom domain or route:
   - Production: `api.bitebase.com/*`
   - Staging: `api-staging.bitebase.com/*`

## Environment Variables

The following environment variables are already configured in `wrangler.toml`:
- `NODE_ENV`: "production"
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key

## Testing

After deployment, test your worker:

```bash
# Health check
curl https://your-worker.workers.dev/health

# Or with custom domain
curl https://api.bitebase.com/health
```

## Monitoring

- View logs: Workers & Pages > your-worker > Logs
- View metrics: Workers & Pages > your-worker > Analytics
- Set up alerts: Workers & Pages > your-worker > Settings > Alerts

## Troubleshooting

1. **Deployment fails with "KV namespace not valid"**
   - Ensure you've created the KV namespace and updated the ID in wrangler.toml
   - Or comment out the KV namespace section for initial deployment

2. **"nodejs_compat" errors**
   - Ensure you're using wrangler version 3.0 or higher
   - The worker is designed to work with Cloudflare's Node.js compatibility

3. **Route conflicts**
   - Check that no other workers are using the same routes
   - Remove route configuration if deploying to workers.dev subdomain