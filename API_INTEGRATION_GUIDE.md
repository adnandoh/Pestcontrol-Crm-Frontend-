# API Integration Guide - PestControl Frontend

## 🚀 Overview

This guide covers the enhanced API integration for the PestControl CRM frontend with support for both local development and Railway production environments.

## 📁 File Structure

```
src/
├── config/
│   └── api.config.ts          # Environment-aware API configuration
├── services/
│   ├── api.ts                 # Original API service (legacy)
│   ├── api.enhanced.ts        # Enhanced API service with best practices
│   └── api.migration.ts       # Migration helper
└── types/
    └── index.ts              # TypeScript type definitions
```

## 🌍 Environment Configuration

### Local Development
```bash
# .env.local
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG_MODE=true
```

### Production (Railway)
```bash
# .env.production
REACT_APP_API_BASE_URL=https://pestcontrol-backend-production.up.railway.app/api
REACT_APP_ENVIRONMENT=production
REACT_APP_DEBUG_MODE=false
```

## 🔧 Features

### ✅ Enhanced API Service Features
- **Environment Detection**: Automatically detects Railway vs local environment
- **Token Management**: Secure JWT token storage and refresh
- **Retry Logic**: Automatic retry for failed network requests
- **Error Handling**: Comprehensive error transformation and logging
- **Health Monitoring**: Background API health checks
- **Request Logging**: Detailed request/response logging in development
- **Type Safety**: Full TypeScript support with proper types

### ✅ API Endpoints Supported
- **Authentication**: Login, refresh, verify tokens
- **Clients**: CRUD operations with search and pagination
- **Inquiries**: Management and conversion to job cards
- **Job Cards**: Full lifecycle management with statistics
- **Renewals**: Tracking and completion management

## 🚀 Usage Examples

### Authentication
```typescript
import { authService } from '../services/api.enhanced';

// Login
const tokens = await authService.login('username', 'password');

// Check if authenticated
const isAuth = authService.isAuthenticated();

// Get user data
const userData = authService.getUserData();

// Logout
authService.logout();
```

### Client Management
```typescript
import { clientService } from '../services/api.enhanced';

// Get clients with search
const clients = await clientService.getClients({ 
  q: 'search term',
  city: 'Mumbai',
  page: 1 
});

// Create client
const newClient = await clientService.createClient({
  full_name: 'John Doe',
  mobile: '9876543210',
  city: 'Mumbai'
});
```

### Job Cards with Statistics
```typescript
import { jobCardService } from '../services/api.enhanced';

// Get job cards
const jobCards = await jobCardService.getJobCards({
  status: 'WIP',
  from: '2024-01-01',
  to: '2024-12-31'
});

// Get statistics
const stats = await jobCardService.getStatistics();

// Update payment status
const updated = await jobCardService.updatePaymentStatus(123, 'Paid');
```

## 🔄 Migration from Old API

### Step 1: Update Imports
```typescript
// OLD
import { authService } from '../services/api';

// NEW
import { authService } from '../services/api.enhanced';
```

### Step 2: Use New Features (Optional)
```typescript
// Health check
import { healthService } from '../services/api.enhanced';
const health = await healthService.check();

// Enhanced error handling is automatic
// Retry logic is automatic
// Token refresh is automatic
```

## 📦 NPM Scripts

### Development
```bash
# Start with local API
npm run start:local

# Start with production API (for testing)
npm run start:prod

# Health check
npm run health-check
```

### Production Build
```bash
# Build for local deployment
npm run build:local

# Build for production (Railway)
npm run build:prod

# Analyze bundle
npm run analyze
```

## 🔧 Configuration Options

### API Configuration (api.config.ts)
```typescript
export const apiConfig = {
  baseURL: 'auto-detected',           // Environment-based
  timeout: 10000,                     // Request timeout
  retryAttempts: 3,                   // Retry failed requests
  retryDelay: 1000,                   // Delay between retries
  healthCheckInterval: 30000,         // Health check frequency
  enableLogging: true,                // Development logging
  logLevel: 'debug',                  // Log level
}
```

### Environment Variables
```bash
# Required
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_ENVIRONMENT=development

# Optional
REACT_APP_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=debug
REACT_APP_REQUEST_TIMEOUT=10000
REACT_APP_HEALTH_CHECK_INTERVAL=30000
REACT_APP_ENABLE_ANALYTICS=false
```

## 🐛 Debugging

### Development Console
The enhanced API service exposes debugging tools in development:

```javascript
// Available in browser console
window.apiServices.auth.login('user', 'pass');
window.apiServices.client.getClients();
window.apiServices.health.check();
```

### Logging Levels
- **debug**: All requests, responses, and internal operations
- **info**: Important operations and status changes
- **warn**: Non-critical issues and fallbacks
- **error**: Errors and failures only

### Health Monitoring
The API automatically monitors backend health and logs status:
```
🔍 [API Debug] Health check: API is healthy
⚠️ [API Warning] Health check: API is unhealthy
```

## 🚀 Deployment

### Local Development
1. Start backend: `python manage.py runserver`
2. Start frontend: `npm run start:local`
3. Access: http://localhost:3000

### Railway Production
1. Build: `npm run build:prod`
2. Deploy to Railway/Vercel/Netlify
3. Environment variables are automatically detected

### Environment Detection
The API automatically detects the environment:
- **Railway**: `*.railway.app` or `*.up.railway.app` domains
- **Production**: `NODE_ENV=production` or `REACT_APP_ENVIRONMENT=production`
- **Development**: Everything else

## 🔒 Security Best Practices

### ✅ Implemented
- Secure token storage in localStorage
- Automatic token refresh
- Request/response sanitization
- CORS-compliant requests
- Environment-based configuration

### ✅ Token Management
- Access tokens automatically attached to requests
- Refresh tokens used for seamless re-authentication
- Automatic logout on token expiration
- Secure storage with error handling

## 📊 API Endpoints

### Base URLs
- **Local**: `http://localhost:8000/api`
- **Production**: `https://pestcontrol-backend-production.up.railway.app/api`

### Versioned Endpoints
- **Clients**: `/v1/clients/`
- **Inquiries**: `/v1/inquiries/`
- **Job Cards**: `/v1/jobcards/`
- **Renewals**: `/v1/renewals/`

### Statistics
- **Job Cards**: `/v1/jobcards/statistics/`
- **Renewals**: `/v1/renewals/upcoming_summary/`

## 🎯 Next Steps

1. **Migration**: Replace old API imports with enhanced version
2. **Testing**: Test all functionality with both local and production APIs
3. **Monitoring**: Set up error reporting for production
4. **Analytics**: Enable usage analytics if needed
5. **Performance**: Monitor API response times and optimize

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check backend CORS configuration
   - Verify frontend domain is whitelisted

2. **Authentication Issues**
   - Clear localStorage and re-login
   - Check token expiration
   - Verify backend authentication endpoints

3. **Network Errors**
   - Check backend health: `npm run health-check`
   - Verify API base URL configuration
   - Check network connectivity

4. **Environment Issues**
   - Verify `.env.local` or `.env.production` files
   - Check environment variable names (must start with `REACT_APP_`)
   - Restart development server after env changes

Your frontend is now equipped with enterprise-grade API integration! 🎉
