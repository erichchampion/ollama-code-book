/**
 * Performance Rollback System
 *
 * Monitors performance metrics and automatically rolls back optimizations
 * if performance regressions are detected.
 */

import { EventEmitter } from 'events';
import { featureFlags } from '../config/feature-flags.js';
import { getPerformanceConfig } from '../config/performance.js';

export interface PerformanceBaseline {
  timestamp: number;
  metrics: {
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    cacheHitRate: number;
    errorRate: number;
    throughput: number;
  };
  featureFlags: string[];
}

export interface PerformanceRegression {
  metric: string;
  baseline: number;
  current: number;
  degradation: number; // Percentage
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RollbackConfig {
  enabled: boolean;
  autoRollback: boolean;
  regressionThresholds: {
    responseTime: number; // % increase threshold
    memoryUsage: number; // % increase threshold
    errorRate: number; // % increase threshold
    throughput: number; // % decrease threshold
  };
  monitoringInterval: number; // ms
  baselineWindow: number; // ms (how long to collect baseline)
  cooldownPeriod: number; // ms (wait before re-enabling)
}

/**
 * Performance Rollback Manager
 */
export class PerformanceRollbackManager extends EventEmitter {
  private static instance: PerformanceRollbackManager;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private currentMetrics: PerformanceBaseline['metrics'];
  private config: RollbackConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private rollbackHistory: Array<{
    timestamp: number;
    regressions: PerformanceRegression[];
    rolledBackFlags: string[];
  }> = [];
  private cooldownFlags: Map<string, number> = new Map(); // flag -> cooldown end timestamp

  private constructor() {
    super();
    const perfConfig = getPerformanceConfig();

    this.config = {
      enabled: true,
      autoRollback: false, // Manual by default for safety
      regressionThresholds: {
        responseTime: 50, // 50% increase
        memoryUsage: 30, // 30% increase
        errorRate: 100, // 100% increase (double)
        throughput: 30 // 30% decrease
      },
      monitoringInterval: perfConfig.monitoring.metricsCollectionIntervalMs,
      baselineWindow: 60000, // 1 minute
      cooldownPeriod: 300000 // 5 minutes
    };

    this.currentMetrics = this.createEmptyMetrics();
  }

  static getInstance(): PerformanceRollbackManager {
    if (!PerformanceRollbackManager.instance) {
      PerformanceRollbackManager.instance = new PerformanceRollbackManager();
    }
    return PerformanceRollbackManager.instance;
  }

  private createEmptyMetrics(): PerformanceBaseline['metrics'] {
    return {
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughput: 0
    };
  }

  /**
   * Start monitoring for performance regressions
   */
  startMonitoring(): void {
    if (!this.config.enabled || this.monitoringInterval) {
      return;
    }

    // Capture initial baseline
    this.captureBaseline('initial');

    this.monitoringInterval = setInterval(() => {
      this.checkForRegressions();
    }, this.config.monitoringInterval);

    this.emit('monitoring:started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.emit('monitoring:stopped');
    }
  }

  /**
   * Capture a performance baseline
   */
  captureBaseline(name: string): void {
    const baseline: PerformanceBaseline = {
      timestamp: Date.now(),
      metrics: { ...this.currentMetrics },
      featureFlags: featureFlags.getEnabledFlags()
    };

    this.baselines.set(name, baseline);
    this.emit('baseline:captured', { name, baseline });
  }

  /**
   * Update current metrics
   */
  updateMetrics(metrics: Partial<PerformanceBaseline['metrics']>): void {
    this.currentMetrics = {
      ...this.currentMetrics,
      ...metrics
    };
  }

  /**
   * Check for performance regressions
   */
  private checkForRegressions(): void {
    const baseline = this.baselines.get('initial') || this.baselines.get('last-stable');
    if (!baseline) {
      return;
    }

    const regressions = this.detectRegressions(baseline.metrics, this.currentMetrics);

    if (regressions.length > 0) {
      this.emit('regression:detected', regressions);

      // Check severity
      const criticalRegressions = regressions.filter(r => r.severity === 'critical');
      const highRegressions = regressions.filter(r => r.severity === 'high');

      if (criticalRegressions.length > 0 || highRegressions.length >= 2) {
        this.handleRegressions(regressions);
      }
    } else {
      // Update stable baseline if performance is good
      const timeSinceLastBaseline = Date.now() - (baseline.timestamp || 0);
      if (timeSinceLastBaseline > this.config.baselineWindow) {
        this.captureBaseline('last-stable');
      }
    }

    // Check for flags ready to re-enable after cooldown
    this.checkCooldowns();
  }

