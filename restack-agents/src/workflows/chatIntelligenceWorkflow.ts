import { ChatIntelligenceAgent } from "../agents/ChatIntelligenceAgent";
import { ChatContext, ChatResponse, WorkflowState } from "../types";

/**
 * Chat Intelligence Workflow
 * Orchestrates intelligent conversation handling with state persistence
 */
export async function chatIntelligenceWorkflow(
  message: string,
  context: Partial<ChatContext> = {}
): Promise<ChatResponse> {
  console.log(`🔄 Starting chat intelligence workflow for message: "${message.substring(0, 50)}..."`);
  
  const startTime = Date.now();
  const workflowId = `chat_intelligence_${Date.now()}`;

  // Initialize workflow state
  const state: WorkflowState = {
    id: workflowId,
    status: "running",
    progress: 0,
    startedAt: new Date().toISOString(),
    metadata: {
      conversationId: context.conversationId,
      restaurantId: context.restaurantId,
      messageLength: message.length,
      language: context.language || "en"
    }
  };

  try {
    // Step 1: Initialize Chat Intelligence Agent
    console.log("💬 Initializing Chat Intelligence Agent...");
    const agent = new ChatIntelligenceAgent();
    await agent.initialize();
    
    state.progress = 20;
    console.log(`🗣️ Workflow progress: ${state.progress}%`);

    // Step 2: Validate and sanitize input
    console.log("✅ Validating and sanitizing input...");
    const sanitizedMessage = sanitizeMessage(message);
    const validatedContext = validateContext(context);
    
    if (!sanitizedMessage.trim()) {
      throw new Error("Empty or invalid message provided");
    }

    state.progress = 30;
    console.log(`🗣️ Workflow progress: ${state.progress}%`);

    // Step 3: Pre-process conversation context
    console.log("🔧 Pre-processing conversation context...");
    const enrichedContext = await enrichConversationContext(validatedContext);
    
    state.progress = 40;
    console.log(`🗣️ Workflow progress: ${state.progress}%`);

    // Step 4: Process message through Chat Intelligence Agent
    console.log("🤖 Processing message through AI agent...");
    const chatResponse = await agent.processMessage(sanitizedMessage, enrichedContext);
    
    state.progress = 80;
    console.log(`🗣️ Workflow progress: ${state.progress}%`);

    // Step 5: Post-process and enhance response
    console.log("✨ Post-processing and enhancing response...");
    const enhancedResponse = await enhanceResponse(chatResponse, sanitizedMessage, enrichedContext);
    
    state.progress = 95;
    console.log(`🗣️ Workflow progress: ${state.progress}%`);

    // Step 6: Log conversation metrics
    console.log("📊 Logging conversation metrics...");
    await logConversationMetrics(enhancedResponse, state, workflowId);
    
    state.progress = 100;
    state.status = "completed";
    state.completedAt = new Date().toISOString();

    const duration = Date.now() - startTime;
    console.log(`✅ Chat intelligence workflow completed in ${duration}ms`);
    console.log(`🎭 Persona: ${enhancedResponse.persona}`);
    console.log(`🎯 Confidence: ${enhancedResponse.confidence}%`);
    console.log(`📝 Response length: ${enhancedResponse.response.length} characters`);
    
    return enhancedResponse;

  } catch (error) {
    const duration = Date.now() - startTime;
    state.status = "failed";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.completedAt = new Date().toISOString();
    
    console.error(`❌ Chat intelligence workflow failed after ${duration}ms:`, error);
    
    // Return a fallback response instead of throwing
    return generateWorkflowFallbackResponse(message, context, error);
  }
}

/**
 * Sanitize user input to prevent issues
 */
function sanitizeMessage(message: string): string {
  if (typeof message !== 'string') {
    return '';
  }

  // Basic sanitization
  return message
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .substring(0, 2000); // Limit message length
}

/**
 * Validate conversation context
 */
function validateContext(context: Partial<ChatContext>): Partial<ChatContext> {
  const validated: Partial<ChatContext> = {
    conversationId: context.conversationId || undefined,
    restaurantId: context.restaurantId || undefined,
    userId: context.userId || undefined,
    language: context.language || "en",
    previousMessages: Array.isArray(context.previousMessages) ? context.previousMessages : [],
    userData: context.userData || {},
    restaurantData: context.restaurantData || undefined
  };

  // Validate language code
  const supportedLanguages = ["en", "th", "es", "fr", "de", "it", "ja", "ko", "zh"];
  if (!supportedLanguages.includes(validated.language!)) {
    validated.language = "en";
  }

  // Limit previous messages to last 20 for performance
  if (validated.previousMessages!.length > 20) {
    validated.previousMessages = validated.previousMessages!.slice(-20);
  }

  return validated;
}

