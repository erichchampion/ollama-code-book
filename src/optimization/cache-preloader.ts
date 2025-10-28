/**
 * Phase 5: Cache and Index Preloading System
 *
 * Optimizes startup performance by preloading frequently used caches and indexes
 * during the startup phase, reducing initial response latency.
 *
 * Features:
 * - Intelligent cache warming based on usage patterns
 * - Predictive preloading of commonly accessed data
 * - Index optimization for faster searches
 * - Memory-aware preloading strategies
 * - Integration with startup optimizer
 */

import { logger } from '../utils/logger.js';
import { getMemoryUsageMB, MemoryMonitor } from '../utils/memory.js';
import { ManagedEventEmitter } from '../utils/managed-event-emitter.js';
import {
  DEFAULT_MEMORY_BUDGET,
  DEFAULT_CACHE_PRELOADING,
  BACKGROUND_PRELOAD_DELAY,
  DEFAULT_MAX_LISTENERS,
  DEFAULT_MAX_PRELOAD_TIME,
  DEFAULT_PARALLEL_PRELOADS,
  CACHE_LOAD_DELAY,
  INDEX_LOAD_DELAY
} from '../constants/startup.js';
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Cache entry metadata
 */
export interface CacheEntry {
  key: string;
  value: any;
  size: number; // Size in bytes
  accessCount: number;
  lastAccessed: Date;
  preloaded: boolean;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

/**
 * Index metadata for optimized searches
 */
export interface IndexMetadata {
  name: string;
  type: 'fulltext' | 'keyword' | 'numeric' | 'composite';
  size: number;
  entries: number;
  lastOptimized: Date;
  preloaded: boolean;
}

/**
 * Preloading strategy configuration
 */
export interface PreloadStrategy {
  enableCachePreloading: boolean;
  enableIndexPreloading: boolean;
  memoryBudget: number; // MB
  preloadPriority: Array<'critical' | 'high' | 'normal' | 'low'>;
  maxPreloadTime: number; // ms
  parallelPreloads: number;
  predictiveLoading: boolean;
}

/**
 * Cache preloading statistics
 */
export interface PreloadStatistics {
  cacheEntriesPreloaded: number;
  indexesPreloaded: number;
  totalPreloadTime: number;
  memoryUsed: number;
  hitRateImprovement: number;
  errors: number;
}

/**
 * Usage pattern for predictive loading
 */
interface UsagePattern {
  key: string;
  frequency: number;
  averageAccessTime: number;
  lastAccessedDays: number;
  predictedNextAccess: Date;
}

/**
 * Cache and Index Preloader
 */
export class CachePreloader extends ManagedEventEmitter {
  private strategy: PreloadStrategy;
  private memoryMonitor: MemoryMonitor;
  private statistics: PreloadStatistics;
  private cacheRegistry: Map<string, CacheEntry>;
  private indexRegistry: Map<string, IndexMetadata>;
  private usagePatterns: Map<string, UsagePattern>;
  private preloadPromises: Promise<void>[];
  private isPreloading: boolean = false;
  private startTime: number = 0;

  constructor(strategy: Partial<PreloadStrategy> = {}) {
    super({ maxListeners: DEFAULT_MAX_LISTENERS });

    this.strategy = {
      enableCachePreloading: DEFAULT_CACHE_PRELOADING,
      enableIndexPreloading: true,
      memoryBudget: DEFAULT_MEMORY_BUDGET,
      preloadPriority: ['critical', 'high', 'normal'],
      maxPreloadTime: DEFAULT_MAX_PRELOAD_TIME,
      parallelPreloads: DEFAULT_PARALLEL_PRELOADS,
      predictiveLoading: true,
      ...strategy
    };

    this.memoryMonitor = new MemoryMonitor();
    this.cacheRegistry = new Map();
    this.indexRegistry = new Map();
    this.usagePatterns = new Map();
    this.preloadPromises = [];

    this.statistics = {
      cacheEntriesPreloaded: 0,
      indexesPreloaded: 0,
      totalPreloadTime: 0,
      memoryUsed: 0,
      hitRateImprovement: 0,
      errors: 0
    };
  }

