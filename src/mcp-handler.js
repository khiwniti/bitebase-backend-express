import { Hono } from 'hono';
import { marketingTools, marketingHandlers } from '../mcp/tools/marketing';
import { seoTools, seoHandlers } from '../mcp/tools/seo';
import { geospatialTools, geospatialHandlers } from '../mcp/tools/geospatial';

export function createMCPHandler() {
  const mcp = new Hono();

  // Combine all tools
  const allTools = [...marketingTools, ...seoTools, ...geospatialTools];
  const allHandlers = { ...marketingHandlers, ...seoHandlers, ...geospatialHandlers };

  // List available tools
  mcp.get('/tools', (c) => {
    return c.json({
      tools: allTools,
      total: allTools.length,
      categories: {
        marketing: marketingTools.length,
        seo: seoTools.length,
        geospatial: geospatialTools.length
      }
    });
  });

  // Execute tool
  mcp.post('/tools/:toolName', async (c) => {
    const { toolName } = c.req.param();
    const body = await c.req.json();

    // Find tool definition
    const tool = allTools.find(t => t.name === toolName);
    if (!tool) {
      return c.json({ error: `Tool '${toolName}' not found` }, 404);
    }

    // Get handler
    const handler = allHandlers[toolName];
    if (!handler) {
      return c.json({ error: `Handler for tool '${toolName}' not implemented` }, 501);
    }

    try {
      // Execute handler with Cloudflare context
      const result = await handler(body, c.env, c.executionCtx);
      return c.json(result);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return c.json({ 
        error: 'Tool execution failed', 
        message: error.message 
      }, 500);
    }
  });

  // Health check
  mcp.get('/health', (c) => {
    return c.json({ 
      status: 'healthy',
      tools: allTools.length,
      timestamp: new Date().toISOString()
    });
  });

  return mcp;
}