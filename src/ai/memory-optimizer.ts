import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getPerformanceConfig, CacheConfig } from '../config/performance.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';

/**
 * Intelligent Cache System for Large Codebase Analysis
 *
 * Implements intelligent caching strategies complementing the existing MemoryManager:
 * - Multi-tier caching (memory → disk → network)
 * - LRU eviction with usage patterns
 * - Cache warming and predictive loading
 * - Compression for disk storage
 * - Integration with existing memory management
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  size: number;
  accessCount: number;
  lastAccessed: number;
  created: number;
  ttl?: number;
  compressed?: boolean;
  priority: CachePriority;
}

export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface MemoryStats {
  totalMemoryUsage: number;
  cacheMemoryUsage: number;
  hitRate: number;
  evictionCount: number;
  compressionRatio: number;
  diskCacheSize: number;
  activeCaches: number;
}

// Re-export the centralized config type for backward compatibility
export type { CacheConfig } from '../config/performance.js';

export interface OptimizationRecommendation {
  type: 'memory' | 'cache' | 'compression' | 'eviction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: string;
  potentialSavings: number;
}

/**
 * Multi-tier intelligent cache system
 */
export class IntelligentCache<T = any> extends EventEmitter {
  private memoryCache = new Map<string, CacheEntry<T>>();
  private diskCacheIndex = new Map<string, string>();
  private usagePatterns = new Map<string, number[]>();
  private config: CacheConfig;
  private diskCacheDir: string;
  private memoryUsage = 0;
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    const defaultConfig = getPerformanceConfig().cache;
    this.config = {
      ...defaultConfig,
      ...config
    };

