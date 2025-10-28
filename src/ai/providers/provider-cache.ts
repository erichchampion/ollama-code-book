/**
 * Provider-Specific Caching Strategies
 *
 * Implements intelligent caching strategies tailored to each AI provider's
 * characteristics, cost models, and performance patterns for optimal
 * response times and cost efficiency.
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { providerConfig } from './provider-config.js';

export interface CacheEntry {
  key: string;
  value: any;
  metadata: CacheMetadata;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  expiresAt?: Date;
}

export interface CacheMetadata {
  providerId: string;
  model: string;
  contextHash: string;
  responseSize: number;
  processingTime: number;
  cost: number;
  quality: number;
  tags: string[];
  capabilities: string[];
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  persistToDisk: boolean;
  compressionEnabled: boolean;
  metricsEnabled: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
  costSavings: number;
  averageResponseTime: number;
}

export interface CacheStrategy {
  name: string;
  description: string;
  shouldCache(request: any, response: any, metadata: CacheMetadata): boolean;
  getTTL(request: any, response: any, metadata: CacheMetadata): number;
  getEvictionPriority(entry: CacheEntry): number;
  shouldUpdate(existing: CacheEntry, newEntry: CacheEntry): boolean;
}

export class ProviderCacheManager extends EventEmitter {
  private caches = new Map<string, ProviderCache>();
  private strategies = new Map<string, CacheStrategy>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    const defaultConfig = providerConfig.getCacheConfig();
    this.config = {
      maxSize: defaultConfig.maxSize,
      defaultTTL: defaultConfig.defaultTtl,
      cleanupInterval: defaultConfig.cleanupInterval,
      persistToDisk: false,
      compressionEnabled: true,
      metricsEnabled: true,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      costSavings: 0,
      averageResponseTime: 0
    };

    this.initializeStrategies();
    this.initializeProviderCaches();
    this.startCleanupTimer();
  }

  /**
   * Initialize caching strategies for different providers
   */
  private initializeStrategies(): void {
    this.strategies.set('ollama', new OllamaCacheStrategy());
    this.strategies.set('openai', new OpenAICacheStrategy());
    this.strategies.set('anthropic', new AnthropicCacheStrategy());
    this.strategies.set('google', new GoogleCacheStrategy());
  }

  /**
   * Initialize provider-specific caches
   */
  private initializeProviderCaches(): void {
    const providers = ['ollama', 'openai', 'anthropic', 'google'];

    for (const providerId of providers) {
      const strategy = this.strategies.get(providerId);
      if (strategy) {
        this.caches.set(providerId, new ProviderCache(providerId, strategy, this.config));
      }
    }
  }

  /**
   * Get cached response if available
   */
  async get(providerId: string, request: any): Promise<any | null> {
    const cache = this.caches.get(providerId);
    if (!cache) {
      return null;
    }

    const key = this.generateCacheKey(providerId, request);
    const entry = await cache.get(key);

    if (entry) {
      this.metrics.hits++;
      this.updateMetrics();
      this.emit('cache_hit', { providerId, key, entry });
      return entry.value;
    }

    this.metrics.misses++;
    this.updateMetrics();
    this.emit('cache_miss', { providerId, key });
    return null;
  }

  /**
   * Store response in cache
   */
  async set(
    providerId: string,
    request: any,
    response: any,
    metadata: CacheMetadata
  ): Promise<void> {
    const cache = this.caches.get(providerId);
    if (!cache) {
      return;
    }

    const key = this.generateCacheKey(providerId, request);
    const strategy = this.strategies.get(providerId);

    if (strategy && strategy.shouldCache(request, response, metadata)) {
      await cache.set(key, response, metadata);
      this.emit('cache_set', { providerId, key, metadata });
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(providerId: string, request: any): string {
    const normalizedRequest = this.normalizeRequest(request);
    const requestString = JSON.stringify(normalizedRequest);
    return createHash('sha256').update(`${providerId}:${requestString}`).digest('hex');
  }

  /**
   * Normalize request for consistent cache keys
   */
  private normalizeRequest(request: any): any {
    const normalized = { ...request };

    // Remove non-deterministic fields
    delete normalized.timestamp;
    delete normalized.requestId;
    delete normalized.sessionId;

    // Normalize arrays
    if (normalized.messages && Array.isArray(normalized.messages)) {
      normalized.messages = normalized.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));
    }

    // Sort object keys for consistency
    return this.sortObjectKeys(normalized);
  }

  /**
   * Sort object keys recursively for consistent serialization
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObjectKeys(obj[key]);
    });

    return sorted;
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = this.metrics.totalRequests > 0
      ? this.metrics.hits / this.metrics.totalRequests
      : 0;

    let totalSize = 0;
    let totalCostSavings = 0;

    for (const cache of this.caches.values()) {
      totalSize += cache.getSize();
      totalCostSavings += cache.getCostSavings();
    }

    this.metrics.cacheSize = totalSize;
    this.metrics.costSavings = totalCostSavings;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform cache cleanup
   */
  private async performCleanup(): Promise<void> {
    for (const cache of this.caches.values()) {
      await cache.cleanup();
    }

    this.updateMetrics();
    this.emit('cleanup_completed', this.metrics);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get provider-specific cache metrics
   */
  getProviderMetrics(providerId: string): CacheMetrics | null {
    const cache = this.caches.get(providerId);
    return cache ? cache.getMetrics() : null;
  }

  /**
   * Clear cache for specific provider
   */
  async clearProvider(providerId: string): Promise<void> {
    const cache = this.caches.get(providerId);
    if (cache) {
      await cache.clear();
      this.emit('cache_cleared', { providerId });
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    for (const [providerId, cache] of this.caches) {
      await cache.clear();
    }

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      costSavings: 0,
      averageResponseTime: 0
    };

    this.emit('all_caches_cleared');
  }

  /**
   * Dispose of cache manager
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.removeAllListeners();
    this.caches.clear();
    this.strategies.clear();
  }
}

/**
 * Individual provider cache implementation
 */
class ProviderCache {
  private entries = new Map<string, CacheEntry>();
  private strategy: CacheStrategy;
  private config: CacheConfig;
  private metrics: CacheMetrics;

  constructor(
    private providerId: string,
    strategy: CacheStrategy,
    config: CacheConfig
  ) {
    this.strategy = strategy;
    this.config = config;
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      costSavings: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Get entry from cache
   */
  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.entries.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.entries.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Update access info
    entry.lastAccessed = new Date();
    entry.accessCount++;

    this.metrics.hits++;
    this.metrics.costSavings += entry.metadata.cost;

    return entry;
  }

  /**
   * Set entry in cache
   */
  async set(key: string, value: any, metadata: CacheMetadata): Promise<void> {
    const now = new Date();
    const ttl = this.strategy.getTTL({}, value, metadata);
    const expiresAt = ttl > 0 ? new Date(now.getTime() + ttl) : undefined;

    const entry: CacheEntry = {
      key,
      value,
      metadata,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      expiresAt
    };

    // Check if we should update existing entry
    const existing = this.entries.get(key);
    if (existing && !this.strategy.shouldUpdate(existing, entry)) {
      return;
    }

    // Ensure cache size limits
    if (this.entries.size >= this.config.maxSize) {
      await this.evictEntries(1);
    }

    this.entries.set(key, entry);
  }

  /**
   * Evict entries based on strategy
   */
  private async evictEntries(count: number): Promise<void> {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) =>
      this.strategy.getEvictionPriority(a) - this.strategy.getEvictionPriority(b)
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.entries.delete(entries[i].key);
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.entries.delete(key);
    }
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.entries.size;
  }

  /**
   * Get cost savings
   */
  getCostSavings(): number {
    return this.metrics.costSavings;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = this.metrics.totalRequests > 0
      ? this.metrics.hits / this.metrics.totalRequests
      : 0;
    this.metrics.cacheSize = this.entries.size;

    // Calculate memory usage estimate
    let memoryUsage = 0;
    for (const entry of this.entries.values()) {
      memoryUsage += JSON.stringify(entry).length * 2; // Rough estimate
    }
    this.metrics.memoryUsage = memoryUsage;
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    this.entries.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      costSavings: 0,
      averageResponseTime: 0
    };
  }
}

