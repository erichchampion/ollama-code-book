/**
 * Query Performance Monitor
 *
 * Comprehensive performance monitoring and benchmarking system for knowledge graph queries.
 * Provides real-time metrics, trend analysis, and optimization recommendations.
 *
 * Features:
 * - Real-time query performance tracking
 * - Historical performance trend analysis
 * - Query optimization recommendations
 * - Memory usage monitoring and alerts
 * - Bottleneck identification and reporting
 * - Performance regression detection
 */

import { logger } from '../utils/logger.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';
import * as os from 'os';

export interface QueryMetrics {
  queryId: string;
  queryType: 'search' | 'pattern' | 'relationship' | 'statistics' | 'architectural';
  queryText: string;
  executionTime: number;
  memoryUsed: number;
  cpuTime: number;
  ioOperations: number;
  cacheHitRate: number;
  resultsCount: number;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
  timestamp: Date;
  success: boolean;
  errorType?: string;
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface OptimizationOpportunity {
  type: 'indexing' | 'caching' | 'query_rewrite' | 'partitioning' | 'memory';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface PerformanceTrend {
  metric: keyof QueryMetrics;
  timeWindow: '1h' | '24h' | '7d' | '30d';
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  significance: 'low' | 'medium' | 'high';
}

export interface PerformanceAlert {
  type: 'slow_query' | 'memory_spike' | 'cache_miss' | 'error_rate' | 'regression';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  queryId?: string;
  metric: string;
  threshold: number;
  actualValue: number;
  timestamp: Date;
  recommendations: string[];
}

export interface PerformanceBenchmark {
  queryType: string;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  averageMemoryUsage: number;
  averageCacheHitRate: number;
  errorRate: number;
  sampleSize: number;
  lastUpdated: Date;
}

export interface SystemResource {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  diskUsage: number;
  networkIO: number;
  timestamp: Date;
}

/**
 * Query Performance Monitor
 */
export class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private benchmarks = new Map<string, PerformanceBenchmark>();
  private alerts: PerformanceAlert[] = [];
  private resourceHistory: SystemResource[] = [];
  private isMonitoring = false;
  private resourceMonitorInterval?: ReturnType<typeof setInterval>;

  // Configuration
  private config = {
    maxMetricsHistory: 10000,
    maxAlertsHistory: 1000,
    maxResourceHistory: 2000,
    alertThresholds: {
      slowQueryMs: 5000,
      memorySpikeMB: 500,
      cacheMissRate: 0.3,
      errorRate: 0.05
    },
    benchmarkUpdateInterval: 100, // Update benchmarks every N queries
    resourceMonitorInterval: 5000 // Monitor system resources every 5s
  };

  constructor() {
    this.startResourceMonitoring();
    logger.info('QueryPerformanceMonitor initialized');
  }

  /**
   * Record a query execution
   */
  recordQuery(metrics: Omit<QueryMetrics, 'queryId' | 'timestamp' | 'optimizationOpportunities'>): string {
    const queryId = this.generateQueryId();
    const optimizationOpportunities = this.analyzeOptimizationOpportunities(metrics);

    const fullMetrics: QueryMetrics = {
      ...metrics,
      queryId,
      timestamp: new Date(),
      optimizationOpportunities
    };

    this.metrics.push(fullMetrics);

    // Maintain history size
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory);
    }

    // Check for alerts
    this.checkForAlerts(fullMetrics);

    // Update benchmarks periodically
    if (this.metrics.length % this.config.benchmarkUpdateInterval === 0) {
      this.updateBenchmarks();
    }

    // Log slow queries
    if (metrics.executionTime > this.config.alertThresholds.slowQueryMs) {
      logger.warn(`Slow query detected: ${queryId} took ${metrics.executionTime}ms`);
    }

