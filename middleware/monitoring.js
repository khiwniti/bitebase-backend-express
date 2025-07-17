/**
 * Performance Monitoring Middleware
 * Tracks API performance, system health, and usage metrics
 */

const os = require('os');
const process = require('process');

// Performance metrics storage (in production, use Redis or database)
const metrics = {
  requests: {
    total: 0,
    byEndpoint: {},
    byStatus: {},
    responseTimeHistory: []
  },
  system: {
    startTime: Date.now(),
    lastHealthCheck: Date.now()
  },
  errors: {
    total: 0,
    byType: {},
    recent: []
  }
};

// Performance tracking middleware
const performanceTracker = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  // Track request
  metrics.requests.total++;
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const endMemory = process.memoryUsage();

    // Track response time
    metrics.requests.responseTimeHistory.push({
      endpoint,
      responseTime,
      timestamp: Date.now(),
      statusCode: res.statusCode,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed
    });

    // Keep only last 500 entries to reduce memory usage
    if (metrics.requests.responseTimeHistory.length > 500) {
      metrics.requests.responseTimeHistory = metrics.requests.responseTimeHistory.slice(-500);
    }

    // Track status codes
    const statusGroup = `${Math.floor(res.statusCode / 100)}xx`;
    metrics.requests.byStatus[statusGroup] = (metrics.requests.byStatus[statusGroup] || 0) + 1;

    // Log slow requests
    if (responseTime > 2000) {
      console.log(`🐌 Slow request detected: ${endpoint} - ${responseTime.toFixed(2)}ms`);
    }

    // Log errors
    if (res.statusCode >= 400) {
      metrics.errors.total++;
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
      
      metrics.errors.recent.push({
        endpoint,
        statusCode: res.statusCode,
        timestamp: Date.now(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Keep only last 50 errors to reduce memory usage
      if (metrics.errors.recent.length > 50) {
        metrics.errors.recent = metrics.errors.recent.slice(-50);
      }
    }

    originalEnd.apply(this, args);
  };

  next();
};

// System health monitoring
const getSystemHealth = () => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const loadAverage = os.loadavg();

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      human: formatUptime(uptime)
    },
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024), // MB
      total: Math.round(memory.heapTotal / 1024 / 1024), // MB
      external: Math.round(memory.external / 1024 / 1024), // MB
      rss: Math.round(memory.rss / 1024 / 1024), // MB
      heap_usage_percent: Math.round((memory.heapUsed / memory.heapTotal) * 100),
      system_usage_percent: Math.round((memory.rss / os.totalmem()) * 100)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
      load_average: loadAverage
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      total_memory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
      free_memory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      cpu_count: os.cpus().length
    }
  };
};

// Performance metrics endpoint
const getPerformanceMetrics = () => {
  const now = Date.now();
  const last24h = now - (24 * 60 * 60 * 1000);
  const last1h = now - (60 * 60 * 1000);

  // Calculate response time statistics
  const recentRequests = metrics.requests.responseTimeHistory.filter(r => r.timestamp > last1h);
  const responseTimes = recentRequests.map(r => r.responseTime);
  
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;

  const p95ResponseTime = responseTimes.length > 0 
    ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] 
    : 0;

  // Calculate error rate
  const recentErrors = metrics.errors.recent.filter(e => e.timestamp > last1h);
  const errorRate = recentRequests.length > 0 
    ? (recentErrors.length / recentRequests.length) * 100 
    : 0;

  // Top endpoints by request count
  const topEndpoints = Object.entries(metrics.requests.byEndpoint)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  // Slowest endpoints
  const endpointPerformance = {};
  recentRequests.forEach(req => {
    if (!endpointPerformance[req.endpoint]) {
      endpointPerformance[req.endpoint] = [];
    }
    endpointPerformance[req.endpoint].push(req.responseTime);
  });

  const slowestEndpoints = Object.entries(endpointPerformance)
    .map(([endpoint, times]) => ({
      endpoint,
      avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
      requestCount: times.length
    }))
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, 5);

  return {
    summary: {
      total_requests: metrics.requests.total,
      avg_response_time: Math.round(avgResponseTime),
      p95_response_time: Math.round(p95ResponseTime),
      error_rate: Math.round(errorRate * 100) / 100,
      uptime_hours: Math.round(process.uptime() / 3600 * 100) / 100
    },
    requests: {
      total: metrics.requests.total,
      by_status: metrics.requests.byStatus,
      last_hour: recentRequests.length,
      top_endpoints: topEndpoints
    },
    performance: {
      avg_response_time: Math.round(avgResponseTime),
      p95_response_time: Math.round(p95ResponseTime),
      slowest_endpoints: slowestEndpoints
    },
    errors: {
      total: metrics.errors.total,
      by_type: metrics.errors.byType,
      error_rate: Math.round(errorRate * 100) / 100,
      recent_errors: metrics.errors.recent.slice(-10)
    },
    system: getSystemHealth()
  };
};

