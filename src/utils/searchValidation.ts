/**
 * Search validation utilities for the PestControl Management application
 * Provides comprehensive validation for search inputs including mobile numbers, names, and IDs
 */

export interface SearchValidationResult {
  isValid: boolean;
  errorMessage?: string;
  searchType: 'mobile' | 'name' | 'id' | 'mixed';
}

/**
 * Validates search input based on different criteria
 * @param query - The search query to validate
 * @returns SearchValidationResult with validation status and type
 */
export function validateSearchInput(query: string): SearchValidationResult {
  // Trim whitespace
  const trimmed = query.trim();

  // Empty input is valid (will show all results)
  if (!trimmed) {
    return {
      isValid: true,
      searchType: 'mixed'
    };
  }

  // Check for invalid characters (allow alphanumeric, spaces, hyphens, underscores, dots, commas)
  const validCharsRegex = /^[a-zA-Z0-9\s\-_.,]+$/;
  if (!validCharsRegex.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Search query contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, dots, and commas are allowed.',
      searchType: 'mixed'
    };
  }

  // Check if it's a pure number (mobile number or ID)
  if (/^\d+$/.test(trimmed)) {
    // If it's exactly 10 digits, it's a mobile number
    if (trimmed.length === 10) {
      return {
        isValid: true,
        searchType: 'mobile'
      };
    }
    // If it's less than 10 digits, it could be an ID
    if (trimmed.length >= 1 && trimmed.length <= 6) {
      return {
        isValid: true,
        searchType: 'id'
      };
    }
    // If it's more than 10 digits, it's invalid
    return {
      isValid: false,
      errorMessage: 'Mobile number must be exactly 10 digits. For ID search, use 1-6 digits.',
      searchType: 'mobile'
    };
  }

  // Check if it's a name (contains letters)
  if (/[a-zA-Z]/.test(trimmed)) {
    // Minimum 3 characters for name search
    if (trimmed.length >= 3) {
      return {
        isValid: true,
        searchType: 'name'
      };
    }
    return {
      isValid: false,
      errorMessage: 'Name search must be at least 3 characters long.',
      searchType: 'name'
    };
  }

  // Mixed content (letters and numbers)
  if (trimmed.length >= 3) {
    return {
      isValid: true,
      searchType: 'mixed'
    };
  }

  return {
    isValid: false,
    errorMessage: 'Search query must be at least 3 characters long.',
    searchType: 'mixed'
  };
}

/**
 * Formats search query for better user experience
 * @param query - The search query to format
 * @returns Formatted query string
 */
export function formatSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' '); // Remove extra spaces
}

/**
 * Gets search placeholder text based on context
 * @param context - The search context (jobcards, society, etc.)
 * @returns Appropriate placeholder text
 */
export function getSearchPlaceholder(context: string = 'general'): string {
  switch (context.toLowerCase()) {
    case 'jobcards':
    case 'society':
      return 'Search by name, mobile, or ID';
    case 'inquiries':
      return 'Search by name, mobile, or inquiry ID';
    case 'renewals':
      return 'Search by client name or job card ID';
    default:
      return 'Search by name, mobile, or ID';
  }
}

/**
 * Debounce function to limit search API calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Search input change handler with validation
 * @param value - Input value
 * @param setSearchQuery - State setter for search query
 * @param setSearchError - State setter for search error
 * @returns Formatted and validated search query
 */
export function handleSearchInputChange(
  value: string,
  setSearchQuery: (value: string) => void,
  setSearchError: (error: string | null) => void
): string {
  const formattedValue = formatSearchQuery(value);
  setSearchQuery(formattedValue);
  
  // Clear error when user starts typing
  if (value !== '') {
    setSearchError(null);
  }
  
  return formattedValue;
}

/**
 * Search submission handler with validation
 * @param query - Search query to validate
 * @param setSearchError - State setter for search error
 * @param onValidSearch - Callback for valid search
 * @returns Boolean indicating if search should proceed
 */
export function handleSearchSubmission(
  query: string,
  setSearchError: (error: string | null) => void,
  onValidSearch: () => void
): boolean {
  const validation = validateSearchInput(query);
  
  if (!validation.isValid) {
    setSearchError(validation.errorMessage || 'Invalid search query');
    return false;
  }
  
  setSearchError(null);
  onValidSearch();
  return true;
}
