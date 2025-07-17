import { Anthropic } from "@anthropic-ai/sdk";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  ChatContext,
  ChatMessage,
  ChatResponse,
  Restaurant,
  AgentConfig,
} from "../types";

export class ChatIntelligenceAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;
  private backendApiUrl: string;
  private conversationStates: Map<string, ChatContext>;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.config = {
      name: "ChatIntelligenceAgent",
      version: "1.0.0",
      maxRetries: 3,
      timeout: 60000,
      enableLogging: true,
      fallbackEnabled: true,
    };

    this.backendApiUrl = process.env.BACKEND_API_URL || "http://localhost:56222";
    this.conversationStates = new Map();
  }

  async initialize(): Promise<void> {
    console.log(`💬 Initializing ${this.config.name} v${this.config.version}`);
    
    try {
      await this.testConnections();
      console.log(`✅ ${this.config.name} initialized successfully`);
    } catch (error) {
      console.error(`❌ ${this.config.name} initialization failed:`, error);
      throw error;
    }
  }

  private async testConnections(): Promise<void> {
    // Test Anthropic connection
    try {
      await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      console.log("✅ Anthropic API connection successful");
    } catch (error) {
      console.error("❌ Anthropic API connection failed:", error);
      throw new Error("Failed to connect to Anthropic API");
    }

    // Test backend connection (optional)
    try {
      const response = await axios.get(`${this.backendApiUrl}/health`, { timeout: 5000 });
      console.log("✅ Backend API connection successful");
    } catch (error) {
      console.warn("⚠️ Backend API connection failed, continuing with limited functionality");
    }
  }

  /**
   * Process a chat message and generate an intelligent response
   */
  async processMessage(
    message: string,
    context: Partial<ChatContext> = {}
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`💬 Processing chat message: "${message.substring(0, 50)}..."`);

      // Step 1: Initialize or retrieve conversation context
      const conversationContext = await this.getOrCreateContext(context);

      // Step 2: Add user message to conversation history
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      conversationContext.previousMessages.push(userMessage);

      // Step 3: Analyze message intent and extract entities
      const intent = await this.analyzeMessageIntent(message, conversationContext);

      // Step 4: Gather relevant data based on intent
      const contextualData = await this.gatherContextualData(intent, conversationContext);

      // Step 5: Generate AI response
      const aiResponse = await this.generateAIResponse(
        message,
        conversationContext,
        intent,
        contextualData
      );

      // Step 6: Add assistant message to conversation history
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
        metadata: {
          intent,
          persona: aiResponse.persona,
          confidence: aiResponse.confidence,
        },
      };
      conversationContext.previousMessages.push(assistantMessage);

      // Step 7: Update conversation state
      this.conversationStates.set(conversationContext.conversationId, conversationContext);

      // Step 8: Generate follow-up suggestions
      const suggestions = await this.generateSuggestions(intent, conversationContext, contextualData);

      const response: ChatResponse = {
        response: aiResponse.response,
        suggestions,
        context: conversationContext,
        persona: aiResponse.persona,
        confidence: aiResponse.confidence,
        dataSource: aiResponse.dataSource,
        followUpQuestions: aiResponse.followUpQuestions,
        visualizations: contextualData.visualizations,
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Chat message processed in ${duration}ms`);

      return response;
    } catch (error) {
      console.error("❌ Chat message processing failed:", error);
      return this.generateFallbackResponse(message, context);
    }
  }

  private async getOrCreateContext(context: Partial<ChatContext>): Promise<ChatContext> {
    const conversationId = context.conversationId || uuidv4();
    
    if (this.conversationStates.has(conversationId)) {
      const existingContext = this.conversationStates.get(conversationId)!;
      // Update with new context data if provided
      return {
        ...existingContext,
        ...context,
        conversationId,
      };
    }

    // Create new conversation context
    const newContext: ChatContext = {
      conversationId,
      restaurantId: context.restaurantId,
      userId: context.userId,
      language: context.language || "en",
      previousMessages: context.previousMessages || [],
      userData: context.userData,
      restaurantData: context.restaurantData,
    };

    // Fetch restaurant data if restaurant ID is provided
    if (newContext.restaurantId && !newContext.restaurantData) {
      newContext.restaurantData = await this.fetchRestaurantData(newContext.restaurantId);
    }

    return newContext;
  }

  private async fetchRestaurantData(restaurantId: string): Promise<Restaurant | undefined> {
    try {
      const response = await axios.get(`${this.backendApiUrl}/api/restaurants/${restaurantId}`, {
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch restaurant data for ID: ${restaurantId}`);
      return undefined;
    }
  }

  private async analyzeMessageIntent(message: string, context: ChatContext): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Rule-based intent detection (in production, this could use ML)
    if (lowerMessage.includes("market") || lowerMessage.includes("competitor") || lowerMessage.includes("analysis")) {
      return "market_analysis";
    }
    
    if (lowerMessage.includes("revenue") || lowerMessage.includes("sales") || lowerMessage.includes("analytics") || lowerMessage.includes("performance")) {
      return "restaurant_analytics";
    }
    
    if (lowerMessage.includes("menu") || lowerMessage.includes("dish") || lowerMessage.includes("food") || lowerMessage.includes("recipe")) {
      return "menu_optimization";
    }
    
    if (lowerMessage.includes("customer") || lowerMessage.includes("review") || lowerMessage.includes("feedback")) {
      return "customer_insights";
    }
    
    if (lowerMessage.includes("location") || lowerMessage.includes("area") || lowerMessage.includes("neighborhood")) {
      return "location_intelligence";
    }
    
    if (lowerMessage.includes("help") || lowerMessage.includes("what can") || lowerMessage.includes("how do")) {
      return "help_assistance";
    }

    // Check conversation history for context
    const recentMessages = context.previousMessages.slice(-3);
    if (recentMessages.some(msg => msg.content.toLowerCase().includes("market"))) {
      return "market_analysis_followup";
    }

    return "general_inquiry";
  }

  private async gatherContextualData(intent: string, context: ChatContext): Promise<any> {
    const data: any = {
      intent,
      timestamp: new Date().toISOString(),
      visualizations: [],
    };

    try {
      switch (intent) {
        case "market_analysis":
        case "market_analysis_followup":
          if (context.restaurantData?.location) {
            data.marketData = await this.fetchMarketData(context.restaurantData.location);
          }
          break;

        case "restaurant_analytics":
          if (context.restaurantId) {
            data.analyticsData = await this.fetchAnalyticsData(context.restaurantId);
          }
          break;

        case "location_intelligence":
          if (context.restaurantData?.location) {
            data.locationData = await this.fetchLocationData(context.restaurantData.location);
          }
          break;

        default:
          // For general inquiries, provide basic restaurant info
          data.restaurantInfo = context.restaurantData;
          break;
      }
    } catch (error) {
      console.warn("⚠️ Failed to gather some contextual data:", error);
    }

    return data;
  }

  private async fetchMarketData(location: any): Promise<any> {
    try {
      // This would typically call the market analysis workflow
      return {
        competitorCount: 8,
        marketSaturation: 65,
        opportunityScore: 72,
        averageRating: 4.1,
      };
    } catch (error) {
      return null;
    }
  }

  private async fetchAnalyticsData(restaurantId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.backendApiUrl}/api/restaurants/${restaurantId}/analytics`,
        { timeout: 10000 }
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async fetchLocationData(location: any): Promise<any> {
    try {
      return {
        footTraffic: 8500,
        demographics: "Mixed age groups, middle to high income",
        nearbyAttractions: ["Shopping center", "Business district"],
      };
    } catch (error) {
      return null;
    }
  }

  private async generateAIResponse(
    message: string,
    context: ChatContext,
    intent: string,
    contextualData: any
  ): Promise<any> {
    try {
      const persona = this.selectPersona(intent, context);
      const systemPrompt = this.buildSystemPrompt(persona, context, contextualData);
      const conversationHistory = this.buildConversationHistory(context, message);

      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1500,
        system: systemPrompt,
        messages: conversationHistory,
      });

      const content = response.content[0];
      if (content.type === "text") {
        return {
          response: content.text,
          persona,
          confidence: this.calculateConfidence(intent, contextualData),
          dataSource: "ai_anthropic",
          followUpQuestions: this.generateFollowUpQuestions(intent, contextualData),
        };
      }

      throw new Error("Failed to get text response from AI");
    } catch (error) {
      console.warn("⚠️ AI response generation failed, using fallback");
      return this.generateBasicResponse(message, intent, context);
    }
  }

  private selectPersona(intent: string, context: ChatContext): string {
    switch (intent) {
      case "market_analysis":
        return "Market Analyst";
      case "restaurant_analytics":
        return "Business Advisor";
      case "menu_optimization":
        return "Culinary Consultant";
      case "customer_insights":
        return "Customer Experience Expert";
      case "location_intelligence":
        return "Location Strategist";
      default:
        return "Restaurant Assistant";
    }
  }

  private buildSystemPrompt(persona: string, context: ChatContext, contextualData: any): string {
    const restaurantName = context.restaurantData?.name || "your restaurant";
    const cuisineType = context.restaurantData?.cuisine_types?.join(", ") || "restaurant";

    let prompt = `You are ${persona}, an AI expert helping ${restaurantName} (${cuisineType}) succeed. 

