# Token Refresh Implementation

## Overview
This document describes the automatic token refresh implementation with best practices for the PestControl application.

## Features Implemented

### 1. Automatic Token Refresh
- **Response Interceptor**: Automatically detects 401 errors and attempts token refresh
- **Retry Logic**: Retries the original request with the new token after successful refresh
- **Infinite Loop Prevention**: Prevents refresh attempts on auth endpoints

### 2. Token Rotation Support
- **Backend Configuration**: `ROTATE_REFRESH_TOKENS: True` and `BLACKLIST_AFTER_ROTATION: True`
- **Frontend Handling**: Automatically updates both access and refresh tokens when rotation occurs
- **Security**: Old refresh tokens are blacklisted on the backend

### 3. Proactive Token Management
- **Token Validation**: Checks token expiration before making requests
- **Periodic Refresh**: Automatically refreshes tokens every 5 minutes when user is active
- **Smart Authentication**: Considers user authenticated if refresh token is valid (even if access token is expired)

### 4. Error Handling
- **Graceful Degradation**: Falls back to login redirect only when refresh fails
- **Comprehensive Logging**: Detailed console logs for debugging
- **Clean State Management**: Properly clears tokens on authentication failure

## Implementation Details

### API Service (`src/services/api.ts`)

#### Response Interceptor
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Skip refresh for auth endpoints
      if (originalRequest.url?.includes('/token/')) {
        // Redirect to login
      }
      
      // Attempt token refresh
      const refreshResponse = await api.post('/token/refresh/', { refresh: refreshToken });
      const { access, refresh: newRefresh } = refreshResponse.data;
      
      // Update tokens
      localStorage.setItem('access_token', access);
      if (newRefresh) {
        localStorage.setItem('refresh_token', newRefresh);
      }
      
      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    }
  }
);
```

#### Token Utilities
- `isTokenExpired(token)`: Checks if a JWT token is expired
- `ensureValidToken()`: Proactively refreshes token if needed
- `isAuthenticated()`: Checks if user has valid tokens

### Auth Context (`src/contexts/AuthContext.tsx`)

#### Initialization
- Validates existing tokens on app startup
- Automatically refreshes expired tokens
- Clears invalid tokens

#### Periodic Refresh
- Runs every 5 minutes when user is logged in
- Keeps tokens fresh without user interaction
- Handles refresh failures gracefully

## Testing

### Development Testing
Use the browser console to test token refresh functionality:

```javascript
// Run all tests
window.testTokenRefresh.runAllTests();

// Test individual components
window.testTokenRefresh.testTokenStorage();
window.testTokenRefresh.testAuthenticationStatus();
window.testTokenRefresh.testManualRefresh();
window.testTokenRefresh.testProactiveValidation();
```

### Test Scenarios
1. **Normal Operation**: User works normally, tokens refresh automatically
2. **Token Expiry**: Access token expires, automatically refreshed
3. **Refresh Token Expiry**: Refresh token expires, user redirected to login
4. **Network Issues**: Refresh fails, user redirected to login
5. **Token Rotation**: Backend rotates tokens, frontend handles seamlessly

## Security Considerations

### Token Storage
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Access tokens have short lifetime (60 minutes)
- Refresh tokens have longer lifetime (7 days)

### Token Rotation
- Refresh tokens are rotated on each use
- Old refresh tokens are blacklisted
- Prevents token replay attacks

### Error Handling
- No sensitive information leaked in error messages
- Proper cleanup of tokens on failure
- Secure redirect to login page

## Configuration

### Backend Settings (`backend/settings.py`)
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}
```

### Frontend Settings
- Periodic refresh interval: 5 minutes
- Token validation: On app initialization and before requests
- Retry logic: Single retry attempt per request

## Best Practices Implemented

1. **Automatic Refresh**: No user intervention required
2. **Token Rotation**: Enhanced security with rotating refresh tokens
3. **Proactive Management**: Tokens refreshed before expiry
4. **Error Recovery**: Graceful handling of refresh failures
5. **Performance**: Minimal impact on user experience
6. **Security**: Proper token cleanup and validation
7. **Logging**: Comprehensive debugging information
8. **Testing**: Built-in test utilities for development

## Monitoring and Debugging

### Console Logs
- Token refresh attempts and results
- Authentication status changes
- Error conditions and recovery

### Browser DevTools
- Network tab shows refresh requests
- Application tab shows token storage
- Console shows detailed logs

## Future Improvements

1. **HttpOnly Cookies**: Move tokens to httpOnly cookies for better security
2. **Refresh Queue**: Handle multiple simultaneous refresh attempts
3. **Offline Support**: Cache requests when offline, retry when online
4. **Analytics**: Track refresh success/failure rates
5. **User Feedback**: Show loading states during refresh

## Troubleshooting

### Common Issues
1. **Infinite Redirects**: Check for auth endpoint exclusions
2. **Token Not Refreshing**: Verify backend token rotation settings
3. **Premature Logout**: Check refresh token expiration
4. **Network Errors**: Verify API endpoint configuration

### Debug Steps
1. Check browser console for error messages
2. Verify token storage in Application tab
3. Test manual refresh using test utilities
4. Check network requests in Network tab
