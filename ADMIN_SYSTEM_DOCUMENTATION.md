# BiteBase Admin System Documentation

## Overview

The BiteBase admin system provides comprehensive tools for managing SEO optimization, content creation, marketing campaigns, and platform administration. Admin users have elevated privileges to manage all aspects of the platform.

## Admin Authentication

### Login Credentials
- **Email**: `admin@bitebase.app`
- **Password**: `Libralytics1234!*` (change in production)
- **Role**: `admin`

### Authentication Flow
```javascript
// Login
POST /api/auth/login
{
  "email": "admin@bitebase.app",
  "password": "Libralytics1234!*"
}

// Response includes JWT token for subsequent requests
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "role": "admin",
      ...
    }
  }
}
```

## Admin Endpoints

### 1. Dashboard
```
GET /api/admin/dashboard
Authorization: Bearer {token}
```
Returns:
- Platform statistics (users, restaurants, blog posts, SEO score)
- Recent activity feed
- SEO metrics (organic traffic, rankings, backlinks)

### 2. SEO Management

#### SEO Overview
```
GET /api/admin/seo/overview
Authorization: Bearer {token}
```
Returns:
- Page-level SEO data
- Keyword tracking statistics
- SEO scores for each page

#### Update Page SEO
```
PUT /api/admin/seo/page/:pageId
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "New Page Title",
  "metaDescription": "Updated meta description",
  "keywords": ["keyword1", "keyword2"],
  "canonicalUrl": "https://bitebase.com/page"
}
```

### 3. Blog Management

#### List Blog Posts
```
GET /api/admin/blog/posts
Authorization: Bearer {token}
```

#### Create Blog Post
```
POST /api/admin/blog/posts
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Blog Post Title",
  "content": "Full blog content in HTML or Markdown",
  "excerpt": "Short description",
  "categories": ["SEO", "Marketing"],
  "tags": ["restaurant", "analytics"],
  "metaTitle": "SEO-optimized title",
  "metaDescription": "SEO-optimized description",
  "featuredImage": "https://example.com/image.jpg"
}
```

#### Update Blog Post
```
PUT /api/admin/blog/posts/:postId
Authorization: Bearer {token}
```

#### Publish Blog Post
```
POST /api/admin/blog/posts/:postId/publish
Authorization: Bearer {token}
```

### 4. Marketing Management

#### List Campaigns
```
GET /api/admin/marketing/campaigns
Authorization: Bearer {token}
```
Returns active, scheduled, and completed marketing campaigns with metrics.

### 5. User Management

#### List All Users
```
GET /api/admin/users
Authorization: Bearer {token}
```

### 6. System Configuration

#### Get Configuration
```
GET /api/admin/config
Authorization: Bearer {token}
```
Returns system-wide configuration for SEO, blog, email, and other settings.

## Permission System

### Admin Permissions
The admin role automatically has all permissions:

#### SEO Permissions
- `seo:manage` - Full SEO management
- `seo:analytics` - View SEO analytics
- `seo:keywords` - Manage keyword tracking

#### Content Permissions
- `blog:create` - Create new blog posts
- `blog:edit` - Edit existing posts
- `blog:delete` - Delete posts
- `blog:publish` - Publish/unpublish posts

#### Marketing Permissions
- `marketing:campaigns` - Manage campaigns
- `marketing:analytics` - View marketing analytics
- `marketing:automation` - Configure automation

#### User Permissions
- `user:view` - View all users
- `user:edit` - Edit user details
- `user:delete` - Delete users
- `user:roles` - Manage user roles

#### System Permissions
- `system:config` - Modify system configuration
- `system:logs` - View system logs
- `system:backup` - Manage backups
- `api:keys` - Manage API keys

## Middleware Usage

### Require Admin Role
```javascript
const { requireAdmin } = require('../middleware/admin');

router.get('/admin-only', authenticate, requireAdmin, (req, res) => {
  // Only accessible by admin users
});
```

