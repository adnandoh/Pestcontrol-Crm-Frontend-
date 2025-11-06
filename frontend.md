    # PestControl Frontend - API Documentation

## Overview
This document provides a comprehensive overview of all APIs used in the PestControl frontend application. The frontend is built with React and TypeScript, and communicates with a Django REST Framework backend.

## API Configuration

### Environment Detection
- **Development**: `http://localhost:8000/api`
- **Production**: `https://pestcontrol-backend-production.up.railway.app/api`
- **Auto-detection**: Railway production environment is automatically detected

### Configuration Files
- **Main Config**: `src/config/api.config.ts`
- **API Services**: `src/services/api.ts` (legacy), `src/services/api.enhanced.ts` (enhanced)
- **API Cache**: `src/services/apiCache.ts`

## Authentication APIs

### JWT Token Management
| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/token/` | POST | Obtain JWT access and refresh tokens | `username`, `password` |
| `/api/token/refresh/` | POST | Refresh JWT access token | `refresh` token |
| `/api/token/verify/` | POST | Verify JWT token validity | `token` |

### Authentication Features
- Automatic token refresh on 401 errors
- Token expiration detection
- Secure token storage in localStorage
- Automatic logout on refresh failure

## Core Resource APIs

### 1. Clients API (`/api/v1/clients/`)

#### Endpoints
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/api/v1/clients/` | List all clients with pagination | `q`, `city`, `page`, `is_active` |
| GET | `/api/v1/clients/{id}/` | Get specific client details | `id` |
| POST | `/api/v1/clients/` | Create new client | Client data object |
| PATCH | `/api/v1/clients/{id}/` | Update existing client | `id`, Client data |
| DELETE | `/api/v1/clients/{id}/` | Delete client (soft delete) | `id` |

#### Features
- **Filtering**: By city, active status
- **Search**: By name, mobile, email
- **Ordering**: By created_at, updated_at, full_name, city, mobile
- **Pagination**: Standard pagination support

#### Usage in Frontend
- **Dashboard**: Client statistics
- **Job Cards**: Client selection and creation
- **Edit Job Card**: Client information updates

### 2. Inquiries API (`/api/v1/inquiries/`)

#### Endpoints
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/api/v1/inquiries/` | List all inquiries with pagination | `status`, `page`, `city` |
| GET | `/api/v1/inquiries/{id}/` | Get specific inquiry details | `id` |
| POST | `/api/v1/inquiries/` | Create new inquiry (public) | Inquiry data object |
| PATCH | `/api/v1/inquiries/{id}/` | Update inquiry status/info | `id`, Inquiry data |
| POST | `/api/v1/inquiries/{id}/convert/` | Convert inquiry to job card | `id`, conversion data |
| POST | `/api/v1/inquiries/{id}/mark_as_read/` | Mark inquiry as read | `id` |
| DELETE | `/api/v1/inquiries/{id}/` | Delete inquiry | `id` |

#### Features
- **Public Creation**: No authentication required for creation
- **Status Tracking**: New, Contacted, Converted, Closed
- **Conversion**: Direct conversion to job cards
- **Read Status**: Mark as read/unread functionality

#### Usage in Frontend
- **Inquiries Page**: List, filter, and manage inquiries
- **Dashboard**: New inquiries count
- **Create Job Card**: Convert inquiries to job cards
- **Notifications**: Mark inquiries as read

### 3. Job Cards API (`/api/v1/jobcards/`)

#### Endpoints
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/api/v1/jobcards/` | List all job cards with pagination | `status`, `from`, `to`, `q`, `city`, `page` |
| GET | `/api/v1/jobcards/{id}/` | Get specific job card details | `id` |
| POST | `/api/v1/jobcards/` | Create new job card | Job card data object |
| PATCH | `/api/v1/jobcards/{id}/` | Update job card information | `id`, Job card data |
| GET | `/api/v1/jobcards/check-client/` | Check if client exists by mobile | `mobile` |
| PATCH | `/api/v1/jobcards/{id}/update_payment_status/` | Update payment status | `id`, `payment_status` |
| GET | `/api/v1/jobcards/reference-report/` | Get reference report | None |
| GET | `/api/v1/jobcards/statistics/` | Get job card statistics | None |

#### Features
- **Client Integration**: Create with existing or new client
- **Payment Tracking**: Paid/Unpaid status management
- **Pause/Resume**: Job card pause functionality
- **Reference Tracking**: Track job sources
- **Statistics**: Comprehensive reporting
- **Date Filtering**: Filter by date ranges

