// API Response Caching Service
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key from URL and params
  generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}${paramString}`;
  }

  // Check if cache entry exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    });

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
    };
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export const apiCache = new ApiCache();

// Auto cleanup every 10 minutes
setInterval(() => {
  apiCache.cleanup();
}, 10 * 60 * 1000);