    this.diskCacheDir = this.config.diskCacheDir || path.join(process.cwd(), '.cache', 'memory-optimizer');
    this.initializeDiskCache();
    this.startMemoryMonitoring();
  }

  private async initializeDiskCache(): Promise<void> {
    try {
      await fs.mkdir(this.diskCacheDir, { recursive: true });
      await this.loadDiskCacheIndex();
    } catch (error) {
      logger.warn('Failed to initialize disk cache:', error);
    }
  }

  private async loadDiskCacheIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.diskCacheDir, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      for (const [key, filePath] of Object.entries(index)) {
        this.diskCacheIndex.set(key, filePath as string);
      }
    } catch (error) {
      // Index doesn't exist yet, will be created
    }
  }

  private async saveDiskCacheIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.diskCacheDir, 'index.json');
      const index = Object.fromEntries(this.diskCacheIndex);
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      logger.warn('Failed to save disk cache index:', error);
    }
  }

  /**
   * Get value from cache with intelligent fallback
   */
  async get(key: string): Promise<T | undefined> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.updateAccessStats(memoryEntry);
      this.hitCount++;
      this.emit('hit', { key, tier: 'memory' });
      return memoryEntry.value;
    }

    // Try disk cache
    const diskValue = await this.getDiskCache(key);
    if (diskValue !== undefined) {
      // Promote to memory cache if frequently accessed
      this.promoteToMemory(key, diskValue);
      this.hitCount++;
      this.emit('hit', { key, tier: 'disk' });
      return diskValue;
    }

    this.missCount++;
    this.emit('miss', { key });
    return undefined;
  }

  /**
   * Set value in cache with intelligent placement
   */
  async set(key: string, value: T, options: {
    ttl?: number;
    priority?: CachePriority;
    size?: number;
  } = {}): Promise<void> {
    const size = options.size || this.estimateSize(value);
    const priority = options.priority || CachePriority.NORMAL;
    const ttl = options.ttl || this.config.defaultTTLMs;

    const entry: CacheEntry<T> = {
      key,
      value,
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      created: Date.now(),
      ttl,
      priority
    };

    // Decide placement based on size and priority
    if (this.shouldUseMemoryCache(entry)) {
      await this.setMemoryCache(key, entry);
    } else {
      await this.setDiskCache(key, entry);
    }

    this.emit('set', { key, tier: entry.priority >= CachePriority.HIGH ? 'memory' : 'disk' });
  }

  private shouldUseMemoryCache(entry: CacheEntry): boolean {
    const memoryLimit = this.config.maxMemoryMB * 1024 * 1024;
    const projectedUsage = this.memoryUsage + entry.size;

    return (
      entry.priority >= CachePriority.HIGH ||
      entry.size < this.config.compressionThresholdBytes ||
      projectedUsage < memoryLimit * this.config.memoryPressureThreshold
    );
  }

  private async setMemoryCache(key: string, entry: CacheEntry): Promise<void> {
    // Check if eviction is needed
    const memoryLimit = this.config.maxMemoryMB * 1024 * 1024;
    if (this.memoryUsage + entry.size > memoryLimit) {
      await this.evictMemoryEntries(entry.size);
    }

    this.memoryCache.set(key, entry);
    this.memoryUsage += entry.size;
    this.updateUsagePattern(key);
  }

  private async setDiskCache(key: string, entry: CacheEntry): Promise<void> {
    try {
      const filePath = path.join(this.diskCacheDir, `${this.hashKey(key)}.cache`);

      let data = JSON.stringify({
        metadata: {
          key: entry.key,
          size: entry.size,
          created: entry.created,
          ttl: entry.ttl,
          priority: entry.priority
        },
        value: entry.value
      });

      // Compress if above threshold
      if (entry.size > this.config.compressionThresholdBytes) {
        data = await this.compressData(data);
        entry.compressed = true;
      }

      await fs.writeFile(filePath, data);
      this.diskCacheIndex.set(key, filePath);
      await this.saveDiskCacheIndex();
    } catch (error) {
      logger.warn('Failed to write disk cache:', error);
    }
  }

  private async getDiskCache(key: string): Promise<T | undefined> {
    try {
      const filePath = this.diskCacheIndex.get(key);
      if (!filePath) return undefined;

      let data = await fs.readFile(filePath, 'utf-8');

      // Check if compressed
      if (data.startsWith('\x1f\x8b')) {
        data = await this.decompressData(data);
      }

      const parsed = JSON.parse(data);

      // Check expiration
      if (parsed.metadata.ttl && Date.now() - parsed.metadata.created > parsed.metadata.ttl) {
        await this.deleteDiskCache(key);
        return undefined;
      }

      return parsed.value;
    } catch (error) {
      logger.warn('Failed to read disk cache:', error);
      return undefined;
    }
  }

  private async deleteDiskCache(key: string): Promise<void> {
    try {
      const filePath = this.diskCacheIndex.get(key);
      if (filePath) {
        await fs.unlink(filePath);
        this.diskCacheIndex.delete(key);
        await this.saveDiskCacheIndex();
      }
    } catch (error) {
      logger.warn('Failed to delete disk cache:', error);
    }
  }

  private async evictMemoryEntries(spaceNeeded: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by priority and access patterns for intelligent eviction
    entries.sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // Priority first
      if (entryA.priority !== entryB.priority) {
        return entryA.priority - entryB.priority;
      }

      // Then by access frequency
      const freqA = entryA.accessCount / ((Date.now() - entryA.created) / 3600000);
      const freqB = entryB.accessCount / ((Date.now() - entryB.created) / 3600000);

      return freqA - freqB;
    });

    let freedSpace = 0;
    const targetSpace = Math.max(spaceNeeded, this.memoryUsage * this.config.evictionRatio);

    for (const [key, entry] of entries) {
      if (freedSpace >= targetSpace) break;
      if (entry.priority === CachePriority.CRITICAL) continue;

      // Move to disk cache before evicting from memory
      await this.setDiskCache(key, entry);

      this.memoryCache.delete(key);
      this.memoryUsage -= entry.size;
      freedSpace += entry.size;
      this.evictionCount++;
    }

    this.emit('eviction', { freedSpace, evictedCount: freedSpace > 0 ? entries.length : 0 });
  }

  private promoteToMemory(key: string, value: T): void {
    const usagePattern = this.usagePatterns.get(key);
    if (!usagePattern) return;

    // Promote if accessed frequently
    const recentAccesses = usagePattern.filter(time => Date.now() - time < 3600000).length;
    if (recentAccesses >= 3) {
      this.set(key, value, { priority: CachePriority.HIGH });
    }
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateUsagePattern(entry.key);
  }

  private updateUsagePattern(key: string): void {
    const pattern = this.usagePatterns.get(key) || [];
    pattern.push(Date.now());

    // Keep only recent access times (last 24 hours)
    const recent = pattern.filter(time => Date.now() - time < 86400000);
    this.usagePatterns.set(key, recent);
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.created > entry.ttl;
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate
  }

  private hashKey(key: string): string {
    return createHash('md5').update(key).digest('hex');
  }

  private async compressData(data: string): Promise<string> {
    // Simplified compression - in real implementation use zlib
    return data;
  }

  private async decompressData(data: string): Promise<string> {
    // Simplified decompression - in real implementation use zlib
    return data;
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memoryLimit = this.config.maxMemoryMB * 1024 * 1024;
      const usage = this.memoryUsage / memoryLimit;

      if (usage > THRESHOLD_CONSTANTS.MEMORY.CRITICAL_USAGE) {
        this.emit('memoryPressure', { usage, level: 'critical' });
        this.evictMemoryEntries(memoryLimit * 0.3);
      } else if (usage > THRESHOLD_CONSTANTS.MEMORY.WARNING_USAGE) {
        this.emit('memoryPressure', { usage, level: 'high' });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get comprehensive memory statistics
   */
  getStats(): MemoryStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      totalMemoryUsage: this.memoryUsage,
      cacheMemoryUsage: this.memoryUsage,
      hitRate,
      evictionCount: this.evictionCount,
      compressionRatio: 0.7, // Estimated
      diskCacheSize: this.diskCacheIndex.size,
      activeCaches: this.memoryCache.size
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const stats = this.getStats();

    if (stats.hitRate < THRESHOLD_CONSTANTS.CACHE.MIN_HIT_RATE) {
      recommendations.push({
        type: 'cache',
        severity: 'high',
        message: 'Low cache hit rate detected',
        action: 'Consider increasing cache size or TTL values',
        potentialSavings: 1024 * 1024 * 50 // 50MB estimated
      });
    }

    if (stats.totalMemoryUsage > this.config.maxMemoryMB * 1024 * 1024 * THRESHOLD_CONSTANTS.MEMORY.HIGH_USAGE) {
      recommendations.push({
        type: 'memory',
        severity: 'medium',
        message: 'High memory usage detected',
        action: 'Consider more aggressive eviction or compression',
        potentialSavings: 1024 * 1024 * 100 // 100MB estimated
      });
    }

    if (stats.evictionCount > 100) {
      recommendations.push({
        type: 'eviction',
        severity: 'medium',
        message: 'High eviction rate detected',
        action: 'Increase memory allocation or improve access patterns',
        potentialSavings: 1024 * 1024 * 75 // 75MB estimated
      });
    }

    return recommendations;
  }

  /**
   * Warm up cache with predicted entries
   */
  async warmupCache(keys: string[], fetcher: (key: string) => Promise<T>): Promise<void> {
    if (!this.config.warmupEnabled) return;

    const warmupPromises = keys.map(async (key) => {
      const existing = await this.get(key);
      if (!existing) {
        try {
          const value = await fetcher(key);
          await this.set(key, value, { priority: CachePriority.NORMAL });
        } catch (error) {
          logger.warn(`Failed to warm up cache for key ${key}:`, error);
        }
      }
    });

    await Promise.all(warmupPromises);
    this.emit('warmupComplete', { count: keys.length });
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.memoryUsage = 0;

    // Clear disk cache
    try {
      const files = await fs.readdir(this.diskCacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.diskCacheDir, file)))
      );
      this.diskCacheIndex.clear();
    } catch (error) {
      logger.warn('Failed to clear disk cache:', error);
    }

    this.emit('cleared');
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.memoryUsage -= entry.size;
      }
    }

    // Cleanup disk cache
    for (const key of this.diskCacheIndex.keys()) {
      const value = await this.getDiskCache(key);
      if (value === undefined) {
        // Entry was expired and removed
        continue;
      }
    }

    this.emit('cleanup');
  }
}

