import { Restack } from "@restackio/ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import agents
import { MarketIntelligenceAgent } from "./agents/MarketIntelligenceAgent";
import { RestaurantAnalyticsAgent } from "./agents/RestaurantAnalyticsAgent";
import { ChatIntelligenceAgent } from "./agents/ChatIntelligenceAgent";

// Import workflows
import { marketAnalysisWorkflow } from "./workflows/marketAnalysisWorkflow";
import { restaurantAnalyticsWorkflow } from "./workflows/restaurantAnalyticsWorkflow";
import { chatIntelligenceWorkflow } from "./workflows/chatIntelligenceWorkflow";

async function main() {
  console.log("🚀 Starting BiteBase Restack AI Agents...");

  // Initialize Restack client
  const client = new Restack({
    host: process.env.RESTACK_API_URL || "http://localhost:5233",
    apiKey: process.env.RESTACK_API_KEY,
  });

  // Initialize agents
  const marketAgent = new MarketIntelligenceAgent();
  const analyticsAgent = new RestaurantAnalyticsAgent();
  const chatAgent = new ChatIntelligenceAgent();

  console.log("📊 Initializing Market Intelligence Agent...");
  await marketAgent.initialize();

  console.log("📈 Initializing Restaurant Analytics Agent...");
  await analyticsAgent.initialize();

  console.log("💬 Initializing Chat Intelligence Agent...");
  await chatAgent.initialize();

  // Register workflows
  console.log("🔄 Registering workflows...");
  
  try {
    await client.registerWorkflow({
      name: "marketAnalysis",
      workflow: marketAnalysisWorkflow,
    });

    await client.registerWorkflow({
      name: "restaurantAnalytics", 
      workflow: restaurantAnalyticsWorkflow,
    });

    await client.registerWorkflow({
      name: "chatIntelligence",
      workflow: chatIntelligenceWorkflow,
    });

    console.log("✅ All workflows registered successfully");
    
    // Start the client
    await client.start();
    
    console.log("🎯 BiteBase AI Agents are now running!");
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Restack URL: ${process.env.RESTACK_API_URL || 'http://localhost:5233'}`);

  } catch (error) {
    console.error("❌ Failed to start Restack agents:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('📴 Shutting down BiteBase AI Agents...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📴 Shutting down BiteBase AI Agents...');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Failed to start BiteBase AI Agents:", error);
    process.exit(1);
  });
}

export { main };