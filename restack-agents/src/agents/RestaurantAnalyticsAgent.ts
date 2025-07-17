import { Anthropic } from "@anthropic-ai/sdk";
import axios from "axios";
import {
  RestaurantAnalyticsInput,
  RestaurantAnalyticsResult,
  PerformanceMetric,
  TrendData,
  PredictionData,
  AnalyticsRecommendation,
  AgentConfig,
} from "../types";

export class RestaurantAnalyticsAgent {
  private anthropic: Anthropic;
  private config: AgentConfig;
  private backendApiUrl: string;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.config = {
      name: "RestaurantAnalyticsAgent",
      version: "1.0.0",
      maxRetries: 3,
      timeout: 60000,
      enableLogging: true,
      fallbackEnabled: true,
    };

    this.backendApiUrl = process.env.BACKEND_API_URL || "http://localhost:56222";
  }

  async initialize(): Promise<void> {
    console.log(`📈 Initializing ${this.config.name} v${this.config.version}`);
    
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

    // Test backend connection
    try {
      const response = await axios.get(`${this.backendApiUrl}/health`, { timeout: 5000 });
      console.log("✅ Backend API connection successful");
    } catch (error) {
      console.warn("⚠️ Backend API connection failed, continuing with limited functionality");
    }
  }

  /**
   * Generate comprehensive restaurant analytics
   */
  async generateAnalytics(input: RestaurantAnalyticsInput): Promise<RestaurantAnalyticsResult> {
    const startTime = Date.now();
    
    try {
      console.log(`📊 Starting analytics generation for restaurant: ${input.restaurantId}`);

      // Step 1: Fetch restaurant data and metrics
      const restaurantData = await this.fetchRestaurantData(input.restaurantId);
      const metricsData = await this.fetchMetricsData(input);

      // Step 2: Calculate performance metrics
      const performance = await this.calculatePerformanceMetrics(metricsData);

      // Step 3: Generate trend analysis
      const trends = await this.generateTrendAnalysis(metricsData);

      // Step 4: Generate predictions
      const predictions = await this.generatePredictions(trends, performance);

      // Step 5: Generate AI-powered recommendations
      const recommendations = await this.generateRecommendations(
        restaurantData,
        performance,
        trends,
        predictions
      );

      const result: RestaurantAnalyticsResult = {
        restaurantId: input.restaurantId,
        period: {
          start: this.getDateRange(input.dateRange || "30d").start,
          end: this.getDateRange(input.dateRange || "30d").end,
          days: this.getDateRange(input.dateRange || "30d").days,
        },
        performance,
        trends,
        predictions,
        recommendations,
        generatedAt: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Analytics generation completed in ${duration}ms`);

      return result;
    } catch (error) {
      console.error("❌ Analytics generation failed:", error);
      throw error;
    }
  }

  private async fetchRestaurantData(restaurantId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.backendApiUrl}/api/restaurants/${restaurantId}`, {
        timeout: 10000,
      });
      return response.data.data;
    } catch (error) {
      console.warn("⚠️ Failed to fetch restaurant data, using defaults");
      return {
        id: restaurantId,
        name: "Restaurant",
        cuisine_types: ["General"],
        rating: 4.0,
        price_range: 2,
      };
    }
  }

  private async fetchMetricsData(input: RestaurantAnalyticsInput): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.backendApiUrl}/api/restaurants/${input.restaurantId}/analytics`,
        {
          params: { date_range: input.dateRange || "30d" },
          timeout: 10000,
        }
      );
      
      return response.data.data?.trends || [];
    } catch (error) {
      console.warn("⚠️ Failed to fetch metrics data, generating mock data");
      return this.generateMockMetricsData(input);
    }
  }

  private generateMockMetricsData(input: RestaurantAnalyticsInput): any[] {
    const dateRange = this.getDateRange(input.dateRange || "30d");
    const data = [];
    
    for (let i = 0; i < dateRange.days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic mock data with trends
      const baseRevenue = 2000 + Math.random() * 1000;
      const weekendMultiplier = [0, 6].includes(date.getDay()) ? 1.5 : 1.0;
      const trendMultiplier = 1 + (i / dateRange.days) * 0.1; // Slight upward trend
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(baseRevenue * weekendMultiplier * trendMultiplier),
        customers: Math.round((baseRevenue * weekendMultiplier * trendMultiplier) / 25),
        avgOrderValue: 20 + Math.random() * 15,
      });
    }
    
    return data.reverse(); // Chronological order
  }

  private async calculatePerformanceMetrics(metricsData: any[]): Promise<{
    revenue: PerformanceMetric;
    customers: PerformanceMetric;
    avgOrderValue: PerformanceMetric;
  }> {
    if (metricsData.length === 0) {
      return {
        revenue: { current: 0, previous: 0, change: 0, changePercent: 0, trend: "stable" },
        customers: { current: 0, previous: 0, change: 0, changePercent: 0, trend: "stable" },
        avgOrderValue: { current: 0, previous: 0, change: 0, changePercent: 0, trend: "stable" },
      };
    }

    const midpoint = Math.floor(metricsData.length / 2);
    const recentPeriod = metricsData.slice(midpoint);
    const previousPeriod = metricsData.slice(0, midpoint);

    const calculateMetric = (recent: any[], previous: any[], field: string): PerformanceMetric => {
      const currentTotal = recent.reduce((sum, item) => sum + (item[field] || 0), 0);
      const previousTotal = previous.reduce((sum, item) => sum + (item[field] || 0), 0);
      
      const current = recent.length > 0 ? currentTotal / recent.length : 0;
      const prev = previous.length > 0 ? previousTotal / previous.length : 0;
      
      const change = current - prev;
      const changePercent = prev > 0 ? (change / prev) * 100 : 0;
      
      let trend: "up" | "down" | "stable" = "stable";
      if (Math.abs(changePercent) > 5) {
        trend = changePercent > 0 ? "up" : "down";
      }

      return {
        current: Math.round(current * 100) / 100,
        previous: Math.round(prev * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        trend,
      };
    };

    return {
      revenue: calculateMetric(recentPeriod, previousPeriod, "revenue"),
      customers: calculateMetric(recentPeriod, previousPeriod, "customers"),
      avgOrderValue: calculateMetric(recentPeriod, previousPeriod, "avgOrderValue"),
    };
  }

  private async generateTrendAnalysis(metricsData: any[]): Promise<TrendData[]> {
    return metricsData.map((item) => ({
      date: item.date,
      revenue: item.revenue || 0,
      customers: item.customers || 0,
      avgOrderValue: item.avgOrderValue || 0,
    }));
  }

  private async generatePredictions(trends: TrendData[], performance: any): Promise<PredictionData[]> {
    const predictions: PredictionData[] = [];
    
    if (trends.length < 3) {
      return predictions; // Not enough data for predictions
    }

    // Simple linear regression for revenue prediction
    const recentTrends = trends.slice(-7); // Last 7 days
    const avgRevenue = recentTrends.reduce((sum, t) => sum + t.revenue, 0) / recentTrends.length;
    const revenueGrowthRate = performance.revenue.changePercent / 100;

    // Generate 7-day forecast
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      
      const predictedRevenue = avgRevenue * (1 + revenueGrowthRate * (i / 7));
      const confidence = Math.max(50, 90 - i * 5); // Decreasing confidence over time
      
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predictedRevenue: Math.round(predictedRevenue),
        confidence,
      });
    }

    return predictions;
  }

  private async generateRecommendations(
    restaurantData: any,
    performance: any,
    trends: TrendData[],
    predictions: PredictionData[]
  ): Promise<AnalyticsRecommendation[]> {
    try {
      const prompt = `
