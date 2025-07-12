# BiteBase Authentication System Documentation

## Overview

The BiteBase authentication system provides secure JWT-based authentication with support for:
- Email/password registration and login
- Google OAuth integration
- JWT token management with refresh tokens
- Role-based authorization
- Password reset functionality
- Email verification

## API Endpoints

### 1. Register New User
**POST** `/api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "company": "Restaurant Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "user",
      "subscription_tier": "basic",
      "subscription_status": "trial"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 604800
  }
}
```

### 2. Login
**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** Same as register

### 3. Google OAuth Login
**POST** `/api/auth/google`

```json
{
  "token": "google-id-token-from-frontend"
}
```

**Response:** Same as register

### 4. Get Current User
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "subscription_tier": "basic",
    "subscription_status": "trial",
    "email_verified": false,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Refresh Token
**POST** `/api/auth/refresh`

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** New token and refresh token

### 6. Logout
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 7. Request Password Reset
**POST** `/api/auth/password-reset`

```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

### 8. Verify Email
**POST** `/api/auth/verify-email`

```json
{
  "token": "verification-token"
}
```

## Frontend Integration

### 1. Update Frontend Auth Service

The frontend already has an auth service at `/frontend/lib/auth-service.ts` that's configured to work with these endpoints.

### 2. Environment Variables

Add to your `.env` files:

**Backend (.env):**
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GOOGLE_CLIENT_ID=your-google-oauth-client-id
DATABASE_URL=postgresql://user:password@localhost:5432/bitebase
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 3. Database Schema

The auth system creates these tables automatically:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  company VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  google_id VARCHAR(255),
  profile_image VARCHAR(500)
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

1. **Password Hashing**: Uses bcrypt with salt rounds of 10
2. **JWT Tokens**: 
   - Access tokens expire in 7 days
   - Refresh tokens expire in 30 days
3. **Rate Limiting**: Applied to all endpoints (100 requests per 15 minutes in production)
4. **CORS**: Configured for allowed origins only
5. **SQL Injection Protection**: Uses parameterized queries
6. **XSS Protection**: Security headers applied

## Testing

Run the test script to verify all endpoints:

```bash
cd backend
node test-auth.js
```

## Middleware Usage

### Protected Routes

Use the `authenticate` middleware to protect routes:

```javascript
const { authenticate } = require('./middleware/auth');

// Protected route
app.get('/api/protected', authenticate, (req, res) => {
  // req.user contains { id, email, role }
  res.json({ user: req.user });
});
```

### Role-Based Access

Use the `authorize` middleware for role-based access:

```javascript
const { authenticate, authorize } = require('./middleware/auth');

// Admin only route
app.get('/api/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Multiple roles
app.get('/api/staff', authenticate, authorize('admin', 'staff'), (req, res) => {
  res.json({ message: 'Staff access granted' });
});
```

### Optional Authentication

Use `optionalAuth` for routes that work with or without authentication:

```javascript
const { optionalAuth } = require('./middleware/auth');

app.get('/api/public', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ message: 'Authenticated user', user: req.user });
  } else {
    res.json({ message: 'Anonymous user' });
  }
});
```

## User Roles

- `user`: Default role for all registered users
- `staff`: Restaurant staff members
- `admin`: System administrators
- `enterprise`: Enterprise customers

## Subscription Tiers

- `basic`: Free tier with limited features
- `pro`: Professional tier with advanced features
- `enterprise`: Custom enterprise solutions

## Subscription Status

- `trial`: New users in trial period
- `active`: Paid subscription active
- `inactive`: Subscription expired or cancelled

## Next Steps

1. **Email Service**: Implement email sending for:
   - Email verification
   - Password reset links
   - Welcome emails

2. **OAuth Providers**: Add more OAuth providers:
   - Facebook
   - Apple
   - Microsoft

3. **Two-Factor Authentication**: Add 2FA support

4. **Session Management**: Add device tracking and session management

5. **Audit Logging**: Log authentication events for security

## Troubleshooting

### Common Issues

1. **"No token provided"**: Ensure Authorization header is set correctly
2. **"Invalid credentials"**: Check email/password combination
3. **"Token expired"**: Use refresh token to get new access token
4. **Database connection errors**: Check DATABASE_URL environment variable

### Debug Mode

In development, the password reset endpoint returns the reset token for testing:

```json
{
  "success": true,
  "message": "...",
  "debug": {
    "resetToken": "actual-reset-token"
  }
}
```

Remove this in production!