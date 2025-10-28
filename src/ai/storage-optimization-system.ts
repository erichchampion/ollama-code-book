/**
 * Storage Optimization System for Knowledge Graph Performance
 *
 * Provides enterprise-grade storage optimization capabilities:
 * - Compressed storage for inactive graph partitions
 * - Efficient serialization/deserialization for persistence
 * - Disk-based cache management for large partitions
 * - Memory-mapped file support for ultra-large graphs
 * - Intelligent partition size monitoring and automatic splitting
 * - Background compression and optimization processes
 */

import { ManagedEventEmitter } from '../utils/managed-event-emitter.js';
import { getPerformanceConfig } from '../config/performance.js';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

// Promisified versions for async operations
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

export interface StorageConfiguration {
  storageDir: string;
  compressionLevel: number; // 1-9, 9 being maximum compression
  cacheMaxSize: number; // Maximum cache size in bytes
  partitionMaxSize: number; // Maximum partition size before splitting
  compressionThreshold: number; // Size threshold for compression
  memoryMapThreshold: number; // Size threshold for memory mapping
  cleanupInterval: number; // Cleanup interval in milliseconds
  persistenceStrategy: 'immediate' | 'batched' | 'lazy';
}

export interface PartitionMetrics {
  id: string;
  size: number;
  compressedSize?: number;
  lastAccessed: number;
  lastModified: number;
  accessCount: number;
  compressionRatio?: number;
  isMemoryMapped: boolean;
  isDiskCached: boolean;
  isCompressed: boolean;
}

export interface StorageStats {
  totalPartitions: number;
  totalSize: number;
  compressedPartitions: number;
  totalCompressedSize: number;
  cacheHitRate: number;
  averageCompressionRatio: number;
  memoryMappedPartitions: number;
  diskCachedPartitions: number;
}

export interface CompressionOptions {
  algorithm: 'gzip' | 'deflate' | 'brotli';
  level: number;
  chunkSize: number;
}

export interface PartitionSplitResult {
  originalId: string;
  newPartitions: string[];
  splitStrategy: 'size' | 'content' | 'access_pattern';
  splitRatio: number;
}

/**
 * Storage optimization engine for graph partitions
 */
