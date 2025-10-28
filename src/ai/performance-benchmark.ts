/**
 * Performance Benchmarking Infrastructure
 *
 * Provides comprehensive performance monitoring and benchmarking for the
 * ollama-code AI system, including knowledge graph operations, query processing,
 * and memory usage tracking.
 */

import { performance } from 'perf_hooks';
import { normalizeError } from '../utils/error-utils.js';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';

export interface BenchmarkResult {
  name: string;
  category: 'indexing' | 'query' | 'memory' | 'startup' | 'incremental';
  duration: number; // milliseconds
  memoryUsed: number; // bytes
  cpuUsage: number; // percentage
  timestamp: Date;
  metadata: Record<string, any>;
  success: boolean;
  error?: string;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  results: BenchmarkResult[];
  totalDuration: number;
  averageMemory: number;
  successRate: number;
  timestamp: Date;
}

export interface SystemMetrics {
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  cpuUsage: number[];
  nodeVersion: string;
  platform: string;
  arch: string;
}

export interface PerformanceTarget {
  name: string;
  category: string;
  maxDuration: number; // milliseconds
  maxMemory: number; // bytes
  minSuccessRate: number; // percentage
}

/**
 * Performance benchmarking and monitoring system
 */
export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private suites: BenchmarkSuite[] = [];
  private activeTimers = new Map<string, { start: number; memStart: number }>();
  private targets: PerformanceTarget[] = [];

  constructor() {
    this.initializeTargets();
  }

  /**
   * Initialize performance targets for different operations
   */
  private initializeTargets(): void {
    this.targets = [
      // Knowledge Graph Indexing
      {
        name: 'full_indexing_100k_files',
        category: 'indexing',
        maxDuration: 10000, // 10 seconds
        maxMemory: 2 * 1024 * 1024 * 1024, // 2GB
        minSuccessRate: 99
      },
      {
        name: 'incremental_update_batch',
        category: 'incremental',
        maxDuration: 1000, // 1 second
        maxMemory: 100 * 1024 * 1024, // 100MB
        minSuccessRate: 99.5
      },

      // Query Performance
      {
        name: 'simple_query',
        category: 'query',
        maxDuration: 100, // 100ms
        maxMemory: 50 * 1024 * 1024, // 50MB
        minSuccessRate: 95
      },
      {
        name: 'complex_query',
        category: 'query',
        maxDuration: 500, // 500ms
        maxMemory: 200 * 1024 * 1024, // 200MB
        minSuccessRate: 90
      },

      // Startup Performance
      {
        name: 'cold_start',
        category: 'startup',
        maxDuration: 1000, // 1 second
        maxMemory: 100 * 1024 * 1024, // 100MB
        minSuccessRate: 95
      },
      {
        name: 'warm_start',
        category: 'startup',
        maxDuration: 200, // 200ms
        maxMemory: 50 * 1024 * 1024, // 50MB
        minSuccessRate: 99
      },

      // Memory Management
      {
        name: 'memory_cleanup',
        category: 'memory',
        maxDuration: 500, // 500ms
        maxMemory: 0, // Should reduce memory
        minSuccessRate: 100
      }
    ];
  }

  /**
   * Start timing a benchmark operation
   */
  startTimer(operationName: string): void {
    const memUsage = process.memoryUsage();
    this.activeTimers.set(operationName, {
      start: performance.now(),
      memStart: memUsage.heapUsed
    });
  }

  /**
   * End timing and record benchmark result
   */
  endTimer(
    operationName: string,
    category: BenchmarkResult['category'],
    metadata: Record<string, any> = {},
    success: boolean = true,
    error?: string
  ): BenchmarkResult {
    const timer = this.activeTimers.get(operationName);
    if (!timer) {
      throw new Error(`No active timer found for operation: ${operationName}`);
    }

    const endTime = performance.now();
    const duration = endTime - timer.start;

    const memUsage = process.memoryUsage();
    const memoryUsed = memUsage.heapUsed - timer.memStart;

    const cpuUsage = this.getCurrentCpuUsage();

    const result: BenchmarkResult = {
      name: operationName,
      category,
      duration,
      memoryUsed,
      cpuUsage,
      timestamp: new Date(),
      metadata,
      success,
      error
    };

    this.results.push(result);
    this.activeTimers.delete(operationName);

    logger.debug('Benchmark completed', {
      operation: operationName,
      duration: `${duration.toFixed(2)}ms`,
      memory: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
      success
    });

    return result;
  }

  /**
   * Run a benchmark function and measure its performance
   */
  async benchmark<T>(
    operationName: string,
    category: BenchmarkResult['category'],
    operation: () => Promise<T> | T,
    metadata: Record<string, any> = {}
  ): Promise<{ result: T; benchmark: BenchmarkResult }> {
    this.startTimer(operationName);

    try {
      const result = await operation();
      const benchmark = this.endTimer(operationName, category, metadata, true);
      return { result, benchmark };
    } catch (error) {
      const benchmark = this.endTimer(
        operationName,
        category,
        metadata,
        false,
        normalizeError(error).message
      );
      throw error;
    }
  }

  /**
   * Run a suite of benchmarks
   */
  async runSuite(
    suiteName: string,
    description: string,
    benchmarks: Array<{
      name: string;
      category: BenchmarkResult['category'];
      operation: () => Promise<any> | any;
      metadata?: Record<string, any>;
    }>
  ): Promise<BenchmarkSuite> {
    const suiteStart = performance.now();
    const suiteResults: BenchmarkResult[] = [];

    logger.info(`Starting benchmark suite: ${suiteName}`);

    for (const bench of benchmarks) {
      try {
        const { benchmark } = await this.benchmark(
          bench.name,
          bench.category,
          bench.operation,
          bench.metadata || {}
        );
        suiteResults.push(benchmark);
      } catch (error) {
        logger.error(`Benchmark failed: ${bench.name}`, { error });
      }
    }

    const totalDuration = performance.now() - suiteStart;
    const averageMemory = suiteResults.reduce((sum, r) => sum + r.memoryUsed, 0) / suiteResults.length;
    const successRate = (suiteResults.filter(r => r.success).length / suiteResults.length) * 100;

    const suite: BenchmarkSuite = {
      name: suiteName,
      description,
      results: suiteResults,
      totalDuration,
      averageMemory,
      successRate,
      timestamp: new Date()
    };

    this.suites.push(suite);

    logger.info(`Benchmark suite completed: ${suiteName}`, {
      duration: `${totalDuration.toFixed(2)}ms`,
      averageMemory: `${(averageMemory / 1024 / 1024).toFixed(2)}MB`,
      successRate: `${successRate.toFixed(1)}%`
    });

    return suite;
  }

  /**
   * Check if results meet performance targets
   */
  checkPerformanceTargets(results: BenchmarkResult[]): {
    passed: boolean;
    failures: Array<{ result: BenchmarkResult; target: PerformanceTarget; reason: string }>;
  } {
    const failures: Array<{ result: BenchmarkResult; target: PerformanceTarget; reason: string }> = [];

    for (const result of results) {
      const target = this.targets.find(t => t.name === result.name || t.category === result.category);
      if (!target) continue;

      if (result.duration > target.maxDuration) {
        failures.push({
          result,
          target,
          reason: `Duration ${result.duration.toFixed(2)}ms exceeds target ${target.maxDuration}ms`
        });
      }

      if (result.memoryUsed > target.maxMemory && target.maxMemory > 0) {
        failures.push({
          result,
          target,
          reason: `Memory ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB exceeds target ${(target.maxMemory / 1024 / 1024).toFixed(2)}MB`
        });
      }
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg(); // 1, 5, 15 minute averages

    return {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      cpuUsage,
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * Generate performance report
   */
  generateReport(includeSystemInfo: boolean = true): {
    summary: {
      totalBenchmarks: number;
      totalSuites: number;
      averageDuration: number;
      averageMemory: number;
      overallSuccessRate: number;
    };
    targetCompliance: {
      passed: boolean;
      failures: Array<{ result: BenchmarkResult; target: PerformanceTarget; reason: string }>;
    };
    recentResults: BenchmarkResult[];
    systemMetrics?: SystemMetrics;
  } {
    const totalBenchmarks = this.results.length;
    const totalSuites = this.suites.length;

    const averageDuration = totalBenchmarks > 0
      ? this.results.reduce((sum, r) => sum + r.duration, 0) / totalBenchmarks
      : 0;

    const averageMemory = totalBenchmarks > 0
      ? this.results.reduce((sum, r) => sum + r.memoryUsed, 0) / totalBenchmarks
      : 0;

    const overallSuccessRate = totalBenchmarks > 0
      ? (this.results.filter(r => r.success).length / totalBenchmarks) * 100
      : 0;

    const targetCompliance = this.checkPerformanceTargets(this.results);

    const recentResults = this.results
      .slice(-10) // Last 10 results
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      summary: {
        totalBenchmarks,
        totalSuites,
        averageDuration,
        averageMemory,
        overallSuccessRate
      },
      targetCompliance,
      recentResults,
      systemMetrics: includeSystemInfo ? this.getSystemMetrics() : undefined
    };
  }

  /**
   * Export benchmark data to file
   */
  async exportResults(filePath: string): Promise<void> {
    const report = this.generateReport();
    const data = {
      exportTimestamp: new Date().toISOString(),
      results: this.results,
      suites: this.suites,
      targets: this.targets,
      report
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.info(`Benchmark data exported to ${filePath}`);
  }

  /**
   * Clear all benchmark data
   */
  clear(): void {
    this.results.length = 0;
    this.suites.length = 0;
    this.activeTimers.clear();
  }

  /**
   * Get CPU usage percentage (simplified)
   */
  private getCurrentCpuUsage(): number {
    const usage = process.cpuUsage();
    // Simplified CPU calculation - in production you'd want more accurate measurement
    return ((usage.user + usage.system) / 1000000) * 100; // Convert microseconds to percentage
  }

  /**
   * Create benchmark for knowledge graph operations
   */
  async benchmarkKnowledgeGraphIndexing(
    files: string[],
    indexingFunction: (files: string[]) => Promise<any>
  ): Promise<BenchmarkResult> {
    const { benchmark } = await this.benchmark(
      'knowledge_graph_indexing',
      'indexing',
      () => indexingFunction(files),
      {
        fileCount: files.length,
        totalSize: files.length * 1000 // Estimate
      }
    );

    return benchmark;
  }

  /**
   * Create benchmark for query operations
   */
  async benchmarkQuery(
    queryName: string,
    queryFunction: () => Promise<any>,
    complexity: 'simple' | 'complex' = 'simple'
  ): Promise<BenchmarkResult> {
    const { benchmark } = await this.benchmark(
      queryName,
      'query',
      queryFunction,
      { complexity }
    );

    return benchmark;
  }

  /**
   * Memory usage benchmark
   */
  async benchmarkMemoryOperation(
    operationName: string,
    operation: () => Promise<any> | any
  ): Promise<BenchmarkResult> {
    // Force garbage collection before measurement if available
    if (global.gc) {
      global.gc();
    }

    const { benchmark } = await this.benchmark(
      operationName,
      'memory',
      operation,
      {
        initialMemory: process.memoryUsage().heapUsed,
        platform: process.platform
      }
    );

    return benchmark;
  }

  /**
   * Startup time benchmark
   */
  async benchmarkStartup(
    startupFunction: () => Promise<any>,
    type: 'cold' | 'warm' = 'cold'
  ): Promise<BenchmarkResult> {
    const { benchmark } = await this.benchmark(
      `${type}_start`,
      'startup',
      startupFunction,
      { startupType: type }
    );

    return benchmark;
  }
}

/**
 * Global benchmark instance
 */
export const globalBenchmark = new PerformanceBenchmark();

/**
 * Decorator for automatic benchmarking of methods
 */
export function Benchmark(category: BenchmarkResult['category'], metadata: Record<string, any> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const operationName = `${target.constructor.name}.${propertyName}`;

      try {
        const { result } = await globalBenchmark.benchmark(
          operationName,
          category,
          () => method.apply(this, args),
          metadata
        );
        return result;
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Simple benchmark utility function
 */
export async function benchmarkFunction<T>(
  name: string,
  fn: () => Promise<T> | T,
  category: BenchmarkResult['category'] = 'query'
): Promise<T> {
  const { result } = await globalBenchmark.benchmark(name, category, fn);
  return result;
}
