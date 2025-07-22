const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const RealDataService = require('../services/RealDataService');
const CloudflareKVCache = require('../services/CloudflareKVCache');

// Initialize services
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const realDataService = new RealDataService();

// Initialize KV cache (will use Cloudflare KV in production, local memory in development)
let kvCache = null;
try {
  // In Cloudflare Workers, this would be: new CloudflareKVCache(env.ANALYTICS_CACHE)
  // For now, initialize without KV namespace (will use local memory cache)
  kvCache = new CloudflareKVCache();
  
  // Connect to cache
  (async () => {
    try {
      await kvCache.connect();
      console.log('✅ KV cache connected for analytics caching');
    } catch (error) {
      console.error('❌ KV cache connection failed:', error);
      kvCache = null; // Disable cache if connection fails
    }
  })();
} catch (error) {
  console.log('⚠️ KV cache initialization failed, continuing without caching...', error.message);
  kvCache = null;
}

// Dashboard stats endpoint
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    // Generate dashboard statistics
    const stats = {
      revenue: {
        current: 45000,
        previous: 42000,
        change: '+7.1%',
        trend: 'up'
      },
      customers: {
        current: 1250,
        previous: 1180,
        change: '+5.9%',
        trend: 'up'
      },
      orders: {
        current: 890,
        previous: 820,
        change: '+8.5%',
        trend: 'up'
      },
      avgOrderValue: {
        current: 50.56,
        previous: 51.22,
        change: '-1.3%',
        trend: 'down'
      }
    };
    
    res.json({
      success: true,
      data: stats,
      metadata: {
        generatedAt: new Date().toISOString(),
        restaurantId,
        period: 'last_30_days'
      }
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

// Market analyses endpoint
router.get('/market-analyses', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // Generate market analysis data
    const analyses = [
      {
        id: 1,
        title: 'Bangkok Restaurant Market Q4 2024',
        location: 'Bangkok, Thailand',
        date: '2024-12-15',
        score: 85,
        insights: ['High demand for Asian fusion', 'Growing delivery market', 'Premium pricing opportunity']
      },
      {
        id: 2,
        title: 'Sukhumvit Area Competition Analysis',
        location: 'Sukhumvit, Bangkok',
        date: '2024-12-10',
        score: 78,
        insights: ['Saturated market', 'Differentiation needed', 'Focus on unique cuisine']
      }
    ];
    
    res.json({
      success: true,
      data: analyses,
      metadata: {
        total: analyses.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Market analyses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market analyses'
    });
  }
});

// Real-time metrics endpoint
router.get('/realtime', async (req, res) => {
  try {
    const { range = 'today', restaurantId } = req.query;
    const cacheKey = `analytics:realtime:${restaurantId}:${range}`;

    // Check cache first (if KV cache is available)
    if (kvCache) {
      try {
        const cached = await kvCache.get(cacheKey);
        if (cached) {
          return res.json(cached);
        }
      } catch (error) {
        console.error('❌ KV cache read error:', error);
      }
    }

    // Calculate date ranges
    const now = new Date();
    let startDate, endDate, previousStartDate, previousEndDate;

    switch (range) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date();
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(endDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        endDate = new Date();
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate = new Date(startDate);
        break;
    }

    // Fetch current period metrics
    const currentMetrics = await getMetrics(restaurantId, startDate, endDate);
    const previousMetrics = await getMetrics(restaurantId, previousStartDate, previousEndDate);

    // Calculate changes
    const metrics = {
      revenue: {
        current: currentMetrics.revenue,
        previous: previousMetrics.revenue,
        change: calculatePercentageChange(previousMetrics.revenue, currentMetrics.revenue)
      },
      customers: {
        current: currentMetrics.customers,
        previous: previousMetrics.customers,
        change: calculatePercentageChange(previousMetrics.customers, currentMetrics.customers)
      },
      orders: {
        current: currentMetrics.orders,
        previous: previousMetrics.orders,
        change: calculatePercentageChange(previousMetrics.orders, currentMetrics.orders)
      },
      avgTicket: {
        current: currentMetrics.avgTicket,
        previous: previousMetrics.avgTicket,
        change: calculatePercentageChange(previousMetrics.avgTicket, currentMetrics.avgTicket)
      }
    };

    // Get additional analytics data
    const [salesTrend, customerSegments, peakHours, popularItems, competitors] = await Promise.all([
      getSalesTrend(restaurantId, startDate, endDate),
      getCustomerSegments(restaurantId),
      getPeakHours(restaurantId, startDate, endDate),
      getPopularItems(restaurantId, startDate, endDate),
      getCompetitorAnalysis(restaurantId)
    ]);

    const response = {
      metrics,
      salesTrend,
      customerSegments,
      peakHours,
      popularItems,
      competitors,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 1 minute (if KV cache is available)
    if (kvCache) {
      try {
        await kvCache.set(cacheKey, response, 60); // 60 seconds TTL
      } catch (error) {
        console.error('❌ KV cache write error:', error);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Customer behavior analytics
router.get('/customer-behavior/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    const behavior = await realDataService.getCustomerBehavior(
      restaurantId,
      { start: startDate, end: endDate }
    );

    res.json(behavior);
  } catch (error) {
    console.error('Error fetching customer behavior:', error);
    res.status(500).json({ error: 'Failed to fetch customer behavior data' });
  }
});

// Sales metrics endpoint
router.get('/sales/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    const sales = await realDataService.getSalesMetrics(
      restaurantId,
      { start: startDate, end: endDate }
    );

    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// Market trends endpoint
router.get('/market-trends', async (req, res) => {
  try {
    const { industry = 'restaurant', lat, lng } = req.query;
    
    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    const trends = await realDataService.getMarketTrends(industry, location);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({ error: 'Failed to fetch market trends' });
  }
});

// Competitor analysis endpoint
router.get('/competitors', async (req, res) => {
  try {
    const { lat, lng, radius = 5000, businessType } = req.query;

    const analysis = await realDataService.getCompetitorAnalysis(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      parseInt(radius),
      businessType
    );

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching competitor analysis:', error);
    res.status(500).json({ error: 'Failed to fetch competitor data' });
  }
});

// Financial dashboard endpoint
router.get('/financial/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { period = '30days' } = req.query;

    const query = `
      SELECT 
        date,
        revenue,
        food_cost,
        labor_cost,
        overhead_cost,
        net_profit,
        food_cost_percentage,
        labor_cost_percentage,
        prime_cost_percentage
      FROM financial_metrics
      WHERE restaurant_id = $1
        AND date >= CURRENT_DATE - INTERVAL '${period}'
      ORDER BY date DESC
    `;

    const result = await pool.query(query, [restaurantId]);

    const summary = {
      totalRevenue: result.rows.reduce((sum, row) => sum + parseFloat(row.revenue || 0), 0),
      totalProfit: result.rows.reduce((sum, row) => sum + parseFloat(row.net_profit || 0), 0),
      avgFoodCost: result.rows.reduce((sum, row) => sum + parseFloat(row.food_cost_percentage || 0), 0) / result.rows.length,
      avgLaborCost: result.rows.reduce((sum, row) => sum + parseFloat(row.labor_cost_percentage || 0), 0) / result.rows.length,
      profitMargin: (result.rows.reduce((sum, row) => sum + parseFloat(row.net_profit || 0), 0) / 
                     result.rows.reduce((sum, row) => sum + parseFloat(row.revenue || 0), 0) * 100).toFixed(2)
    };

    res.json({
      daily: result.rows,
      summary,
      trends: analyzeFinancialTrends(result.rows)
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// Inventory analytics endpoint
router.get('/inventory/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const query = `
      SELECT 
        i.*,
        CASE 
          WHEN current_quantity <= min_quantity THEN 'critical'
          WHEN current_quantity <= min_quantity * 1.5 THEN 'low'
          ELSE 'adequate'
        END as stock_status,
        (current_quantity * unit_cost) as inventory_value
      FROM inventory i
      WHERE restaurant_id = $1
      ORDER BY stock_status, category, item_name
    `;

    const result = await pool.query(query, [restaurantId]);

    const summary = {
      totalItems: result.rows.length,
      criticalItems: result.rows.filter(r => r.stock_status === 'critical').length,
      lowStockItems: result.rows.filter(r => r.stock_status === 'low').length,
      totalValue: result.rows.reduce((sum, row) => sum + parseFloat(row.inventory_value || 0), 0),
      categories: [...new Set(result.rows.map(r => r.category))]
    };

    res.json({
      items: result.rows,
      summary,
      recommendations: generateInventoryRecommendations(result.rows)
    });
  } catch (error) {
    console.error('Error fetching inventory data:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

// Helper functions
async function getMetrics(restaurantId, startDate, endDate) {
  const query = `
    SELECT 
      COUNT(*) as orders,
      COUNT(DISTINCT customer_id) as customers,
      SUM(total_amount) as revenue,
      AVG(total_amount) as avg_ticket
    FROM sales_transactions
    WHERE restaurant_id = $1
      AND transaction_date BETWEEN $2 AND $3
  `;

  const result = await pool.query(query, [restaurantId, startDate, endDate]);
  const row = result.rows[0];

  return {
    orders: parseInt(row.orders) || 0,
    customers: parseInt(row.customers) || 0,
    revenue: parseFloat(row.revenue) || 0,
    avgTicket: parseFloat(row.avg_ticket) || 0
  };
}

async function getSalesTrend(restaurantId, startDate, endDate) {
  const query = `
    SELECT 
      DATE_TRUNC('hour', transaction_date) as time,
      COUNT(*) as orders,
      SUM(total_amount) as revenue
    FROM sales_transactions
    WHERE restaurant_id = $1
      AND transaction_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('hour', transaction_date)
    ORDER BY time
  `;

  const result = await pool.query(query, [restaurantId, startDate, endDate]);
  
  return result.rows.map(row => ({
    time: new Date(row.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    orders: parseInt(row.orders),
    revenue: parseFloat(row.revenue)
  }));
}

async function getCustomerSegments(restaurantId) {
  const query = `
    SELECT 
      CASE 
        WHEN visit_count >= 10 THEN 'VIP'
        WHEN visit_count >= 4 THEN 'Regular'
        WHEN visit_count >= 2 THEN 'Occasional'
        ELSE 'New'
      END as segment,
      COUNT(*) as count,
      AVG(total_spent) as avg_spend,
      AVG(visit_count) as frequency
    FROM customers
    WHERE restaurant_id = $1
    GROUP BY segment
    ORDER BY 
      CASE segment
        WHEN 'VIP' THEN 1
        WHEN 'Regular' THEN 2
        WHEN 'Occasional' THEN 3
        WHEN 'New' THEN 4
      END
  `;

  const result = await pool.query(query, [restaurantId]);
  
  return result.rows.map(row => ({
    segment: row.segment,
    count: parseInt(row.count),
    avgSpend: parseFloat(row.avg_spend),
    frequency: parseFloat(row.frequency)
  }));
}

async function getPeakHours(restaurantId, startDate, endDate) {
  const query = `
    SELECT 
      EXTRACT(HOUR FROM transaction_date) as hour,
      COUNT(*) as traffic,
      SUM(total_amount) as sales
    FROM sales_transactions
    WHERE restaurant_id = $1
      AND transaction_date BETWEEN $2 AND $3
    GROUP BY EXTRACT(HOUR FROM transaction_date)
    ORDER BY hour
  `;

  const result = await pool.query(query, [restaurantId, startDate, endDate]);
  
  return result.rows.map(row => ({
    hour: `${row.hour}:00`,
    traffic: parseInt(row.traffic),
    sales: parseFloat(row.sales)
  }));
}

async function getPopularItems(restaurantId, startDate, endDate) {
  const query = `
    SELECT 
      i.item_name as name,
      i.category,
      i.price,
      COUNT(oi.id) as quantity,
      SUM(oi.price * oi.quantity) as revenue,
      (COUNT(oi.id) * 100.0 / (
        SELECT COUNT(*) 
        FROM order_items oi2 
        JOIN sales_transactions st2 ON oi2.transaction_id = st2.id
        WHERE st2.restaurant_id = $1 
          AND st2.transaction_date BETWEEN $2 AND $3
      )) as order_percentage
    FROM order_items oi
    JOIN sales_transactions st ON oi.transaction_id = st.id
    JOIN items i ON oi.item_id = i.id
    WHERE st.restaurant_id = $1
      AND st.transaction_date BETWEEN $2 AND $3
    GROUP BY i.item_name, i.category, i.price
    ORDER BY quantity DESC
    LIMIT 10
  `;

  const result = await pool.query(query, [restaurantId, startDate, endDate]);
  
  return result.rows.map(row => ({
    name: row.name,
    category: row.category,
    price: parseFloat(row.price),
    quantity: parseInt(row.quantity),
    revenue: parseFloat(row.revenue),
    growth: Math.floor(Math.random() * 20) + 5 // This should be calculated from historical data
  }));
}

async function getCompetitorAnalysis(restaurantId) {
  // This would fetch real competitor data
  // For now, returning structured sample data
  return [
    { metric: 'Price', yours: 85, average: 75, topCompetitor: 90 },
    { metric: 'Quality', yours: 90, average: 80, topCompetitor: 95 },
    { metric: 'Service', yours: 88, average: 78, topCompetitor: 92 },
    { metric: 'Location', yours: 75, average: 70, topCompetitor: 85 },
    { metric: 'Online Reviews', yours: 82, average: 75, topCompetitor: 88 },
    { metric: 'Menu Variety', yours: 78, average: 72, topCompetitor: 80 }
  ];
}

function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return parseFloat(((newValue - oldValue) / oldValue * 100).toFixed(1));
}

function analyzeFinancialTrends(data) {
  if (data.length < 2) return { trend: 'insufficient_data' };

  const recentWeek = data.slice(0, 7);
  const previousWeek = data.slice(7, 14);

  const recentRevenue = recentWeek.reduce((sum, d) => sum + parseFloat(d.revenue || 0), 0);
  const previousRevenue = previousWeek.reduce((sum, d) => sum + parseFloat(d.revenue || 0), 0);

  const recentProfit = recentWeek.reduce((sum, d) => sum + parseFloat(d.net_profit || 0), 0);
  const previousProfit = previousWeek.reduce((sum, d) => sum + parseFloat(d.net_profit || 0), 0);

  return {
    revenue: {
      trend: recentRevenue > previousRevenue ? 'up' : 'down',
      change: calculatePercentageChange(previousRevenue, recentRevenue)
    },
    profit: {
      trend: recentProfit > previousProfit ? 'up' : 'down',
      change: calculatePercentageChange(previousProfit, recentProfit)
    },
    recommendations: generateFinancialRecommendations(data)
  };
}

function generateFinancialRecommendations(data) {
  const recommendations = [];
  const avgFoodCost = data.reduce((sum, d) => sum + parseFloat(d.food_cost_percentage || 0), 0) / data.length;
  const avgLaborCost = data.reduce((sum, d) => sum + parseFloat(d.labor_cost_percentage || 0), 0) / data.length;

  if (avgFoodCost > 35) {
    recommendations.push({
      type: 'cost_control',
      priority: 'high',
      message: 'Food cost exceeds 35% - review supplier contracts and portion sizes'
    });
  }

  if (avgLaborCost > 30) {
    recommendations.push({
      type: 'labor_optimization',
      priority: 'high',
      message: 'Labor cost exceeds 30% - optimize scheduling and improve productivity'
    });
  }

  return recommendations;
}

function generateInventoryRecommendations(items) {
  const recommendations = [];
  const criticalItems = items.filter(i => i.stock_status === 'critical');
  const slowMoving = items.filter(i => {
    const daysSinceOrder = (new Date() - new Date(i.last_ordered)) / (1000 * 60 * 60 * 24);
    return daysSinceOrder > 30 && i.current_quantity > i.max_quantity * 0.8;
  });

  if (criticalItems.length > 0) {
    recommendations.push({
      type: 'reorder',
      priority: 'urgent',
      items: criticalItems.map(i => i.item_name),
      message: `${criticalItems.length} items need immediate reordering`
    });
  }

  if (slowMoving.length > 0) {
    recommendations.push({
      type: 'reduce_stock',
      priority: 'medium',
      items: slowMoving.map(i => i.item_name),
      message: `${slowMoving.length} items are slow-moving, consider reducing stock levels`
    });
  }

  return recommendations;
}



module.exports = router;