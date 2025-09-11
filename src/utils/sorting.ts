/**
 * Sorting utilities for API requests
 * Provides consistent sorting functionality across the application
 */

export interface SortOption {
  readonly value: string;
  readonly label: string;
  readonly direction: 'asc' | 'desc';
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Common sorting options for different entities
 */
export const SORT_OPTIONS = {
  // Job Cards sorting options
  JOB_CARDS: [
    { value: '-created_at', label: 'Latest First', direction: 'desc' as const },
    { value: 'created_at', label: 'Oldest First', direction: 'asc' as const },
    { value: '-schedule_date', label: 'Schedule Date (Latest)', direction: 'desc' as const },
    { value: 'schedule_date', label: 'Schedule Date (Earliest)', direction: 'asc' as const },
    { value: 'client__full_name', label: 'Client Name (A-Z)', direction: 'asc' as const },
    { value: '-client__full_name', label: 'Client Name (Z-A)', direction: 'desc' as const },
    { value: 'status', label: 'Status (A-Z)', direction: 'asc' as const },
    { value: '-status', label: 'Status (Z-A)', direction: 'desc' as const },
  ],

  // Inquiries sorting options
  INQUIRIES: [
    { value: '-created_at', label: 'Latest First', direction: 'desc' as const },
    { value: 'created_at', label: 'Oldest First', direction: 'asc' as const },
    { value: 'name', label: 'Name (A-Z)', direction: 'asc' as const },
    { value: '-name', label: 'Name (Z-A)', direction: 'desc' as const },
    { value: 'status', label: 'Status (A-Z)', direction: 'asc' as const },
    { value: '-status', label: 'Status (Z-A)', direction: 'desc' as const },
    { value: 'city', label: 'City (A-Z)', direction: 'asc' as const },
    { value: '-city', label: 'City (Z-A)', direction: 'desc' as const },
  ],

  // Clients sorting options
  CLIENTS: [
    { value: '-created_at', label: 'Latest First', direction: 'desc' as const },
    { value: 'created_at', label: 'Oldest First', direction: 'asc' as const },
    { value: 'full_name', label: 'Name (A-Z)', direction: 'asc' as const },
    { value: '-full_name', label: 'Name (Z-A)', direction: 'desc' as const },
    { value: 'city', label: 'City (A-Z)', direction: 'asc' as const },
    { value: '-city', label: 'City (Z-A)', direction: 'desc' as const },
  ],
} as const;

/**
 * Parse sorting value to get field and direction
 */
export const parseSortValue = (sortValue: string): SortConfig => {
  const isDescending = sortValue.startsWith('-');
  const field = isDescending ? sortValue.substring(1) : sortValue;
  const direction = isDescending ? 'desc' : 'asc';
  
  return { field, direction };
};

/**
 * Build sorting value from field and direction
 */
export const buildSortValue = (field: string, direction: 'asc' | 'desc'): string => {
  return direction === 'desc' ? `-${field}` : field;
};

/**
 * Get default sorting for different entity types
 */
export const getDefaultSorting = (entityType: keyof typeof SORT_OPTIONS): string => {
  return SORT_OPTIONS[entityType][0]?.value || '-created_at';
};

/**
 * Validate if a sort value is valid for the given entity type
 */
export const isValidSortValue = (sortValue: string, entityType: keyof typeof SORT_OPTIONS): boolean => {
  const options = SORT_OPTIONS[entityType] as readonly SortOption[];
  return options.some((option: SortOption) => option.value === sortValue);
};

/**
 * Get sort option by value
 */
export const getSortOption = (sortValue: string, entityType: keyof typeof SORT_OPTIONS): SortOption | undefined => {
  const options = SORT_OPTIONS[entityType] as readonly SortOption[];
  return options.find((option: SortOption) => option.value === sortValue);
};

/**
 * Add sorting parameter to API request params
 */
export const addSortingToParams = (params: Record<string, any>, sortValue: string): Record<string, any> => {
  return {
    ...params,
    ordering: sortValue,
  };
};