  /**
   * Detect regressions between baseline and current metrics
   */
  private detectRegressions(
    baseline: PerformanceBaseline['metrics'],
    current: PerformanceBaseline['metrics']
  ): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];

    // Response time regression
    if (baseline.averageResponseTime > 0) {
      const increase = ((current.averageResponseTime - baseline.averageResponseTime) / baseline.averageResponseTime) * 100;
      if (increase > this.config.regressionThresholds.responseTime) {
        regressions.push({
          metric: 'averageResponseTime',
          baseline: baseline.averageResponseTime,
          current: current.averageResponseTime,
          degradation: increase,
          severity: this.calculateSeverity(increase, this.config.regressionThresholds.responseTime)
        });
      }
    }

    // Memory usage regression
    if (baseline.memoryUsage > 0) {
      const increase = ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100;
      if (increase > this.config.regressionThresholds.memoryUsage) {
        regressions.push({
          metric: 'memoryUsage',
          baseline: baseline.memoryUsage,
          current: current.memoryUsage,
          degradation: increase,
          severity: this.calculateSeverity(increase, this.config.regressionThresholds.memoryUsage)
        });
      }
    }

    // Error rate regression
    if (current.errorRate > baseline.errorRate) {
      const increase = baseline.errorRate > 0
        ? ((current.errorRate - baseline.errorRate) / baseline.errorRate) * 100
        : 100;
      if (increase > this.config.regressionThresholds.errorRate) {
        regressions.push({
          metric: 'errorRate',
          baseline: baseline.errorRate,
          current: current.errorRate,
          degradation: increase,
          severity: current.errorRate > 0.1 ? 'critical' : 'high'
        });
      }
    }

    // Throughput regression (decrease is bad)
    if (baseline.throughput > 0) {
      const decrease = ((baseline.throughput - current.throughput) / baseline.throughput) * 100;
      if (decrease > this.config.regressionThresholds.throughput) {
        regressions.push({
          metric: 'throughput',
          baseline: baseline.throughput,
          current: current.throughput,
          degradation: decrease,
          severity: this.calculateSeverity(decrease, this.config.regressionThresholds.throughput)
        });
      }
    }

