/**
 * Shared Cache Utility
 *
 * Centralized caching system to eliminate DRY violations across providers
 * with configurable TTL and automatic cleanup.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class ProviderCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private ttl: number) {
    // Set up periodic cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cached value if not expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Dispose of cache and cleanup timer
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

/**
 * Cache TTL constants for different provider types
 */
export const CACHE_TTL = {
  COMPLETION: 5 * 60 * 1000,      // 5 minutes for completions
  HOVER: 10 * 60 * 1000,          // 10 minutes for hover info
  CODE_ACTION: 5 * 60 * 1000,     // 5 minutes for code actions
  DIAGNOSTICS: 30 * 60 * 1000     // 30 minutes for diagnostics
} as const;