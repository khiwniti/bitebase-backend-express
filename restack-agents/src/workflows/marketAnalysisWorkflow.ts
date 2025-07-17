import { MarketIntelligenceAgent } from "../agents/MarketIntelligenceAgent";
import { MarketAnalysisInput, MarketAnalysisResult, WorkflowState } from "../types";

/**
 * Market Analysis Workflow
 * Orchestrates the market intelligence gathering and analysis process
 */
export async function marketAnalysisWorkflow(input: MarketAnalysisInput): Promise<MarketAnalysisResult> {
  console.log(`🔄 Starting market analysis workflow for location: ${input.latitude}, ${input.longitude}`);
  
  const startTime = Date.now();
  const workflowId = `market_analysis_${Date.now()}`;

  // Initialize workflow state
  const state: WorkflowState = {
    id: workflowId,
    status: "running",
    progress: 0,
    startedAt: new Date().toISOString(),
    metadata: {
      location: { latitude: input.latitude, longitude: input.longitude },
      businessType: input.businessType,
      radius: input.radius
    }
  };

  try {
    // Step 1: Initialize Market Intelligence Agent
    console.log("📊 Initializing Market Intelligence Agent...");
    const agent = new MarketIntelligenceAgent();
    await agent.initialize();
    
    state.progress = 20;
    console.log(`📈 Workflow progress: ${state.progress}%`);

    // Step 2: Validate input parameters
    console.log("✅ Validating input parameters...");
    if (!input.latitude || !input.longitude) {
      throw new Error("Latitude and longitude are required");
    }
    
    if (input.latitude < -90 || input.latitude > 90) {
      throw new Error("Invalid latitude: must be between -90 and 90");
    }
    
    if (input.longitude < -180 || input.longitude > 180) {
      throw new Error("Invalid longitude: must be between -180 and 180");
    }

    state.progress = 30;
    console.log(`📈 Workflow progress: ${state.progress}%`);

    // Step 3: Generate market analysis
    console.log("🔍 Generating comprehensive market analysis...");
    const analysisResult = await agent.generateMarketAnalysis(input);
    
    state.progress = 80;
    console.log(`📈 Workflow progress: ${state.progress}%`);

    // Step 4: Post-process and enhance results
    console.log("🔧 Post-processing analysis results...");
    const enhancedResult = await enhanceAnalysisResult(analysisResult, input);
    
    state.progress = 95;
    console.log(`📈 Workflow progress: ${state.progress}%`);

    // Step 5: Log workflow completion
    const duration = Date.now() - startTime;
    state.status = "completed";
    state.progress = 100;
    state.completedAt = new Date().toISOString();
    
    console.log(`✅ Market analysis workflow completed in ${duration}ms`);
    console.log(`📊 Analysis score: ${enhancedResult.score}/100`);
    console.log(`🎯 Opportunity score: ${enhancedResult.insights.opportunity_score}/100`);
    
    return enhancedResult;

  } catch (error) {
    const duration = Date.now() - startTime;
    state.status = "failed";
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.completedAt = new Date().toISOString();
    
    console.error(`❌ Market analysis workflow failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Enhance analysis result with additional computed fields and metadata
 */
async function enhanceAnalysisResult(
  result: MarketAnalysisResult, 
  input: MarketAnalysisInput
): Promise<MarketAnalysisResult> {
  
  // Add trend indicators
  const trendIndicators = calculateTrendIndicators(result);
  
  // Add risk assessment
  const riskAssessment = calculateRiskAssessment(result);
  
  // Add confidence score
  const confidenceScore = calculateConfidenceScore(result);

  // Enhance recommendations based on all factors
  const enhancedRecommendations = enhanceRecommendations(result, trendIndicators, riskAssessment);

  return {
    ...result,
    insights: {
      ...result.insights,
      trend_indicators: trendIndicators,
      risk_assessment: riskAssessment,
      confidence_score: confidenceScore
    },
    recommendations: enhancedRecommendations,
    metadata: {
      workflow_id: `market_analysis_${Date.now()}`,
      processing_time: new Date().toISOString(),
      data_sources: ["competitors", "demographics", "ai_analysis"],
      confidence_level: confidenceScore > 80 ? "high" : confidenceScore > 60 ? "medium" : "low"
    }
  };
}

function calculateTrendIndicators(result: MarketAnalysisResult): any {
  const competitors = result.competitors;
  const avgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
  const avgPrice = competitors.reduce((sum, c) => sum + c.price_range, 0) / competitors.length;
  
  return {
    market_quality: avgRating > 4.0 ? "high" : avgRating > 3.5 ? "medium" : "low",
    price_trend: avgPrice > 3 ? "premium" : avgPrice > 2 ? "moderate" : "budget",
    competition_density: competitors.length > 10 ? "high" : competitors.length > 5 ? "medium" : "low",
    market_maturity: competitors.filter(c => c.rating > 4.0).length / competitors.length > 0.5 ? "mature" : "developing"
  };
}

function calculateRiskAssessment(result: MarketAnalysisResult): any {
  const riskFactors = result.insights.risk_factors;
  const competitorCount = result.competitors.length;
  const marketSaturation = result.insights.market_saturation;
  
  let riskLevel = "low";
  if (marketSaturation > 80 || competitorCount > 15) {
    riskLevel = "high";
  } else if (marketSaturation > 60 || competitorCount > 10) {
    riskLevel = "medium";
  }
  
  return {
    overall_risk: riskLevel,
    risk_score: Math.min(100, (marketSaturation + competitorCount * 5)),
    mitigation_strategies: generateMitigationStrategies(riskFactors),
    success_probability: Math.max(10, 100 - (marketSaturation * 0.8))
  };
}

function calculateConfidenceScore(result: MarketAnalysisResult): number {
  let confidence = 70; // Base confidence
  
  // More competitors = higher confidence in analysis
  if (result.competitors.length > 5) confidence += 15;
  if (result.competitors.length > 10) confidence += 10;
  
  // Good data quality indicators
  if (result.demographics.population > 0) confidence += 10;
  if (result.insights.opportunity_score > 0) confidence += 5;
  
  return Math.min(100, confidence);
}

function enhanceRecommendations(
  result: MarketAnalysisResult, 
  trends: any, 
  risks: any
): string[] {
  const recommendations = [...result.recommendations];
  
  // Add trend-based recommendations
  if (trends.market_quality === "low") {
    recommendations.push("Focus on superior service quality to differentiate from competitors");
  }
  
  if (trends.price_trend === "premium" && result.demographics.average_income < 60000) {
    recommendations.push("Consider value-oriented pricing to match local demographics");
  }
  
  // Add risk-based recommendations
  if (risks.overall_risk === "high") {
    recommendations.push("Develop strong unique value proposition to compete in saturated market");
  }
  
  if (risks.success_probability < 50) {
    recommendations.push("Consider alternative locations or market segments");
  }
  
  return recommendations;
}

function generateMitigationStrategies(riskFactors: string[]): string[] {
  const strategies = [];
  
  riskFactors.forEach(risk => {
    if (risk.toLowerCase().includes("competition")) {
      strategies.push("Develop unique menu offerings and superior customer experience");
    }
    if (risk.toLowerCase().includes("traffic")) {
      strategies.push("Invest in digital marketing and delivery platform presence");
    }
    if (risk.toLowerCase().includes("price")) {
      strategies.push("Implement value-based pricing with loyalty programs");
    }
  });
  
  return strategies.length > 0 ? strategies : ["Conduct regular market monitoring and adapt strategy accordingly"];
}

export default marketAnalysisWorkflow;