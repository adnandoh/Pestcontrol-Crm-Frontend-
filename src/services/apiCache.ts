/**
 * API Caching Service with intelligent cache management
 * Provides request deduplication, caching, and batching capabilities
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class ApiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get data from cache or execute request
   * @param key - Cache key
   * @param requestFn - Function to execute if not cached
   * @param ttl - Time to live in milliseconds
   * @returns Cached data or fresh data
   */
  async get<T>(key: string, requestFn: () => Promise<T>, ttl?: number): Promise<T> {
    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(key)) {
      const pending = this.pendingRequests.get(key)!;
      // If pending request is not too old, return it
      if (Date.now() - pending.timestamp < 30000) { // 30 seconds max
        return pending.promise;
      } else {
        // Remove stale pending request
        this.pendingRequests.delete(key);
      }
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached)) {
      return cached.data;
    }

    // Execute request and cache result
    const promise = requestFn().then(data => {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      });
      this.pendingRequests.delete(key);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Set data in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate cache entry
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalidate cache entries matching pattern
   * @param pattern - Pattern to match (supports wildcards)
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    // Collect keys to delete
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    // Delete collected keys
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Collect expired keys
    this.cache.forEach((entry, key) => {
      if (!this.isValid(entry, now)) {
        keysToDelete.push(key);
      }
    });
    
    // Delete expired keys
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  /**
   * Check if cache entry is valid
   * @param entry - Cache entry
   * @param now - Current timestamp
   * @returns True if valid
   */
  private isValid(entry: CacheEntry<any>, now: number = Date.now()): boolean {
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
export const apiCache = new ApiCacheService();

// Auto-cleanup every 5 minutes
setInterval(() => {
  apiCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Cache key generators for different API endpoints
 */
export const CacheKeys = {
  clients: (params?: any) => `clients:${JSON.stringify(params || {})}`,
  client: (id: number) => `client:${id}`,
  inquiries: (params?: any) => `inquiries:${JSON.stringify(params || {})}`,
  inquiry: (id: number) => `inquiry:${id}`,
  jobCards: (params?: any) => `jobcards:${JSON.stringify(params || {})}`,
  jobCard: (id: number) => `jobcard:${id}`,
  renewals: (params?: any) => `renewals:${JSON.stringify(params || {})}`,
  renewal: (id: number) => `renewal:${id}`,
  statistics: (type: string) => `stats:${type}`,
};

/**
 * Cache TTL constants
 */
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,    // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 15 * 60 * 1000,    // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};