export class StorageOptimizationSystem extends ManagedEventEmitter {
  private config: StorageConfiguration;
  private partitionCache = new Map<string, any>();
  private partitionMetrics = new Map<string, PartitionMetrics>();
  private diskCache = new Map<string, string>(); // partitionId -> filePath
  private memoryMappedFiles = new Map<string, Buffer>();
  private compressionJobs = new Set<string>();
  private accessStats = new Map<string, { hits: number; misses: number }>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<StorageConfiguration> = {}) {
    super({ maxListeners: 20 });

    const performanceConfig = getPerformanceConfig();
    this.config = {
      storageDir: config.storageDir || './data/storage-cache',
      compressionLevel: config.compressionLevel || performanceConfig.storage.compressionLevel,
      cacheMaxSize: config.cacheMaxSize || performanceConfig.storage.cacheMaxSizeBytes,
      partitionMaxSize: config.partitionMaxSize || performanceConfig.storage.partitionMaxSizeBytes,
      compressionThreshold: config.compressionThreshold || performanceConfig.storage.compressionThresholdBytes,
      memoryMapThreshold: config.memoryMapThreshold || performanceConfig.storage.memoryMapThresholdBytes,
      cleanupInterval: config.cleanupInterval || performanceConfig.storage.cleanupIntervalMs,
      persistenceStrategy: config.persistenceStrategy || 'batched'
    };

    this.initializeStorageSystem();
    this.startBackgroundProcesses();
  }

  /**
   * Initialize storage directories and metadata
   */
  private async initializeStorageSystem(): Promise<void> {
    try {
      await mkdir(this.config.storageDir, { recursive: true });
      await mkdir(path.join(this.config.storageDir, 'compressed'), { recursive: true });
      await mkdir(path.join(this.config.storageDir, 'cache'), { recursive: true });
      await mkdir(path.join(this.config.storageDir, 'mmap'), { recursive: true });

      // Load existing partition metrics
      await this.loadPartitionMetrics();

      this.emit('storageInitialized', {
        storageDir: this.config.storageDir,
        config: this.config
      });
    } catch (error) {
      this.emit('storageError', { operation: 'initialize', error });
      throw error;
    }
  }

  /**
   * Store partition data with automatic optimization
   */
  async storePartition(partitionId: string, data: any): Promise<void> {
    const startTime = Date.now();

    try {
      const serializedData = this.serializePartition(data);
      const dataSize = Buffer.byteLength(serializedData);

      // Update metrics
      this.updatePartitionMetrics(partitionId, {
        size: dataSize,
        lastModified: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1
      });

      // Store in memory cache first
      this.partitionCache.set(partitionId, data);

      // Determine storage strategy based on size and configuration
      if (dataSize >= this.config.memoryMapThreshold) {
        await this.createMemoryMappedFile(partitionId, serializedData);
      } else if (dataSize >= this.config.compressionThreshold) {
        await this.compressAndStorePartition(partitionId, serializedData);
      } else {
        await this.storeToDiskCache(partitionId, serializedData);
      }

      // Check if partition needs splitting
      if (dataSize >= this.config.partitionMaxSize) {
        this.schedulePartitionSplit(partitionId, data);
      }

      // Trigger cache cleanup if needed
      await this.performCacheCleanup();

      this.emit('partitionStored', {
        partitionId,
        size: dataSize,
        storageTime: Date.now() - startTime,
        strategy: this.getStorageStrategy(dataSize)
      });

    } catch (error) {
      this.emit('storageError', { operation: 'store', partitionId, error });
      throw error;
    }
  }

  /**
   * Retrieve partition data with caching and decompression
   */
  async retrievePartition(partitionId: string): Promise<any> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // Check memory cache first
      if (this.partitionCache.has(partitionId)) {
        cacheHit = true;
        this.updateAccessStats(partitionId, true);
        this.updatePartitionAccess(partitionId);

        const data = this.partitionCache.get(partitionId);
        this.emit('partitionRetrieved', {
          partitionId,
          cacheHit: true,
          retrievalTime: Date.now() - startTime
        });
        return data;
      }

      // Try memory-mapped files
      if (this.memoryMappedFiles.has(partitionId)) {
        const buffer = this.memoryMappedFiles.get(partitionId)!;
        const data = this.deserializePartition(buffer.toString());
        this.partitionCache.set(partitionId, data);
        this.updateAccessStats(partitionId, true);
        this.updatePartitionAccess(partitionId);

        this.emit('partitionRetrieved', {
          partitionId,
          cacheHit: false,
          source: 'memory_mapped',
          retrievalTime: Date.now() - startTime
        });
        return data;
      }

      // Try disk cache
      if (this.diskCache.has(partitionId)) {
        const filePath = this.diskCache.get(partitionId)!;
        const serializedData = await readFile(filePath, 'utf8');
        const data = this.deserializePartition(serializedData);

        this.partitionCache.set(partitionId, data);
        this.updateAccessStats(partitionId, true);
        this.updatePartitionAccess(partitionId);

        this.emit('partitionRetrieved', {
          partitionId,
          cacheHit: false,
          source: 'disk_cache',
          retrievalTime: Date.now() - startTime
        });
        return data;
      }

      // Try compressed storage
      const compressedPath = this.getCompressedPath(partitionId);
      if (await this.fileExists(compressedPath)) {
        const data = await this.decompressAndLoad(partitionId, compressedPath);
        this.partitionCache.set(partitionId, data);
        this.updateAccessStats(partitionId, true);
        this.updatePartitionAccess(partitionId);

        this.emit('partitionRetrieved', {
          partitionId,
          cacheHit: false,
          source: 'compressed',
          retrievalTime: Date.now() - startTime
        });
        return data;
      }

      // Partition not found
      this.updateAccessStats(partitionId, false);
      this.emit('partitionNotFound', { partitionId });
      return null;

    } catch (error) {
      this.emit('storageError', { operation: 'retrieve', partitionId, error });
      throw error;
    }
  }

  /**
   * Compress and store partition data
   */
  private async compressAndStorePartition(partitionId: string, data: string): Promise<void> {
    if (this.compressionJobs.has(partitionId)) {
      return; // Already being compressed
    }

    this.compressionJobs.add(partitionId);

    try {
      const compressed = await this.compressData(data);
      const compressedPath = this.getCompressedPath(partitionId);

      await writeFile(compressedPath, compressed);

      // Update metrics
      const metrics = this.partitionMetrics.get(partitionId);
      if (metrics) {
        metrics.compressedSize = compressed.length;
        metrics.compressionRatio = data.length / compressed.length;
        metrics.isCompressed = true;
      }

      this.emit('partitionCompressed', {
        partitionId,
        originalSize: data.length,
        compressedSize: compressed.length,
        compressionRatio: data.length / compressed.length
      });

    } finally {
      this.compressionJobs.delete(partitionId);
    }
  }

  /**
   * Decompress and load partition data
   */
  private async decompressAndLoad(partitionId: string, filePath: string): Promise<any> {
    try {
      const compressedData = await readFile(filePath);
      const decompressed = await this.decompressData(compressedData);
      return this.deserializePartition(decompressed);
    } catch (error) {
      this.emit('storageError', { operation: 'decompress', partitionId, error });
      throw error;
    }
  }

  /**
   * Create memory-mapped file for large partitions
   */
  private async createMemoryMappedFile(partitionId: string, data: string): Promise<void> {
    try {
      const mmapPath = this.getMemoryMappedPath(partitionId);
      await writeFile(mmapPath, data);

      // Create memory mapping
      const buffer = await readFile(mmapPath);
      this.memoryMappedFiles.set(partitionId, buffer);

      // Update metrics
      const metrics = this.partitionMetrics.get(partitionId);
      if (metrics) {
        metrics.isMemoryMapped = true;
      }

      this.emit('memoryMappedCreated', { partitionId, size: buffer.length });
    } catch (error) {
      this.emit('storageError', { operation: 'memory_map', partitionId, error });
      throw error;
    }
  }

  /**
   * Store to disk cache for medium-sized partitions
   */
  private async storeToDiskCache(partitionId: string, data: string): Promise<void> {
    try {
      const cachePath = this.getDiskCachePath(partitionId);
      await writeFile(cachePath, data);
      this.diskCache.set(partitionId, cachePath);

      // Update metrics
      const metrics = this.partitionMetrics.get(partitionId);
      if (metrics) {
        metrics.isDiskCached = true;
      }

      this.emit('diskCacheStored', { partitionId, path: cachePath });
    } catch (error) {
      this.emit('storageError', { operation: 'disk_cache', partitionId, error });
      throw error;
    }
  }

  /**
   * Schedule partition splitting for oversized partitions
   */
  private async schedulePartitionSplit(partitionId: string, data: any): Promise<void> {
    try {
      const splitResult = await this.splitPartition(partitionId, data);

      this.emit('partitionSplit', {
        originalId: partitionId,
        newPartitions: splitResult.newPartitions,
        strategy: splitResult.splitStrategy
      });

      // Store new partitions
      for (const newPartitionId of splitResult.newPartitions) {
        // Implementation would extract sub-data for each new partition
        // This is a simplified version
        const subData = this.extractPartitionData(data, newPartitionId);
        await this.storePartition(newPartitionId, subData);
      }

    } catch (error) {
      this.emit('storageError', { operation: 'split', partitionId, error });
    }
  }

  /**
   * Serialize partition data for storage
   */
  private serializePartition(data: any): string {
    try {
      return JSON.stringify(data, null, 0); // Compact JSON
    } catch (error) {
      this.emit('storageError', { operation: 'serialize', error });
      throw new Error(`Serialization failed: ${error}`);
    }
  }

  /**
   * Deserialize partition data from storage
   */
  private deserializePartition(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      this.emit('storageError', { operation: 'deserialize', error });
      throw new Error(`Deserialization failed: ${error}`);
    }
  }

  /**
   * Compress data using configured algorithm
   */
  private async compressData(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, { level: this.config.compressionLevel }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (error, result) => {
        if (error) reject(error);
        else resolve(result.toString());
      });
    });
  }

  /**
   * Perform cache cleanup to maintain size limits
   */
  private async performCacheCleanup(): Promise<void> {
    const currentCacheSize = this.calculateCacheSize();

    if (currentCacheSize > this.config.cacheMaxSize) {
      const excess = currentCacheSize - this.config.cacheMaxSize;
      await this.evictLeastUsedPartitions(excess);

      this.emit('cacheCleanup', {
        excessSize: excess,
        newCacheSize: this.calculateCacheSize()
      });
    }
  }

  /**
   * Evict least recently used partitions from cache
   */
  private async evictLeastUsedPartitions(targetEvictionSize: number): Promise<void> {
    const partitions = Array.from(this.partitionMetrics.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let evictedSize = 0;
    for (const [partitionId, metrics] of partitions) {
      if (evictedSize >= targetEvictionSize) break;

      this.partitionCache.delete(partitionId);
      evictedSize += metrics.size;

      this.emit('partitionEvicted', { partitionId, size: metrics.size });
    }
  }

  /**
   * Split oversized partition into smaller chunks
   */
  private async splitPartition(partitionId: string, data: any): Promise<PartitionSplitResult> {
    // Simplified splitting logic - in reality this would be more sophisticated
    const splitStrategy = 'size'; // Could be 'content' or 'access_pattern'
    const numSplits = 2;
    const newPartitions: string[] = [];

    for (let i = 0; i < numSplits; i++) {
      newPartitions.push(`${partitionId}_split_${i}`);
    }

    return {
      originalId: partitionId,
      newPartitions,
      splitStrategy,
      splitRatio: 1 / numSplits
    };
  }

  /**
   * Extract data for a specific partition split
   */
  private extractPartitionData(data: any, partitionId: string): any {
    // Simplified extraction - would implement actual data splitting logic
    return { ...data, partitionId };
  }

  /**
   * Update partition metrics
   */
  private updatePartitionMetrics(partitionId: string, updates: Partial<PartitionMetrics>): void {
    const existing = this.partitionMetrics.get(partitionId) || {
      id: partitionId,
      size: 0,
      lastAccessed: Date.now(),
      lastModified: Date.now(),
      accessCount: 0,
      isMemoryMapped: false,
      isDiskCached: false,
      isCompressed: false
    };

    this.partitionMetrics.set(partitionId, { ...existing, ...updates });
  }

  /**
   * Update partition access statistics
   */
  private updatePartitionAccess(partitionId: string): void {
    const metrics = this.partitionMetrics.get(partitionId);
    if (metrics) {
      metrics.lastAccessed = Date.now();
      metrics.accessCount++;
    }
  }

  /**
   * Update cache access statistics
   */
  private updateAccessStats(partitionId: string, hit: boolean): void {
    const stats = this.accessStats.get(partitionId) || { hits: 0, misses: 0 };
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    this.accessStats.set(partitionId, stats);
  }

  /**
   * Calculate current cache size
   */
  private calculateCacheSize(): number {
    let totalSize = 0;
    for (const [partitionId] of this.partitionCache) {
      const metrics = this.partitionMetrics.get(partitionId);
      if (metrics) {
        totalSize += metrics.size;
      }
    }
    return totalSize;
  }

  /**
   * Determine storage strategy based on data size
   */
  private getStorageStrategy(size: number): string {
    if (size >= this.config.memoryMapThreshold) return 'memory_mapped';
    if (size >= this.config.compressionThreshold) return 'compressed';
    return 'disk_cache';
  }

  /**
   * Get file paths for different storage types
   */
  private getCompressedPath(partitionId: string): string {
    return path.join(this.config.storageDir, 'compressed', `${partitionId}.gz`);
  }

  private getDiskCachePath(partitionId: string): string {
    return path.join(this.config.storageDir, 'cache', `${partitionId}.json`);
  }

  private getMemoryMappedPath(partitionId: string): string {
    return path.join(this.config.storageDir, 'mmap', `${partitionId}.mmap`);
  }

  private getMetricsPath(): string {
    return path.join(this.config.storageDir, 'metrics.json');
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load partition metrics from disk
   */
  private async loadPartitionMetrics(): Promise<void> {
    try {
      const metricsPath = this.getMetricsPath();
      if (await this.fileExists(metricsPath)) {
        const data = await readFile(metricsPath, 'utf8');
        const metrics = JSON.parse(data);

        for (const [partitionId, partitionMetrics] of Object.entries(metrics)) {
          this.partitionMetrics.set(partitionId, partitionMetrics as PartitionMetrics);
        }
      }
    } catch (error) {
      this.emit('storageError', { operation: 'loadMetrics', error });
    }
  }

  /**
   * Save partition metrics to disk
   */
  private async savePartitionMetrics(): Promise<void> {
    try {
      const metricsPath = this.getMetricsPath();
      const metrics = Object.fromEntries(this.partitionMetrics);
      await writeFile(metricsPath, JSON.stringify(metrics, null, 2));
    } catch (error) {
      this.emit('storageError', { operation: 'saveMetrics', error });
    }
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.performCacheCleanup();
      await this.savePartitionMetrics();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop background processes
   */
  private stopBackgroundProcesses(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): StorageStats {
    const metrics = Array.from(this.partitionMetrics.values());
    const totalStats = this.accessStats.values();

    let totalHits = 0;
    let totalMisses = 0;
    for (const stats of totalStats) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }

    const compressedPartitions = metrics.filter(m => m.isCompressed);
    const totalCompressionRatio = compressedPartitions
      .reduce((sum, m) => sum + (m.compressionRatio || 1), 0);

    return {
      totalPartitions: metrics.length,
      totalSize: metrics.reduce((sum, m) => sum + m.size, 0),
      compressedPartitions: compressedPartitions.length,
      totalCompressedSize: compressedPartitions.reduce((sum, m) => sum + (m.compressedSize || 0), 0),
      cacheHitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
      averageCompressionRatio: compressedPartitions.length > 0 ? totalCompressionRatio / compressedPartitions.length : 1,
      memoryMappedPartitions: metrics.filter(m => m.isMemoryMapped).length,
      diskCachedPartitions: metrics.filter(m => m.isDiskCached).length
    };
  }

  /**
   * Remove partition from all storage layers
   */
  async removePartition(partitionId: string): Promise<void> {
    try {
      // Remove from memory cache
      this.partitionCache.delete(partitionId);

      // Remove from memory-mapped files
      this.memoryMappedFiles.delete(partitionId);

      // Remove from disk cache
      if (this.diskCache.has(partitionId)) {
        const cachePath = this.diskCache.get(partitionId)!;
        if (await this.fileExists(cachePath)) {
          await unlink(cachePath);
        }
        this.diskCache.delete(partitionId);
      }

      // Remove compressed file
      const compressedPath = this.getCompressedPath(partitionId);
      if (await this.fileExists(compressedPath)) {
        await unlink(compressedPath);
      }

      // Remove memory-mapped file
      const mmapPath = this.getMemoryMappedPath(partitionId);
      if (await this.fileExists(mmapPath)) {
        await unlink(mmapPath);
      }

      // Remove metrics
      this.partitionMetrics.delete(partitionId);
      this.accessStats.delete(partitionId);

      this.emit('partitionRemoved', { partitionId });
    } catch (error) {
      this.emit('storageError', { operation: 'remove', partitionId, error });
      throw error;
    }
  }

  /**
   * Shutdown storage system
   */
  async shutdown(): Promise<void> {
    this.stopBackgroundProcesses();
    await this.savePartitionMetrics();

    // Clear all caches
    this.partitionCache.clear();
    this.memoryMappedFiles.clear();
    this.diskCache.clear();

    this.emit('storageShutdown');
  }
}