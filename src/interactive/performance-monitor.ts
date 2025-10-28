/**
 * Performance Monitoring System
 *
 * Tracks initialization timing, memory usage, component load times,
 * and overall system performance for interactive mode optimization.
 */

import { logger } from '../utils/logger.js';
import { ComponentType } from './component-factory.js';

export interface PerformanceMetrics {
  initializationTime: number;
  memoryUsage: MemoryUsage;
  componentTimes: Map<ComponentType, ComponentTiming>;
  systemMetrics: SystemMetrics;
  benchmarks: BenchmarkResults;
}

export interface MemoryUsage {
  totalHeapUsed: number;
  totalHeapSize: number;
  externalMemory: number;
  rss: number; // Resident Set Size
  timestamp: Date;
}

export interface ComponentTiming {
  component: ComponentType;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'loading' | 'completed' | 'failed';
  memoryBefore: number;
  memoryAfter?: number;
  memoryDelta?: number;
}

export interface SystemMetrics {
  startupTime: number;
  readyTime: number;
  backgroundLoadTime: number;
  totalComponents: number;
  successfulComponents: number;
  failedComponents: number;
  averageComponentTime: number;
  peakMemoryUsage: number;
  cpuUsagePercent: number;
}

export interface BenchmarkResults {
  targets: PerformanceTargets;
  actual: ActualPerformance;
  scores: PerformanceScores;
  recommendations: string[];
}

export interface PerformanceTargets {
  maxStartupTime: number;      // 3 seconds
  maxMemoryUsage: number;      // 100 MB
  maxComponentTime: number;    // 10 seconds
  minSuccessRate: number;      // 95%
}

export interface ActualPerformance {
  startupTime: number;
  memoryUsage: number;
  maxComponentTime: number;
  successRate: number;
}

export interface PerformanceScores {
  startup: number;    // 0-100
  memory: number;     // 0-100
  reliability: number; // 0-100
  overall: number;    // 0-100
}

/**
 * Comprehensive performance monitoring for interactive mode
 */