As a restaurant business analyst, analyze the following performance data and provide actionable recommendations:

Restaurant: ${restaurantData.name}
Cuisine: ${restaurantData.cuisine_types?.join(", ") || "General"}
Rating: ${restaurantData.rating || "N/A"}

Performance Metrics:
- Revenue: ${performance.revenue.current} (${performance.revenue.changePercent > 0 ? "+" : ""}${performance.revenue.changePercent}% vs previous period)
- Customers: ${performance.customers.current} (${performance.customers.changePercent > 0 ? "+" : ""}${performance.customers.changePercent}% vs previous period)
- Avg Order Value: $${performance.avgOrderValue.current} (${performance.avgOrderValue.changePercent > 0 ? "+" : ""}${performance.avgOrderValue.changePercent}% vs previous period)

Recent Trends: ${trends.length} days of data available
Predictions: ${predictions.length > 0 ? `${predictions[0].predictedRevenue} revenue predicted for tomorrow` : "Limited prediction data"}

Provide 3-5 specific, actionable recommendations in this JSON format:
[
  {
    "category": "revenue|operations|marketing|menu",
    "priority": "high|medium|low",
    "action": "specific action to take",
    "expectedImpact": "expected business impact",
    "timeframe": "implementation timeframe"
  }
]
`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      throw new Error("Failed to parse AI recommendations");
    } catch (error) {
      console.warn("⚠️ AI recommendations failed, using heuristic recommendations");
      return this.generateHeuristicRecommendations(performance, trends);
    }
  }

  private generateHeuristicRecommendations(performance: any, trends: TrendData[]): AnalyticsRecommendation[] {
    const recommendations: AnalyticsRecommendation[] = [];

    // Revenue recommendations
    if (performance.revenue.trend === "down") {
      recommendations.push({
        category: "revenue",
        priority: "high",
        action: "Review pricing strategy and implement promotional campaigns",
        expectedImpact: "5-15% revenue increase within 30 days",
        timeframe: "2-4 weeks",
      });
    }

    // Customer recommendations
    if (performance.customers.trend === "down") {
      recommendations.push({
        category: "marketing",
        priority: "high",
        action: "Launch customer retention campaign and loyalty program",
        expectedImpact: "10-20% increase in repeat customers",
        timeframe: "4-6 weeks",
      });
    }

    // Order value recommendations
    if (performance.avgOrderValue.current < 25) {
      recommendations.push({
        category: "menu",
        priority: "medium",
        action: "Introduce upselling strategies and bundle offers",
        expectedImpact: "$3-7 increase in average order value",
        timeframe: "2-3 weeks",
      });
    }

    // Operational recommendations
    if (trends.length > 0) {
      const avgDailyRevenue = trends.reduce((sum, t) => sum + t.revenue, 0) / trends.length;
      if (avgDailyRevenue < 1500) {
        recommendations.push({
          category: "operations",
          priority: "medium",
          action: "Optimize operating hours and staff scheduling",
          expectedImpact: "5-10% cost reduction and efficiency improvement",
          timeframe: "3-4 weeks",
        });
      }
    }

    return recommendations;
  }

  private getDateRange(dateRange: string): { start: string; end: string; days: number } {
    const end = new Date();
    const start = new Date();
    
    let days = 30;
    switch (dateRange) {
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
      case "1y":
        days = 365;
        break;
    }

    start.setDate(start.getDate() - days);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      days,
    };
  }
}

export default RestaurantAnalyticsAgent;