### Require Specific Permissions
```javascript
const { requirePermission, ADMIN_PERMISSIONS } = require('../middleware/admin');

router.post('/seo/update', 
  authenticate, 
  requirePermission([ADMIN_PERMISSIONS.SEO_MANAGE]), 
  (req, res) => {
    // Accessible by users with SEO management permission
  }
);
```

### Pre-built Permission Checks
```javascript
const { canManageSEO, canManageBlog, canManageMarketing } = require('../middleware/admin');

// SEO routes
router.use('/seo', authenticate, canManageSEO);

// Blog routes
router.use('/blog', authenticate, canManageBlog);

// Marketing routes
router.use('/marketing', authenticate, canManageMarketing);
```

## Frontend Integration

### Admin Panel Routes
The admin panel should include the following sections:

1. **Dashboard** (`/admin`)
   - Overview statistics
   - Recent activity
   - Quick actions

2. **SEO Center** (`/admin/seo`)
   - Page optimization
   - Keyword tracking
   - Technical SEO settings
   - SEO reports

3. **Content Studio** (`/admin/content`)
   - Blog post editor
   - Media library
   - Content calendar
   - Categories & tags

4. **Marketing Hub** (`/admin/marketing`)
   - Campaign manager
   - Email templates
   - Analytics dashboard
   - A/B testing

5. **User Management** (`/admin/users`)
   - User list with filters
   - Role assignment
   - Activity logs

6. **Settings** (`/admin/settings`)
   - Platform configuration
   - API keys
   - Integrations

### Example Frontend Code
```javascript
// Check if user is admin
const isAdmin = user?.role === 'admin';

// Admin-only component
{isAdmin && (
  <AdminDashboard />
)}

// API call with admin token
const response = await fetch('/api/admin/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Security Best Practices

1. **Token Security**
   - Store admin tokens securely (httpOnly cookies preferred)
   - Implement token refresh mechanism
   - Set appropriate token expiration

2. **Access Control**
   - Always verify admin role on backend
   - Use middleware for consistent permission checking
   - Log all admin actions for audit trail

3. **Data Protection**
   - Sanitize all inputs, especially for blog content
   - Implement CSRF protection
   - Use rate limiting on admin endpoints

4. **Production Deployment**
   - Change default admin password immediately
   - Enable 2FA for admin accounts
   - Use HTTPS for all admin traffic
   - Implement IP whitelisting if possible

## Testing

### Manual Testing
1. Run `node test-admin-auth.js` to test admin authentication
2. Run `node test-admin-routes.js` to test all admin endpoints

### Integration Testing
```javascript
describe('Admin Routes', () => {
  it('should require admin role for dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(403);
  });
  
  it('should allow admin access to dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
  });
});
```

## Database Schema (Production)

### Users Table Enhancement
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
```

### Admin Activity Log
```sql
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Monitoring & Analytics

### Key Metrics to Track
1. **Admin Activity**
   - Login frequency
   - Actions performed
   - Error rates

2. **Content Performance**
   - Blog post views
   - SEO improvements
   - Engagement metrics

3. **System Health**
   - API response times
   - Error logs
   - Resource usage

### Recommended Tools
- **Logging**: Winston or Bunyan
- **Monitoring**: Datadog or New Relic
- **Analytics**: Google Analytics + Custom Dashboard
- **Error Tracking**: Sentry

## Future Enhancements

1. **Advanced SEO Tools**
   - Automated SEO audits
   - Competitor analysis
   - Schema markup generator

2. **Content AI Assistant**
   - AI-powered content suggestions
   - Automated keyword optimization
   - Content performance predictions

3. **Marketing Automation**
   - Drip campaign builder
   - Behavioral triggers
   - Advanced segmentation

4. **Multi-tenant Administration**
   - Restaurant group management
   - Franchise administration
   - White-label capabilities