  /**
   * Start the preloading process
   */
  async startPreloading(): Promise<void> {
    if (this.isPreloading) {
      logger.debug('Cache preloading already in progress');
      return;
    }

    this.isPreloading = true;
    this.startTime = performance.now();

    logger.info('Starting Phase 5 cache and index preloading', {
      strategy: this.strategy,
      currentMemory: getMemoryUsageMB()
    });

    try {
      // Phase 1: Load usage patterns
      await this.loadUsagePatterns();

      // Phase 2: Preload critical caches
      if (this.strategy.enableCachePreloading) {
        await this.preloadCaches();
      }

      // Phase 3: Preload indexes
      if (this.strategy.enableIndexPreloading) {
        await this.preloadIndexes();
      }

      // Phase 4: Optimize based on patterns
      if (this.strategy.predictiveLoading) {
        await this.predictivePreload();
      }

      this.statistics.totalPreloadTime = performance.now() - this.startTime;
      this.statistics.memoryUsed = getMemoryUsageMB() - this.memoryMonitor.getPeakUsage();

      this.emit('preload:complete', { statistics: this.statistics });

      logger.info('Cache preloading completed', {
        statistics: this.statistics,
        duration: this.statistics.totalPreloadTime
      });

    } catch (error) {
      this.statistics.errors++;
      logger.error('Cache preloading failed', error);
      this.emit('preload:error', { error, statistics: this.statistics });
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Load usage patterns from disk or memory
   */
  private async loadUsagePatterns(): Promise<void> {
    try {
      const patternsPath = path.join(process.cwd(), '.ollama-code', 'cache-patterns.json');

      try {
        const data = await fs.readFile(patternsPath, 'utf-8');
        const patterns = JSON.parse(data) as UsagePattern[];

        patterns.forEach(pattern => {
          this.usagePatterns.set(pattern.key, {
            ...pattern,
            predictedNextAccess: new Date(pattern.predictedNextAccess)
          });
        });

        logger.debug('Loaded usage patterns', { count: patterns.length });
      } catch (error) {
        // No existing patterns, start fresh
        logger.debug('No existing usage patterns found');
      }
    } catch (error) {
      logger.warn('Failed to load usage patterns', error);
    }
  }

  /**
   * Preload cache entries based on priority and usage patterns
   */
  private async preloadCaches(): Promise<void> {
    const memoryBefore = getMemoryUsageMB();
    const timeLimit = this.startTime + this.strategy.maxPreloadTime;

    // Sort caches by priority and usage
    const cachesToPreload = Array.from(this.cacheRegistry.values())
      .filter(cache =>
        this.strategy.preloadPriority.includes(cache.priority) &&
        !cache.preloaded
      )
      .sort((a, b) => {
        // Priority order
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by access count
        return b.accessCount - a.accessCount;
      });

    // Preload in parallel batches
    const batchSize = this.strategy.parallelPreloads;
    for (let i = 0; i < cachesToPreload.length; i += batchSize) {
      // Check memory and time constraints
      if (getMemoryUsageMB() - memoryBefore > this.strategy.memoryBudget) {
        logger.warn('Memory budget exceeded during cache preloading');
        break;
      }

      if (performance.now() > timeLimit) {
        logger.warn('Time limit exceeded during cache preloading');
        break;
      }

      const batch = cachesToPreload.slice(i, i + batchSize);
      const promises = batch.map(cache => this.preloadCache(cache));

      await Promise.allSettled(promises);
    }
  }

  /**
   * Preload a single cache entry
   */
  private async preloadCache(entry: CacheEntry): Promise<void> {
    try {
      const startTime = performance.now();

      // Simulate cache loading (in real implementation, load from disk/network)
      await this.loadCacheData(entry.key);

      entry.preloaded = true;
      entry.lastAccessed = new Date();
      this.statistics.cacheEntriesPreloaded++;

      const loadTime = performance.now() - startTime;

      logger.debug('Cache entry preloaded', {
        key: entry.key,
        priority: entry.priority,
        loadTime
      });

      this.emit('cache:preloaded', { key: entry.key, loadTime });

    } catch (error) {
      this.statistics.errors++;
      logger.error('Failed to preload cache entry', { key: entry.key, error });
    }
  }

  /**
   * Load cache data (implementation-specific)
   */
  private async loadCacheData(key: string): Promise<any> {
    // This would be replaced with actual cache loading logic
    // For now, simulate with a small delay
    await new Promise(resolve => setTimeout(resolve, CACHE_LOAD_DELAY));
    return { key, data: 'preloaded' };
  }

  /**
   * Preload indexes for optimized searches
   */
  private async preloadIndexes(): Promise<void> {
    const indexesToPreload = Array.from(this.indexRegistry.values())
      .filter(index => !index.preloaded)
      .sort((a, b) => b.entries - a.entries); // Larger indexes first

    for (const index of indexesToPreload) {
      try {
        await this.preloadIndex(index);
      } catch (error) {
        logger.error('Failed to preload index', { name: index.name, error });
      }
    }
  }

  /**
   * Preload a single index
   */
  private async preloadIndex(index: IndexMetadata): Promise<void> {
    const startTime = performance.now();

    // Simulate index loading
    await this.loadIndexData(index.name);

    index.preloaded = true;
    index.lastOptimized = new Date();
    this.statistics.indexesPreloaded++;

    const loadTime = performance.now() - startTime;

    logger.debug('Index preloaded', {
      name: index.name,
      type: index.type,
      entries: index.entries,
      loadTime
    });

    this.emit('index:preloaded', { name: index.name, loadTime });
  }

  /**
   * Load index data (implementation-specific)
   */
  private async loadIndexData(name: string): Promise<any> {
    // Simulate index loading
    await new Promise(resolve => setTimeout(resolve, INDEX_LOAD_DELAY));
    return { name, loaded: true };
  }

  /**
   * Predictive preloading based on usage patterns
   */
  private async predictivePreload(): Promise<void> {
    const now = new Date();
    const predictedCaches = Array.from(this.usagePatterns.values())
      .filter(pattern => {
        // Preload if predicted to be accessed soon
        const timeDiff = pattern.predictedNextAccess.getTime() - now.getTime();
        return timeDiff > 0 && timeDiff < 60000; // Within next minute
      })
      .sort((a, b) => b.frequency - a.frequency);

    for (const pattern of predictedCaches) {
      const cache = this.cacheRegistry.get(pattern.key);
      if (cache && !cache.preloaded) {
        await this.preloadCache(cache);
      }
    }
  }

  /**
   * Register a cache for preloading
   */
  registerCache(entry: Omit<CacheEntry, 'preloaded'>): void {
    this.cacheRegistry.set(entry.key, {
      ...entry,
      preloaded: false
    });
  }

  /**
   * Register an index for preloading
   */
  registerIndex(index: Omit<IndexMetadata, 'preloaded'>): void {
    this.indexRegistry.set(index.name, {
      ...index,
      preloaded: false
    });
  }

  /**
   * Update usage pattern for predictive loading
   */
  updateUsagePattern(key: string, accessTime: number): void {
    const existing = this.usagePatterns.get(key);

    if (existing) {
      existing.frequency++;
      existing.averageAccessTime =
        (existing.averageAccessTime * (existing.frequency - 1) + accessTime) / existing.frequency;
      existing.lastAccessedDays = 0;

      // Simple prediction: assume similar access pattern
      const daysSinceLastAccess = existing.lastAccessedDays;
      const predictedDays = Math.max(1, Math.floor(daysSinceLastAccess * 0.8));
      existing.predictedNextAccess = new Date(Date.now() + predictedDays * 86400000);
    } else {
      this.usagePatterns.set(key, {
        key,
        frequency: 1,
        averageAccessTime: accessTime,
        lastAccessedDays: 0,
        predictedNextAccess: new Date(Date.now() + 86400000) // Next day
      });
    }
  }

  /**
   * Save usage patterns to disk
   */
  async saveUsagePatterns(): Promise<void> {
    try {
      const patternsPath = path.join(process.cwd(), '.ollama-code', 'cache-patterns.json');
      const patterns = Array.from(this.usagePatterns.values());

      await fs.mkdir(path.dirname(patternsPath), { recursive: true });
      await fs.writeFile(patternsPath, JSON.stringify(patterns, null, 2));

      logger.debug('Saved usage patterns', { count: patterns.length });
    } catch (error) {
      logger.warn('Failed to save usage patterns', error);
    }
  }

  /**
   * Get preloading statistics
   */
  getStatistics(): PreloadStatistics {
    return { ...this.statistics };
  }

  /**
   * Get cache hit rate improvement
   */
  calculateHitRateImprovement(): number {
    const preloadedCaches = Array.from(this.cacheRegistry.values())
      .filter(cache => cache.preloaded);

    if (preloadedCaches.length === 0) return 0;

    const totalAccess = preloadedCaches.reduce((sum, cache) => sum + cache.accessCount, 0);
    const avgAccess = totalAccess / preloadedCaches.length;

    // Simple estimation: preloading improves hit rate proportionally to access frequency
    return Math.min(0.5, avgAccess / 100); // Max 50% improvement
  }

  /**
   * Clear all preloaded data
   */
  async clear(): Promise<void> {
    this.cacheRegistry.clear();
    this.indexRegistry.clear();
    this.usagePatterns.clear();
    this.statistics = {
      cacheEntriesPreloaded: 0,
      indexesPreloaded: 0,
      totalPreloadTime: 0,
      memoryUsed: 0,
      hitRateImprovement: 0,
      errors: 0
    };
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    await this.saveUsagePatterns();
    await this.clear();
    this.memoryMonitor.clear();
    super.destroy();
  }
}

// Global instance for easy access
let globalCachePreloader: CachePreloader | null = null;

/**
 * Initialize global cache preloader
 */
export async function initializeCachePreloader(
  strategy?: Partial<PreloadStrategy>
): Promise<CachePreloader> {
  if (globalCachePreloader) {
    return globalCachePreloader;
  }

  globalCachePreloader = new CachePreloader(strategy);

  // Register common caches and indexes
  registerDefaultCaches(globalCachePreloader);
  registerDefaultIndexes(globalCachePreloader);

  return globalCachePreloader;
}

/**
 * Register default caches for preloading
 */
function registerDefaultCaches(preloader: CachePreloader): void {
  // Command cache
  preloader.registerCache({
    key: 'commands:registry',
    value: null,
    size: 5000,
    accessCount: 100,
    lastAccessed: new Date(),
    priority: 'critical'
  });

  // Configuration cache
  preloader.registerCache({
    key: 'config:user',
    value: null,
    size: 2000,
    accessCount: 50,
    lastAccessed: new Date(),
    priority: 'high'
  });

  // Project context cache
  preloader.registerCache({
    key: 'project:context',
    value: null,
    size: 10000,
    accessCount: 75,
    lastAccessed: new Date(),
    priority: 'high'
  });

  // AI model cache
  preloader.registerCache({
    key: 'ai:models',
    value: null,
    size: 8000,
    accessCount: 30,
    lastAccessed: new Date(),
    priority: 'normal'
  });
}

/**
 * Register default indexes for preloading
 */
function registerDefaultIndexes(preloader: CachePreloader): void {
  // File index
  preloader.registerIndex({
    name: 'files:fulltext',
    type: 'fulltext',
    size: 50000,
    entries: 1000,
    lastOptimized: new Date()
  });

  // Symbol index
  preloader.registerIndex({
    name: 'symbols:keyword',
    type: 'keyword',
    size: 30000,
    entries: 500,
    lastOptimized: new Date()
  });

  // Command index
  preloader.registerIndex({
    name: 'commands:composite',
    type: 'composite',
    size: 10000,
    entries: 100,
    lastOptimized: new Date()
  });
}

/**
 * Get global cache preloader instance
 */
export function getCachePreloader(): CachePreloader | null {
  return globalCachePreloader;
}

/**
 * Start background cache preloading
 */
export async function startBackgroundPreloading(): Promise<void> {
  setTimeout(async () => {
    try {
      const preloader = await initializeCachePreloader();
      await preloader.startPreloading();
    } catch (error) {
      logger.error('Background cache preloading failed', error);
    }
  }, BACKGROUND_PRELOAD_DELAY);
}