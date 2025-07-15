/**
 * Enterprise Security Middleware
 * Implements rate limiting, security headers, and audit logging
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const compression = require('compression');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`🚫 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Too many requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limiting
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many requests from this IP, please try again later.'
  ),

  // Strict rate limiting for AI endpoints
  ai: createRateLimiter(
    60 * 1000, // 1 minute
    10, // 10 requests per minute
    'AI endpoint rate limit exceeded. Please wait before making more requests.'
  ),

  // Authentication rate limiting
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per window
    'Too many authentication attempts, please try again later.'
  ),

  // Payment endpoint rate limiting
  payments: createRateLimiter(
    60 * 1000, // 1 minute
    3, // 3 requests per minute
    'Payment endpoint rate limit exceeded. Please wait before retrying.'
  ),

  // Search endpoint rate limiting
  search: createRateLimiter(
    60 * 1000, // 1 minute
    20, // 20 searches per minute
    'Search rate limit exceeded. Please wait before searching again.'
  )
};

// Speed limiting (progressive delay)
const speedLimiters = {
  general: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per window at full speed
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
  }),

  ai: slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 5, // Allow 5 requests per minute at full speed
    delayMs: 1000, // Add 1s delay per request after delayAfter
    maxDelayMs: 10000, // Maximum delay of 10 seconds
  })
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
});

// Compression middleware
const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
});

// Audit logging middleware
const auditLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Log request details
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID,
  };

  // Override res.send to capture response details
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log response details
    console.log(`📊 API Request: ${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms - IP: ${req.ip}`);
    
    // Store audit log for enterprise customers
    if (req.user?.subscriptionTier === 'ENTERPRISE') {
      // In production, store this in a database
      console.log(`🔍 Enterprise Audit Log:`, {
        ...logData,
        statusCode: res.statusCode,
        responseTime,
        dataSize: data ? Buffer.byteLength(data, 'utf8') : 0
      });
    }

    originalSend.call(this, data);
  };

  next();
};

// IP whitelist middleware (for enterprise customers)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }

    const clientIP = req.ip;
    const isAllowed = allowedIPs.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation support would go here
        return false;
      }
      return clientIP === ip;
    });

    if (!isAllowed) {
      console.log(`🚫 IP ${clientIP} not in whitelist`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource.'
      });
    }

    next();
  };
};

// Request size limiting
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds maximum allowed size of ${maxSize}`
      });
    }

    next();
  };
};

// Helper function to parse size strings
const parseSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  return Math.floor(value * units[unit]);
};

// Security monitoring middleware
const securityMonitor = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // XSS attempts
    /union\s+select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /eval\s*\(/gi, // Code injection
  ];

  const checkString = `${req.url} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.log(`🚨 Security Alert: Suspicious request detected from IP ${req.ip}: ${pattern}`);
      
      // In production, you might want to:
      // 1. Log to security monitoring system
      // 2. Temporarily block the IP
      // 3. Send alerts to security team
      
      return res.status(400).json({
        error: 'Bad request',
        message: 'Request contains invalid characters or patterns.'
      });
    }
  }

  next();
};

module.exports = {
  rateLimiters,
  speedLimiters,
  securityHeaders,
  compressionMiddleware,
  auditLogger,
  ipWhitelist,
  requestSizeLimit,
  securityMonitor,
  
  // Convenience functions for applying multiple security measures
  basicSecurity: () => [
    securityHeaders,
    compressionMiddleware,
    auditLogger,
    securityMonitor,
    rateLimiters.general
  ],

  enterpriseSecurity: (options = {}) => [
    securityHeaders,
    compressionMiddleware,
    auditLogger,
    securityMonitor,
    ipWhitelist(options.allowedIPs),
    requestSizeLimit(options.maxRequestSize),
    rateLimiters.general
  ]
};