export class PerformanceMonitor {
  private startTime = Date.now();
  private componentTimings = new Map<ComponentType, ComponentTiming>();
  private memorySnapshots: MemoryUsage[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private peakMemory = 0;

  private readonly targets: PerformanceTargets = {
    maxStartupTime: 3000,     // 3 seconds
    maxMemoryUsage: 100,      // 100 MB
    maxComponentTime: 10000,  // 10 seconds
    minSuccessRate: 0.95      // 95%
  };

  constructor() {
    this.takeMemorySnapshot();
  }

  /**
   * Start monitoring a component load
   */
  startComponentTiming(component: ComponentType): void {
    const timing: ComponentTiming = {
      component,
      startTime: Date.now(),
      status: 'loading',
      memoryBefore: this.getCurrentMemoryUsage().totalHeapUsed
    };

    this.componentTimings.set(component, timing);
    logger.debug(`Started timing component: ${component}`);
  }

  /**
   * End monitoring a component load
   */
  endComponentTiming(component: ComponentType, success: boolean): void {
    const timing = this.componentTimings.get(component);
    if (!timing) {
      logger.warn(`No timing found for component: ${component}`);
      return;
    }

    const endTime = Date.now();
    const memoryAfter = this.getCurrentMemoryUsage().totalHeapUsed;

    timing.endTime = endTime;
    timing.duration = endTime - timing.startTime;
    timing.status = success ? 'completed' : 'failed';
    timing.memoryAfter = memoryAfter;
    timing.memoryDelta = memoryAfter - timing.memoryBefore;

    this.componentTimings.set(component, timing);

    logger.debug(`Component ${component} timing completed: ${timing.duration}ms, memory delta: ${timing.memoryDelta}MB`);
  }

  /**
   * Start continuous performance monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.takeMemorySnapshot();
      this.updatePeakMemory();
    }, intervalMs);

    logger.debug('Performance monitoring started');
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;

    logger.debug('Performance monitoring stopped');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const currentTime = Date.now();
    const systemMetrics = this.calculateSystemMetrics(currentTime);
    const benchmarks = this.calculateBenchmarks(systemMetrics);

    return {
      initializationTime: currentTime - this.startTime,
      memoryUsage: this.getCurrentMemoryUsage(),
      componentTimes: new Map(this.componentTimings),
      systemMetrics,
      benchmarks
    };
  }

  /**
   * Get formatted performance report
   */
  getPerformanceReport(format: 'summary' | 'detailed' | 'json' = 'summary'): string {
    const metrics = this.getMetrics();

    switch (format) {
      case 'json':
        return JSON.stringify(metrics, this.mapReplacer, 2);

      case 'detailed':
        return this.formatDetailedReport(metrics);

      case 'summary':
      default:
        return this.formatSummaryReport(metrics);
    }
  }

  /**
   * Check if performance targets are met
   */
  checkPerformanceTargets(): {
    allTargetsMet: boolean;
    results: Array<{ target: string; met: boolean; actual: number; expected: number }>;
  } {
    const metrics = this.getMetrics();
    const results = [
      {
        target: 'Startup Time',
        met: metrics.systemMetrics.startupTime <= this.targets.maxStartupTime,
        actual: metrics.systemMetrics.startupTime,
        expected: this.targets.maxStartupTime
      },
      {
        target: 'Memory Usage',
        met: metrics.memoryUsage.totalHeapUsed <= this.targets.maxMemoryUsage,
        actual: metrics.memoryUsage.totalHeapUsed,
        expected: this.targets.maxMemoryUsage
      },
      {
        target: 'Max Component Time',
        met: metrics.systemMetrics.averageComponentTime <= this.targets.maxComponentTime,
        actual: metrics.systemMetrics.averageComponentTime,
        expected: this.targets.maxComponentTime
      },
      {
        target: 'Success Rate',
        met: (metrics.systemMetrics.successfulComponents / metrics.systemMetrics.totalComponents) >= this.targets.minSuccessRate,
        actual: metrics.systemMetrics.successfulComponents / metrics.systemMetrics.totalComponents,
        expected: this.targets.minSuccessRate
      }
    ];

    return {
      allTargetsMet: results.every(r => r.met),
      results
    };
  }

  /**
   * Get performance optimization recommendations
   */
  getRecommendations(metrics?: PerformanceMetrics): string[] {
    if (!metrics) {
      // Return default recommendations without calling any other methods to avoid recursion
      return ['No metrics available for recommendations'];
    }
    const currentMetrics = metrics;
    const recommendations: string[] = [];

    // Startup time recommendations
    if (currentMetrics.systemMetrics.startupTime > this.targets.maxStartupTime) {
      recommendations.push(`Startup time (${currentMetrics.systemMetrics.startupTime}ms) exceeds target (${this.targets.maxStartupTime}ms). Consider lazy loading more components.`);
    }

    // Memory usage recommendations
    if (currentMetrics.memoryUsage.totalHeapUsed > this.targets.maxMemoryUsage) {
      recommendations.push(`Memory usage (${currentMetrics.memoryUsage.totalHeapUsed.toFixed(1)}MB) exceeds target (${this.targets.maxMemoryUsage}MB). Review component memory consumption.`);
    }

    // Component-specific recommendations
    const slowComponents = Array.from(currentMetrics.componentTimes.values())
      .filter(timing => timing.duration && timing.duration > 5000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    if (slowComponents.length > 0) {
      recommendations.push(`Slow components detected: ${slowComponents.map(c => `${c.component} (${c.duration}ms)`).join(', ')}`);
    }

    // Memory leak detection
    if (this.memorySnapshots.length > 10) {
      const recent = this.memorySnapshots.slice(-5);
      const older = this.memorySnapshots.slice(-10, -5);
      const recentAvg = recent.reduce((sum, s) => sum + s.totalHeapUsed, 0) / recent.length;
      const olderAvg = older.reduce((sum, s) => sum + s.totalHeapUsed, 0) / older.length;

      if (recentAvg > olderAvg * 1.5) {
        recommendations.push('Potential memory leak detected - memory usage has increased significantly over time.');
      }
    }

    // Success rate recommendations
    const successRate = currentMetrics.systemMetrics.successfulComponents / currentMetrics.systemMetrics.totalComponents;
    if (successRate < this.targets.minSuccessRate) {
      recommendations.push(`Component success rate (${(successRate * 100).toFixed(1)}%) is below target (${this.targets.minSuccessRate * 100}%). Review component reliability.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All performance targets are being met. System is performing optimally.');
    }

    return recommendations;
  }

  /**
   * Generate recommendations from raw data without circular dependency
   */
  private generateRecommendationsFromData(systemMetrics: SystemMetrics, memoryUsage: MemoryUsage): string[] {
    const recommendations: string[] = [];

    // Startup time recommendations
    if (systemMetrics.startupTime > this.targets.maxStartupTime) {
      recommendations.push(`Startup time (${systemMetrics.startupTime}ms) exceeds target (${this.targets.maxStartupTime}ms). Consider lazy loading more components.`);
    }

    // Memory usage recommendations
    if (memoryUsage.totalHeapUsed > this.targets.maxMemoryUsage) {
      recommendations.push(`Memory usage (${memoryUsage.totalHeapUsed.toFixed(1)}MB) exceeds target (${this.targets.maxMemoryUsage}MB). Review component memory consumption.`);
    }

    // Success rate recommendations
    const successRate = systemMetrics.successfulComponents / systemMetrics.totalComponents;
    if (successRate < this.targets.minSuccessRate) {
      recommendations.push(`Component success rate (${(successRate * 100).toFixed(1)}%) is below target (${this.targets.minSuccessRate * 100}%). Review component reliability.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All performance targets are being met. System is performing optimally.');
    }

    return recommendations;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): string {
    const metrics = this.getMetrics();
    const exportData = {
      timestamp: new Date().toISOString(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      metrics,
      targets: this.targets,
      memoryHistory: this.memorySnapshots
    };

    return JSON.stringify(exportData, this.mapReplacer, 2);
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    this.startTime = Date.now();
    this.componentTimings.clear();
    this.memorySnapshots = [];
    this.peakMemory = 0;
    this.takeMemorySnapshot();

    logger.debug('Performance monitor reset');
  }

  /**
   * Dispose of the performance monitor
   */
  dispose(): void {
    this.stopMonitoring();
    this.componentTimings.clear();
    this.memorySnapshots = [];
  }

  // Private methods

  private getCurrentMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      totalHeapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      totalHeapSize: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      externalMemory: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      timestamp: new Date()
    };
  }

  private takeMemorySnapshot(): void {
    const snapshot = this.getCurrentMemoryUsage();
    this.memorySnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }
  }

  private updatePeakMemory(): void {
    const current = this.getCurrentMemoryUsage();
    if (current.totalHeapUsed > this.peakMemory) {
      this.peakMemory = current.totalHeapUsed;
    }
  }

  private calculateSystemMetrics(currentTime: number): SystemMetrics {
    const completedComponents = Array.from(this.componentTimings.values())
      .filter(t => t.status === 'completed' || t.status === 'failed');

    const successfulComponents = completedComponents.filter(t => t.status === 'completed').length;
    const failedComponents = completedComponents.filter(t => t.status === 'failed').length;

    const componentDurations = completedComponents
      .map(t => t.duration || 0)
      .filter(d => d > 0);

    const averageComponentTime = componentDurations.length > 0
      ? componentDurations.reduce((sum, d) => sum + d, 0) / componentDurations.length
      : 0;

    // Estimate ready time (when essential components are loaded)
    const essentialComponents = ['aiClient', 'intentAnalyzer', 'conversationManager'];
    const essentialTimes = essentialComponents
      .map(comp => this.componentTimings.get(comp as ComponentType))
      .filter(t => t && t.duration)
      .map(t => t!.duration!);

    const readyTime = essentialTimes.length > 0 ? Math.max(...essentialTimes) : 0;

    return {
      startupTime: currentTime - this.startTime,
      readyTime,
      backgroundLoadTime: currentTime - this.startTime - readyTime,
      totalComponents: this.componentTimings.size,
      successfulComponents,
      failedComponents,
      averageComponentTime,
      peakMemoryUsage: this.peakMemory,
      cpuUsagePercent: 0 // Simplified - would need additional monitoring
    };
  }

  private calculateBenchmarks(systemMetrics: SystemMetrics): BenchmarkResults {
    const actual: ActualPerformance = {
      startupTime: systemMetrics.startupTime,
      memoryUsage: this.getCurrentMemoryUsage().totalHeapUsed,
      maxComponentTime: systemMetrics.averageComponentTime,
      successRate: systemMetrics.totalComponents > 0
        ? systemMetrics.successfulComponents / systemMetrics.totalComponents
        : 1
    };

    // Calculate scores (0-100)
    const scores: PerformanceScores = {
      startup: Math.max(0, 100 - (actual.startupTime / this.targets.maxStartupTime) * 100),
      memory: Math.max(0, 100 - (actual.memoryUsage / this.targets.maxMemoryUsage) * 100),
      reliability: actual.successRate * 100,
      overall: 0
    };

    scores.overall = (scores.startup + scores.memory + scores.reliability) / 3;

    return {
      targets: this.targets,
      actual,
      scores,
      recommendations: [] // Recommendations will be generated separately when needed
    };
  }

  private formatSummaryReport(metrics: PerformanceMetrics): string {
    const scores = metrics.benchmarks.scores;
    return [
      `🚀 Performance Summary`,
      `Overall Score: ${scores.overall.toFixed(1)}/100`,
      `Startup: ${scores.startup.toFixed(1)}/100 (${metrics.systemMetrics.startupTime}ms)`,
      `Memory: ${scores.memory.toFixed(1)}/100 (${metrics.memoryUsage.totalHeapUsed.toFixed(1)}MB)`,
      `Reliability: ${scores.reliability.toFixed(1)}/100 (${metrics.systemMetrics.successfulComponents}/${metrics.systemMetrics.totalComponents})`,
      `Peak Memory: ${metrics.systemMetrics.peakMemoryUsage.toFixed(1)}MB`,
      '',
      '📊 Component Loading:',
      `Ready Time: ${metrics.systemMetrics.readyTime}ms`,
      `Background Time: ${metrics.systemMetrics.backgroundLoadTime}ms`,
      `Average Component: ${metrics.systemMetrics.averageComponentTime.toFixed(0)}ms`
    ].join('\\n');
  }

  private formatDetailedReport(metrics: PerformanceMetrics): string {
    const summary = this.formatSummaryReport(metrics);
    const componentDetails = Array.from(metrics.componentTimes.values())
      .map(timing => {
        const status = timing.status === 'completed' ? '✅' :
                      timing.status === 'failed' ? '❌' : '🔄';
        const duration = timing.duration ? `${timing.duration}ms` : 'pending';
        const memory = timing.memoryDelta ? `${timing.memoryDelta > 0 ? '+' : ''}${timing.memoryDelta.toFixed(1)}MB` : '';
        return `${status} ${timing.component}: ${duration} ${memory}`;
      })
      .join('\\n');

    const recommendations = metrics.benchmarks.recommendations
      .map(rec => `• ${rec}`)
      .join('\\n');

    return [
      summary,
      '',
      '🔧 Component Details:',
      componentDetails,
      '',
      '💡 Recommendations:',
      recommendations
    ].join('\\n');
  }

  private mapReplacer(key: string, value: any): any {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor();
  }
  return globalPerformanceMonitor;
}

export function resetPerformanceMonitor(): void {
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.dispose();
  }
  globalPerformanceMonitor = null;
}