/**
 * Enrich conversation context with additional data
 */
async function enrichConversationContext(context: Partial<ChatContext>): Promise<Partial<ChatContext>> {
  const enriched = { ...context };

  // Add session metadata
  enriched.sessionMetadata = {
    startTime: new Date().toISOString(),
    userAgent: "BiteBase-AI-Agent",
    platform: "Restack-Workflow"
  };

  // Add conversation analytics
  if (enriched.previousMessages && enriched.previousMessages.length > 0) {
    enriched.conversationAnalytics = analyzeConversationHistory(enriched.previousMessages);
  }

  return enriched;
}

/**
 * Analyze conversation history for context
 */
function analyzeConversationHistory(messages: any[]): any {
  const totalMessages = messages.length;
  const userMessages = messages.filter(m => m.role === "user").length;
  const assistantMessages = messages.filter(m => m.role === "assistant").length;
  
  // Analyze topic trends
  const topics = extractTopics(messages);
  const averageMessageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / totalMessages;

  // Determine conversation stage
  let conversationStage = "introduction";
  if (totalMessages > 10) conversationStage = "deep_discussion";
  else if (totalMessages > 4) conversationStage = "exploration";
  else if (totalMessages > 1) conversationStage = "engagement";

  return {
    totalMessages,
    userMessages,
    assistantMessages,
    topics,
    averageMessageLength: Math.round(averageMessageLength),
    conversationStage,
    sentiment: analyzeSentiment(messages),
    lastInteraction: messages[messages.length - 1]?.timestamp
  };
}

/**
 * Extract topics from conversation
 */
function extractTopics(messages: any[]): string[] {
  const topicKeywords = {
    "market_analysis": ["market", "competitor", "analysis", "opportunity", "saturation"],
    "restaurant_analytics": ["revenue", "sales", "performance", "analytics", "metrics"],
    "menu_optimization": ["menu", "dish", "food", "recipe", "pricing"],
    "customer_insights": ["customer", "review", "feedback", "satisfaction"],
    "location_intelligence": ["location", "area", "neighborhood", "foot traffic"],
    "operations": ["staff", "operations", "efficiency", "cost", "management"]
  };

  const topics = new Set<string>();
  const allText = messages.map(m => m.content.toLowerCase()).join(" ");

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      topics.add(topic);
    }
  });

  return Array.from(topics);
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(messages: any[]): string {
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length === 0) return "neutral";

  const positiveWords = ["good", "great", "excellent", "amazing", "helpful", "thank", "appreciate"];
  const negativeWords = ["bad", "terrible", "awful", "disappointing", "frustrated", "angry"];

  let positiveCount = 0;
  let negativeCount = 0;

  userMessages.forEach(message => {
    const text = message.content.toLowerCase();
    positiveCount += positiveWords.filter(word => text.includes(word)).length;
    negativeCount += negativeWords.filter(word => text.includes(word)).length;
  });

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

/**
 * Enhance the chat response with additional features
 */
async function enhanceResponse(
  response: ChatResponse,
  originalMessage: string,
  context: Partial<ChatContext>
): Promise<ChatResponse> {
  
  // Add response metadata
  const enhancedResponse = {
    ...response,
    metadata: {
      originalMessage: originalMessage.substring(0, 100) + (originalMessage.length > 100 ? "..." : ""),
      processingTime: new Date().toISOString(),
      workflowVersion: "1.0.0",
      enhancementApplied: true
    }
  };

  // Enhance suggestions based on conversation history
  if (context.conversationAnalytics) {
    enhancedResponse.suggestions = enhanceSuggestions(
      response.suggestions,
      context.conversationAnalytics
    );
  }

  // Add contextual follow-up questions
  if (response.followUpQuestions) {
    enhancedResponse.followUpQuestions = enhanceFollowUpQuestions(
      response.followUpQuestions,
      context
    );
  }

  // Add conversation insights
  enhancedResponse.conversationInsights = generateConversationInsights(context);

  return enhancedResponse;
}

/**
 * Enhance suggestions based on conversation analytics
 */