#### Usage in Frontend
- **Job Cards Page**: List and manage job cards
- **Society Job Cards**: Specialized view for society jobs
- **Create Job Card**: Create new job cards with client data
- **Edit Job Card**: Update job card information
- **Job Card Detail**: View detailed job card information
- **Dashboard**: Job card statistics
- **Reference Report**: Reference tracking reports

### 4. Renewals API (`/api/v1/renewals/`)

#### Endpoints
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/api/v1/renewals/` | List all renewals with pagination | `upcoming`, `page`, `status`, `urgency_level` |
| GET | `/api/v1/renewals/{id}/` | Get specific renewal details | `id` |
| PATCH | `/api/v1/renewals/{id}/` | Update renewal information | `id`, Renewal data |
| PATCH | `/api/v1/renewals/{id}/mark_completed/` | Mark renewal as completed | `id` |
| GET | `/api/v1/renewals/upcoming_summary/` | Get upcoming renewals summary | None |

#### Features
- **Urgency Levels**: Low, Medium, High, Critical
- **Due Date Tracking**: Automatic urgency calculation
- **Completion Status**: Mark as completed
- **Upcoming Summary**: Dashboard statistics

#### Usage in Frontend
- **Renewals Page**: List and manage renewals
- **Dashboard**: Upcoming renewals summary

## Health Check APIs

### System Health
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/` | GET | System health check |
| `/api/v1/firebase/health/` | GET | Firebase service health check |

## API Service Architecture

### Service Files
1. **api.ts** - Legacy API service with basic functionality
2. **api.enhanced.ts** - Enhanced API service with advanced features
3. **api.migration.ts** - Migration helper for transitioning between services
4. **apiCache.ts** - API response caching service

### Enhanced Features
- **Retry Logic**: Automatic retry for network errors
- **Request/Response Logging**: Comprehensive logging system
- **Health Monitoring**: Automatic health checks
- **Error Handling**: Standardized error transformation
- **Token Management**: Advanced token handling with refresh

### Interceptors
- **Request Interceptor**: Adds authentication tokens and request tracking
- **Response Interceptor**: Handles 401 errors with automatic token refresh

## Frontend Usage Patterns

### Pages Using APIs
1. **Dashboard** - Multiple API calls for statistics
2. **Inquiries** - Full CRUD operations on inquiries
3. **Job Cards** - Complete job card management
4. **Society Job Cards** - Filtered job card view
5. **Create Job Card** - Client checking and job card creation
6. **Edit Job Card** - Job card and client updates
7. **Job Card Detail** - Detailed job card information
8. **Renewals** - Renewal management
9. **Reference Report** - Reference tracking reports

### Common Parameters
- **Pagination**: `page` parameter for all list endpoints
- **Search**: `q` parameter for text search
- **Filtering**: Various filter parameters per endpoint
- **Ordering**: `ordering` parameter for sorting

### Error Handling
- Automatic token refresh on 401 errors
- Network error retry logic
- User-friendly error messages
- Fallback to login on authentication failure

## Security Features
- JWT token-based authentication
- Automatic token refresh
- Secure token storage
- Request/response logging (development only)
- CORS handling for cross-origin requests

## Performance Optimizations
- API response caching
- Request deduplication
- Pagination for large datasets
- Lazy loading of components
- Optimized table rendering

## Development Tools
- API service debugging in browser console
- Health check monitoring
- Request/response logging
- Environment-specific configurations
- Hot reload support

## Total API Count Summary
- **Authentication APIs**: 3 endpoints
- **Client APIs**: 5 endpoints
- **Inquiry APIs**: 7 endpoints  
- **Job Card APIs**: 8 endpoints
- **Renewal APIs**: 5 endpoints
- **Health Check APIs**: 2 endpoints

**Total: 30 API endpoints** used across the frontend application.

## Configuration Environment Variables
- `REACT_APP_API_BASE_URL` - API base URL
- `REACT_APP_ENVIRONMENT` - Environment (development/production)
- `REACT_APP_API_VERSION` - API version
- `REACT_APP_REQUEST_TIMEOUT` - Request timeout
- `REACT_APP_DEBUG_MODE` - Enable debug logging
- `REACT_APP_LOG_LEVEL` - Logging level
- `REACT_APP_ENABLE_ANALYTICS` - Enable analytics
- `REACT_APP_ENABLE_ERROR_REPORTING` - Enable error reporting