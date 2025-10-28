/**
 * Multi-level cache with different strategies per level
 */
export class MultiLevelCache {
  private l1Cache: Map<string, CacheEntry>; // Memory cache (fast)
  private l2Cache: LRUCache<string, CacheEntry>; // LRU cache (medium)
  private l3Cache: DiskCache; // Disk cache (slow but persistent)

  constructor(
    private options: CacheOptions
  ) {
    this.l1Cache = new Map();
    this.l2Cache = new LRUCache({
      max: options.l2MaxSize || 1000,
      ttl: options.l2TTL || 1000 * 60 * 60 // 1 hour
    });
    this.l3Cache = new DiskCache(options.l3Path || '.cache');
  }

  /**
   * Get value from cache (checks all levels)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check L1 (memory)
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && !this.isExpired(l1Entry)) {
      return l1Entry.value as T;
    }

    // Check L2 (LRU)
    const l2Entry = this.l2Cache.get(key);
    if (l2Entry && !this.isExpired(l2Entry)) {
      // Promote to L1
      this.l1Cache.set(key, l2Entry);
      return l2Entry.value as T;
    }

    // Check L3 (disk)
    const l3Entry = await this.l3Cache.get(key);
    if (l3Entry && !this.isExpired(l3Entry)) {
      // Promote to L2 and L1
      this.l2Cache.set(key, l3Entry);
      this.l1Cache.set(key, l3Entry);
      return l3Entry.value as T;
    }

    return null;
  }

  /**
   * Set value in cache (writes to all levels)
   */
  async set<T>(
    key: string,
    value: T,
    options?: SetOptions
  ): Promise<void> {
    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      ttl: options?.ttl || this.options.defaultTTL || 1000 * 60 * 60,
      size: this.estimateSize(value)
    };

    // Write to L1
    this.l1Cache.set(key, entry);

    // Write to L2
    this.l2Cache.set(key, entry);

    // Write to L3 (async, don't wait)
    this.l3Cache.set(key, entry).catch(err => {
      console.error('L3 cache write failed:', err);
    });
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    this.l1Cache.delete(key);
    this.l2Cache.delete(key);
    await this.l3Cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
    await this.l3Cache.clear();
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    return JSON.stringify(value).length;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      l1Size: this.l1Cache.size,
      l2Size: this.l2Cache.size,
      l3Size: this.l3Cache.getSize(),
      totalMemoryUsage: this.calculateMemoryUsage()
    };
  }

  private calculateMemoryUsage(): number {
    let total = 0;

    for (const entry of this.l1Cache.values()) {
      total += entry.size;
    }

    return total;
  }
}

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
  size: number;
}

interface CacheOptions {
  l2MaxSize?: number;
  l2TTL?: number;
  l3Path?: string;
  defaultTTL?: number;
}

interface SetOptions {
  ttl?: number;
}

interface CacheStats {
  l1Size: number;
  l2Size: number;
  l3Size: number;
  totalMemoryUsage: number;
}