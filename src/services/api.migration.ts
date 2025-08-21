/**
 * API Migration Guide - Gradually replace old API with enhanced version
 * This file helps transition from the old API to the new enhanced API
 */

// Re-export enhanced services with same interface for backward compatibility
export {
  authService,
  clientService,
  inquiryService,
  jobCardService,
  renewalService,
} from './api.enhanced';

// Migration notes for developers:
/*
1. The enhanced API maintains the same interface as the old API
2. Simply replace imports from './api' to './api.enhanced' or './api.migration'
3. New features available:
   - Environment-aware configuration
   - Automatic retry logic
   - Enhanced error handling
   - Request/response logging
   - Health monitoring
   - Token auto-refresh

4. To migrate a component:
   OLD: import { authService } from '../services/api';
   NEW: import { authService } from '../services/api.enhanced';
   
5. Additional services now available:
   - healthService.check()
   - authService.verifyToken()
   - authService.getUserData()
   - jobCardService.getStatistics()
   - renewalService.getUpcomingSummary()
*/

// Legacy API compatibility layer (if needed)
import { apiClient } from './api.enhanced';

// Export the raw API client for custom requests
export { apiClient };

// Utility function to help with migration
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health/');
    return !!(response && typeof response === 'object');
  } catch {
    return false;
  }
};

export default {
  // Re-export all services for easy import
  auth: require('./api.enhanced').authService,
  client: require('./api.enhanced').clientService,
  inquiry: require('./api.enhanced').inquiryService,
  jobCard: require('./api.enhanced').jobCardService,
  renewal: require('./api.enhanced').renewalService,
  health: require('./api.enhanced').healthService,
};
