/**
 * Restack Client Service
 * Handles communication between Express.js backend and Restack AI agents
 */

const axios = require('axios');
const crypto = require('crypto');

class RestackClient {
  constructor(options = {}) {
    this.restackApiUrl = options.restackApiUrl || process.env.RESTACK_API_URL || 'http://localhost:5233';
    this.apiKey = options.apiKey || process.env.RESTACK_API_KEY;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.fallbackEnabled = options.fallbackEnabled !== false;
    
    // Initialize axios client with base configuration
    this.httpClient = axios.create({
      baseURL: this.restackApiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });

    console.log(`🔗 RestackClient initialized: ${this.restackApiUrl}`);
    
    // Set up request/response interceptors for logging
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        console.log(`🚀 Restack API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Restack API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata?.startTime;
        console.log(`✅ Restack API Response: ${response.status} (${duration}ms)`);
        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.startTime 
          ? Date.now() - error.config.metadata.startTime 
          : 0;
        console.error(`❌ Restack API Error: ${error.response?.status || 'Network Error'} (${duration}ms)`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute Market Analysis workflow
   */
  async executeMarketAnalysis(input) {
    const workflowId = this.generateWorkflowId('market_analysis');
    
    try {
      console.log(`📊 Executing market analysis workflow: ${workflowId}`);
      
      const response = await this.executeWorkflow('marketAnalysis', {
        latitude: input.latitude,
        longitude: input.longitude,
        businessType: input.businessType || 'restaurant',
        radius: input.radius || 1000,
        restaurantId: input.restaurantId
      }, { workflowId });

      return {
        success: true,
        workflowId,
        data: response.data,
        source: 'restack_agent',
        executionTime: response.executionTime
      };
    } catch (error) {
      console.error(`❌ Market analysis workflow failed: ${workflowId}`, error);
      
      if (this.fallbackEnabled) {
        return this.generateMarketAnalysisFallback(input);
      }
      throw error;
    }
  }

  /**
   * Execute Restaurant Analytics workflow
   */
  async executeRestaurantAnalytics(input) {
    const workflowId = this.generateWorkflowId('restaurant_analytics');
    
    try {
      console.log(`📈 Executing restaurant analytics workflow: ${workflowId}`);
      
      const response = await this.executeWorkflow('restaurantAnalytics', {
        restaurantId: input.restaurantId,
        dateRange: input.dateRange || '30d',
        metrics: input.metrics || ['revenue', 'customers', 'avgOrderValue']
      }, { workflowId });

      return {
        success: true,
        workflowId,
        data: response.data,
        source: 'restack_agent',
        executionTime: response.executionTime
      };
    } catch (error) {
      console.error(`❌ Restaurant analytics workflow failed: ${workflowId}`, error);
      
      if (this.fallbackEnabled) {
        return this.generateAnalyticsFallback(input);
      }
      throw error;
    }
  }

  /**
   * Execute Chat Intelligence workflow
   */
  async executeChatIntelligence(message, context = {}) {
    const workflowId = this.generateWorkflowId('chat_intelligence');
    
    try {
      console.log(`💬 Executing chat intelligence workflow: ${workflowId}`);
      
      const response = await this.executeWorkflow('chatIntelligence', {
        message,
        context: {
          conversationId: context.conversationId,
          restaurantId: context.restaurantId,
          userId: context.userId,
          language: context.language || 'en',
          previousMessages: context.previousMessages || [],
          userData: context.userData,
          restaurantData: context.restaurantData
        }
      }, { workflowId });

      return {
        success: true,
        workflowId,
        data: response.data,
        source: 'restack_agent',
        executionTime: response.executionTime
      };
    } catch (error) {
      console.error(`❌ Chat intelligence workflow failed: ${workflowId}`, error);
      
      if (this.fallbackEnabled) {
        return this.generateChatFallback(message, context);
      }
      throw error;
    }
  }

  /**
   * Generic workflow execution with retry logic
   */
  async executeWorkflow(workflowName, input, options = {}) {
    const startTime = Date.now();
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 Workflow execution attempt ${attempt}/${this.retryAttempts}: ${workflowName}`);
        
        const response = await this.httpClient.post('/workflows/execute', {
          workflowName,
          input,
          options: {
            workflowId: options.workflowId,
            timeout: this.timeout,
            ...options
          }
        });

        const executionTime = Date.now() - startTime;
        
        return {
          data: response.data,
          executionTime,
          attempt
        };
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts && this.isRetryableError(error)) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`⏳ Retrying workflow in ${delay}ms... (attempt ${attempt + 1}/${this.retryAttempts})`);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (!error.response) return true; // Network errors are retryable
    
    const status = error.response.status;
    // Retry on server errors but not client errors
    return status >= 500 || status === 408 || status === 429;
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateRetryDelay(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique workflow ID
   */
  generateWorkflowId(prefix) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Health check for Restack service
   */
  async healthCheck() {
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      return {
        healthy: true,
        status: response.data,
        responseTime: response.config.metadata?.startTime 
          ? Date.now() - response.config.metadata.startTime 
          : 0
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: error.response?.status || 'Network Error'
      };
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId) {
    try {
      const response = await this.httpClient.get(`/workflows/${workflowId}/status`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get workflow status for ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(workflowId) {
    try {
      const response = await this.httpClient.post(`/workflows/${workflowId}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to cancel workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Fallback market analysis when Restack is unavailable
   */
  generateMarketAnalysisFallback(input) {
    console.log('⚠️ Using market analysis fallback');
    
    return {
      success: true,
      workflowId: this.generateWorkflowId('fallback_market'),
      data: {
        location: {
          latitude: input.latitude,
          longitude: input.longitude,
          address: `${input.latitude}, ${input.longitude}`
        },
        competitors: [
          {
            id: 'fallback_comp_1',
            name: 'Local Restaurant',
            cuisine_type: 'General',
            rating: 4.0,
            price_range: 2,
            distance: 500,
            estimated_revenue: 50000,
            customer_sentiment: 'neutral'
          }
        ],
        demographics: {
          population: 30000,
          average_income: 60000,
          age_groups: {
            '18-25': 0.2,
            '26-35': 0.3,
            '36-45': 0.25,
            '46-55': 0.15,
            '56+': 0.1
          },
          dining_preferences: ['casual dining', 'delivery'],
          foot_traffic: 8000
        },
        insights: {
          market_saturation: 60,
          opportunity_score: 65,
          competitive_advantage: ['New market entry', 'Service quality focus'],
          risk_factors: ['Competition', 'Location visibility'],
          optimal_pricing: {
            min: 2,
            max: 3,
            recommended: 2
          }
        },
        recommendations: [
          'Focus on quality service to differentiate',
          'Consider delivery partnership opportunities',
          'Monitor competitor pricing strategies'
        ],
        score: 65,
        generatedAt: new Date().toISOString()
      },
      source: 'fallback',
      executionTime: 100
    };
  }

  /**
   * Fallback restaurant analytics when Restack is unavailable
   */
  generateAnalyticsFallback(input) {
    console.log('⚠️ Using restaurant analytics fallback');
    
    return {
      success: true,
      workflowId: this.generateWorkflowId('fallback_analytics'),
      data: {
        restaurantId: input.restaurantId,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
          days: 30
        },
        performance: {
          revenue: { current: 2500, previous: 2300, change: 200, changePercent: 8.7, trend: 'up' },
          customers: { current: 85, previous: 78, change: 7, changePercent: 9.0, trend: 'up' },
          avgOrderValue: { current: 29.41, previous: 29.49, change: -0.08, changePercent: -0.3, trend: 'stable' }
        },
        trends: this.generateMockTrends(30),
        predictions: this.generateMockPredictions(7),
        recommendations: [
          {
            category: 'revenue',
            priority: 'medium',
            action: 'Implement upselling strategies during peak hours',
            expectedImpact: '5-10% revenue increase',
            timeframe: '2-3 weeks'
          }
        ],
        generatedAt: new Date().toISOString()
      },
      source: 'fallback',
      executionTime: 100
    };
  }

  /**
   * Fallback chat response when Restack is unavailable
   */
  generateChatFallback(message, context) {
    console.log('⚠️ Using chat intelligence fallback');
    
    return {
      success: true,
      workflowId: this.generateWorkflowId('fallback_chat'),
      data: {
        response: "I'm here to help with your restaurant business questions! While my AI systems are experiencing some connectivity issues, I can still provide general guidance on market analysis, performance metrics, and business strategies. What would you like to know?",
        suggestions: [
          'Ask about market analysis',
          'Show restaurant performance',
          'Get menu optimization tips'
        ],
        context: {
          conversationId: context.conversationId || this.generateWorkflowId('conv'),
          restaurantId: context.restaurantId,
          language: context.language || 'en',
          previousMessages: context.previousMessages || []
        },
        persona: 'Restaurant Assistant',
        confidence: 60,
        dataSource: 'fallback',
        followUpQuestions: ['What specific area would you like help with?']
      },
      source: 'fallback',
      executionTime: 50
    };
  }

  /**
   * Generate mock trend data
   */
  generateMockTrends(days) {
    const trends = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        revenue: 2000 + Math.random() * 1000,
        customers: 60 + Math.random() * 40,
        avgOrderValue: 25 + Math.random() * 10
      });
    }
    return trends.reverse();
  }

  /**
   * Generate mock prediction data
   */
  generateMockPredictions(days) {
    const predictions = [];
    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        predictedRevenue: 2400 + Math.random() * 200,
        confidence: Math.max(50, 90 - i * 5)
      });
    }
    return predictions;
  }
}

module.exports = RestackClient;