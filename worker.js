/**
 * Cloudflare Worker entry point for BiteBase Backend
 * Simplified version without Express.js dependencies
 */

// Worker fetch event handler
export default {
  async fetch(request, env, ctx) {
    try {
      // Create a mock Express request/response
      const url = new URL(request.url);
      
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'bitebase-cloudflare-backend',
          version: '2.0.0',
          environment: env.NODE_ENV || 'production',
          services: {
            api: true,
            database: !!env.DATABASE_URL,
            redis: !!env.REDIS_URL,
            ai: !!env.BEDROCK_API_KEY,
            mapbox: !!env.MAPBOX_API_KEY,
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
          },
        });
      }

      // AI status endpoint
      if (url.pathname === '/ai') {
        return new Response(JSON.stringify({
          status: env.BEDROCK_API_KEY ? 'operational' : 'unavailable',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          features: ['conversational_analytics', 'predictive_insights', 'competitive_intelligence'],
          models: env.BEDROCK_API_KEY ? {
            chat: env.BEDROCK_CHAT_MODEL,
            reasoning: env.BEDROCK_REASONING_MODEL,
            fast: env.BEDROCK_FAST_MODEL,
            gateway_url: env.BEDROCK_API_BASE_URL
          } : null,
          fallback_available: true
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
          },
        });
      }

      // Basic AI chat endpoint (simplified for Workers)
      if (url.pathname === '/ai/chat' && request.method === 'POST') {
        try {
          const body = await request.json();
          const { message } = body;

          if (!message) {
            return new Response(JSON.stringify({
              success: false,
              message: 'Message is required',
              timestamp: new Date().toISOString(),
              status: 400
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
              },
            });
          }

          // Simple mock response for now (can be enhanced with actual AI integration)
          const mockResponse = {
            success: true,
            message: 'AI response generated successfully',
            data: {
              response: `Thank you for your message: "${message}". This is a simplified response from the Cloudflare Workers deployment. Full AI integration will be available soon.`,
              intent: 'general_inquiry',
              language: 'auto',
              suggestions: ['Tell me about restaurant analytics', 'Show me performance metrics'],
              model: 'mock-model',
              data_source: 'cloudflare-workers',
              conversation_id: crypto.randomUUID()
            },
            timestamp: new Date().toISOString(),
            status: 200
          };

          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
            },
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to process AI request',
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 500
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
            },
          });
        }
      }

      // Default response for other endpoints
      return new Response(JSON.stringify({
        message: 'BiteBase API - Cloudflare Workers',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        available_endpoints: [
          '/health',
          '/ai',
          '/ai/chat'
        ]
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 500
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
        },
      });
    }
  },
};