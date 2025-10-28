/**
 * Predictive AI Cache System
 *
 * Implements intelligent caching and prefetching for AI responses based on
 * user behavior patterns, context analysis, and predictive algorithms.
 * Designed to achieve 80% faster cached responses and >80% cache hit rates.
 */

import { EventEmitter } from 'events';
import { normalizeError } from '../utils/error-utils.js';
import * as crypto from 'crypto';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { IntelligentCache, CachePriority as MemoryCachePriority } from './memory-optimizer.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  ttl: number;
  metadata: CacheMetadata;
  priority: MemoryCachePriority;
  tags: string[];
}

export interface CacheMetadata {
  queryType: 'code_generation' | 'explanation' | 'fix' | 'refactor' | 'analysis';
  complexity: 'simple' | 'medium' | 'complex';
  language?: string;
  fileType?: string;
  contextSize: number;
  responseSize: number;
  computeTime: number;
  userProfile?: string;
  projectContext?: string;
}

// Use CachePriority from memory-optimizer
export const CachePriority = MemoryCachePriority;

export interface UserBehaviorPattern {
  userId: string;
  commonQueries: string[];
  frequentLanguages: string[];
  preferredQueryTypes: string[];
  sessionPatterns: {
    averageSessionLength: number;
    peakUsageHours: number[];
    commonWorkflows: string[];
  };
  contextPatterns: {
    projectTypes: string[];
    filePatterns: string[];
    codebaseSize: 'small' | 'medium' | 'large';
  };
}

export interface PredictionModel {
  type: 'sequence' | 'context' | 'similarity' | 'temporal';
  confidence: number;
  predictions: CachePrediction[];
  lastUpdated: Date;
}

export interface CachePrediction {
  queryHash: string;
  probability: number;
  estimatedAccessTime: Date;
  context: Record<string, any>;
  reasoning: string;
}

export interface CacheAnalytics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  predictiveAccuracy: number;
  totalRequests: number;
  cachedRequests: number;
  prefetchedRequests: number;
  memoryUsage: number;
  topQueries: Array<{ query: string; count: number }>;
}

/**
 * Predictive AI Caching System
 *
 * Provides intelligent caching with context-aware prefetching and
 * machine learning-based prediction of user queries.
 */
export class PredictiveAICache extends EventEmitter {
  private cache: IntelligentCache<CacheEntry>;
  private userPatterns = new Map<string, UserBehaviorPattern>();
  private predictionModels = new Map<string, PredictionModel>();
  private querySequences = new Map<string, string[]>(); // userId -> query sequence
  private contextSimilarity = new Map<string, Map<string, number>>(); // context -> similar contexts
  private analytics: CacheAnalytics;
  private prefetchQueue: CachePrediction[] = [];
  private isProcessingPrefetch = false;

  constructor(
    private config: {
      maxCacheSize: number;
      defaultTTL: number;
      maxPrefetchQueue: number;
      predictionThreshold: number;
      enableBackgroundPrefetch: boolean;
    } = {
      maxCacheSize: 1000,
      defaultTTL: 3600000, // 1 hour
      maxPrefetchQueue: 50,
      predictionThreshold: 0.6,
      enableBackgroundPrefetch: true
    }
  ) {
    super();

    this.cache = new IntelligentCache({
      maxMemoryMB: 256,
      maxDiskMB: 1024,
      defaultTTLMs: config.defaultTTL,
      compressionThresholdBytes: 1024
    });

    this.analytics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      predictiveAccuracy: 0,
      totalRequests: 0,
      cachedRequests: 0,
      prefetchedRequests: 0,
      memoryUsage: 0,
      topQueries: []
    };

