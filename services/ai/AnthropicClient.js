/**
 * Anthropic Claude Client Service
 * Handles AI-powered analytics and insights generation using Claude
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

class AnthropicClient {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'demo-key-for-development'
    });
    
    this.isEnabled = !!process.env.ANTHROPIC_API_KEY;
    
    if (!this.isEnabled) {
      logger.warn('Anthropic API key not configured - using mock responses');
    }
  }

  /**
   * Generate market analysis insights using Claude
   */
  async generateMarketAnalysis(data) {
    try {
      if (!this.isEnabled) {
        return this.getMockMarketAnalysis(data);
      }

      const prompt = this.buildMarketAnalysisPrompt(data);
      
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      return this.parseAIResponse(content);
      
    } catch (error) {
      logger.error('Anthropic market analysis error:', error);
      return this.getMockMarketAnalysis(data);
    }
  }

  /**
   * Generate sales forecast insights using Claude
   */
  async generateSalesForecast(data) {
    try {
      if (!this.isEnabled) {
        return this.getMockSalesForecast(data);
      }

      const prompt = this.buildSalesForecastPrompt(data);
      
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1200,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      return this.parseAIResponse(content);
      
    } catch (error) {
      logger.error('Anthropic sales forecast error:', error);
      return this.getMockSalesForecast(data);
    }
  }

  /**
   * Generate customer segmentation insights using Claude
   */
  async generateCustomerSegmentation(data) {
    try {
      if (!this.isEnabled) {
        return this.getMockCustomerSegmentation(data);
      }

      const prompt = this.buildCustomerSegmentationPrompt(data);
      
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      return this.parseAIResponse(content);
      
    } catch (error) {
      logger.error('Anthropic customer segmentation error:', error);
      return this.getMockCustomerSegmentation(data);
    }
  }

  /**
   * Generate business recommendations using Claude
   */
  async generateBusinessRecommendations(data) {
    try {
      if (!this.isEnabled) {
        return this.getMockBusinessRecommendations(data);
      }

      const prompt = this.buildBusinessRecommendationsPrompt(data);
      
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      return this.parseAIResponse(content);
      
    } catch (error) {
      logger.error('Anthropic business recommendations error:', error);
      return this.getMockBusinessRecommendations(data);
    }
  }

  /**
   * Build market analysis prompt for Claude
   */
  buildMarketAnalysisPrompt(data) {
    const { location, competitors, demographics, businessType } = data;
    
    return `You are a restaurant industry expert providing market analysis and business insights. Analyze the restaurant market for the following location and provide actionable insights.

Location: ${location.address || 'Not specified'}
Business Type: ${businessType || 'General Restaurant'}
Competitor Count: ${competitors?.length || 0}
Demographics: ${JSON.stringify(demographics || {})}

Competitors in area:
${competitors?.slice(0, 10).map(c => `- ${c.name} (${c.rating}⭐, ${c.cuisine}, ${c.price_level ? '$'.repeat(c.price_level) : 'N/A'})`).join('\n') || 'No competitor data available'}

Please provide a comprehensive market analysis including:
1. Market saturation assessment (scale 1-10)
2. Competition density analysis
3. Optimal pricing strategy recommendations
4. Target customer segments
5. Market opportunities and threats
6. Success probability score (1-100)
7. Key recommendations (3-5 actionable items)

Format your response as valid JSON with the following structure:
{
  "marketSaturation": number,
  "competitionDensity": number,
  "pricingStrategy": {
    "recommendedRange": string,
    "reasoning": string
  },
  "targetSegments": [string],
  "opportunities": [string],
  "threats": [string],
  "successProbability": number,
  "recommendations": [string],
  "summary": string
}

Provide only the JSON response, no additional text.`;
  }

  /**
   * Build sales forecast prompt for Claude
   */
  buildSalesForecastPrompt(data) {
    const { businessType, location, seasonality, marketData } = data;
    
    return `You are a restaurant business analyst specializing in sales forecasting and revenue predictions. Generate a sales forecast for a restaurant business with the following parameters:

Business Type: ${businessType || 'General Restaurant'}
Location: ${location?.address || 'Urban area'}
Market Data: ${JSON.stringify(marketData || {})}

Please provide a 12-month sales forecast including:
1. Monthly revenue projections
2. Seasonal adjustments
3. Growth trends
4. Confidence intervals
5. Key factors affecting sales
6. Risk assessment

Format as JSON:
{
  "monthlyForecast": [
    {"month": "2025-01", "revenue": number, "confidence": number}
  ],
  "yearlyProjection": number,
  "growthRate": number,
  "seasonalFactors": [string],
  "riskFactors": [string],
  "confidence": number,
  "methodology": string
}

Provide only the JSON response, no additional text.`;
  }

  /**
   * Build customer segmentation prompt for Claude
   */
  buildCustomerSegmentationPrompt(data) {
    const { demographics, location, businessType } = data;
    
    return `You are a customer analytics expert specializing in restaurant customer segmentation and behavior analysis. Analyze customer segmentation for a restaurant business:

Business Type: ${businessType || 'General Restaurant'}
Location: ${location?.address || 'Urban area'}
Demographics: ${JSON.stringify(demographics || {})}

Provide customer segmentation analysis including:
1. Primary customer segments (3-5 segments)
2. Segment characteristics and preferences
3. Revenue potential per segment
4. Marketing strategies for each segment

Format as JSON:
{
  "segments": [
    {
      "name": string,
      "description": string,
      "size": number,
      "revenueContribution": number,
      "characteristics": [string],
      "preferences": [string],
      "marketingStrategy": string
    }
  ],
  "primarySegment": string,
  "recommendations": [string]
}

Provide only the JSON response, no additional text.`;
  }

  /**
   * Build business recommendations prompt for Claude
   */
  buildBusinessRecommendationsPrompt(data) {
    const { marketAnalysis, salesForecast, customerSegments, businessGoals } = data;
    
    return `You are a restaurant business consultant providing strategic recommendations. Based on the following analysis data, provide actionable business recommendations:

Market Analysis: ${JSON.stringify(marketAnalysis || {})}
Sales Forecast: ${JSON.stringify(salesForecast || {})}
Customer Segments: ${JSON.stringify(customerSegments || {})}
Business Goals: ${businessGoals || 'Growth and profitability'}

Provide strategic recommendations including:
1. Priority actions (top 3)
2. Marketing strategies
3. Operational improvements
4. Financial recommendations
5. Risk mitigation strategies

Format as JSON:
{
  "priorityActions": [
    {
      "action": string,
      "impact": string,
      "timeline": string,
      "effort": string
    }
  ],
  "marketingStrategies": [string],
  "operationalImprovements": [string],
  "financialRecommendations": [string],
  "riskMitigation": [string],
  "summary": string
}

Provide only the JSON response, no additional text.`;
  }

  /**
   * Parse AI response and handle errors
   */
  parseAIResponse(content) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return structured response
      return {
        success: false,
        error: 'Invalid AI response format',
        rawResponse: content
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      return {
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: content
      };
    }
  }

  /**
   * Mock market analysis for development/demo
   */
  getMockMarketAnalysis(data) {
    return {
      marketSaturation: 7.2,
      competitionDensity: 8.1,
      pricingStrategy: {
        recommendedRange: "$15-25 per entree",
        reasoning: "Based on competitor analysis and local demographics, mid-range pricing offers optimal market positioning"
      },
      targetSegments: [
        "Young professionals (25-35)",
        "Families with children",
        "Business lunch crowd",
        "Weekend diners"
      ],
      opportunities: [
        "Limited healthy fast-casual options in area",
        "Growing demand for delivery services",
        "Underserved lunch market for office workers",
        "Potential for catering services"
      ],
      threats: [
        "High competition from established restaurants",
        "Rising commercial rent costs",
        "Economic uncertainty affecting dining out",
        "Seasonal fluctuations in foot traffic"
      ],
      successProbability: 73,
      recommendations: [
        "Focus on unique cuisine or dining experience to differentiate",
        "Invest in strong online presence and delivery partnerships",
        "Consider lunch specials to capture business crowd",
        "Build customer loyalty program for repeat business",
        "Monitor competitor pricing and adjust accordingly"
      ],
      summary: "The market shows moderate saturation with good opportunities for differentiated concepts. Success depends on unique positioning and strong execution.",
      confidence: 0.85,
      generatedAt: new Date().toISOString(),
      aiProvider: 'anthropic-claude'
    };
  }

  /**
   * Mock sales forecast for development/demo
   */
  getMockSalesForecast(data) {
    const baseRevenue = 45000;
    const monthlyForecast = [];
    
    for (let i = 1; i <= 12; i++) {
      const month = `2025-${i.toString().padStart(2, '0')}`;
      const seasonalMultiplier = this.getSeasonalMultiplier(i);
      const revenue = Math.round(baseRevenue * seasonalMultiplier * (1 + Math.random() * 0.2 - 0.1));
      
      monthlyForecast.push({
        month,
        revenue,
        confidence: 0.75 + Math.random() * 0.2
      });
    }
    
    return {
      monthlyForecast,
      yearlyProjection: monthlyForecast.reduce((sum, m) => sum + m.revenue, 0),
      growthRate: 0.15,
      seasonalFactors: [
        "Holiday season boost (Nov-Dec)",
        "Summer outdoor dining increase",
        "Back-to-school lunch traffic (Sep)",
        "Valentine's Day and special occasions"
      ],
      riskFactors: [
        "Economic downturn reducing discretionary spending",
        "New competitor opening nearby",
        "Supply chain disruptions affecting costs",
        "Seasonal weather impacts on foot traffic"
      ],
      confidence: 0.78,
      methodology: "Based on industry benchmarks, local market analysis, and seasonal patterns",
      generatedAt: new Date().toISOString(),
      aiProvider: 'anthropic-claude'
    };
  }

  /**
   * Mock customer segmentation for development/demo
   */
  getMockCustomerSegmentation(data) {
    return {
      segments: [
        {
          name: "Young Professionals",
          description: "Working professionals aged 25-35 seeking convenient, quality dining",
          size: 35,
          revenueContribution: 40,
          characteristics: ["Tech-savvy", "Time-conscious", "Quality-focused", "Social media active"],
          preferences: ["Quick service", "Healthy options", "Online ordering", "Instagram-worthy presentation"],
          marketingStrategy: "Digital marketing, lunch promotions, loyalty apps"
        },
        {
          name: "Families",
          description: "Families with children looking for casual, affordable dining",
          size: 25,
          revenueContribution: 30,
          characteristics: ["Budget-conscious", "Kid-friendly needs", "Weekend diners", "Value-oriented"],
          preferences: ["Kids menu", "Family portions", "Comfortable seating", "Quick service"],
          marketingStrategy: "Family deals, weekend promotions, community engagement"
        },
        {
          name: "Business Diners",
          description: "Business professionals for lunch meetings and corporate events",
          size: 20,
          revenueContribution: 25,
          characteristics: ["Expense account", "Quality expectations", "Time-sensitive", "Professional atmosphere"],
          preferences: ["Private dining", "Business lunch specials", "WiFi", "Professional service"],
          marketingStrategy: "Corporate partnerships, LinkedIn advertising, business lunch packages"
        },
        {
          name: "Food Enthusiasts",
          description: "Culinary adventurers seeking unique dining experiences",
          size: 20,
          revenueContribution: 5,
          characteristics: ["Adventurous palate", "Social media influencers", "Quality over price", "Experience-focused"],
          preferences: ["Unique dishes", "Chef specials", "Wine pairings", "Instagram moments"],
          marketingStrategy: "Food blogger partnerships, special events, tasting menus"
        }
      ],
      primarySegment: "Young Professionals",
      recommendations: [
        "Focus marketing efforts on young professionals for highest ROI",
        "Develop family-friendly offerings to capture weekend traffic",
        "Create business lunch packages for corporate segment",
        "Use social media to attract food enthusiasts and build buzz"
      ],
      generatedAt: new Date().toISOString(),
      aiProvider: 'anthropic-claude'
    };
  }

  /**
   * Mock business recommendations for development/demo
   */
  getMockBusinessRecommendations(data) {
    return {
      priorityActions: [
        {
          action: "Develop unique menu positioning",
          impact: "High - differentiation from competitors",
          timeline: "2-4 weeks",
          effort: "Medium"
        },
        {
          action: "Launch digital marketing campaign",
          impact: "High - reach target demographics",
          timeline: "1-2 weeks",
          effort: "Low"
        },
        {
          action: "Implement loyalty program",
          impact: "Medium - increase repeat customers",
          timeline: "4-6 weeks",
          effort: "Medium"
        }
      ],
      marketingStrategies: [
        "Focus on Instagram and TikTok for young professional segment",
        "Partner with local businesses for lunch delivery",
        "Create family-friendly weekend promotions",
        "Develop influencer partnerships for food enthusiasts"
      ],
      operationalImprovements: [
        "Optimize kitchen workflow for faster service",
        "Implement online ordering system",
        "Train staff on upselling techniques",
        "Establish supplier relationships for consistent quality"
      ],
      financialRecommendations: [
        "Monitor food costs closely - target 28-32% of revenue",
        "Implement dynamic pricing for peak hours",
        "Track customer acquisition costs by channel",
        "Set aside 10% of revenue for marketing and growth"
      ],
      riskMitigation: [
        "Diversify revenue streams with catering and delivery",
        "Build cash reserves for seasonal fluctuations",
        "Monitor competitor activities and pricing",
        "Develop contingency plans for supply chain disruptions"
      ],
      summary: "Focus on differentiation and digital presence while building operational efficiency and financial discipline for sustainable growth.",
      generatedAt: new Date().toISOString(),
      aiProvider: 'anthropic-claude'
    };
  }

  /**
   * Get seasonal multiplier for sales forecasting
   */
  getSeasonalMultiplier(month) {
    const seasonalFactors = {
      1: 0.85,  // January - post-holiday slowdown
      2: 0.90,  // February - Valentine's boost
      3: 0.95,  // March - spring pickup
      4: 1.00,  // April - baseline
      5: 1.05,  // May - spring/graduation season
      6: 1.10,  // June - summer dining
      7: 1.15,  // July - peak summer
      8: 1.10,  // August - summer continues
      9: 1.05,  // September - back to school
      10: 1.00, // October - fall baseline
      11: 1.20, // November - holiday season
      12: 1.25  // December - peak holiday
    };
    
    return seasonalFactors[month] || 1.0;
  }

  /**
   * Health check for AI service
   */
  async healthCheck() {
    return {
      service: 'Anthropic Claude Client',
      status: this.isEnabled ? 'enabled' : 'mock',
      apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AnthropicClient;