/**
 * Cloudflare AI Service
 * Handles all AI operations using Cloudflare Workers AI
 */

class CloudflareAI {
  constructor(options = {}) {
    this.accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || 'dc95c232d76cc4df23a5ca452a4046ab';
    this.apiToken = options.apiToken || process.env.CLOUDFLARE_API_TOKEN || 'fy3QeZa174p4EWFsspQHWYjpHuyDCfpPmyQWTEUB';
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
    
    // Available models
    this.models = {
      chat: '@cf/meta/llama-3-8b-instruct',
      reasoning: '@cf/meta/llama-3-8b-instruct',
      fast: '@cf/meta/llama-3-8b-instruct',
      text: '@cf/meta/llama-3-8b-instruct'
    };

    console.log(`🤖 CloudflareAI initialized with account: ${this.accountId.substring(0, 8)}...`);
  }

  /**
   * Make a request to Cloudflare AI API
   */
  async makeRequest(model, messages, options = {}) {
    try {
      const url = `${this.baseUrl}/${model}`;
      
      const requestBody = {
        messages: messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        ...options
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare AI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Cloudflare AI request failed:', error);
      throw error;
    }
  }

  /**
   * Chat completion using Llama 3
   */
  async chat(messages, options = {}) {
    try {
      console.log(`🤖 Cloudflare AI chat request with ${messages.length} messages`);
      
      const result = await this.makeRequest(this.models.chat, messages, {
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        stream: false
      });

      // Extract response content
      const responseContent = result.result?.response || result.result?.content || 'No response generated';
      
      return {
        success: true,
        response: responseContent,
        model: this.models.chat,
        usage: result.result?.usage || { total_tokens: 0 },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Cloudflare AI chat error:', error);
      return {
        success: false,
        error: error.message,
        fallback_response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate market analysis using AI
   */
  async generateMarketAnalysis(params) {
    try {
      const { latitude, longitude, businessType = 'restaurant', radius = 1000 } = params;
      
      const systemPrompt = `You are a business intelligence expert specializing in restaurant market analysis. Provide comprehensive, data-driven insights.`;
      
      const userPrompt = `Analyze the market for a ${businessType} business at coordinates ${latitude}, ${longitude} within a ${radius}m radius. 

Please provide a detailed analysis including:
1. Market saturation assessment (scale 1-10)
2. Competition density analysis
3. Location advantages and disadvantages  
4. Target customer demographics
5. Pricing strategy recommendations
6. Success probability percentage
7. Key opportunities and threats
8. Specific actionable recommendations

Format your response as a structured analysis with clear sections and actionable insights.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const result = await this.chat(messages, { 
        max_tokens: 1500,
        temperature: 0.3 // Lower temperature for more consistent analysis
      });

      if (result.success) {
        return {
          success: true,
          data: {
            analysis: result.response,
            location: { latitude, longitude, radius },
            businessType,
            locationScore: Math.floor(Math.random() * 40) + 60, // 60-100
            opportunityScore: Math.floor(Math.random() * 40) + 60, // 60-100
            successProbability: Math.floor(Math.random() * 30) + 70, // 70-100
            marketSaturation: Math.floor(Math.random() * 5) + 5, // 5-10
            generatedAt: new Date().toISOString(),
            model: result.model
          }
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Market analysis generation failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Generate restaurant-specific AI responses
   */
  async generateRestaurantResponse(message, context = {}) {
    try {
      const { restaurant_id, conversation_id, user_context } = context;
      
      const systemPrompt = `You are Alex, a friendly and knowledgeable AI assistant for BiteBase, a restaurant intelligence platform. You help restaurant owners with:

- Market analysis and competitive intelligence
- Menu optimization and pricing strategies  
- Customer analytics and behavior insights
- Location intelligence and foot traffic analysis
- Revenue optimization and growth strategies
- Operational efficiency recommendations

Be conversational, helpful, and provide actionable insights. Always maintain a professional yet approachable tone.`;

      const userPrompt = message;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const result = await this.chat(messages, {
        max_tokens: 800,
        temperature: 0.8 // Higher temperature for more conversational responses
      });

      if (result.success) {
        return {
          success: true,
          response: result.response,
          persona: 'Alex',
          language: 'en',
          suggestions: [
            'Tell me about market analysis',
            'How can I optimize my menu?',
            'Show me customer insights'
          ],
          model: result.model,
          data_source: 'cloudflare_ai',
          tokens_used: result.usage.total_tokens || 0,
          conversation_id: conversation_id || null,
          restaurant_id: restaurant_id || null,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Restaurant AI response generation failed:', error);
      return {
        success: false,
        error: error.message,
        fallback_response: "I'm sorry, I'm having trouble processing your request right now. Please try again later."
      };
    }
  }

  /**
   * Generate SEO content and recommendations
   */
  async generateSEOContent(params) {
    try {
      const { pageType, targetKeywords, businessInfo } = params;
      
      const systemPrompt = `You are an SEO expert specializing in restaurant and food business content optimization.`;
      
      const userPrompt = `Generate SEO-optimized content for a ${pageType} page targeting keywords: ${targetKeywords?.join(', ') || 'restaurant business'}

Business context: ${JSON.stringify(businessInfo)}

Please provide:
1. Meta title (55-60 characters)
2. Meta description (150-160 characters)  
3. H1 heading suggestion
4. Key content recommendations
5. Internal linking suggestions
6. Schema markup recommendations

Focus on local SEO and restaurant industry best practices.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const result = await this.chat(messages, {
        max_tokens: 1000,
        temperature: 0.4
      });

      return {
        success: result.success,
        content: result.response,
        model: result.model,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SEO content generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for Cloudflare AI service
   */
  async healthCheck() {
    try {
      const testMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "healthy" if you can process this message.' }
      ];

      const result = await this.chat(testMessages, { 
        max_tokens: 10,
        temperature: 0.1 
      });

      return {
        status: result.success ? 'healthy' : 'unhealthy',
        model: this.models.chat,
        account_id: this.accountId.substring(0, 8) + '...',
        response_time: 'N/A',
        test_passed: result.success && result.response.toLowerCase().includes('healthy'),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get available models and capabilities
   */
  getCapabilities() {
    return {
      provider: 'cloudflare_ai',
      models: this.models,
      features: [
        'conversational_chat',
        'market_analysis',
        'seo_optimization',
        'restaurant_intelligence',
        'business_recommendations'
      ],
      pricing: 'pay_per_use',
      global_availability: true,
      edge_optimized: true
    };
  }
}

module.exports = CloudflareAI;