Key context:
- Restaurant: ${restaurantName}
- Cuisine: ${cuisineType}
- Conversation ID: ${context.conversationId}
- Language: ${context.language || "English"}

`;

    if (contextualData.marketData) {
      prompt += `Market Context:
- Competitors: ${contextualData.marketData.competitorCount}
- Market Saturation: ${contextualData.marketData.marketSaturation}%
- Opportunity Score: ${contextualData.marketData.opportunityScore}/100

`;
    }

    if (contextualData.analyticsData) {
      prompt += `Performance Data Available: Yes
`;
    }

    prompt += `Guidelines:
- Be conversational and helpful
- Provide specific, actionable advice
- Use data when available
- Ask clarifying questions when needed
- Keep responses under 200 words unless detailed analysis is requested
- End with a relevant follow-up question when appropriate

Respond as ${persona} would, focusing on practical restaurant business insights.`;

    return prompt;
  }

  private buildConversationHistory(context: ChatContext, currentMessage: string): any[] {
    const messages = [];

    // Add last 5 messages for context (to stay within token limits)
    const recentMessages = context.previousMessages.slice(-5);
    
    recentMessages.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current message
    messages.push({
      role: "user",
      content: currentMessage,
    });

    return messages;
  }

  private calculateConfidence(intent: string, contextualData: any): number {
    let confidence = 70; // Base confidence

    // Higher confidence when we have relevant data
    if (intent === "market_analysis" && contextualData.marketData) confidence += 20;
    if (intent === "restaurant_analytics" && contextualData.analyticsData) confidence += 20;
    if (intent === "location_intelligence" && contextualData.locationData) confidence += 15;

    // Higher confidence for help/general inquiries
    if (intent === "help_assistance" || intent === "general_inquiry") confidence += 10;

    return Math.min(95, confidence);
  }

  private generateFollowUpQuestions(intent: string, contextualData: any): string[] {
    const questions = [];

    switch (intent) {
      case "market_analysis":
        questions.push("Would you like me to analyze your competitive positioning?");
        questions.push("Should we explore specific market opportunities?");
        break;
      case "restaurant_analytics":
        questions.push("Would you like to see revenue predictions?");
        questions.push("Should we dive into customer behavior patterns?");
        break;
      case "menu_optimization":
        questions.push("Would you like suggestions for new menu items?");
        questions.push("Should we analyze your current menu pricing?");
        break;
      default:
        questions.push("What specific aspect would you like to explore further?");
        break;
    }

    return questions.slice(0, 2); // Limit to 2 questions
  }

  private async generateSuggestions(
    intent: string,
    context: ChatContext,
    contextualData: any
  ): Promise<string[]> {
    const suggestions = [];

    switch (intent) {
      case "market_analysis":
        suggestions.push("Analyze local competition");
        suggestions.push("Show market opportunities");
        suggestions.push("Compare pricing strategies");
        break;
      case "restaurant_analytics":
        suggestions.push("Show revenue trends");
        suggestions.push("Analyze customer patterns");
        suggestions.push("Generate performance report");
        break;
      case "menu_optimization":
        suggestions.push("Optimize menu pricing");
        suggestions.push("Suggest popular dishes");
        suggestions.push("Analyze item profitability");
        break;
      default:
        suggestions.push("Tell me about market analysis");
        suggestions.push("Show my restaurant analytics");
        suggestions.push("Help with menu optimization");
        break;
    }

    return suggestions.slice(0, 3);
  }

  private generateBasicResponse(message: string, intent: string, context: ChatContext): any {
    const restaurantName = context.restaurantData?.name || "your restaurant";
    
    let response = "";
    switch (intent) {
      case "market_analysis":
        response = `I'd be happy to help analyze the market for ${restaurantName}. Based on your location, I can provide insights about competitors, market opportunities, and positioning strategies.`;
        break;
      case "restaurant_analytics":
        response = `I can help you understand ${restaurantName}'s performance through detailed analytics. This includes revenue trends, customer behavior, and operational insights.`;
        break;
      default:
        response = `I'm here to help ${restaurantName} succeed! I can assist with market analysis, performance analytics, menu optimization, and strategic insights. What would you like to explore?`;
        break;
    }

    return {
      response,
      persona: "Restaurant Assistant",
      confidence: 60,
      dataSource: "fallback",
      followUpQuestions: ["What specific area would you like help with?"],
    };
  }

  private generateFallbackResponse(message: string, context: Partial<ChatContext>): ChatResponse {
    return {
      response: "I apologize, but I'm experiencing some technical difficulties. However, I'm still here to help with your restaurant business questions. Could you please try asking again?",
      suggestions: [
        "Tell me about market analysis",
        "Show restaurant analytics", 
        "Help with menu optimization"
      ],
      context: context as ChatContext,
      persona: "Restaurant Assistant",
      confidence: 30,
      dataSource: "fallback",
      followUpQuestions: ["What would you like help with today?"],
    };
  }

  /**
   * Clear conversation state (useful for testing or memory management)
   */
  public clearConversation(conversationId: string): void {
    this.conversationStates.delete(conversationId);
    console.log(`🧹 Cleared conversation state for: ${conversationId}`);
  }

  /**
   * Get conversation statistics
   */
  public getConversationStats(): any {
    return {
      activeConversations: this.conversationStates.size,
      memoryUsage: process.memoryUsage(),
      agentVersion: this.config.version,
    };
  }
}

export default ChatIntelligenceAgent;