    return regressions;
  }

  /**
   * Calculate regression severity
   */
  private calculateSeverity(degradation: number, threshold: number): PerformanceRegression['severity'] {
    const ratio = degradation / threshold;
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Handle detected regressions
   */
  private handleRegressions(regressions: PerformanceRegression[]): void {
    if (this.config.autoRollback) {
      this.performRollback(regressions);
    } else {
      this.emit('rollback:suggested', {
        regressions,
        suggestedFlags: this.identifyProblematicFlags(regressions)
      });
    }
  }

  /**
   * Perform automatic rollback
   */
  private performRollback(regressions: PerformanceRegression[]): void {
    const flagsToRollback = this.identifyProblematicFlags(regressions);

    if (flagsToRollback.length === 0) {
      return;
    }

    // Disable problematic flags
    const rolledBack: string[] = [];
    for (const flag of flagsToRollback) {
      if (featureFlags.isEnabled(flag)) {
        featureFlags.disableFlag(flag);
        rolledBack.push(flag);
        // Set cooldown
        this.cooldownFlags.set(flag, Date.now() + this.config.cooldownPeriod);
      }
    }

    if (rolledBack.length > 0) {
      // Record rollback
      this.rollbackHistory.push({
        timestamp: Date.now(),
        regressions,
        rolledBackFlags: rolledBack
      });

      // Capture new baseline after rollback
      setTimeout(() => {
        this.captureBaseline('post-rollback');
      }, 5000);

      this.emit('rollback:performed', {
        regressions,
        rolledBackFlags: rolledBack
      });
    }
  }

  /**
   * Identify which feature flags are likely causing regressions
   */
  private identifyProblematicFlags(regressions: PerformanceRegression[]): string[] {
    const problematicFlags: string[] = [];

    // Map regression types to likely feature flags
    const regressionToFlags: Record<string, string[]> = {
      averageResponseTime: ['streaming-responses', 'predictive-caching', 'distributed-processing'],
      memoryUsage: ['memory-optimization', 'graph-partitioning', 'incremental-indexing'],
      errorRate: ['background-service', 'real-time-collaboration'],
      throughput: ['distributed-processing', 'lazy-module-loading']
    };

    // Recently enabled flags are more likely to be problematic
    const recentlyEnabled = this.getRecentlyEnabledFlags();

    for (const regression of regressions) {
      const suspectFlags = regressionToFlags[regression.metric] || [];
      for (const flag of suspectFlags) {
        if (featureFlags.isEnabled(flag) && !problematicFlags.includes(flag)) {
          // Prioritize recently enabled flags
          if (recentlyEnabled.includes(flag)) {
            problematicFlags.unshift(flag);
          } else {
            problematicFlags.push(flag);
          }
        }
      }
    }

    return problematicFlags;
  }

  /**
   * Get recently enabled feature flags
   */
  private getRecentlyEnabledFlags(): string[] {
    // Compare with last stable baseline
    const lastStable = this.baselines.get('last-stable');
    if (!lastStable) {
      return [];
    }

    const currentFlags = featureFlags.getEnabledFlags();
    const baselineFlags = lastStable.featureFlags;

    return currentFlags.filter(flag => !baselineFlags.includes(flag));
  }

  /**
   * Check and re-enable flags after cooldown
   */
  private checkCooldowns(): void {
    const now = Date.now();
    const toReEnable: string[] = [];

    for (const [flag, cooldownEnd] of this.cooldownFlags.entries()) {
      if (now >= cooldownEnd) {
        toReEnable.push(flag as string);
      }
    }

    for (const flag of toReEnable) {
      this.cooldownFlags.delete(flag);
      // Gradually re-enable with lower rollout percentage
      featureFlags.setRolloutPercentage(flag, 10);
      this.emit('flag:re-enabled', { flag, rolloutPercentage: 10 });
    }
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(): typeof this.rollbackHistory {
    return [...this.rollbackHistory];
  }

  /**
   * Clear rollback history
   */
  clearHistory(): void {
    this.rollbackHistory = [];
  }

  /**
   * Manual rollback of specific flags
   */
  manualRollback(flags: string[]): void {
    const rolledBack: string[] = [];

    for (const flag of flags) {
      if (featureFlags.isEnabled(flag)) {
        featureFlags.disableFlag(flag);
        rolledBack.push(flag);
        this.cooldownFlags.set(flag, Date.now() + this.config.cooldownPeriod);
      }
    }

    if (rolledBack.length > 0) {
      this.emit('rollback:manual', { rolledBackFlags: rolledBack });
    }
  }

  /**
   * Configure rollback settings
   */
  configure(config: Partial<RollbackConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart monitoring if interval changed
    if (config.monitoringInterval && this.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RollbackConfig {
    return { ...this.config };
  }

  /**
   * Get status report
   */
  getStatusReport(): string {
    const lines: string[] = ['Performance Rollback Status', '=' .repeat(50)];

    lines.push('', 'Configuration:');
    lines.push(`  Monitoring: ${this.config.enabled ? 'Enabled' : 'Disabled'}`);
    lines.push(`  Auto-rollback: ${this.config.autoRollback ? 'Enabled' : 'Disabled'}`);
    lines.push(`  Monitoring interval: ${this.config.monitoringInterval}ms`);

    lines.push('', 'Thresholds:');
    lines.push(`  Response time: +${this.config.regressionThresholds.responseTime}%`);
    lines.push(`  Memory usage: +${this.config.regressionThresholds.memoryUsage}%`);
    lines.push(`  Error rate: +${this.config.regressionThresholds.errorRate}%`);
    lines.push(`  Throughput: -${this.config.regressionThresholds.throughput}%`);

    lines.push('', 'Current Metrics:');
    lines.push(`  Avg response time: ${this.currentMetrics.averageResponseTime.toFixed(2)}ms`);
    lines.push(`  Memory usage: ${(this.currentMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    lines.push(`  CPU usage: ${this.currentMetrics.cpuUsage.toFixed(2)}%`);
    lines.push(`  Cache hit rate: ${(this.currentMetrics.cacheHitRate * 100).toFixed(2)}%`);
    lines.push(`  Error rate: ${(this.currentMetrics.errorRate * 100).toFixed(2)}%`);
    lines.push(`  Throughput: ${this.currentMetrics.throughput.toFixed(2)} ops/sec`);

    if (this.rollbackHistory.length > 0) {
      lines.push('', 'Recent Rollbacks:');
      for (const rollback of this.rollbackHistory.slice(-5)) {
        const time = new Date(rollback.timestamp).toLocaleString();
        lines.push(`  ${time}: Rolled back ${rollback.rolledBackFlags.join(', ')}`);
      }
    }

    if (this.cooldownFlags.size > 0) {
      lines.push('', 'Flags in Cooldown:');
      const now = Date.now();
      for (const [flag, cooldownEnd] of this.cooldownFlags.entries()) {
        const remaining = Math.max(0, cooldownEnd - now);
        const minutes = Math.floor(remaining / 60000);
        lines.push(`  ${flag}: ${minutes} minutes remaining`);
      }
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const rollbackManager = PerformanceRollbackManager.getInstance();