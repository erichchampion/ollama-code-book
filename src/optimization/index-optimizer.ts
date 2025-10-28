/**
 * Index Optimization System
 *
 * Phase 5: Cache and Index Preloading
 * Optimizes file system and module indexes for faster lookup and loading
 */

import { logger } from '../utils/logger.js';
import { getMemoryUsageMB } from '../utils/memory.js';
import {
  DEFAULT_INDEX_CACHE_SIZE,
  CORE_MODULE_MEMORY,
  INDEX_OPTIMIZATION_TIMEOUT
} from '../constants/startup.js';

/**
 * Index entry for optimized lookups
 */
export interface IndexEntry {
  path: string;
  type: 'file' | 'directory' | 'module';
  lastModified: number;
  size?: number;
  dependencies?: string[];
  priority: 'critical' | 'high' | 'normal' | 'lazy';
}

/**
 * Index optimization configuration
 */
export interface IndexOptimizationConfig {
  maxCacheSize: number;
  enablePredictiveIndexing: boolean;
  indexUpdateInterval: number;
  memoryBudget: number;
}

/**
 * Index optimizer for file system and module lookups
 */
export class IndexOptimizer {
  private fileIndex = new Map<string, IndexEntry>();
  private moduleIndex = new Map<string, IndexEntry>();
  private accessPatterns = new Map<string, number>();
  private config: IndexOptimizationConfig;
  private indexUpdateTimer?: NodeJS.Timeout;

  constructor(config: Partial<IndexOptimizationConfig> = {}) {
    this.config = {
      maxCacheSize: DEFAULT_INDEX_CACHE_SIZE,
      enablePredictiveIndexing: true,
      indexUpdateInterval: 30000, // 30 seconds
      memoryBudget: CORE_MODULE_MEMORY.INDEX_OPTIMIZER || 20,
      ...config
    };

    logger.debug('IndexOptimizer initialized', { config: this.config });
  }

  /**
   * Initialize the index optimizer
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Initializing index optimizer');

      // Build initial file system index
      await this.buildFileSystemIndex();

      // Build module dependency index
      await this.buildModuleIndex();

      // Start periodic index updates if enabled
      if (this.config.enablePredictiveIndexing) {
        this.startPeriodicUpdates();
      }

      const duration = Date.now() - startTime;
      logger.info(`Index optimizer initialized in ${duration}ms`);

    } catch (error) {
      logger.error('Failed to initialize index optimizer:', error);
      throw error;
    }
  }

  /**
   * Build file system index for common paths
   */
  private async buildFileSystemIndex(): Promise<void> {
    const commonPaths = [
      'src',
      'dist',
      'node_modules',
      'package.json',
      'tsconfig.json'
    ];

    for (const path of commonPaths) {
      try {
        const stats = await this.getPathStats(path);
        if (stats) {
          this.fileIndex.set(path, {
            path,
            type: stats.isDirectory ? 'directory' : 'file',
            lastModified: stats.mtime,
            size: stats.size,
            priority: this.getPathPriority(path)
          });
        }
      } catch (error) {
        // Path doesn't exist, skip
        logger.debug(`Path ${path} not found during indexing`);
      }
    }

    logger.debug(`Built file system index with ${this.fileIndex.size} entries`);
  }

  /**
   * Build module dependency index
   */
  private async buildModuleIndex(): Promise<void> {
    const coreModules = [
      './utils/logger.js',
      './commands/index.js',
      './ai/index.js',
      './core/services.js',
      './optimization/startup-optimizer.js'
    ];

    for (const modulePath of coreModules) {
      this.moduleIndex.set(modulePath, {
        path: modulePath,
        type: 'module',
        lastModified: Date.now(),
        dependencies: await this.analyzeDependencies(modulePath),
        priority: this.getModulePriority(modulePath)
      });
    }

    logger.debug(`Built module index with ${this.moduleIndex.size} entries`);
  }

  /**
   * Get optimized file lookup
   */
  async getOptimizedPath(path: string): Promise<string | null> {
    // Record access pattern
    this.recordAccess(path);

    // Check file index first
    const indexed = this.fileIndex.get(path);
    if (indexed) {
      logger.debug(`Index hit for path: ${path}`);
      return indexed.path;
    }

    // Fallback to file system lookup
    try {
      const stats = await this.getPathStats(path);
      if (stats) {
        // Add to index for future lookups
        this.fileIndex.set(path, {
          path,
          type: stats.isDirectory ? 'directory' : 'file',
          lastModified: stats.mtime,
          size: stats.size,
          priority: 'normal'
        });
        return path;
      }
    } catch (error) {
      logger.debug(`Path not found: ${path}`);
    }

    return null;
  }