    return queryId;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeWindow: '1h' | '24h' | '7d' | '30d' = '24h'): {
    totalQueries: number;
    averageExecutionTime: number;
    medianExecutionTime: number;
    p95ExecutionTime: number;
    successRate: number;
    averageMemoryUsage: number;
    cacheMissRate: number;
    queryTypeDistribution: Record<string, number>;
    slowestQueries: QueryMetrics[];
    mostCommonErrors: Record<string, number>;
  } {
    const filteredMetrics = this.getMetricsInTimeWindow(timeWindow);

    if (filteredMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        medianExecutionTime: 0,
        p95ExecutionTime: 0,
        successRate: 0,
        averageMemoryUsage: 0,
        cacheMissRate: 0,
        queryTypeDistribution: {},
        slowestQueries: [],
        mostCommonErrors: {}
      };
    }

    const executionTimes = filteredMetrics.map(m => m.executionTime).sort((a, b) => a - b);
    const memoryUsages = filteredMetrics.map(m => m.memoryUsed);
    const cacheHitRates = filteredMetrics.map(m => m.cacheHitRate);

    const successfulQueries = filteredMetrics.filter(m => m.success);
    const failedQueries = filteredMetrics.filter(m => !m.success);

    // Query type distribution
    const queryTypeDistribution: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      queryTypeDistribution[m.queryType] = (queryTypeDistribution[m.queryType] || 0) + 1;
    });

    // Most common errors
    const mostCommonErrors: Record<string, number> = {};
    failedQueries.forEach(m => {
      if (m.errorType) {
        mostCommonErrors[m.errorType] = (mostCommonErrors[m.errorType] || 0) + 1;
      }
    });

    return {
      totalQueries: filteredMetrics.length,
      averageExecutionTime: this.average(executionTimes),
      medianExecutionTime: this.percentile(executionTimes, THRESHOLD_CONSTANTS.QUERY_PERFORMANCE.MEDIAN_PERCENTILE),
      p95ExecutionTime: this.percentile(executionTimes, THRESHOLD_CONSTANTS.QUERY_PERFORMANCE.P95_PERCENTILE),
      successRate: successfulQueries.length / filteredMetrics.length,
      averageMemoryUsage: this.average(memoryUsages),
      cacheMissRate: 1 - this.average(cacheHitRates),
      queryTypeDistribution,
      slowestQueries: filteredMetrics
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10),
      mostCommonErrors
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const timeWindows: Array<'1h' | '24h' | '7d' | '30d'> = ['1h', '24h', '7d', '30d'];

    for (const window of timeWindows) {
      const current = this.getMetricsInTimeWindow(window);
      const previous = this.getMetricsInTimeWindow(window, this.getTimeWindowOffset(window));

      if (current.length > 0 && previous.length > 0) {
        trends.push(...this.calculateTrends(current, previous, window));
      }
    }

    return trends;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > oneDayAgo);
  }

  /**
   * Get benchmarks for specific query types
   */
  getBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationOpportunity[] {
    const recentMetrics = this.getMetricsInTimeWindow('24h');
    const opportunities = new Map<string, OptimizationOpportunity>();

    // Collect all optimization opportunities
    recentMetrics.forEach(metric => {
      metric.optimizationOpportunities.forEach(opp => {
        const key = `${opp.type}-${opp.description}`;
        if (!opportunities.has(key)) {
          opportunities.set(key, opp);
        }
      });
    });

    // Sort by impact and effort
    return Array.from(opportunities.values())
      .sort((a, b) => {
        const impactWeight = { high: 3, medium: 2, low: 1 };
        const effortWeight = { low: 3, medium: 2, high: 1 };

        const aScore = impactWeight[a.impact] * effortWeight[a.effort];
        const bScore = impactWeight[b.impact] * effortWeight[b.effort];

        return bScore - aScore;
      });
  }

  /**
   * Get current system resource usage
   */
  getCurrentSystemResources(): SystemResource {
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0] / os.cpus().length; // Normalized CPU usage

    return {
      cpuUsage: Math.min(100, cpuUsage * 100),
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
      memoryTotal: memUsage.heapTotal / 1024 / 1024, // MB
      diskUsage: 0, // Would need additional implementation
      networkIO: 0, // Would need additional implementation
      timestamp: new Date()
    };
  }

  /**
   * Start monitoring system resources
   */
  private startResourceMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.resourceMonitorInterval = setInterval(() => {
      const resource = this.getCurrentSystemResources();
      this.resourceHistory.push(resource);

      // Maintain history size
      if (this.resourceHistory.length > this.config.maxResourceHistory) {
        this.resourceHistory = this.resourceHistory.slice(-this.config.maxResourceHistory);
      }

      // Check for resource-based alerts
      this.checkResourceAlerts(resource);
    }, this.config.resourceMonitorInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('QueryPerformanceMonitor stopped');
  }

  private generateQueryId(): string {
    return `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private analyzeOptimizationOpportunities(metrics: Omit<QueryMetrics, 'queryId' | 'timestamp' | 'optimizationOpportunities'>): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Slow execution time
    if (metrics.executionTime > 2000) {
      opportunities.push({
        type: 'indexing',
        description: 'Query execution time is high',
        impact: 'high',
        effort: 'medium',
        recommendation: 'Consider adding indexes for frequently queried properties'
      });
    }

    // High memory usage
    if (metrics.memoryUsed > 100) {
      opportunities.push({
        type: 'memory',
        description: 'High memory usage detected',
        impact: 'medium',
        effort: 'low',
        recommendation: 'Implement result streaming or pagination for large result sets'
      });
    }

    // Low cache hit rate
    if (metrics.cacheHitRate < THRESHOLD_CONSTANTS.QUERY_PERFORMANCE.LOW_CACHE_HIT_RATE) {
      opportunities.push({
        type: 'caching',
        description: 'Low cache hit rate',
        impact: 'medium',
        effort: 'low',
        recommendation: 'Improve caching strategy or increase cache size'
      });
    }

    // High complexity queries
    if (metrics.complexity === 'extreme') {
      opportunities.push({
        type: 'query_rewrite',
        description: 'Extremely complex query detected',
        impact: 'high',
        effort: 'high',
        recommendation: 'Consider breaking down complex queries into simpler components'
      });
    }

    return opportunities;
  }

  private checkForAlerts(metrics: QueryMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Slow query alert
    if (metrics.executionTime > this.config.alertThresholds.slowQueryMs) {
      alerts.push({
        type: 'slow_query',
        severity: metrics.executionTime > this.config.alertThresholds.slowQueryMs * 2 ? 'critical' : 'warning',
        message: `Query ${metrics.queryId} exceeded execution time threshold`,
        queryId: metrics.queryId,
        metric: 'executionTime',
        threshold: this.config.alertThresholds.slowQueryMs,
        actualValue: metrics.executionTime,
        timestamp: new Date(),
        recommendations: [
          'Consider adding appropriate indexes',
          'Review query complexity',
          'Check for missing caching opportunities'
        ]
      });
    }

    // Memory spike alert
    if (metrics.memoryUsed > this.config.alertThresholds.memorySpikeMB) {
      alerts.push({
        type: 'memory_spike',
        severity: 'warning',
        message: `High memory usage detected for query ${metrics.queryId}`,
        queryId: metrics.queryId,
        metric: 'memoryUsed',
        threshold: this.config.alertThresholds.memorySpikeMB,
        actualValue: metrics.memoryUsed,
        timestamp: new Date(),
        recommendations: [
          'Implement result pagination',
          'Use streaming for large datasets',
          'Consider query optimization'
        ]
      });
    }

    // Cache miss alert
    if (metrics.cacheHitRate < (1 - this.config.alertThresholds.cacheMissRate)) {
      alerts.push({
        type: 'cache_miss',
        severity: 'info',
        message: `Low cache hit rate for query ${metrics.queryId}`,
        queryId: metrics.queryId,
        metric: 'cacheHitRate',
        threshold: 1 - this.config.alertThresholds.cacheMissRate,
        actualValue: metrics.cacheHitRate,
        timestamp: new Date(),
        recommendations: [
          'Review caching strategy',
          'Increase cache size if needed',
          'Check cache invalidation policies'
        ]
      });
    }

    this.alerts.push(...alerts);

    // Maintain alerts history
    if (this.alerts.length > this.config.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.config.maxAlertsHistory);
    }
  }

  private checkResourceAlerts(resource: SystemResource): void {
    // High memory usage alert
    if (resource.memoryUsage > resource.memoryTotal * THRESHOLD_CONSTANTS.QUERY_PERFORMANCE.HIGH_MEMORY_THRESHOLD) {
      this.alerts.push({
        type: 'memory_spike',
        severity: 'warning',
        message: 'System memory usage is high',
        metric: 'systemMemoryUsage',
        threshold: resource.memoryTotal * 0.8,
        actualValue: resource.memoryUsage,
        timestamp: new Date(),
        recommendations: [
          'Consider garbage collection',
          'Review memory-intensive operations',
          'Implement memory optimization strategies'
        ]
      });
    }

    // High CPU usage alert
    if (resource.cpuUsage > 80) {
      this.alerts.push({
        type: 'slow_query',
        severity: 'warning',
        message: 'System CPU usage is high',
        metric: 'systemCpuUsage',
        threshold: 80,
        actualValue: resource.cpuUsage,
        timestamp: new Date(),
        recommendations: [
          'Review CPU-intensive operations',
          'Consider parallel processing optimization',
          'Check for infinite loops or blocking operations'
        ]
      });
    }
  }

  private updateBenchmarks(): void {
    const queryTypes = new Set(this.metrics.map(m => m.queryType));

    queryTypes.forEach(queryType => {
      const typeMetrics = this.metrics.filter(m => m.queryType === queryType && m.success);

      if (typeMetrics.length > 0) {
        const executionTimes = typeMetrics.map(m => m.executionTime).sort((a, b) => a - b);
        const memoryUsages = typeMetrics.map(m => m.memoryUsed);
        const cacheHitRates = typeMetrics.map(m => m.cacheHitRate);
        const errorRate = 1 - (typeMetrics.length / this.metrics.filter(m => m.queryType === queryType).length);

        this.benchmarks.set(queryType, {
          queryType,
          p50ExecutionTime: this.percentile(executionTimes, 0.5),
          p95ExecutionTime: this.percentile(executionTimes, 0.95),
          p99ExecutionTime: this.percentile(executionTimes, 0.99),
          averageMemoryUsage: this.average(memoryUsages),
          averageCacheHitRate: this.average(cacheHitRates),
          errorRate,
          sampleSize: typeMetrics.length,
          lastUpdated: new Date()
        });
      }
    });
  }

  private getMetricsInTimeWindow(timeWindow: '1h' | '24h' | '7d' | '30d', offsetMs = 0): QueryMetrics[] {
    const windowMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(Date.now() - windowMs[timeWindow] - offsetMs);
    const endTime = offsetMs > 0 ? new Date(Date.now() - offsetMs) : new Date();

    return this.metrics.filter(m => m.timestamp >= cutoff && m.timestamp <= endTime);
  }

  private getTimeWindowOffset(timeWindow: '1h' | '24h' | '7d' | '30d'): number {
    const windowMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    return windowMs[timeWindow];
  }

  private calculateTrends(current: QueryMetrics[], previous: QueryMetrics[], timeWindow: string): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    const currentAvgTime = this.average(current.map(m => m.executionTime));
    const previousAvgTime = this.average(previous.map(m => m.executionTime));

    if (previousAvgTime > 0) {
      const changePercent = ((currentAvgTime - previousAvgTime) / previousAvgTime) * 100;
      trends.push({
        metric: 'executionTime',
        timeWindow: timeWindow as any,
        trend: changePercent > 5 ? 'degrading' : changePercent < -5 ? 'improving' : 'stable',
        changePercent,
        significance: Math.abs(changePercent) > 20 ? 'high' : Math.abs(changePercent) > 10 ? 'medium' : 'low'
      });
    }

    return trends;
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  private percentile(sortedNumbers: number[], p: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil(sortedNumbers.length * p) - 1;
    return sortedNumbers[Math.max(0, index)];
  }
}