function enhanceSuggestions(suggestions: string[], analytics: any): string[] {
  const enhanced = [...suggestions];

  // Add topic-specific suggestions based on conversation history
  if (analytics.topics.includes("market_analysis")) {
    enhanced.push("Compare with industry benchmarks");
  }
  
  if (analytics.topics.includes("restaurant_analytics")) {
    enhanced.push("Generate detailed performance report");
  }

  // Add suggestions based on conversation stage
  if (analytics.conversationStage === "introduction") {
    enhanced.push("Tell me about your restaurant");
  } else if (analytics.conversationStage === "deep_discussion") {
    enhanced.push("Summarize our discussion");
  }

  // Remove duplicates and limit to 4 suggestions
  return [...new Set(enhanced)].slice(0, 4);
}

/**
 * Enhance follow-up questions
 */
function enhanceFollowUpQuestions(questions: string[], context: Partial<ChatContext>): string[] {
  const enhanced = [...questions];

  // Add contextual questions based on restaurant data
  if (context.restaurantData) {
    const restaurant = context.restaurantData;
    if (restaurant.cuisine_types) {
      enhanced.push(`How can we leverage your ${restaurant.cuisine_types[0]} cuisine specialty?`);
    }
    if (restaurant.location) {
      enhanced.push("Should we analyze your location's market potential?");
    }
  }

  return enhanced.slice(0, 3); // Limit to 3 questions
}

/**
 * Generate conversation insights
 */
function generateConversationInsights(context: Partial<ChatContext>): any {
  if (!context.conversationAnalytics) {
    return {
      available: false,
      reason: "Insufficient conversation history"
    };
  }

  const analytics = context.conversationAnalytics;
  
  return {
    available: true,
    stage: analytics.conversationStage,
    topTopics: analytics.topics.slice(0, 3),
    sentiment: analytics.sentiment,
    engagement: analytics.totalMessages > 5 ? "high" : analytics.totalMessages > 2 ? "medium" : "low",
    recommendations: generateInsightRecommendations(analytics)
  };
}

/**
 * Generate recommendations based on conversation insights
 */
function generateInsightRecommendations(analytics: any): string[] {
  const recommendations = [];

  if (analytics.sentiment === "negative") {
    recommendations.push("Focus on addressing concerns and providing solutions");
  } else if (analytics.sentiment === "positive") {
    recommendations.push("Build on positive momentum with detailed recommendations");
  }

  if (analytics.conversationStage === "introduction") {
    recommendations.push("Gather more context about restaurant goals and challenges");
  } else if (analytics.conversationStage === "deep_discussion") {
    recommendations.push("Provide actionable next steps and implementation guidance");
  }

  if (analytics.topics.length > 3) {
    recommendations.push("Consider focusing on one main topic for better clarity");
  }

  return recommendations.slice(0, 2);
}

/**
 * Log conversation metrics for analytics
 */
async function logConversationMetrics(
  response: ChatResponse,
  state: WorkflowState,
  workflowId: string
): Promise<void> {
  const metrics = {
    workflowId,
    conversationId: response.context.conversationId,
    responseTime: new Date(state.completedAt!).getTime() - new Date(state.startedAt).getTime(),
    confidence: response.confidence,
    persona: response.persona,
    messageLength: response.response.length,
    suggestionsCount: response.suggestions.length,
    followUpQuestionsCount: response.followUpQuestions?.length || 0,
    timestamp: new Date().toISOString()
  };

  // In a real implementation, this would send metrics to a logging service
  console.log("📊 Conversation metrics:", JSON.stringify(metrics, null, 2));
}

/**
 * Generate fallback response when workflow fails
 */
function generateWorkflowFallbackResponse(
  message: string,
  context: Partial<ChatContext>,
  error: any
): ChatResponse {
  console.error("🚨 Generating workflow fallback response due to error:", error);

  return {
    response: "I apologize, but I'm experiencing some technical difficulties processing your request. However, I'm still here to help with your restaurant business questions. Could you please try asking again or rephrase your question?",
    suggestions: [
      "Ask about market analysis",
      "Show restaurant performance",
      "Get menu optimization tips",
      "Explore location insights"
    ],
    context: {
      conversationId: context.conversationId || `fallback_${Date.now()}`,
      restaurantId: context.restaurantId,
      userId: context.userId,
      language: context.language || "en",
      previousMessages: context.previousMessages || [],
      userData: context.userData,
      restaurantData: context.restaurantData,
    },
    persona: "Restaurant Assistant",
    confidence: 25,
    dataSource: "workflow_fallback",
    followUpQuestions: ["What would you like help with today?"],
    metadata: {
      errorType: "workflow_failure",
      originalMessage: message.substring(0, 50),
      fallbackReason: error instanceof Error ? error.message : "Unknown error"
    }
  };
}

export default chatIntelligenceWorkflow;