// Health check middleware
const healthCheck = (req, res, next) => {
  metrics.system.lastHealthCheck = Date.now();
  
  const health = getSystemHealth();
  
  // Determine if system is healthy
  const systemMemoryUsage = health.memory.system_usage_percent;
  const heapMemoryUsage = health.memory.heap_usage_percent;
  const isHealthy = systemMemoryUsage < 80 && heapMemoryUsage < 90; // More reasonable thresholds

  if (!isHealthy) {
    health.status = 'unhealthy';
    health.issues = [];
    
    if (systemMemoryUsage > 80) {
      health.issues.push(`High system memory usage: ${systemMemoryUsage}%`);
    }
    if (heapMemoryUsage > 90) {
      health.issues.push(`High heap memory usage: ${heapMemoryUsage}%`);
    }
  }

  req.systemHealth = health;
  next();
};

// Alert system for critical issues
const checkAlerts = () => {
  const health = getSystemHealth();
  const metrics_data = getPerformanceMetrics();
  
  const alerts = [];

  // System memory usage alert
  if (health.memory.system_usage_percent > 70) {
    alerts.push({
      type: 'memory',
      severity: health.memory.system_usage_percent > 85 ? 'critical' : 'warning',
      message: `High system memory usage: ${health.memory.system_usage_percent}%`,
      timestamp: new Date().toISOString()
    });
  }

  // Heap memory usage alert
  if (health.memory.heap_usage_percent > 85) {
    alerts.push({
      type: 'heap_memory',
      severity: health.memory.heap_usage_percent > 95 ? 'critical' : 'warning',
      message: `High heap memory usage: ${health.memory.heap_usage_percent}%`,
      timestamp: new Date().toISOString()
    });
  }

  // High error rate alert
  if (metrics_data.errors.error_rate > 5) {
    alerts.push({
      type: 'error_rate',
      severity: metrics_data.errors.error_rate > 10 ? 'critical' : 'warning',
      message: `High error rate: ${metrics_data.errors.error_rate}%`,
      timestamp: new Date().toISOString()
    });
  }

  // Slow response time alert
  if (metrics_data.performance.avg_response_time > 3000) {
    alerts.push({
      type: 'performance',
      severity: metrics_data.performance.avg_response_time > 5000 ? 'critical' : 'warning',
      message: `Slow average response time: ${metrics_data.performance.avg_response_time}ms`,
      timestamp: new Date().toISOString()
    });
  }

  if (alerts.length > 0) {
    console.log('🚨 System Alerts:', alerts);
    // In production, send alerts to monitoring service (PagerDuty, Slack, etc.)
  }

  return alerts;
};

// Utility functions
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

// Periodic monitoring (run every 5 minutes)
const startPeriodicMonitoring = () => {
  const monitoringInterval = setInterval(() => {
    checkAlerts();
    
    // Clean up old metrics more aggressively
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const oldResponseHistoryLength = metrics.requests.responseTimeHistory.length;
    const oldErrorsLength = metrics.errors.recent.length;
    
    metrics.requests.responseTimeHistory = metrics.requests.responseTimeHistory
      .filter(r => r.timestamp > thirtyMinutesAgo);
    
    metrics.errors.recent = metrics.errors.recent
      .filter(e => e.timestamp > thirtyMinutesAgo);
    
    // Reset endpoint counters if they get too large
    if (Object.keys(metrics.requests.byEndpoint).length > 100) {
      const topEndpoints = Object.entries(metrics.requests.byEndpoint)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
      metrics.requests.byEndpoint = topEndpoints;
    }
    
    // Log cleanup if significant
    const cleanedResponses = oldResponseHistoryLength - metrics.requests.responseTimeHistory.length;
    const cleanedErrors = oldErrorsLength - metrics.errors.recent.length;
    if (cleanedResponses > 0 || cleanedErrors > 0) {
      console.log(`🧹 Cleaned up ${cleanedResponses} response entries and ${cleanedErrors} error entries`);
    }
    
    // Use memory optimizer for cleanup
    try {
      const memoryOptimizer = require('../utils/memoryOptimizer');
      memoryOptimizer.cleanup(metrics, {
        maxArraySize: 300,
        maxObjectSize: 50
      });
      
      // Force garbage collection if needed
      memoryOptimizer.forceGarbageCollection();
    } catch (error) {
      // Fallback to basic GC if memory optimizer fails
      if (global.gc) {
        global.gc();
      }
    }
      
  }, 5 * 60 * 1000); // 5 minutes
  
  // Store interval reference for cleanup
  process.monitoringInterval = monitoringInterval;
};

module.exports = {
  performanceTracker,
  healthCheck,
  getSystemHealth,
  getPerformanceMetrics,
  checkAlerts,
  startPeriodicMonitoring,
  metrics // Export for testing
};