/**
 * Cache for tool results
 */
export class ResultCache {
  private cache = new Map<string, CacheEntry>();
  private logger: Logger;
  private maxSize: number;
  private ttlMs: number;

  constructor(logger: Logger, options: CacheOptions = {}) {
    this.logger = logger;
    this.maxSize = options.maxSize || 1000;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get cached result
   */
  get(key: string): ToolResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);

    // Mark result as cached
    return {
      ...entry.result,
      metadata: {
        ...entry.result.metadata,
        cached: true
      }
    };
  }

  /**
   * Store result in cache
   */
  set(key: string, result: ToolResult): void {
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    this.logger.debug(`Cached result: ${key}`);
  }

  /**
   * Check if result is cached
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttlMs) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      if (age > this.ttlMs) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

interface CacheEntry {
  result: ToolResult;
  timestamp: number;
}

interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  expired: number;
  hitRate: number;
}