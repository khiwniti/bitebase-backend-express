import { RestaurantAnalyticsAgent } from "../agents/RestaurantAnalyticsAgent";
import { RestaurantAnalyticsInput, RestaurantAnalyticsResult, WorkflowState } from "../types";

/**
 * Restaurant Analytics Workflow
 * Orchestrates comprehensive restaurant performance analysis
 */
export async function restaurantAnalyticsWorkflow(input: RestaurantAnalyticsInput): Promise<RestaurantAnalyticsResult> {
  console.log(`🔄 Starting restaurant analytics workflow for restaurant: ${input.restaurantId}`);
  
  const startTime = Date.now();
  const workflowId = `restaurant_analytics_${Date.now()}`;

  // Initialize workflow state
  const state: WorkflowState = {
    id: workflowId,
    status: "running",
    progress: 0,
    startedAt: new Date().toISOString(),
    metadata: {
      restaurantId: input.restaurantId,
      dateRange: input.dateRange || "30d",
      metrics: input.metrics || ["revenue", "customers", "avgOrderValue"]
    }
  };

  try {
    // Step 1: Initialize Restaurant Analytics Agent
    console.log("📈 Initializing Restaurant Analytics Agent...");
    const agent = new RestaurantAnalyticsAgent();
    await agent.initialize();
    
    state.progress = 15;
    console.log(`📊 Workflow progress: ${state.progress}%`);

    // Step 2: Validate input parameters
    console.log("✅ Validating input parameters...");
    if (!input.restaurantId) {
      throw new Error("Restaurant ID is required");
    }
    
    if (input.restaurantId.length < 1) {
      throw new Error("Invalid restaurant ID");
    }

    state.progress = 25;
    console.log(`📊 Workflow progress: ${state.progress}%`);

    // Step 3: Generate analytics
    console.log("📊 Generating comprehensive restaurant analytics...");
    const analyticsResult = await agent.generateAnalytics(input);
    
    state.progress = 70;
    console.log(`📊 Workflow progress: ${state.progress}%`);

    // Step 4: Post-process and enhance results
    console.log("🔧 Post-processing analytics results...");
    const enhancedResult = await enhanceAnalyticsResult(analyticsResult, input);
    
    state.progress = 90;
    console.log(`📊 Workflow progress: ${state.progress}%`);

    // Step 5: Generate executive summary
    console.log("📋 Generating executive summary...");
    const executiveSummary = generateExecutiveSummary(enhancedResult);
    
    state.progress = 95;
    console.log(`📊 Workflow progress: ${state.progress}%`);

    // Step 6: Log workflow completion
    const duration = Date.now() - startTime;
    state.status = "completed";
    state.progress = 100;
    state.completedAt = new Date().toISOString();
    
    console.log(`✅ Restaurant analytics workflow completed in ${duration}ms`);
    console.log(`📈 Revenue trend: ${enhancedResult.performance.revenue.trend}`);
    console.log(`👥 Customer trend: ${enhancedResult.performance.customers.trend}`);
    console.log(`💰 AOV trend: ${enhancedResult.performance.avgOrderValue.trend}`);
    
    const finalResult = {
      ...enhancedResult,
      executiveSummary,
      workflowMetadata: {
        workflowId,
        duration,
        dataQuality: calculateDataQuality(enhancedResult),
        completedAt: state.completedAt
      }
    };
    
    return finalResult;

  } catch (error) {
    const duration = Date.now() - startTime;
    state.status = "failed";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.completedAt = new Date().toISOString();
    
    console.error(`❌ Restaurant analytics workflow failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Enhance analytics result with additional insights and calculations
 */
async function enhanceAnalyticsResult(
  result: RestaurantAnalyticsResult,
  input: RestaurantAnalyticsInput
): Promise<RestaurantAnalyticsResult> {
  
  // Add performance benchmarks
  const benchmarks = calculatePerformanceBenchmarks(result);
  
  // Add seasonality analysis
  const seasonalityInsights = analyzeSeasonality(result.trends);
  
  // Add predictive confidence metrics
  const predictionMetrics = calculatePredictionMetrics(result.predictions);
  
  // Add recommendation priorities
  const prioritizedRecommendations = prioritizeRecommendations(result.recommendations, result.performance);

  return {
    ...result,
    benchmarks,
    seasonalityInsights,
    predictionMetrics,
    recommendations: prioritizedRecommendations,
    enhancedMetadata: {
      dataPoints: result.trends.length,
      analysisDepth: calculateAnalysisDepth(result),
      reliabilityScore: calculateReliabilityScore(result),
      actionableInsights: countActionableInsights(result.recommendations)
    }
  };
}

function calculatePerformanceBenchmarks(result: RestaurantAnalyticsResult): any {
  // Industry benchmarks (these would typically come from a database)
  const industryBenchmarks = {
    dailyRevenue: 2500,
    dailyCustomers: 85,
    avgOrderValue: 28,
    customerRetention: 0.65
  };

  const currentPerformance = {
    dailyRevenue: result.performance.revenue.current,
    dailyCustomers: result.performance.customers.current,
    avgOrderValue: result.performance.avgOrderValue.current
  };

  return {
    industry: industryBenchmarks,
    current: currentPerformance,
    relativeTo Industry: {
      revenue: ((currentPerformance.dailyRevenue / industryBenchmarks.dailyRevenue) * 100) - 100,
      customers: ((currentPerformance.dailyCustomers / industryBenchmarks.dailyCustomers) * 100) - 100,
      avgOrderValue: ((currentPerformance.avgOrderValue / industryBenchmarks.avgOrderValue) * 100) - 100
    },
    performanceLevel: determinePerformanceLevel(currentPerformance, industryBenchmarks)
  };
}

function analyzeSeasonality(trends: any[]): any {
  if (trends.length < 14) {
    return { available: false, reason: "Insufficient data for seasonality analysis" };
  }

  const dayOfWeekPatterns = analyzeDayOfWeekPatterns(trends);
  const weeklyTrends = analyzeWeeklyTrends(trends);

  return {
    available: true,
    dayOfWeek: dayOfWeekPatterns,
    weekly: weeklyTrends,
    recommendations: generateSeasonalityRecommendations(dayOfWeekPatterns, weeklyTrends)
  };
}

function analyzeDayOfWeekPatterns(trends: any[]): any {
  const dayTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  trends.forEach(trend => {
    const date = new Date(trend.date);
    const dayOfWeek = date.getDay();
    dayTotals[dayOfWeek] += trend.revenue;
    dayCounts[dayOfWeek]++;
  });

  const averages = {};
  Object.keys(dayTotals).forEach(day => {
    averages[day] = dayCounts[day] > 0 ? dayTotals[day] / dayCounts[day] : 0;
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bestDay = Object.keys(averages).reduce((a, b) => averages[a] > averages[b] ? a : b);
  const worstDay = Object.keys(averages).reduce((a, b) => averages[a] < averages[b] ? a : b);

  return {
    averages,
    bestDay: { day: dayNames[bestDay], revenue: averages[bestDay] },
    worstDay: { day: dayNames[worstDay], revenue: averages[worstDay] },
    weekendVsWeekday: {
      weekend: (averages[0] + averages[6]) / 2,
      weekday: (averages[1] + averages[2] + averages[3] + averages[4] + averages[5]) / 5
    }
  };
}

function analyzeWeeklyTrends(trends: any[]): any {
  const weeks = [];
  let currentWeek = [];
  let currentWeekRevenue = 0;

  trends.forEach((trend, index) => {
    currentWeek.push(trend);
    currentWeekRevenue += trend.revenue;

    if (currentWeek.length === 7 || index === trends.length - 1) {
      weeks.push({
        weekStart: currentWeek[0].date,
        weekEnd: currentWeek[currentWeek.length - 1].date,
        totalRevenue: currentWeekRevenue,
        avgDailyRevenue: currentWeekRevenue / currentWeek.length
      });
      currentWeek = [];
      currentWeekRevenue = 0;
    }
  });

  const weeklyGrowthRate = weeks.length > 1 
    ? ((weeks[weeks.length - 1].totalRevenue - weeks[0].totalRevenue) / weeks[0].totalRevenue) * 100
    : 0;

  return {
    weeks,
    growthRate: weeklyGrowthRate,
    trend: weeklyGrowthRate > 5 ? "growing" : weeklyGrowthRate < -5 ? "declining" : "stable"
  };
}

function calculatePredictionMetrics(predictions: any[]): any {
  if (predictions.length === 0) {
    return { available: false };
  }

  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  const totalPredictedRevenue = predictions.reduce((sum, p) => sum + p.predictedRevenue, 0);

  return {
    available: true,
    averageConfidence: Math.round(avgConfidence),
    forecastPeriod: predictions.length,
    totalPredictedRevenue,
    confidenceLevel: avgConfidence > 80 ? "high" : avgConfidence > 60 ? "medium" : "low"
  };
}

function prioritizeRecommendations(recommendations: any[], performance: any): any[] {
  return recommendations
    .map(rec => ({
      ...rec,
      urgencyScore: calculateUrgencyScore(rec, performance),
      impactScore: calculateImpactScore(rec)
    }))
    .sort((a, b) => {
      // Sort by priority first, then by urgency and impact scores
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return (b.urgencyScore + b.impactScore) - (a.urgencyScore + a.impactScore);
    });
}

function calculateUrgencyScore(recommendation: any, performance: any): number {
  let score = 5; // Base score

  // Increase urgency for declining metrics
  if (recommendation.category === "revenue" && performance.revenue.trend === "down") score += 3;
  if (recommendation.category === "marketing" && performance.customers.trend === "down") score += 3;
  
  // High priority recommendations get higher urgency
  if (recommendation.priority === "high") score += 2;
  
  return Math.min(10, score);
}

function calculateImpactScore(recommendation: any): number {
  let score = 5; // Base score

  // Parse expected impact for numeric indicators
  const impactText = recommendation.expectedImpact.toLowerCase();
  
  if (impactText.includes("15%") || impactText.includes("20%")) score += 3;
  else if (impactText.includes("10%") || impactText.includes("$7")) score += 2;
  else if (impactText.includes("5%") || impactText.includes("$3")) score += 1;

  // Revenue-related recommendations typically have higher impact
  if (recommendation.category === "revenue") score += 1;

  return Math.min(10, score);
}

function generateExecutiveSummary(result: RestaurantAnalyticsResult): any {
  const performance = result.performance;
  const trends = result.trends;
  const recommendations = result.recommendations;

  // Overall performance assessment
  let overallTrend = "stable";
  const trendScores = [
    performance.revenue.trend === "up" ? 1 : performance.revenue.trend === "down" ? -1 : 0,
    performance.customers.trend === "up" ? 1 : performance.customers.trend === "down" ? -1 : 0,
    performance.avgOrderValue.trend === "up" ? 1 : performance.avgOrderValue.trend === "down" ? -1 : 0
  ];
  
  const totalTrendScore = trendScores.reduce((sum, score) => sum + score, 0);
  if (totalTrendScore > 0) overallTrend = "improving";
  else if (totalTrendScore < 0) overallTrend = "declining";

  // Key highlights
  const keyHighlights = [];
  if (performance.revenue.changePercent > 10) {
    keyHighlights.push(`Revenue increased by ${performance.revenue.changePercent.toFixed(1)}%`);
  } else if (performance.revenue.changePercent < -10) {
    keyHighlights.push(`Revenue declined by ${Math.abs(performance.revenue.changePercent).toFixed(1)}%`);
  }

  if (performance.avgOrderValue.changePercent > 15) {
    keyHighlights.push(`Average order value improved significantly`);
  }

  // Priority actions
  const priorityActions = recommendations
    .filter(rec => rec.priority === "high")
    .slice(0, 3)
    .map(rec => rec.action);

  return {
    overallTrend,
    keyHighlights,
    priorityActions,
    dataQuality: trends.length > 14 ? "excellent" : trends.length > 7 ? "good" : "limited",
    confidenceLevel: trends.length > 20 ? "high" : "medium",
    lastUpdated: result.generatedAt
  };
}

function determinePerformanceLevel(current: any, benchmarks: any): string {
  const revenueRatio = current.dailyRevenue / benchmarks.dailyRevenue;
  const customerRatio = current.dailyCustomers / benchmarks.dailyCustomers;
  const aovRatio = current.avgOrderValue / benchmarks.avgOrderValue;

  const averageRatio = (revenueRatio + customerRatio + aovRatio) / 3;

  if (averageRatio > 1.2) return "excellent";
  if (averageRatio > 1.1) return "above average";
  if (averageRatio > 0.9) return "average";
  if (averageRatio > 0.8) return "below average";
  return "needs improvement";
}

function generateSeasonalityRecommendations(dayPatterns: any, weeklyTrends: any): string[] {
  const recommendations = [];

  if (dayPatterns.weekendVsWeekday.weekend > dayPatterns.weekendVsWeekday.weekday * 1.3) {
    recommendations.push("Focus marketing efforts on weekdays to balance revenue");
  }

  if (weeklyTrends.trend === "declining") {
    recommendations.push("Implement customer retention strategies to reverse declining trend");
  }

  return recommendations;
}

function calculateDataQuality(result: RestaurantAnalyticsResult): string {
  const factors = [];
  
  if (result.trends.length > 20) factors.push("sufficient-data");
  if (result.predictions.length > 0) factors.push("predictive-capability");
  if (result.recommendations.length > 3) factors.push("comprehensive-analysis");

  const qualityScore = factors.length;
  
  if (qualityScore >= 3) return "excellent";
  if (qualityScore >= 2) return "good";
  return "adequate";
}

function calculateAnalysisDepth(result: RestaurantAnalyticsResult): number {
  let depth = 1; // Base depth
  
  if (result.trends.length > 7) depth += 1;
  if (result.predictions.length > 0) depth += 1;
  if (result.recommendations.length > 3) depth += 1;
  
  return depth;
}

function calculateReliabilityScore(result: RestaurantAnalyticsResult): number {
  let score = 70; // Base score
  
  if (result.trends.length > 14) score += 15;
  if (result.trends.length > 30) score += 10;
  if (result.predictions.length > 0) score += 5;
  
  return Math.min(100, score);
}

function countActionableInsights(recommendations: any[]): number {
  return recommendations.filter(rec => 
    rec.timeframe && 
    rec.expectedImpact && 
    rec.action.length > 20
  ).length;
}

export default restaurantAnalyticsWorkflow;