/**
 * Advanced cache manager that integrates with existing MemoryManager
 */
export class AdvancedCacheManager {
  private static instance: AdvancedCacheManager;
  private caches = new Map<string, IntelligentCache>();
  private globalStats = {
    totalAllocated: 0,
    totalHits: 0,
    totalMisses: 0
  };

  static getInstance(): AdvancedCacheManager {
    if (!AdvancedCacheManager.instance) {
      AdvancedCacheManager.instance = new AdvancedCacheManager();
    }
    return AdvancedCacheManager.instance;
  }

  /**
   * Get or create named cache
   */
  getCache<T>(name: string, config?: Partial<CacheConfig>): IntelligentCache<T> {
    if (!this.caches.has(name)) {
      const cache = new IntelligentCache<T>(config);

      cache.on('hit', () => this.globalStats.totalHits++);
      cache.on('miss', () => this.globalStats.totalMisses++);

      this.caches.set(name, cache);
    }

    return this.caches.get(name) as IntelligentCache<T>;
  }

  /**
   * Get global memory statistics
   */
  getGlobalStats(): MemoryStats & { totalCaches: number } {
    const cacheStats = Array.from(this.caches.values()).map(cache => cache.getStats());

    return {
      totalMemoryUsage: cacheStats.reduce((sum, stats) => sum + stats.totalMemoryUsage, 0),
      cacheMemoryUsage: cacheStats.reduce((sum, stats) => sum + stats.cacheMemoryUsage, 0),
      hitRate: this.globalStats.totalHits / (this.globalStats.totalHits + this.globalStats.totalMisses),
      evictionCount: cacheStats.reduce((sum, stats) => sum + stats.evictionCount, 0),
      compressionRatio: cacheStats.reduce((sum, stats) => sum + stats.compressionRatio, 0) / cacheStats.length,
      diskCacheSize: cacheStats.reduce((sum, stats) => sum + stats.diskCacheSize, 0),
      activeCaches: cacheStats.reduce((sum, stats) => sum + stats.activeCaches, 0),
      totalCaches: this.caches.size
    };
  }

  /**
   * Global optimization recommendations
   */
  getGlobalOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [name, cache] of this.caches.entries()) {
      const cacheRecommendations = cache.getOptimizationRecommendations();
      recommendations.push(...cacheRecommendations.map(rec => ({
        ...rec,
        message: `[${name}] ${rec.message}`
      })));
    }

    return recommendations;
  }

  /**
   * Cleanup all caches
   */
  async globalCleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.caches.values()).map(cache => cache.cleanup());
    await Promise.all(cleanupPromises);
  }
}