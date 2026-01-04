/**
 * Simple In-Memory Cache Utility - Mayo Fix
 * 
 * Provides caching with TTL (Time To Live) support for inventory data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;

    // Clean up expired entries every minute
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Stop the cleanup interval (call on app shutdown)
   */
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.cache.clear();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiresAt < now) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
    };
  }
}

// Export singleton instances for different use cases
export const productsCache = new Cache(10 * 60 * 1000); // 10 minutes
export const categoriesCache = new Cache(10 * 60 * 1000); // 10 minutes
export const warehousesCache = new Cache(10 * 60 * 1000); // 10 minutes
export const suppliersCache = new Cache(10 * 60 * 1000); // 10 minutes
export const settingsCache = new Cache(30 * 60 * 1000); // 30 minutes
export const generalCache = new Cache(5 * 60 * 1000); // 5 minutes