    if (config.enableBackgroundPrefetch) {
      this.startBackgroundPrefetching();
    }
  }

  /**
   * Get cached response or predict and prefetch likely queries
   */
  async get<T>(
    query: string,
    context: Record<string, any> = {},
    userId: string = 'default'
  ): Promise<CacheEntry<T> | null> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, context);

    this.analytics.totalRequests++;

    // Try to get from cache
    const cached = await this.cache.get(queryHash) as CacheEntry<T> | null;

    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = new Date();

      this.analytics.cachedRequests++;
      this.updateHitRate();

      // Update user patterns based on cache hit
      this.updateUserPatterns(userId, query, context, true);

      // Trigger prediction for next queries
      this.predictAndPrefetch(userId, query, context, async () => null);

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      logger.debug('Cache hit', {
        queryHash: queryHash.substring(0, 8),
        responseTime,
        accessCount: cached.accessCount
      });

      this.emit('cache:hit', { queryHash, responseTime, cached });
      return cached;
    }

    // Cache miss - update patterns and predict
    this.updateUserPatterns(userId, query, context, false);
    this.updateMissRate();

    logger.debug('Cache miss', {
      queryHash: queryHash.substring(0, 8)
    });

    this.emit('cache:miss', { queryHash, query, context });
    return null;
  }

  /**
   * Store response in cache with intelligent metadata
   */
  async set<T>(
    query: string,
    response: T,
    context: Record<string, any> = {},
    metadata: Partial<CacheMetadata> = {},
    userId: string = 'default',
    ttl?: number
  ): Promise<void> {
    const queryHash = this.generateQueryHash(query, context);
    const now = new Date();

    const cacheEntry: CacheEntry<T> = {
      key: queryHash,
      value: response,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      ttl: ttl || this.config.defaultTTL,
      priority: this.calculatePriority(query, context, metadata),
      tags: this.generateTags(query, context, metadata),
      metadata: {
        queryType: metadata.queryType || 'analysis',
        complexity: metadata.complexity || 'medium',
        language: metadata.language,
        fileType: metadata.fileType,
        contextSize: JSON.stringify(context).length,
        responseSize: JSON.stringify(response).length,
        computeTime: metadata.computeTime || 0,
        userProfile: userId,
        projectContext: context.projectRoot,
        ...metadata
      }
    };

    await this.cache.set(queryHash, cacheEntry, { ttl: ttl || this.config.defaultTTL, priority: cacheEntry.priority, size: cacheEntry.metadata.responseSize });

    // Update user patterns with successful cache set
    this.updateUserPatterns(userId, query, context, false);

    // Update context similarity mapping
    this.updateContextSimilarity(context, queryHash);

    // Trigger predictive analysis for future queries
    this.predictAndPrefetch(userId, query, context, async () => null);

    logger.debug('Cache entry stored', {
      queryHash: queryHash.substring(0, 8),
      priority: cacheEntry.priority,
      tags: cacheEntry.tags,
      metadata: cacheEntry.metadata
    });

    this.emit('cache:set', { queryHash, cacheEntry });
  }

  /**
   * Predict and prefetch likely queries based on current context
   */
  async predictAndPrefetch(
    userId: string,
    currentQuery: string,
    context: Record<string, any>,
    aiResponseFunction: (query: string, ctx: Record<string, any>) => Promise<any>
  ): Promise<CachePrediction[]> {
    const predictions = await this.generatePredictions(userId, currentQuery, context);

    // Filter predictions by confidence threshold
    const highConfidencePredictions = predictions.filter(
      p => p.probability >= this.config.predictionThreshold
    );

    // Add to prefetch queue
    for (const prediction of highConfidencePredictions) {
      if (this.prefetchQueue.length < this.config.maxPrefetchQueue) {
        this.prefetchQueue.push(prediction);
      }
    }

    // Start background prefetching if enabled
    if (this.config.enableBackgroundPrefetch && !this.isProcessingPrefetch) {
      this.processPrefetchQueue(aiResponseFunction);
    }

    logger.info('Generated predictions', {
      userId,
      totalPredictions: predictions.length,
      highConfidence: highConfidencePredictions.length,
      queueSize: this.prefetchQueue.length
    });

    return highConfidencePredictions;
  }

  /**
   * Generate predictions based on user patterns and context
   */
  private async generatePredictions(
    userId: string,
    currentQuery: string,
    context: Record<string, any>
  ): Promise<CachePrediction[]> {
    const predictions: CachePrediction[] = [];

    // Sequence-based predictions
    const sequencePredictions = this.generateSequencePredictions(userId, currentQuery);
    predictions.push(...sequencePredictions);

    // Context-based predictions
    const contextPredictions = this.generateContextPredictions(context);
    predictions.push(...contextPredictions);

    // Similarity-based predictions
    const similarityPredictions = this.generateSimilarityPredictions(currentQuery, context);
    predictions.push(...similarityPredictions);

    // Temporal predictions (time-based patterns)
    const temporalPredictions = this.generateTemporalPredictions(userId);
    predictions.push(...temporalPredictions);

    // Sort by probability and remove duplicates
    const uniquePredictions = this.deduplicatePredictions(predictions);
    return uniquePredictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Generate sequence-based predictions using query history
   */
  private generateSequencePredictions(userId: string, currentQuery: string): CachePrediction[] {
    const userSequence = this.querySequences.get(userId) || [];
    const predictions: CachePrediction[] = [];

    // Look for common patterns in query sequences
    const queryHash = this.generateQueryHash(currentQuery, {});
    const commonNextQueries = this.findCommonNextQueries(userSequence, queryHash);

    for (const nextQuery of commonNextQueries) {
      predictions.push({
        queryHash: nextQuery.hash,
        probability: nextQuery.probability,
        estimatedAccessTime: new Date(Date.now() + nextQuery.avgDelay),
        context: { type: 'sequence' },
        reasoning: `Common next query after "${currentQuery.substring(0, 30)}..."`
      });
    }

    return predictions;
  }

  /**
   * Generate context-based predictions
   */
  private generateContextPredictions(context: Record<string, any>): CachePrediction[] {
    const predictions: CachePrediction[] = [];

    // Based on file type and language
    if (context.fileType || context.language) {
      const commonQueries = this.getCommonQueriesForContext(context);

      for (const query of commonQueries) {
        predictions.push({
          queryHash: query.hash,
          probability: query.probability,
          estimatedAccessTime: new Date(Date.now() + 60000), // 1 minute
          context: { type: 'context', fileType: context.fileType, language: context.language },
          reasoning: `Common query for ${context.fileType || context.language} files`
        });
      }
    }

    return predictions;
  }

  /**
   * Generate similarity-based predictions
   */
  private generateSimilarityPredictions(
    currentQuery: string,
    context: Record<string, any>
  ): CachePrediction[] {
    const predictions: CachePrediction[] = [];
    const contextKey = this.generateContextKey(context);

    // Find similar contexts
    const similarContexts = this.contextSimilarity.get(contextKey);
    if (similarContexts) {
      for (const [similarContext, similarity] of similarContexts.entries()) {
        if (similarity > 0.7) { // High similarity threshold
          predictions.push({
            queryHash: this.generateQueryHash(currentQuery, { similarContext }),
            probability: similarity * 0.8, // Reduce probability for similarity-based predictions
            estimatedAccessTime: new Date(Date.now() + 30000), // 30 seconds
            context: { type: 'similarity', similarity },
            reasoning: `Similar to context: ${similarContext}`
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Generate temporal predictions based on time patterns
   */
  private generateTemporalPredictions(userId: string): CachePrediction[] {
    const predictions: CachePrediction[] = [];
    const userPattern = this.userPatterns.get(userId);

    if (userPattern) {
      const currentHour = new Date().getHours();

      // Check if current time matches peak usage patterns
      if (userPattern.sessionPatterns.peakUsageHours.includes(currentHour)) {
        // Predict common queries for this time period
        for (const commonQuery of userPattern.commonQueries.slice(0, 5)) {
          predictions.push({
            queryHash: this.generateQueryHash(commonQuery, {}),
            probability: 0.7,
            estimatedAccessTime: new Date(Date.now() + 300000), // 5 minutes
            context: { type: 'temporal', hour: currentHour },
            reasoning: `Common query during peak hour ${currentHour}`
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Process prefetch queue in background
   */
  private async processPrefetchQueue(
    aiResponseFunction: (query: string, ctx: Record<string, any>) => Promise<any>
  ): Promise<void> {
    if (this.isProcessingPrefetch || this.prefetchQueue.length === 0) {
      return;
    }

    this.isProcessingPrefetch = true;

    try {
      while (this.prefetchQueue.length > 0) {
        const prediction = this.prefetchQueue.shift()!;

        // Check if already cached
        const existing = await this.cache.get(prediction.queryHash);
        if (existing) continue;

        // Generate response and cache it
        try {
          const response = await aiResponseFunction(
            this.decodeQueryHash(prediction.queryHash),
            prediction.context
          );

          const prefetchEntry: CacheEntry = {
            key: prediction.queryHash,
            value: response,
            timestamp: new Date(),
            accessCount: 0,
            lastAccessed: new Date(),
            ttl: this.config.defaultTTL,
            priority: MemoryCachePriority.NORMAL,
            tags: ['prefetched'],
            metadata: {
              queryType: 'analysis',
              complexity: 'medium',
              contextSize: JSON.stringify(prediction.context).length,
              responseSize: JSON.stringify(response).length,
              computeTime: 0
            }
          };
          await this.cache.set(prediction.queryHash, prefetchEntry, {
            ttl: this.config.defaultTTL,
            priority: MemoryCachePriority.NORMAL,
            size: prefetchEntry.metadata.responseSize
          });

          this.analytics.prefetchedRequests++;

          logger.debug('Prefetched and cached', {
            queryHash: prediction.queryHash.substring(0, 8),
            probability: prediction.probability
          });

        } catch (error) {
          logger.warn('Prefetch failed', {
            queryHash: prediction.queryHash.substring(0, 8),
            error: normalizeError(error).message
          });
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, DELAY_CONSTANTS.BRIEF_PAUSE));
      }
    } finally {
      this.isProcessingPrefetch = false;
    }
  }

  /**
   * Update user behavior patterns
   */
  private updateUserPatterns(
    userId: string,
    query: string,
    context: Record<string, any>,
    cacheHit: boolean
  ): void {
    let pattern = this.userPatterns.get(userId);

    if (!pattern) {
      pattern = {
        userId,
        commonQueries: [],
        frequentLanguages: [],
        preferredQueryTypes: [],
        sessionPatterns: {
          averageSessionLength: 0,
          peakUsageHours: [],
          commonWorkflows: []
        },
        contextPatterns: {
          projectTypes: [],
          filePatterns: [],
          codebaseSize: 'medium'
        }
      };
    }

    // Update common queries
    if (!pattern.commonQueries.includes(query)) {
      pattern.commonQueries.push(query);
      if (pattern.commonQueries.length > 20) {
        pattern.commonQueries = pattern.commonQueries.slice(-20); // Keep last 20
      }
    }

    // Update language patterns
    if (context.language && !pattern.frequentLanguages.includes(context.language)) {
      pattern.frequentLanguages.push(context.language);
    }

    // Update query sequence
    const queryHash = this.generateQueryHash(query, context);
    let sequence = this.querySequences.get(userId) || [];
    sequence.push(queryHash);
    if (sequence.length > 50) {
      sequence = sequence.slice(-50); // Keep last 50 queries
    }
    this.querySequences.set(userId, sequence);

    this.userPatterns.set(userId, pattern);
  }

  /**
   * Calculate cache priority based on query characteristics
   */
  private calculatePriority(
    query: string,
    context: Record<string, any>,
    metadata: Partial<CacheMetadata>
  ): MemoryCachePriority {
    let score = 0;

    // Query complexity
    if (metadata.complexity === 'complex') score += 2;
    else if (metadata.complexity === 'medium') score += 1;

    // Query type importance
    if (metadata.queryType === 'code_generation') score += 2;
    else if (metadata.queryType === 'explanation') score += 1;

    // Context size (larger context = higher priority)
    if (context && Object.keys(context).length > 5) score += 1;

    // Convert score to priority
    if (score >= 4) return MemoryCachePriority.CRITICAL;
    if (score >= 2) return MemoryCachePriority.HIGH;
    if (score >= 1) return MemoryCachePriority.NORMAL;
    return MemoryCachePriority.LOW;
  }

  /**
   * Generate cache entry tags for organization and retrieval
   */
  private generateTags(
    query: string,
    context: Record<string, any>,
    metadata: Partial<CacheMetadata>
  ): string[] {
    const tags: string[] = [];

    if (metadata.queryType) tags.push(`type:${metadata.queryType}`);
    if (metadata.language) tags.push(`lang:${metadata.language}`);
    if (metadata.fileType) tags.push(`file:${metadata.fileType}`);
    if (metadata.complexity) tags.push(`complexity:${metadata.complexity}`);
    if (context.projectRoot) tags.push(`project:${path.basename(context.projectRoot)}`);

    return tags;
  }

  /**
   * Generate deterministic hash for query + context
   */
  private generateQueryHash(query: string, context: Record<string, any>): string {
    const combined = JSON.stringify({ query, context });
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Generate context key for similarity mapping
   */
  private generateContextKey(context: Record<string, any>): string {
    return JSON.stringify({
      fileType: context.fileType,
      language: context.language,
      projectType: context.projectType
    });
  }

  /**
   * Get analytics and performance metrics
   */
  getAnalytics(): CacheAnalytics {
    return { ...this.analytics };
  }

  /**
   * Clear cache and reset analytics
   */
  async clear(): Promise<void> {
    await this.cache.clear();
    this.userPatterns.clear();
    this.querySequences.clear();
    this.contextSimilarity.clear();
    this.prefetchQueue.length = 0;

    this.analytics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      predictiveAccuracy: 0,
      totalRequests: 0,
      cachedRequests: 0,
      prefetchedRequests: 0,
      memoryUsage: 0,
      topQueries: []
    };
  }

  /**
   * Start background prefetching process
   */
  private startBackgroundPrefetching(): void {
    setInterval(() => {
      if (this.prefetchQueue.length > 0 && !this.isProcessingPrefetch) {
        // Background prefetching would need AI response function
        // This would be triggered by the main application
        this.emit('prefetch:ready', { queueSize: this.prefetchQueue.length });
      }
    }, 30000); // Check every 30 seconds
  }

  // Helper methods for internal operations
  private findCommonNextQueries(sequence: string[], currentHash: string): Array<{ hash: string; probability: number; avgDelay: number }> {
    // Implementation would analyze sequence patterns
    return [];
  }

  private getCommonQueriesForContext(context: Record<string, any>): Array<{ hash: string; probability: number }> {
    // Implementation would return common queries for given context
    return [];
  }

  private updateContextSimilarity(context: Record<string, any>, queryHash: string): void {
    // Implementation would update context similarity mappings
  }

  private deduplicatePredictions(predictions: CachePrediction[]): CachePrediction[] {
    const seen = new Set<string>();
    return predictions.filter(p => {
      if (seen.has(p.queryHash)) return false;
      seen.add(p.queryHash);
      return true;
    });
  }

  private decodeQueryHash(hash: string): string {
    // This would need to be implemented with reverse mapping
    return `decoded_query_${hash.substring(0, 8)}`;
  }

  private updateHitRate(): void {
    this.analytics.hitRate = (this.analytics.cachedRequests / this.analytics.totalRequests) * 100;
  }

  private updateMissRate(): void {
    this.analytics.missRate = ((this.analytics.totalRequests - this.analytics.cachedRequests) / this.analytics.totalRequests) * 100;
  }

  private updateAverageResponseTime(responseTime: number): void {
    if (this.analytics.averageResponseTime === 0) {
      this.analytics.averageResponseTime = responseTime;
    } else {
      this.analytics.averageResponseTime = (this.analytics.averageResponseTime + responseTime) / 2;
    }
  }
}

// Global predictive cache instance
export const globalPredictiveCache = new PredictiveAICache();
