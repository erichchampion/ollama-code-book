/**
 * AI Response Caching System
 *
 * Implements intelligent caching for AI responses to improve performance:
 * - Semantic similarity matching
 * - Context-aware caching
 * - Persistent cache storage
 * - Cache warming strategies
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { DELAY_CONSTANTS, THRESHOLD_CONSTANTS } from '../config/constants.js';
// import { memoryManager } from './memory-manager.js';

interface CacheEntry {
  query: string;
  context: Record<string, any>;
  response: string;
  timestamp: number;
  hits: number;
  model: string;
  hash: string;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  averageResponseTime: number;
}

export class AICacheManager {
  private cache = new Map<string, CacheEntry>();
  private cacheDir: string;
  private cacheFile: string;
  private stats = {
    hits: 0,
    misses: 0,
    totalQueries: 0,
    averageResponseTime: 0
  };
  private memoryManager: any;

  constructor(memoryManager?: any) {
    this.memoryManager = memoryManager;
    this.cacheDir = path.join(process.env.HOME || '~', '.ollama-code', 'cache');
    this.cacheFile = path.join(this.cacheDir, 'ai-responses.json');
    this.initializeCache();
  }

  /**
   * Check cache for similar queries
   */
  async getCachedResponse(
    query: string,
    context: Record<string, any> = {},
    model: string = 'default'
  ): Promise<string | null> {
    const startTime = performance.now();
    this.stats.totalQueries++;

    const queryHash = this.generateQueryHash(query, context, model);

    // Exact match first
    let entry = this.cache.get(queryHash);

    if (!entry) {
      // Try semantic similarity matching
      const similarEntry = await this.findSimilarQuery(query, context, model);
      entry = similarEntry || undefined;
    }

    if (entry) {
      entry.hits++;
      this.stats.hits++;
      this.stats.averageResponseTime = (this.stats.averageResponseTime + (performance.now() - startTime)) / 2;

      logger.debug(`Cache hit for query: ${query.substring(0, 50)}...`);
      return entry.response;
    }

    this.stats.misses++;
    logger.debug(`Cache miss for query: ${query.substring(0, 50)}...`);
    return null;
  }

  /**
   * Store AI response in cache
   */
  async cacheResponse(
    query: string,
    response: string,
    context: Record<string, any> = {},
    model: string = 'default'
  ): Promise<void> {
    const queryHash = this.generateQueryHash(query, context, model);

    const entry: CacheEntry = {
      query,
      context,
      response,
      timestamp: Date.now(),
      hits: 0,
      model,
      hash: queryHash
    };

    this.cache.set(queryHash, entry);

    // Store in memory manager for better memory handling
    if (this.memoryManager) {
      this.memoryManager.set(`ai-cache:${queryHash}`, entry, 3600000); // 1 hour TTL
    }

    logger.debug(`Cached AI response for: ${query.substring(0, 50)}...`);

    // Periodically persist to disk
    if (this.cache.size % 10 === 0) {
      await this.persistCache();
    }
  }

  /**
   * Warm cache with common queries
   */
  async warmCache(commonQueries: Array<{
    query: string;
    context?: Record<string, any>;
    model?: string;
  }>): Promise<void> {
    logger.info('Warming AI response cache...');

    for (const { query, context = {}, model = 'default' } of commonQueries) {
      const cached = await this.getCachedResponse(query, context, model);

      if (!cached) {
        // This would trigger a real AI request in production
        logger.debug(`Cache warming needed for: ${query.substring(0, 50)}...`);
      }
    }

    logger.info('Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const hitRate = this.stats.totalQueries > 0
      ? (this.stats.hits / this.stats.totalQueries) * 100
      : 0;

    return {
      totalEntries: this.cache.size,
      hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      cacheSize: this.cache.size * 1024, // Rough estimate
      averageResponseTime: this.stats.averageResponseTime
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      averageResponseTime: 0
    };

    try {
      await fs.unlink(this.cacheFile);
      logger.info('AI cache cleared');
    } catch (error) {
      // File might not exist, that's okay
    }
  }

  /**
   * Optimize cache by removing old entries
   */
  optimizeCache(): void {
    const maxEntries = 1000;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    if (this.cache.size <= maxEntries) {
      return;
    }

    // Convert to array and sort by usage and age
    const entries = Array.from(this.cache.entries())
      .map(([hashKey, entry]) => ({ hashKey, ...entry }))
      .filter(entry => now - entry.timestamp < maxAge)
      .sort((a, b) => {
        // Sort by hits (descending) then by timestamp (descending)
        if (a.hits !== b.hits) {
          return b.hits - a.hits;
        }
        return b.timestamp - a.timestamp;
      });

    // Keep only top entries
    this.cache.clear();

    for (let i = 0; i < Math.min(entries.length, maxEntries); i++) {
      const entry = entries[i];
      this.cache.set(entry.hashKey, {
        query: entry.query,
        context: entry.context,
        response: entry.response,
        timestamp: entry.timestamp,
        hits: entry.hits,
        model: entry.model,
        hash: entry.hash
      });
    }

    logger.info(`Cache optimized: kept ${this.cache.size} out of ${entries.length} entries`);
  }

  /**
   * Initialize cache from disk
   */
  private async initializeCache(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });

      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const entries: CacheEntry[] = JSON.parse(data);

      for (const entry of entries) {
        this.cache.set(entry.hash, entry);
      }

      logger.debug(`Loaded ${entries.length} cached AI responses`);
    } catch (error) {
      // Cache file doesn't exist or is corrupted, start fresh
      logger.debug('Starting with empty AI cache');
    }
  }

  /**
   * Persist cache to disk
   */
  private async persistCache(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());

      // Add timeout to prevent hanging on file operations
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Cache persist timeout')), DELAY_CONSTANTS.RESTART_DELAY);
      });

      await Promise.race([
        fs.writeFile(this.cacheFile, JSON.stringify(entries, null, 2)),
        timeoutPromise
      ]);

      logger.debug(`Persisted ${entries.length} cache entries to disk`);
    } catch (error) {
      logger.error('Failed to persist AI cache:', error);
    }
  }

  /**
   * Generate hash for query + context + model
   */
  private generateQueryHash(query: string, context: Record<string, any>, model: string): string {
    const combined = JSON.stringify({ query: query.toLowerCase().trim(), context, model });
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Find similar queries using simple text similarity
   */
  private async findSimilarQuery(
    query: string,
    context: Record<string, any>,
    model: string
  ): Promise<CacheEntry | null> {
    const normalizedQuery = query.toLowerCase().trim();
    const contextKeys = Object.keys(context).sort();

    let bestMatch: CacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.cache.values()) {
      // Must be same model
      if (entry.model !== model) continue;

      // Check context similarity
      const entryContextKeys = Object.keys(entry.context).sort();
      const contextSimilarity = this.calculateContextSimilarity(contextKeys, entryContextKeys);

      if (contextSimilarity < THRESHOLD_CONSTANTS.CACHE.CONTEXT_SIMILARITY) continue; // Context must be quite similar

      // Check query similarity
      const querySimilarity = this.calculateTextSimilarity(
        normalizedQuery,
        entry.query.toLowerCase().trim()
      );

      const totalScore = (querySimilarity * 0.7) + (contextSimilarity * THRESHOLD_CONSTANTS.WEIGHTS.MODERATE);

      if (totalScore > THRESHOLD_CONSTANTS.CACHE.SCORE_THRESHOLD && totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      logger.debug(`Found similar query with score ${bestScore.toFixed(2)}`);
    }

    return bestMatch;
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate context similarity
   */
  private calculateContextSimilarity(keys1: string[], keys2: string[]): number {
    if (keys1.length === 0 && keys2.length === 0) return 1.0;
    if (keys1.length === 0 || keys2.length === 0) return 0.0;

    const set1 = new Set(keys1);
    const set2 = new Set(keys2);
    const intersection = new Set([...set1].filter(key => set2.has(key)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Dispose of the AI cache manager and clean up resources
   */
  async dispose(): Promise<void> {
    await this.persistCache();
    this.cache.clear();
    logger.debug('AI cache manager disposed');
  }
}

// Legacy export - use dependency injection instead
// export const aiCacheManager = AICacheManager.getInstance();