# Step-by-Step Guide: Creating Cloudflare Resources

## Prerequisites
- Cloudflare account with Workers plan
- Wrangler CLI installed and authenticated

## Step 1: Authenticate Wrangler

```bash
# Login to Cloudflare
wrangler login
```

This will open a browser window. Log in and authorize wrangler.

## Step 2: Create KV Namespace

KV is used for caching and session storage.

```bash
# Create production KV namespace
wrangler kv:namespace create "CACHE"
```

**Expected output:**
```
🌀 Creating namespace with title "bitebase-backend-prod-CACHE"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "CACHE", id = "abcd1234567890abcdef1234567890ab" }
```

**Save the ID!** You'll need it for wrangler.toml.

### Optional: Create preview namespace for development
```bash
wrangler kv:namespace create "CACHE" --preview
```

## Step 3: Create D1 Database

D1 is Cloudflare's serverless SQL database.

```bash
# Create D1 database
wrangler d1 create bitebase-db
```

**Expected output:**
```
✅ Successfully created DB 'bitebase-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via point-in-time restore.

[[d1_databases]]
binding = "DB"
database_name = "bitebase-db"
database_id = "1234abcd-5678-90ef-ghij-klmnopqrstuv"
```

**Save the database_id!**

### Initialize the database schema
```bash
# Create schema file
cat > schema.sql << 'EOF'
-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL,
    longitude REAL,
    cuisine_type TEXT,
    rating REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics data
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id TEXT,
    metric_type TEXT,
    value REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- User sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX idx_analytics_restaurant ON analytics(restaurant_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
EOF

# Execute schema
wrangler d1 execute bitebase-db --local --file=schema.sql
```

## Step 4: Create R2 Bucket

R2 is used for storing files (images, documents, etc.).

```bash
# Create R2 bucket
wrangler r2 bucket create bitebase-storage
```

**Expected output:**
```
Creating bucket bitebase-storage.
Created bucket bitebase-storage.
```

### Configure CORS for R2 (if needed for direct uploads)
```bash
# Create cors.json
cat > cors.json << 'EOF'
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply CORS rules
wrangler r2 bucket cors put bitebase-storage --rules cors.json
```

## Step 5: Update wrangler.toml

Now update your `wrangler.toml` with the actual IDs:

```toml
name = "bitebase-backend-prod"
main = "src/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[build]
command = ""

# KV Namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # Replace with actual ID from Step 2

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "bitebase-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"  # Replace with actual ID from Step 3

# R2 Storage
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "bitebase-storage"

# Environment variables
[vars]
NODE_ENV = "production"
GOOGLE_MAPS_API_KEY = "AIzaSyCfG9E3ggBc1ZBkhqTEDSBm0eYp152tMLk"

[env.production]
name = "bitebase-backend-prod"

[env.staging]
name = "bitebase-backend-staging"
```

## Step 6: Update Worker Code

Update your worker to use these bindings properly:

```javascript
// Example: Using KV for caching
async function getCachedData(key, env) {
  if (!env.CACHE) return null;
  
  const cached = await env.CACHE.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

async function setCachedData(key, data, env, ttl = 3600) {
  if (!env.CACHE) return;
  
  await env.CACHE.put(key, JSON.stringify(data), {
    expirationTtl: ttl
  });
}

// Example: Using D1 for database queries
async function getRestaurants(env) {
  if (!env.DB) {
    return { error: "Database not configured" };
  }
  
  const { results } = await env.DB.prepare(
    "SELECT * FROM restaurants LIMIT 10"
  ).all();
  
  return results;
}

// Example: Using R2 for file storage
async function uploadFile(request, env) {
  if (!env.STORAGE) {
    return new Response("Storage not configured", { status: 500 });
  }
  
  const file = await request.arrayBuffer();
  const key = `uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await env.STORAGE.put(key, file);
  
  return new Response(JSON.stringify({ key }), {
    headers: { "Content-Type": "application/json" }
  });
}
```

## Step 7: Set Secrets

```bash
# Set JWT secret for authentication
wrangler secret put JWT_SECRET
# Enter your secret when prompted

# Set database URL (if using external database)
wrangler secret put DATABASE_URL
# Enter: postgresql://user:pass@host:5432/dbname

# Set Redis URL (if using external Redis)
wrangler secret put REDIS_URL
# Enter: redis://user:pass@host:6379
```

## Step 8: Deploy

```bash
# Deploy to production
wrangler deploy --env production

# Or just deploy (uses default environment)
wrangler deploy
```

## Step 9: Verify Resources

### Test KV
```bash
# Write to KV
wrangler kv:key put --binding=CACHE "test-key" "test-value"

# Read from KV
wrangler kv:key get --binding=CACHE "test-key"
```

### Test D1
```bash
# Query database
wrangler d1 execute bitebase-db --command="SELECT * FROM restaurants LIMIT 1"
```

### Test R2
```bash
# List bucket contents
wrangler r2 object list bitebase-storage
```

## Troubleshooting

### Issue: "KV namespace not found"
- Ensure you copied the correct namespace ID
- Check that the binding name matches exactly

### Issue: "D1 database not found"
- Verify the database_id is correct
- Ensure the database name matches

### Issue: "R2 bucket not found"
- Check that the bucket name is correct
- Ensure you have R2 enabled on your account

## Dashboard URLs

After setup, you can manage resources at:

- **KV**: https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces
- **D1**: https://dash.cloudflare.com/?to=/:account/workers/d1
- **R2**: https://dash.cloudflare.com/?to=/:account/r2/buckets

## Cost Considerations

- **KV**: Free tier includes 100k reads/day, 1k writes/day
- **D1**: Free tier includes 5GB storage, 5M reads/day
- **R2**: Free tier includes 10GB storage, 10M requests/month

## Next Steps

1. Test your worker locally: `wrangler dev`
2. Monitor usage in Cloudflare dashboard
3. Set up custom domains
4. Configure rate limiting if needed