/**
 * Centralized Cache Management System
 *
 * Provides shared cache utilities to eliminate duplicate cache implementations
 * across the codebase and ensure consistent cache behavior.
 */

import { EventEmitter } from 'events';
import { getPerformanceConfig } from '../config/performance.js';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number;
  size?: number;
}

export interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
  enableMetrics?: boolean;
  evictionStrategy?: 'lru' | 'lfu' | 'ttl';
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  memoryUsage: number;
  entryCount: number;
  evictions: number;
}

/**
 * LRU Cache implementation with metrics and TTL support
 */
export class LRUCache<K, V> extends EventEmitter {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder = new Map<K, number>();
  private accessCounter = 0;
  private metrics: CacheMetrics;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    super();

    const config = getPerformanceConfig();
    this.options = {
      maxSize: options.maxSize || 1000,
      ttlMs: options.ttlMs || config.cache.defaultTTLMs,
      enableMetrics: options.enableMetrics !== false,
      evictionStrategy: options.evictionStrategy || 'lru'
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalOperations: 0,
      memoryUsage: 0,
      entryCount: 0,
      evictions: 0
    };
  }

  get(key: K): V | undefined {
    this.metrics.totalOperations++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      this.emit('expired', key, entry.value);
      return undefined;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, this.accessCounter++);

    this.metrics.hits++;
    this.updateHitRate();

    if (this.options.enableMetrics) {
      this.emit('hit', key, entry.value);
    }

    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Evict if at capacity
    if (this.cache.size >= this.options.maxSize) {
      this.evictOne();
    }

    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      ttl: ttl || this.options.ttlMs,
      size: this.estimateSize(value)
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, this.accessCounter++);
    this.metrics.entryCount = this.cache.size;
    this.updateMemoryUsage();

    if (this.options.enableMetrics) {
      this.emit('set', key, value);
    }
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.emit('expired', key, entry.value);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.metrics.entryCount = this.cache.size;
      this.updateMemoryUsage();
      this.emit('delete', key);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.metrics.entryCount = 0;
    this.metrics.memoryUsage = 0;
    this.emit('clear', size);
  }

  size(): number {
    return this.cache.size;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private evictOne(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: K;

    switch (this.options.evictionStrategy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'ttl':
        keyToEvict = this.findOldestTTLKey();
        break;
      default:
        keyToEvict = this.findLRUKey();
    }

    if (keyToEvict !== undefined) {
      const entry = this.cache.get(keyToEvict);
      this.cache.delete(keyToEvict);
      this.accessOrder.delete(keyToEvict);
      this.metrics.evictions++;
      this.metrics.entryCount = this.cache.size;
      this.updateMemoryUsage();

      if (entry) {
        this.emit('evict', keyToEvict, entry.value);
      }
    }
  }

  private findLRUKey(): K {
    let oldestAccess = this.accessCounter;
    let lruKey: K | undefined;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        lruKey = key;
      }
    }

    return lruKey as K;
  }

  private findLFUKey(): K {
    let minAccessCount = Infinity;
    let lfuKey: K | undefined;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey as K;
  }

  private findOldestTTLKey(): K {
    let oldestTimestamp = Date.now();
    let oldestKey: K | undefined;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey as K;
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalOperations > 0
      ? this.metrics.hits / this.metrics.totalOperations
      : 0;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    this.metrics.memoryUsage = totalSize;
  }

  private estimateSize(value: V): number {
    // Simple size estimation - can be enhanced
    if (typeof value === 'string') {
      return value.length * 2; // Unicode characters
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value).length * 2;
    }
    return 8; // Primitive types
  }
}

/**
 * Simple Map-based cache for scenarios where LRU is not needed
 */
export class SimpleCache<K, V> extends EventEmitter {
  private cache = new Map<K, V>();
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    super();
    this.options = options;
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      // Remove first entry (FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.emit('evict', firstKey);
      }
    }

    this.cache.set(key, value);
    this.emit('set', key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('delete', key);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.emit('clear', size);
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

/**
 * Cache Manager Factory
 */
export class CacheManager {
  private static caches = new Map<string, LRUCache<any, any> | SimpleCache<any, any>>();

  static createLRUCache<K, V>(name: string, options?: CacheOptions): LRUCache<K, V> {
    if (this.caches.has(name)) {
      throw new Error(`Cache with name '${name}' already exists`);
    }

    const cache = new LRUCache<K, V>(options);
    this.caches.set(name, cache);
    return cache;
  }

  static createSimpleCache<K, V>(name: string, options?: CacheOptions): SimpleCache<K, V> {
    if (this.caches.has(name)) {
      throw new Error(`Cache with name '${name}' already exists`);
    }

    const cache = new SimpleCache<K, V>(options);
    this.caches.set(name, cache);
    return cache;
  }

  static getCache<K, V>(name: string): LRUCache<K, V> | SimpleCache<K, V> | undefined {
    return this.caches.get(name) as LRUCache<K, V> | SimpleCache<K, V>;
  }

  static removeCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.clear();
      return this.caches.delete(name);
    }
    return false;
  }

  static clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
    this.caches.clear();
  }

  static getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  static getTotalMemoryUsage(): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      if (cache instanceof LRUCache) {
        total += cache.getMetrics().memoryUsage;
      }
    }
    return total;
  }
}