const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');

// Import MCP tool handlers
const marketingTools = require('./tools/marketing');
const seoTools = require('./tools/seo');
const geospatialTools = require('./tools/geospatial');

class BiteBaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'bitebase-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ...marketingTools.getToolDefinitions(),
        ...seoTools.getToolDefinitions(),
        ...geospatialTools.getToolDefinitions(),
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route to appropriate tool handler
        if (marketingTools.hasHandler(name)) {
          return await marketingTools.handleTool(name, args);
        }
        if (seoTools.hasHandler(name)) {
          return await seoTools.handleTool(name, args);
        }
        if (geospatialTools.hasHandler(name)) {
          return await geospatialTools.handleTool(name, args);
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BiteBase MCP Server running on stdio');
  }
}

// Express middleware for HTTP-based MCP
function createMCPMiddleware() {
  const router = express.Router();

  // List tools endpoint
  router.get('/tools', async (req, res) => {
    const tools = [
      ...marketingTools.getToolDefinitions(),
      ...seoTools.getToolDefinitions(),
      ...geospatialTools.getToolDefinitions(),
    ];
    res.json({ tools });
  });

  // Call tool endpoint
  router.post('/tools/:toolName', async (req, res) => {
    const { toolName } = req.params;
    const args = req.body;

    try {
      let result;
      if (marketingTools.hasHandler(toolName)) {
        result = await marketingTools.handleTool(toolName, args);
      } else if (seoTools.hasHandler(toolName)) {
        result = await seoTools.handleTool(toolName, args);
      } else if (geospatialTools.hasHandler(toolName)) {
        result = await geospatialTools.handleTool(toolName, args);
      } else {
        return res.status(404).json({ error: `Unknown tool: ${toolName}` });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: error.message,
        isError: true 
      });
    }
  });

  return router;
}

// Start server if run directly
if (require.main === module) {
  const server = new BiteBaseMCPServer();
  server.start().catch(console.error);
}

module.exports = {
  BiteBaseMCPServer,
  createMCPMiddleware,
};