  /**
   * Get optimized module resolution
   */
  async getOptimizedModule(modulePath: string): Promise<IndexEntry | null> {
    // Record access pattern
    this.recordAccess(modulePath);

    // Check module index
    const indexed = this.moduleIndex.get(modulePath);
    if (indexed) {
      logger.debug(`Module index hit: ${modulePath}`);
      return indexed;
    }

    // Analyze and cache module
    try {
      const dependencies = await this.analyzeDependencies(modulePath);
      const entry: IndexEntry = {
        path: modulePath,
        type: 'module',
        lastModified: Date.now(),
        dependencies,
        priority: this.getModulePriority(modulePath)
      };

      this.moduleIndex.set(modulePath, entry);
      return entry;
    } catch (error) {
      logger.debug(`Failed to analyze module: ${modulePath}`, error);
      return null;
    }
  }

  /**
   * Preload indexes based on access patterns
   */
  async preloadIndexes(): Promise<void> {
    logger.info('Starting predictive index preloading');

    // Sort paths by access frequency
    const sortedPaths = Array.from(this.accessPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50); // Top 50 accessed paths

    for (const [path] of sortedPaths) {
      try {
        if (!this.fileIndex.has(path)) {
          await this.getOptimizedPath(path);
        }
      } catch (error) {
        logger.debug(`Failed to preload index for: ${path}`, error);
      }

      // Check memory budget
      if (getMemoryUsageMB() > this.config.memoryBudget * 2) {
        logger.warn('Memory budget exceeded during index preloading');
        break;
      }
    }

    logger.info(`Preloaded indexes for ${sortedPaths.length} frequently accessed paths`);
  }

  /**
   * Clear old index entries to manage memory
   */
  pruneIndexes(): void {
    const maxEntries = this.config.maxCacheSize;

    // Prune file index
    if (this.fileIndex.size > maxEntries) {
      const entries = Array.from(this.fileIndex.entries());
      entries.sort(([a], [b]) => (this.accessPatterns.get(b) || 0) - (this.accessPatterns.get(a) || 0));

      this.fileIndex.clear();
      for (let i = 0; i < maxEntries; i++) {
        const [path, entry] = entries[i];
        this.fileIndex.set(path, entry);
      }
    }

    // Prune module index
    if (this.moduleIndex.size > maxEntries) {
      const entries = Array.from(this.moduleIndex.entries());
      entries.sort(([a], [b]) => (this.accessPatterns.get(b) || 0) - (this.accessPatterns.get(a) || 0));

      this.moduleIndex.clear();
      for (let i = 0; i < maxEntries; i++) {
        const [path, entry] = entries[i];
        this.moduleIndex.set(path, entry);
      }
    }

    logger.debug(`Pruned indexes: ${this.fileIndex.size} files, ${this.moduleIndex.size} modules`);
  }

  /**
   * Get index statistics
   */
  getStats(): { files: number; modules: number; memory: number } {
    return {
      files: this.fileIndex.size,
      modules: this.moduleIndex.size,
      memory: getMemoryUsageMB()
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.indexUpdateTimer) {
      clearInterval(this.indexUpdateTimer);
      this.indexUpdateTimer = undefined;
    }

    this.fileIndex.clear();
    this.moduleIndex.clear();
    this.accessPatterns.clear();

    logger.debug('IndexOptimizer disposed');
  }

  // Private helper methods

  private async getPathStats(path: string): Promise<{ isDirectory: boolean; mtime: number; size: number } | null> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(path);
      return {
        isDirectory: stats.isDirectory(),
        mtime: stats.mtime.getTime(),
        size: stats.size
      };
    } catch {
      return null;
    }
  }

  private async analyzeDependencies(modulePath: string): Promise<string[]> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Simple dependency analysis - look for import/require statements
      const content = await fs.readFile(modulePath, 'utf-8');
      const importRegex = /(?:import|require)\s*\(['"`]([^'"`]+)['"`]\)/g;
      const dependencies: string[] = [];

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }

      return dependencies;
    } catch {
      return [];
    }
  }

  private getPathPriority(path: string): 'critical' | 'high' | 'normal' | 'lazy' {
    if (path.includes('package.json') || path.includes('tsconfig.json')) return 'critical';
    if (path.startsWith('src/')) return 'high';
    if (path.startsWith('dist/')) return 'normal';
    return 'lazy';
  }

  private getModulePriority(modulePath: string): 'critical' | 'high' | 'normal' | 'lazy' {
    if (modulePath.includes('logger') || modulePath.includes('core')) return 'critical';
    if (modulePath.includes('commands') || modulePath.includes('ai')) return 'high';
    if (modulePath.includes('optimization')) return 'normal';
    return 'lazy';
  }

  private recordAccess(path: string): void {
    const current = this.accessPatterns.get(path) || 0;
    this.accessPatterns.set(path, current + 1);
  }

  private startPeriodicUpdates(): void {
    this.indexUpdateTimer = setInterval(async () => {
      try {
        this.pruneIndexes();
        await this.preloadIndexes();
      } catch (error) {
        logger.error('Error during periodic index update:', error);
      }
    }, this.config.indexUpdateInterval);
  }
}

// Export singleton instance
export const indexOptimizer = new IndexOptimizer();