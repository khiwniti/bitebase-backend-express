/**
 * Admin middleware for role-based access control
 */

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Middleware to check if user has admin or specific permissions
 */
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check specific permissions for other roles
    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Admin permissions enum
 */
const ADMIN_PERMISSIONS = {
  // SEO Management
  SEO_MANAGE: 'seo:manage',
  SEO_ANALYTICS: 'seo:analytics',
  SEO_KEYWORDS: 'seo:keywords',
  
  // Content Management
  BLOG_CREATE: 'blog:create',
  BLOG_EDIT: 'blog:edit',
  BLOG_DELETE: 'blog:delete',
  BLOG_PUBLISH: 'blog:publish',
  
  // Marketing
  MARKETING_CAMPAIGNS: 'marketing:campaigns',
  MARKETING_ANALYTICS: 'marketing:analytics',
  MARKETING_AUTOMATION: 'marketing:automation',
  
  // User Management
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_ROLES: 'user:roles',
  
  // Restaurant Management
  RESTAURANT_VIEW_ALL: 'restaurant:view_all',
  RESTAURANT_EDIT_ALL: 'restaurant:edit_all',
  RESTAURANT_ANALYTICS: 'restaurant:analytics',
  
  // System Management
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
  
  // API Management
  API_KEYS: 'api:keys',
  API_USAGE: 'api:usage',
  API_LIMITS: 'api:limits'
};

/**
 * Get all permissions for admin role
 */
const getAdminPermissions = () => {
  return Object.values(ADMIN_PERMISSIONS);
};

/**
 * Check if user can perform SEO operations
 */
const canManageSEO = (req, res, next) => {
  requirePermission([
    ADMIN_PERMISSIONS.SEO_MANAGE,
    ADMIN_PERMISSIONS.SEO_ANALYTICS,
    ADMIN_PERMISSIONS.SEO_KEYWORDS
  ])(req, res, next);
};

/**
 * Check if user can manage blog content
 */
const canManageBlog = (req, res, next) => {
  requirePermission([
    ADMIN_PERMISSIONS.BLOG_CREATE,
    ADMIN_PERMISSIONS.BLOG_EDIT,
    ADMIN_PERMISSIONS.BLOG_PUBLISH
  ])(req, res, next);
};

/**
 * Check if user can manage marketing
 */
const canManageMarketing = (req, res, next) => {
  requirePermission([
    ADMIN_PERMISSIONS.MARKETING_CAMPAIGNS,
    ADMIN_PERMISSIONS.MARKETING_ANALYTICS
  ])(req, res, next);
};

module.exports = {
  requireAdmin,
  requirePermission,
  ADMIN_PERMISSIONS,
  getAdminPermissions,
  canManageSEO,
  canManageBlog,
  canManageMarketing
};