/**
 * Ollama caching strategy
 * - Cache aggressively since it's typically free
 * - Long TTL for stable responses
 * - Prioritize frequently accessed entries
 */
class OllamaCacheStrategy implements CacheStrategy {
  name = 'ollama-strategy';
  description = 'Aggressive caching for free Ollama responses';

  shouldCache(_request: any, response: any, metadata: CacheMetadata): boolean {
    // Cache almost everything for Ollama since it's free
    if (!response || response.length === 0) {
      return false;
    }

    // Don't cache very large responses to save memory
    return metadata.responseSize < 100000; // 100KB limit
  }

  getTTL(_request: any, _response: any, _metadata: CacheMetadata): number {
    // Long TTL since Ollama responses are typically consistent
    return 24 * 60 * 60 * 1000; // 24 hours
  }

  getEvictionPriority(entry: CacheEntry): number {
    // Lower is higher priority for eviction
    // Evict entries with low access count and old age first
    const ageFactor = (Date.now() - entry.lastAccessed.getTime()) / (1000 * 60 * 60); // Hours
    const accessFactor = 1 / (entry.accessCount + 1);
    return ageFactor + accessFactor;
  }

  shouldUpdate(existing: CacheEntry, newEntry: CacheEntry): boolean {
    // Update if the new entry is significantly newer
    const ageHours = (newEntry.createdAt.getTime() - existing.createdAt.getTime()) / (1000 * 60 * 60);
    return ageHours > 12; // Update if >12 hours old
  }
}

/**
 * OpenAI caching strategy
 * - Balance cost savings with freshness
 * - Shorter TTL for expensive models
 * - Consider request cost in caching decisions
 */
class OpenAICacheStrategy implements CacheStrategy {
  name = 'openai-strategy';
  description = 'Cost-aware caching for OpenAI responses';

