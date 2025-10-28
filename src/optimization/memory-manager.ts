/**
 * Memory Management System
 *
 * Optimizes memory usage for large projects by implementing:
 * - Smart caching with size limits
 * - Selective file loading
 * - Memory pressure monitoring
 * - Automatic garbage collection
 */

import { logger } from '../utils/logger.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  size: number;
}

interface MemoryStats {
  used: number;
  total: number;
  available: number;
  cacheSize: number;
  cacheEntries: number;
}

export class MemoryManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxCacheSize = 100 * 1024 * 1024; // 100MB default
  private maxMemoryUsage = 0.9; // 90% of available memory (more reasonable)
  private gcInterval: NodeJS.Timeout | null = null;
  private lastWarningTime = 0;
  private warningCooldown = 300000; // 5 minutes between warnings
  private monitoringEnabled = true;

  constructor(enableMonitoring: boolean = true) {
    this.monitoringEnabled = enableMonitoring;
    if (this.monitoringEnabled) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Store data in memory-optimized cache
   */
  set<T>(key: string, data: T, ttl: number = 300000): void { // 5min default TTL
    const size = this.estimateSize(data);

    // Check if we need to free memory first
    this.ensureMemoryAvailable(size);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      size
    });

    logger.debug(`Cached ${key}: ${this.formatBytes(size)}`);
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > 300000) { // 5 min default
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.data as T;
  }

  /**
   * Smart file loading with memory optimization
   */
  async loadFileOptimized(filePath: string, maxSize: number = 1024 * 1024): Promise<string | null> {
    const cacheKey = `file:${filePath}`;

    // Check cache first
    const cached = this.get<string>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const { promises: fs } = await import('fs');
      const stats = await fs.stat(filePath);

      // Skip very large files to prevent memory issues
      if (stats.size > maxSize) {
        logger.warn(`Skipping large file ${filePath}: ${this.formatBytes(stats.size)}`);
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      // Cache with shorter TTL for files
      this.set(cacheKey, content, 600000); // 10 min for files

      return content;
    } catch (error) {
      logger.debug(`Failed to load file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Process directory with memory-aware batching
   */
  async processDirectoryBatched(
    dirPath: string,
    processor: (files: string[]) => Promise<void>,
    batchSize: number = 50
  ): Promise<void> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(path.join(dirPath, entry.name));
        }
      }

      // Process in batches to avoid memory spikes
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        // Check memory before processing batch
        if (this.isMemoryPressureHigh()) {
          logger.debug('High memory pressure during batch processing, triggering cleanup');
          await this.forceGarbageCollection();
        }

        await processor(batch);

        // Small delay to allow GC
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      logger.error(`Failed to process directory ${dirPath}:`, error);
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const cacheSize = this.getCacheSize();
    const cacheEntries = this.cache.size;

    return {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      available: memUsage.heapTotal - memUsage.heapUsed,
      cacheSize,
      cacheEntries
    };
  }

  /**
   * Force garbage collection and cache cleanup
   */
  async forceGarbageCollection(): Promise<void> {
    // Clear old cache entries
    this.cleanupCache();

    // Force Node.js garbage collection if available
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection');
    }

    // Small delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, DELAY_CONSTANTS.BRIEF_PAUSE));
  }

  /**
   * Configure memory limits
   */
  configure(options: {
    maxCacheSize?: number;
    maxMemoryUsage?: number;
    warningCooldown?: number;
    enableMonitoring?: boolean;
  }): void {
    if (options.maxCacheSize) {
      this.maxCacheSize = options.maxCacheSize;
    }
    if (options.maxMemoryUsage) {
      this.maxMemoryUsage = options.maxMemoryUsage;
    }
    if (options.warningCooldown) {
      this.warningCooldown = options.warningCooldown;
    }
    if (options.enableMonitoring !== undefined) {
      this.monitoringEnabled = options.enableMonitoring;
      if (this.monitoringEnabled && !this.gcInterval) {
        this.startMemoryMonitoring();
      } else if (!this.monitoringEnabled && this.gcInterval) {
        this.stopMonitoring();
      }
    }

    logger.debug('Memory manager configured:', {
      maxCacheSize: this.formatBytes(this.maxCacheSize),
      maxMemoryUsage: `${(this.maxMemoryUsage * 100).toFixed(1)}%`,
      warningCooldown: `${this.warningCooldown / 1000}s`,
      monitoringEnabled: this.monitoringEnabled
    });
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.gcInterval = setInterval(() => {
      this.cleanupCache();

      if (this.isMemoryPressureHigh()) {
        this.handleMemoryPressure();
      }
    }, 60000); // Check every 60 seconds (less aggressive)
  }

  /**
   * Handle memory pressure with debounced warnings
   */
  private handleMemoryPressure(): void {
    const now = Date.now();
    const shouldWarn = (now - this.lastWarningTime) > this.warningCooldown;

    if (shouldWarn) {
      const stats = this.getMemoryStats();
      const usagePercent = ((stats.used / stats.total) * 100).toFixed(1);
      logger.warn(`High memory pressure detected (${usagePercent}% heap usage), cleaning up`);
      this.lastWarningTime = now;
    }

    this.forceGarbageCollection();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    if (typeof obj === 'string') {
      return obj.length * 2; // UTF-16
    }

    if (typeof obj === 'object' && obj !== null) {
      return JSON.stringify(obj).length * 2;
    }

    return 8; // Basic estimate for primitives
  }

  /**
   * Check if memory pressure is high
   */
  private isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats();
    const usageRatio = stats.used / stats.total;
    return usageRatio > this.maxMemoryUsage;
  }

  /**
   * Get total cache size
   */
  private getCacheSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Ensure memory is available for new allocation
   */
  private ensureMemoryAvailable(requiredSize: number): void {
    const currentCacheSize = this.getCacheSize();

    if (currentCacheSize + requiredSize > this.maxCacheSize) {
      this.evictLeastUsed(requiredSize);
    }
  }

  /**
   * Evict least used entries to free memory
   */
  private evictLeastUsed(requiredSize: number): void {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => {
        // Sort by access count (ascending) then by age (descending)
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return b.timestamp - a.timestamp;
      });

    let freedSize = 0;
    let evicted = 0;

    for (const entry of entries) {
      if (freedSize >= requiredSize) break;

      this.cache.delete(entry.key);
      freedSize += entry.size;
      evicted++;
    }

    logger.debug(`Evicted ${evicted} cache entries, freed ${this.formatBytes(freedSize)}`);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > 300000) { // 5 min default TTL
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Dispose of the memory manager and clean up resources
   */
  async dispose(): Promise<void> {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    this.cache.clear();
    logger.debug('Memory manager disposed');
  }
}

// Global memory manager instance
// Legacy export - use dependency injection instead
// export const memoryManager = MemoryManager.getInstance();