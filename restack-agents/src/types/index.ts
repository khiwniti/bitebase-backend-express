// Core types for BiteBase Restack AI Agents

export interface Restaurant {
  id: string;
  name: string;
  cuisine_types: string[];
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  rating?: number;
  price_range?: number;
  phone?: string;
  website?: string;
}

export interface MarketAnalysisInput {
  latitude: number;
  longitude: number;
  businessType?: string;
  radius?: number;
  restaurantId?: string;
}

export interface MarketAnalysisResult {
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  competitors: Competitor[];
  demographics: DemographicData;
  insights: MarketInsights;
  recommendations: string[];
  score: number;
  generatedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  cuisine_type: string;
  rating: number;
  price_range: number;
  distance: number;
  estimated_revenue?: number;
  customer_sentiment?: string;
}

export interface DemographicData {
  population: number;
  average_income: number;
  age_groups: Record<string, number>;
  dining_preferences: string[];
  foot_traffic: number;
}

export interface MarketInsights {
  market_saturation: number;
  opportunity_score: number;
  competitive_advantage: string[];
  risk_factors: string[];
  optimal_pricing: {
    min: number;
    max: number;
    recommended: number;
  };
}

export interface RestaurantAnalyticsInput {
  restaurantId: string;
  dateRange?: string;
  metrics?: string[];
}

export interface RestaurantAnalyticsResult {
  restaurantId: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  performance: {
    revenue: PerformanceMetric;
    customers: PerformanceMetric;
    avgOrderValue: PerformanceMetric;
  };
  trends: TrendData[];
  predictions: PredictionData[];
  recommendations: AnalyticsRecommendation[];
  generatedAt: string;
}

export interface PerformanceMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendData {
  date: string;
  revenue: number;
  customers: number;
  avgOrderValue: number;
}

export interface PredictionData {
  date: string;
  predictedRevenue: number;
  confidence: number;
}

export interface AnalyticsRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedImpact: string;
  timeframe: string;
}

export interface ChatContext {
  restaurantId?: string;
  conversationId: string;
  userId?: string;
  language?: string;
  previousMessages: ChatMessage[];
  userData?: any;
  restaurantData?: Restaurant;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface ChatResponse {
  response: string;
  suggestions: string[];
  context: ChatContext;
  persona: string;
  confidence: number;
  dataSource: string;
  followUpQuestions?: string[];
  visualizations?: any[];
}

export interface AgentConfig {
  name: string;
  version: string;
  maxRetries: number;
  timeout: number;
  enableLogging: boolean;
  fallbackEnabled: boolean;
}

export interface WorkflowState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: any;
}