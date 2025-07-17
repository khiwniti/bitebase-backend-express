import { Anthropic } from "@anthropic-ai/sdk";
import axios from "axios";
import {
  MarketAnalysisInput,
  MarketAnalysisResult,
  Competitor,
  DemographicData,
  MarketInsights,
  AgentConfig,
} from "../types";

export class MarketIntelligenceAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;
  private backendApiUrl: string;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.config = {
      name: "MarketIntelligenceAgent",
      version: "1.0.0",
      maxRetries: 3,
      timeout: 60000,
      enableLogging: true,
      fallbackEnabled: true,
    };

    this.backendApiUrl = process.env.BACKEND_API_URL || "http://localhost:56222";
  }

  async initialize(): Promise<void> {
    console.log(`📊 Initializing ${this.config.name} v${this.config.version}`);
    
    // Test API connections
    try {
      await this.testAnthropicConnection();
      await this.testBackendConnection();
      console.log(`✅ ${this.config.name} initialized successfully`);
    } catch (error) {
      console.error(`❌ ${this.config.name} initialization failed:`, error);
      throw error;
    }
  }

  private async testAnthropicConnection(): Promise<void> {
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
  }

  private async testBackendConnection(): Promise<void> {
    try {
      const response = await axios.get(`${this.backendApiUrl}/health`, {
        timeout: 5000,
      });
      console.log("✅ Backend API connection successful");
    } catch (error) {
      console.error("❌ Backend API connection failed:", error);
      if (this.config.fallbackEnabled) {
        console.log("⚠️ Backend connection failed, continuing with limited functionality");
      } else {
        throw new Error("Failed to connect to Backend API");
      }
    }
  }

  /**
   * Generate comprehensive market analysis for a location
   */
  async generateMarketAnalysis(input: MarketAnalysisInput): Promise<MarketAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Starting market analysis for location: ${input.latitude}, ${input.longitude}`);

      // Step 1: Gather competitor data
      const competitors = await this.gatherCompetitorData(input);

      // Step 2: Get demographic insights
      const demographics = await this.getDemographicData(input);

      // Step 3: Generate AI-powered market insights
      const insights = await this.generateMarketInsights(input, competitors, demographics);

      // Step 4: Generate recommendations
      const recommendations = await this.generateRecommendations(input, competitors, demographics, insights);

      // Step 5: Calculate market score
      const score = this.calculateMarketScore(competitors, demographics, insights);

      const result: MarketAnalysisResult = {
        location: {
          latitude: input.latitude,
          longitude: input.longitude,
          address: `${input.latitude}, ${input.longitude}`, // TODO: Add reverse geocoding
        },
        competitors,
        demographics,
        insights,
        recommendations,
        score,
        generatedAt: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Market analysis completed in ${duration}ms`);

      return result;
    } catch (error) {
      console.error("❌ Market analysis failed:", error);
      throw error;
    }
  }

  private async gatherCompetitorData(input: MarketAnalysisInput): Promise<Competitor[]> {
    try {
      // Try to get data from backend first
      const response = await axios.get(`${this.backendApiUrl}/api/restaurants`, {
        params: {
          latitude: input.latitude,
          longitude: input.longitude,
          radius: input.radius || 1000,
          limit: 20,
        },
        timeout: 10000,
      });

      const restaurants = response.data.data?.restaurants || [];
      
      return restaurants.map((restaurant: any, index: number) => ({
        id: restaurant.id || `competitor_${index}`,
        name: restaurant.name || `Restaurant ${index + 1}`,
        cuisine_type: restaurant.cuisine_types?.[0] || "Unknown",
        rating: restaurant.rating || 3.5,
        price_range: restaurant.price_range || 2,
        distance: restaurant.distance || Math.random() * 1000,
        estimated_revenue: this.estimateRevenue(restaurant),
        customer_sentiment: this.generateSentiment(restaurant.rating),
      }));
    } catch (error) {
      console.warn("⚠️ Failed to fetch competitor data from backend, using mock data");
      return this.generateMockCompetitors(input);
    }
  }

  private generateMockCompetitors(input: MarketAnalysisInput): Competitor[] {
    const mockCompetitors: Competitor[] = [
      {
        id: "comp_1",
        name: "Local Bistro",
        cuisine_type: "French",
        rating: 4.2,
        price_range: 3,
        distance: 250,
        estimated_revenue: 75000,
        customer_sentiment: "positive",
      },
      {
        id: "comp_2", 
        name: "Pizza Corner",
        cuisine_type: "Italian",
        rating: 3.8,
        price_range: 2,
        distance: 400,
        estimated_revenue: 45000,
        customer_sentiment: "neutral",
      },
      {
        id: "comp_3",
        name: "Thai Garden",
        cuisine_type: "Thai",
        rating: 4.5,
        price_range: 2,
        distance: 600,
        estimated_revenue: 60000,
        customer_sentiment: "positive",
      },
    ];

    return mockCompetitors;
  }

  private async getDemographicData(input: MarketAnalysisInput): Promise<DemographicData> {
    // For now, return mock demographic data
    // In a real implementation, this would call census APIs or demographic services
    return {
      population: 25000 + Math.floor(Math.random() * 50000),
      average_income: 55000 + Math.floor(Math.random() * 30000),
      age_groups: {
        "18-25": 0.18,
        "26-35": 0.25,
        "36-45": 0.22,
        "46-55": 0.18,
        "56-65": 0.12,
        "65+": 0.05,
      },
      dining_preferences: ["casual dining", "fast food", "ethnic cuisine", "healthy options"],
      foot_traffic: Math.floor(Math.random() * 10000) + 5000,
    };
  }

  private async generateMarketInsights(
    input: MarketAnalysisInput,
    competitors: Competitor[],
    demographics: DemographicData
  ): Promise<MarketInsights> {
    try {
      const prompt = `
As a restaurant market analyst, analyze the following data and provide market insights:

Location: ${input.latitude}, ${input.longitude}
Business Type: ${input.businessType || "restaurant"}

Competitors (${competitors.length} found):
${competitors.map(c => `- ${c.name} (${c.cuisine_type}, Rating: ${c.rating}, Price: ${"$".repeat(c.price_range)}, Distance: ${c.distance}m)`).join("\n")}

Demographics:
- Population: ${demographics.population.toLocaleString()}
- Average Income: $${demographics.average_income.toLocaleString()}
- Foot Traffic: ${demographics.foot_traffic.toLocaleString()} people/month

Provide insights in this exact JSON format:
{
  "market_saturation": [0-100 score],
  "opportunity_score": [0-100 score],
  "competitive_advantage": ["advantage1", "advantage2", "advantage3"],
  "risk_factors": ["risk1", "risk2", "risk3"],
  "optimal_pricing": {
    "min": [minimum price range 1-4],
    "max": [maximum price range 1-4], 
    "recommended": [recommended price range 1-4]
  }
}
`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      throw new Error("Failed to parse AI response");
    } catch (error) {
      console.warn("⚠️ AI analysis failed, using heuristic analysis");
      return this.generateHeuristicInsights(competitors, demographics);
    }
  }

  private generateHeuristicInsights(competitors: Competitor[], demographics: DemographicData): MarketInsights {
    const avgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
    const competitorCount = competitors.length;
    const avgPrice = competitors.reduce((sum, c) => sum + c.price_range, 0) / competitors.length;

    const market_saturation = Math.min(100, competitorCount * 10);
    const opportunity_score = Math.max(0, 100 - market_saturation + (demographics.average_income > 60000 ? 20 : 0));

    return {
      market_saturation,
      opportunity_score,
      competitive_advantage: [
        demographics.average_income > 60000 ? "Higher income demographic" : "Cost-conscious market",
        competitorCount < 5 ? "Low competition" : "Established market",
        avgRating < 4.0 ? "Room for quality improvement" : "High standards market"
      ],
      risk_factors: [
        competitorCount > 8 ? "High competition" : "Market entry barriers",
        demographics.foot_traffic < 7000 ? "Low foot traffic" : "Parking challenges",
        avgPrice > 3 ? "Premium market expectations" : "Price sensitivity"
      ],
      optimal_pricing: {
        min: Math.max(1, Math.floor(avgPrice - 0.5)),
        max: Math.min(4, Math.ceil(avgPrice + 0.5)),
        recommended: Math.round(avgPrice)
      }
    };
  }

  private async generateRecommendations(
    input: MarketAnalysisInput,
    competitors: Competitor[],
    demographics: DemographicData,
    insights: MarketInsights
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (insights.opportunity_score > 70) {
      recommendations.push("Strong market opportunity - consider premium positioning");
    } else if (insights.opportunity_score > 40) {
      recommendations.push("Moderate opportunity - focus on differentiation");
    } else {
      recommendations.push("Challenging market - requires unique value proposition");
    }

    if (insights.market_saturation < 50) {
      recommendations.push("Low saturation market - first-mover advantage possible");
    } else {
      recommendations.push("Saturated market - focus on niche or superior service");
    }

    if (demographics.average_income > 70000) {
      recommendations.push("High-income area - premium dining concepts may succeed");
    } else {
      recommendations.push("Value-conscious market - focus on quality-to-price ratio");
    }

    return recommendations;
  }

  private calculateMarketScore(competitors: Competitor[], demographics: DemographicData, insights: MarketInsights): number {
    let score = 50; // Base score

    // Adjust for opportunity
    score += (insights.opportunity_score - 50) * 0.3;

    // Adjust for market saturation (inverse)
    score += (50 - insights.market_saturation) * 0.2;

    // Adjust for demographics
    if (demographics.average_income > 60000) score += 10;
    if (demographics.foot_traffic > 8000) score += 10;

    // Adjust for competition quality
    const avgCompetitorRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
    if (avgCompetitorRating < 4.0) score += 15;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private estimateRevenue(restaurant: any): number {
    const baseRevenue = 30000;
    const ratingMultiplier = (restaurant.rating || 3.5) / 3.5;
    const priceMultiplier = (restaurant.price_range || 2) * 0.5;
    
    return Math.round(baseRevenue * ratingMultiplier * priceMultiplier);
  }

  private generateSentiment(rating: number): string {
    if (rating >= 4.5) return "very positive";
    if (rating >= 4.0) return "positive";
    if (rating >= 3.5) return "neutral";
    if (rating >= 3.0) return "mixed";
    return "negative";
  }
}

export default MarketIntelligenceAgent;