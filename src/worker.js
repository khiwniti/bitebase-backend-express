import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';

// Import route handlers
import { createMCPHandler } from './mcp-handler';
import { createAnalyticsHandler } from './analytics-handler';
import { createLocationHandler } from './location-handler';

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://bitebase.com', 'https://www.bitebase.com', 'http://localhost:3000'],
  credentials: true,
}));
app.use('*', compress());
app.use('*', secureHeaders());

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: c.env.NODE_ENV 
  });
});

// API Routes
app.route('/api/mcp', createMCPHandler());
app.route('/api/analytics', createAnalyticsHandler());
app.route('/api/location', createLocationHandler());

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'BiteBase API',
    version: '2.0.0',
    endpoints: [
      '/api/mcp/tools',
      '/api/analytics/realtime',
      '/api/location/search',
      '/health'
    ]
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    // Add environment to app context
    app.use('*', async (c, next) => {
      c.env = env;
      c.executionCtx = ctx;
      await next();
    });

    return app.fetch(request, env, ctx);
  },
};