  shouldCache(request: any, response: any, metadata: CacheMetadata): boolean {
    if (!response || response.length === 0) {
      return false;
    }

    // Cache based on cost and quality
    return metadata.cost > 0.001 || metadata.quality > 0.7;
  }

  getTTL(_request: any, _response: any, metadata: CacheMetadata): number {
    // Shorter TTL for expensive models, longer for cheap ones
    const baseTTL = 2 * 60 * 60 * 1000; // 2 hours
    const costFactor = Math.min(metadata.cost / 0.01, 2); // Scale with cost
    return baseTTL * (1 + costFactor);
  }

  getEvictionPriority(entry: CacheEntry): number {
    // Consider cost, access frequency, and age
    const ageFactor = (Date.now() - entry.lastAccessed.getTime()) / (1000 * 60 * 60);
    const costFactor = 1 / (entry.metadata.cost + 0.001); // Higher cost = lower priority for eviction
    const accessFactor = 1 / (entry.accessCount + 1);

    return ageFactor + costFactor + accessFactor;
  }

  shouldUpdate(existing: CacheEntry, newEntry: CacheEntry): boolean {
    // Update if cost is significantly higher or quality is better
    return newEntry.metadata.cost > existing.metadata.cost * 1.5 ||
           newEntry.metadata.quality > existing.metadata.quality + 0.1;
  }
}

/**
 * Anthropic caching strategy
 * - Focus on high-quality, reasoning-heavy responses
 * - Longer TTL for analytical content
 * - Prioritize complex analysis results
 */
class AnthropicCacheStrategy implements CacheStrategy {
  name = 'anthropic-strategy';
  description = 'Quality-focused caching for Anthropic responses';

  shouldCache(request: any, response: any, metadata: CacheMetadata): boolean {
    if (!response || response.length === 0) {
      return false;
    }

    // Cache high-quality responses and analytical content
    const isAnalytical = metadata.tags.some(tag =>
      ['analysis', 'reasoning', 'explanation'].includes(tag)
    );

    return metadata.quality > 0.6 || isAnalytical || metadata.responseSize > 1000;
  }

  getTTL(_request: any, _response: any, _metadata: CacheMetadata): number {
    // Longer TTL for analytical content
    const baseTTL = 4 * 60 * 60 * 1000; // 4 hours
    const qualityFactor = _metadata.quality * 2;
    const analysisBonus = _metadata.tags.includes('analysis') ? 2 : 1;

    return baseTTL * qualityFactor * analysisBonus;
  }

  getEvictionPriority(entry: CacheEntry): number {
    const ageFactor = (Date.now() - entry.lastAccessed.getTime()) / (1000 * 60 * 60);
    const qualityFactor = 1 / (entry.metadata.quality + 0.1);
    const sizeFactor = 1 / (entry.metadata.responseSize / 1000 + 1);

    return ageFactor + qualityFactor + sizeFactor;
  }

  shouldUpdate(existing: CacheEntry, newEntry: CacheEntry): boolean {
    // Update if quality is significantly better
    return newEntry.metadata.quality > existing.metadata.quality + 0.2;
  }
}

/**
 * Google caching strategy
 * - Optimize for multimodal content
 * - Consider model capabilities in caching
 * - Balance cost and performance
 */
class GoogleCacheStrategy implements CacheStrategy {
  name = 'google-strategy';
  description = 'Multimodal-aware caching for Google responses';

  shouldCache(request: any, response: any, metadata: CacheMetadata): boolean {
    if (!response || response.length === 0) {
      return false;
    }

    // Cache multimodal content more aggressively
    const isMultimodal = metadata.capabilities.includes('multimodal');
    const isFunctionCall = metadata.capabilities.includes('function-calling');

    return isMultimodal || isFunctionCall || metadata.quality > 0.65;
  }

  getTTL(_request: any, _response: any, _metadata: CacheMetadata): number {
    const baseTTL = 3 * 60 * 60 * 1000; // 3 hours

    // Longer TTL for multimodal content (more expensive to regenerate)
    if (_metadata.capabilities.includes('multimodal')) {
      return baseTTL * 3;
    }

    // Standard TTL for text-only
    return baseTTL;
  }

  getEvictionPriority(entry: CacheEntry): number {
    const ageFactor = (Date.now() - entry.lastAccessed.getTime()) / (1000 * 60 * 60);
    const accessFactor = 1 / (entry.accessCount + 1);

    // Lower priority for eviction if multimodal
    const modalityFactor = entry.metadata.capabilities.includes('multimodal') ? 0.5 : 1;

    return (ageFactor + accessFactor) * modalityFactor;
  }

  shouldUpdate(existing: CacheEntry, newEntry: CacheEntry): boolean {
    // Update if new entry has more capabilities
    const existingCapabilities = new Set(existing.metadata.capabilities);
    const newCapabilities = new Set(newEntry.metadata.capabilities);

    for (const capability of newCapabilities) {
      if (!existingCapabilities.has(capability)) {
        return true;
      }
    }

    return false;
  }
}