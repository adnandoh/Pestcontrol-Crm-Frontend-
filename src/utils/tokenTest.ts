/**
 * Token Refresh Test Utility
 * This file contains utilities to test the token refresh functionality
 * Remove this file after testing is complete
 */

import { authService } from '../services/api';

export const testTokenRefresh = {
  // Test if tokens are properly stored and retrieved
  testTokenStorage: () => {
    console.log('🧪 Testing token storage...');
    
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    console.log('Access token exists:', !!accessToken);
    console.log('Refresh token exists:', !!refreshToken);
    
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiry = new Date(payload.exp * 1000);
        console.log('Access token expires at:', expiry.toLocaleString());
        console.log('Access token is expired:', payload.exp < Date.now() / 1000);
      } catch (error) {
        console.error('Error parsing access token:', error);
      }
    }
    
    if (refreshToken) {
      try {
        const payload = JSON.parse(atob(refreshToken.split('.')[1]));
        const expiry = new Date(payload.exp * 1000);
        console.log('Refresh token expires at:', expiry.toLocaleString());
        console.log('Refresh token is expired:', payload.exp < Date.now() / 1000);
      } catch (error) {
        console.error('Error parsing refresh token:', error);
      }
    }
  },

  // Test authentication status
  testAuthenticationStatus: () => {
    console.log('🧪 Testing authentication status...');
    
    const isAuth = authService.isAuthenticated();
    console.log('User is authenticated:', isAuth);
    
    return isAuth;
  },

  // Test manual token refresh
  testManualRefresh: async () => {
    console.log('🧪 Testing manual token refresh...');
    
    try {
      const newToken = await authService.refreshToken();
      console.log('✅ Manual refresh successful');
      console.log('New access token:', newToken.substring(0, 20) + '...');
      return true;
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      return false;
    }
  },

  // Test proactive token validation
  testProactiveValidation: async () => {
    console.log('🧪 Testing proactive token validation...');
    
    try {
      const validToken = await authService.ensureValidToken();
      if (validToken) {
        console.log('✅ Proactive validation successful');
        console.log('Valid token:', validToken.substring(0, 20) + '...');
        return true;
      } else {
        console.log('❌ No valid token available');
        return false;
      }
    } catch (error) {
      console.error('❌ Proactive validation failed:', error);
      return false;
    }
  },

  // Run all tests
  runAllTests: async function() {
    console.log('🚀 Running all token refresh tests...');
    console.log('=====================================');
    
    this.testTokenStorage();
    console.log('---');
    
    const isAuth = this.testAuthenticationStatus();
    console.log('---');
    
    if (isAuth) {
      await this.testManualRefresh();
      console.log('---');
      
      await this.testProactiveValidation();
    } else {
      console.log('⚠️ User not authenticated, skipping refresh tests');
    }
    
    console.log('=====================================');
    console.log('✅ All tests completed');
  }
};

// Make it available in development
if (process.env.NODE_ENV === 'development') {
  (window as any).testTokenRefresh = testTokenRefresh;
  console.log('🧪 Token refresh test utilities available at window.testTokenRefresh');
}
