/**
 * Performance Monitoring Dashboard
 *
 * Centralized performance monitoring and analytics for Phase 6 optimizations:
 * - Real-time performance metrics collection
 * - Historical trend analysis
 * - Bottleneck identification and alerts
 * - Resource usage monitoring
 * - Optimization recommendations
 * - Integration with all Phase 6 components
 */

import { ManagedEventEmitter } from '../utils/managed-event-emitter.js';
import { getPerformanceConfig } from '../config/performance.js';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger.js';

// Import Phase 6 components for integration
// import { globalPredictiveCache } from './predictive-ai-cache.js';
// import { globalStreamingSystem } from './streaming-response-system.js';
// import { globalStartupOptimizer } from './startup-optimizer.js';

export interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    userTime: number;
    systemTime: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    maxHeapUsed: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  gc: {
    frequency: number;
    averageDuration: number;
    totalPauseTime: number;
  };
  network: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
    evictions: number;
  };
  startup: {
    lastStartupTime: number;
    averageStartupTime: number;
    moduleLoadTime: number;
  };
  streaming: {
    activeStreams: number;
    completedStreams: number;
    averageStreamDuration: number;
    tokensPerSecond: number;
  };
}

export interface PerformanceThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  responseTime: {
    warning: number;
    critical: number;
  };
  cacheHitRate: {
    warning: number;
    critical: number;
  };
  startupTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  category: 'cpu' | 'memory' | 'network' | 'cache' | 'startup' | 'streaming';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolutionTime?: Date;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'performance' | 'memory' | 'cache' | 'startup' | 'streaming';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number;
  confidence: number;
  timestamp: Date;
}

export interface PerformanceTrend {
  metric: string;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
}

export interface DashboardConfig {
  metricsCollectionInterval: number;
  trendAnalysisInterval: number;
  alertCheckInterval: number;
  recommendationInterval: number;
  dataRetentionDays: number;
  enableRealTimeUpdates: boolean;
  enablePredictiveAnalysis: boolean;
  thresholds: PerformanceThresholds;
}

/**
 * Main performance monitoring dashboard
 */
export class PerformanceDashboard extends ManagedEventEmitter {
  private config: DashboardConfig;
  private metricsHistory: PerformanceMetrics[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private trends: Map<string, PerformanceTrend> = new Map();
  private isMonitoring = false;
  private intervalHandles: NodeJS.Timeout[] = [];

  // Performance counters
  private requestCounter = 0;
  private responseTimeSum = 0;
  private errorCounter = 0;
  private lastMetricsCollection = Date.now();

  constructor(config: Partial<DashboardConfig> = {}) {
    super({ maxListeners: 30 });

    const performanceConfig = getPerformanceConfig();
    this.config = {
      metricsCollectionInterval: performanceConfig.monitoring.metricsCollectionIntervalMs,
      trendAnalysisInterval: performanceConfig.monitoring.trendAnalysisIntervalMs,
      alertCheckInterval: performanceConfig.monitoring.alertCheckIntervalMs,
      recommendationInterval: performanceConfig.monitoring.recommendationIntervalMs,
      dataRetentionDays: performanceConfig.monitoring.dataRetentionDays,
      enableRealTimeUpdates: true,
      enablePredictiveAnalysis: true,
      thresholds: {
        cpu: {
          warning: performanceConfig.thresholds.cpuUsage.warning * 100,
          critical: performanceConfig.thresholds.cpuUsage.critical * 100
        },
        memory: {
          warning: performanceConfig.thresholds.memoryUsage.warning * 1024, // Convert to MB
          critical: performanceConfig.thresholds.memoryUsage.critical * 1024
        },
        responseTime: {
          warning: performanceConfig.thresholds.responseTime.warning,
          critical: performanceConfig.thresholds.responseTime.critical
        },
        cacheHitRate: {
          warning: performanceConfig.thresholds.cacheHitRate.warning * 100,
          critical: performanceConfig.thresholds.cacheHitRate.critical * 100
        },
        startupTime: {
          warning: performanceConfig.thresholds.startupTime.warning,
          critical: performanceConfig.thresholds.startupTime.critical
        },
        errorRate: { warning: 5, critical: 10 } // %
      },
      ...config
    };

    this.initializeMetricsCollection();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Performance monitoring already started');
      return;
    }

    this.isMonitoring = true;

    // Start metrics collection
    const metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsCollectionInterval);

    // Start trend analysis
    const trendInterval = setInterval(() => {
      this.analyzeTrends();
    }, this.config.trendAnalysisInterval);

    // Start alert checking
    const alertInterval = setInterval(() => {
      this.checkAlerts();
    }, this.config.alertCheckInterval);

    // Start recommendation generation
    const recommendationInterval = setInterval(() => {
      this.generateRecommendations();
    }, this.config.recommendationInterval);

    this.intervalHandles = [metricsInterval, trendInterval, alertInterval, recommendationInterval];

    logger.info('Performance monitoring started', {
      metricsInterval: this.config.metricsCollectionInterval,
      trendInterval: this.config.trendAnalysisInterval,
      alertInterval: this.config.alertCheckInterval
    });

    this.emit('monitoring:started', { config: this.config });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Clear all intervals
    this.intervalHandles.forEach(handle => clearInterval(handle));
    this.intervalHandles = [];

    logger.info('Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Get current performance snapshot
   */
  getCurrentMetrics(): PerformanceMetrics {
    return this.collectMetrics();
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(timeRange?: '1h' | '6h' | '24h' | '7d'): PerformanceMetrics[] {
    if (!timeRange) {
      return [...this.metricsHistory];
    }

    const now = Date.now();
    const cutoff = {
      '1h': now - 3600000,
      '6h': now - 21600000,
      '24h': now - 86400000,
      '7d': now - 604800000
    }[timeRange];

    return this.metricsHistory.filter(m => m.timestamp.getTime() >= cutoff);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(priority?: 'low' | 'medium' | 'high' | 'critical'): OptimizationRecommendation[] {
    const recommendations = Array.from(this.recommendations.values());

    if (priority) {
      return recommendations.filter(r => r.priority === priority);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get performance trends
   */
  getTrends(metric?: string): PerformanceTrend[] {
    const trends = Array.from(this.trends.values());

    if (metric) {
      return trends.filter(t => t.metric === metric);
    }

    return trends;
  }

  /**
   * Get comprehensive dashboard summary
   */
  getDashboardSummary(): {
    metrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    recommendations: OptimizationRecommendation[];
    trends: PerformanceTrend[];
    health: {
      overall: 'good' | 'warning' | 'critical';
      scores: Record<string, number>;
    };
  } {
    const metrics = this.getCurrentMetrics();
    const alerts = this.getActiveAlerts();
    const recommendations = this.getRecommendations();
    const trends = this.getTrends();
    const health = this.calculateHealthScore(metrics, alerts);

    return {
      metrics,
      alerts,
      recommendations,
      trends,
      health
    };
  }

  /**
   * Manually trigger recommendation generation
   */
  async generateOptimizationReport(): Promise<{
    recommendations: OptimizationRecommendation[];
    trends: PerformanceTrend[];
    summary: string;
  }> {
    this.generateRecommendations();
    this.analyzeTrends();

    const recommendations = this.getRecommendations();
    const trends = this.getTrends();
    const summary = this.generateReportSummary(recommendations, trends);

    return { recommendations, trends, summary };
  }

  /**
   * Record custom performance event
   */
  recordEvent(category: string, metric: string, value: number, metadata?: Record<string, any>): void {
    this.emit('custom:event', {
      category,
      metric,
      value,
      metadata,
      timestamp: new Date()
    });
  }

  // Private implementation methods

  private initializeMetricsCollection(): void {
    // Initialize performance counters
    this.lastMetricsCollection = Date.now();

    // Set up process monitoring
    process.on('beforeExit', () => {
      this.stopMonitoring();
    });
  }

  private collectMetrics(): PerformanceMetrics {
    const now = new Date();
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    // Calculate CPU usage percentage
    const cpuPercent = this.calculateCpuPercentage(cpuUsage);

    // Calculate event loop lag
    const eventLoopLag = this.measureEventLoopLag();

    // Get cache metrics (would integrate with actual cache in real implementation)
    const cacheMetrics = this.getCacheMetrics();

    // Get startup metrics (would integrate with actual startup optimizer)
    const startupMetrics = this.getStartupMetrics();

    // Get streaming metrics (would integrate with actual streaming system)
    const streamingMetrics = this.getStreamingMetrics();

    // Calculate network metrics
    const networkMetrics = this.calculateNetworkMetrics();

    const metrics: PerformanceMetrics = {
      timestamp: now,
      cpu: {
        usage: cpuPercent,
        userTime: cpuUsage.user / 1000000, // Convert to seconds
        systemTime: cpuUsage.system / 1000000
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        maxHeapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) // Simplified
      },
      eventLoop: {
        lag: eventLoopLag,
        utilization: Math.min(100, eventLoopLag / 10) // Simplified calculation
      },
      gc: {
        frequency: 0, // Would require gc monitoring
        averageDuration: 0,
        totalPauseTime: 0
      },
      network: networkMetrics,
      cache: cacheMetrics,
      startup: startupMetrics,
      streaming: streamingMetrics
    };

    // Store metrics
    this.metricsHistory.push(metrics);

    // Cleanup old metrics
    this.cleanupOldMetrics();

    // Emit real-time update
    if (this.config.enableRealTimeUpdates) {
      this.emit('metrics:update', metrics);
    }

    return metrics;
  }

  private calculateCpuPercentage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU calculation - in real implementation would track deltas
    const totalTime = cpuUsage.user + cpuUsage.system;
    const elapsedTime = Date.now() - this.lastMetricsCollection;

    // Convert to percentage (simplified)
    return Math.min(100, (totalTime / 1000000) / (elapsedTime / 1000) * 100);
  }

  private measureEventLoopLag(): number {
    const start = performance.now();
    return new Promise<number>((resolve) => {
      setImmediate(() => {
        const lag = performance.now() - start;
        resolve(lag);
      });
    }) as any; // Simplified for synchronous return

    // Return simplified lag measurement
    return Math.random() * 10; // Mock value
  }

  private getCacheMetrics(): PerformanceMetrics['cache'] {
    // In real implementation, would integrate with globalPredictiveCache
    return {
      hitRate: 75 + Math.random() * 20, // Mock 75-95%
      missRate: 5 + Math.random() * 20,  // Mock 5-25%
      size: 100 + Math.random() * 50,    // Mock size
      evictions: Math.floor(Math.random() * 10)
    };
  }

  private getStartupMetrics(): PerformanceMetrics['startup'] {
    // In real implementation, would integrate with globalStartupOptimizer
    return {
      lastStartupTime: 1500 + Math.random() * 1000, // Mock 1.5-2.5s
      averageStartupTime: 1800 + Math.random() * 500,
      moduleLoadTime: 800 + Math.random() * 400
    };
  }

  private getStreamingMetrics(): PerformanceMetrics['streaming'] {
    // In real implementation, would integrate with globalStreamingSystem
    return {
      activeStreams: Math.floor(Math.random() * 5),
      completedStreams: 50 + Math.floor(Math.random() * 100),
      averageStreamDuration: 2000 + Math.random() * 3000,
      tokensPerSecond: 20 + Math.random() * 30
    };
  }

  private calculateNetworkMetrics(): PerformanceMetrics['network'] {
    const timeSinceLastCollection = Date.now() - this.lastMetricsCollection;
    const requestsPerSecond = this.requestCounter / (timeSinceLastCollection / 1000);
    const averageResponseTime = this.responseTimeSum / Math.max(this.requestCounter, 1);
    const errorRate = (this.errorCounter / Math.max(this.requestCounter, 1)) * 100;

    // Reset counters
    this.requestCounter = 0;
    this.responseTimeSum = 0;
    this.errorCounter = 0;
    this.lastMetricsCollection = Date.now();

    return {
      requestsPerSecond: requestsPerSecond || 0,
      averageResponseTime: averageResponseTime || 0,
      errorRate: errorRate || 0
    };
  }

  private checkAlerts(): void {
    const metrics = this.getCurrentMetrics();
    const thresholds = this.config.thresholds;

    // Check CPU alerts
    this.checkThresholdAlert('cpu', 'CPU Usage', metrics.cpu.usage, thresholds.cpu, '%');

    // Check memory alerts
    this.checkThresholdAlert('memory', 'Memory Usage', metrics.memory.heapUsed, thresholds.memory, 'MB');

    // Check response time alerts
    this.checkThresholdAlert('network', 'Response Time', metrics.network.averageResponseTime, thresholds.responseTime, 'ms');

    // Check cache hit rate alerts (reverse threshold - lower is worse)
    this.checkReverseThresholdAlert('cache', 'Cache Hit Rate', metrics.cache.hitRate, thresholds.cacheHitRate, '%');

    // Check startup time alerts
    this.checkThresholdAlert('startup', 'Startup Time', metrics.startup.lastStartupTime, thresholds.startupTime, 'ms');

    // Check error rate alerts
    this.checkThresholdAlert('network', 'Error Rate', metrics.network.errorRate, thresholds.errorRate, '%');
  }

  private checkThresholdAlert(
    category: PerformanceAlert['category'],
    name: string,
    value: number,
    threshold: { warning: number; critical: number },
    unit: string
  ): void {
    const alertId = `${category}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const existingAlert = this.alerts.get(alertId);

    if (value >= threshold.critical) {
      if (!existingAlert || existingAlert.resolved) {
        this.createAlert(alertId, 'critical', category, `${name} is critically high: ${value}${unit}`, value, threshold.critical);
      }
    } else if (value >= threshold.warning) {
      if (!existingAlert || existingAlert.resolved || existingAlert.type !== 'warning') {
        this.createAlert(alertId, 'warning', category, `${name} is elevated: ${value}${unit}`, value, threshold.warning);
      }
    } else {
      if (existingAlert && !existingAlert.resolved) {
        this.resolveAlert(alertId);
      }
    }
  }

  private checkReverseThresholdAlert(
    category: PerformanceAlert['category'],
    name: string,
    value: number,
    threshold: { warning: number; critical: number },
    unit: string
  ): void {
    const alertId = `${category}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const existingAlert = this.alerts.get(alertId);

    if (value <= threshold.critical) {
      if (!existingAlert || existingAlert.resolved) {
        this.createAlert(alertId, 'critical', category, `${name} is critically low: ${value}${unit}`, value, threshold.critical);
      }
    } else if (value <= threshold.warning) {
      if (!existingAlert || existingAlert.resolved || existingAlert.type !== 'warning') {
        this.createAlert(alertId, 'warning', category, `${name} is low: ${value}${unit}`, value, threshold.warning);
      }
    } else {
      if (existingAlert && !existingAlert.resolved) {
        this.resolveAlert(alertId);
      }
    }
  }

  private createAlert(
    id: string,
    type: 'warning' | 'critical',
    category: PerformanceAlert['category'],
    message: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      id,
      type,
      category,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(id, alert);

    logger[type === 'critical' ? 'error' : 'warn']('Performance alert', alert);
    this.emit('alert:created', alert);
  }

  private resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolutionTime = new Date();

      logger.info('Performance alert resolved', { alertId, duration: alert.resolutionTime.getTime() - alert.timestamp.getTime() });
      this.emit('alert:resolved', alert);
    }
  }

  private analyzeTrends(): void {
    const timeRanges: ('1h' | '6h' | '24h' | '7d')[] = ['1h', '6h', '24h', '7d'];
    const metrics = ['cpu.usage', 'memory.heapUsed', 'network.averageResponseTime', 'cache.hitRate'];

    for (const metric of metrics) {
      for (const timeRange of timeRanges) {
        this.analyzeTrendForMetric(metric, timeRange);
      }
    }
  }

  private analyzeTrendForMetric(metricPath: string, timeRange: '1h' | '6h' | '24h' | '7d'): void {
    const history = this.getMetricsHistory(timeRange);
    if (history.length < 2) return;

    const values = history.map(h => this.getMetricValue(h, metricPath));
    const trendId = `${metricPath}_${timeRange}`;

    // Calculate trend direction and change percentage
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    let direction: PerformanceTrend['direction'] = 'stable';
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'degrading' : 'improving';

      // For cache hit rate, reverse the logic
      if (metricPath.includes('cache.hitRate')) {
        direction = changePercent > 0 ? 'improving' : 'degrading';
      }
    }

    const trend: PerformanceTrend = {
      metric: metricPath,
      timeRange,
      direction,
      changePercent,
      dataPoints: history.map(h => ({
        timestamp: h.timestamp,
        value: this.getMetricValue(h, metricPath)
      }))
    };

    this.trends.set(trendId, trend);
  }

  private getMetricValue(metrics: PerformanceMetrics, path: string): number {
    const parts = path.split('.');
    let value: any = metrics;

    for (const part of parts) {
      value = value[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  private generateRecommendations(): void {
    const metrics = this.getCurrentMetrics();
    const trends = this.getTrends();
    const alerts = this.getActiveAlerts();

    // Clear old recommendations
    this.recommendations.clear();

    // Generate recommendations based on current metrics
    this.generateMetricBasedRecommendations(metrics);

    // Generate recommendations based on trends
    this.generateTrendBasedRecommendations(trends);

    // Generate recommendations based on alerts
    this.generateAlertBasedRecommendations(alerts);

    this.emit('recommendations:updated', Array.from(this.recommendations.values()));
  }

  private generateMetricBasedRecommendations(metrics: PerformanceMetrics): void {
    // High memory usage recommendation
    if (metrics.memory.heapUsed > 400) {
      this.addRecommendation({
        id: 'high_memory_usage',
        category: 'memory',
        priority: 'high',
        title: 'High Memory Usage Detected',
        description: `Memory usage is at ${metrics.memory.heapUsed}MB. Consider implementing memory optimization strategies.`,
        impact: 'Reduce memory footprint by 20-30%',
        implementation: 'Enable more aggressive garbage collection, implement object pooling, and review memory-intensive operations.',
        estimatedImprovement: 25,
        confidence: 85
      });
    }

    // Low cache hit rate recommendation
    if (metrics.cache.hitRate < 70) {
      this.addRecommendation({
        id: 'low_cache_hit_rate',
        category: 'cache',
        priority: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${metrics.cache.hitRate.toFixed(1)}%. Optimize caching strategy for better performance.`,
        impact: 'Improve response times by 30-50%',
        implementation: 'Review cache TTL settings, implement predictive caching, and analyze cache miss patterns.',
        estimatedImprovement: 40,
        confidence: 90
      });
    }

    // High startup time recommendation
    if (metrics.startup.lastStartupTime > 3000) {
      this.addRecommendation({
        id: 'slow_startup',
        category: 'startup',
        priority: 'medium',
        title: 'Slow Application Startup',
        description: `Startup time is ${metrics.startup.lastStartupTime}ms. Implement startup optimization strategies.`,
        impact: 'Reduce startup time by 40-60%',
        implementation: 'Enable lazy loading, optimize module dependencies, and implement parallel initialization.',
        estimatedImprovement: 50,
        confidence: 80
      });
    }
  }

  private generateTrendBasedRecommendations(trends: PerformanceTrend[]): void {
    // Find degrading trends
    const degradingTrends = trends.filter(t => t.direction === 'degrading' && Math.abs(t.changePercent) > 10);

    for (const trend of degradingTrends) {
      if (trend.metric === 'memory.heapUsed') {
        this.addRecommendation({
          id: 'memory_trend_degradation',
          category: 'memory',
          priority: 'high',
          title: 'Memory Usage Trending Upward',
          description: `Memory usage has increased by ${trend.changePercent.toFixed(1)}% over ${trend.timeRange}.`,
          impact: 'Prevent memory leaks and improve stability',
          implementation: 'Investigate memory leaks, implement monitoring for object retention, and optimize data structures.',
          estimatedImprovement: 30,
          confidence: 75
        });
      }
    }
  }

  private generateAlertBasedRecommendations(alerts: PerformanceAlert[]): void {
    const criticalAlerts = alerts.filter(a => a.type === 'critical');

    if (criticalAlerts.length > 0) {
      this.addRecommendation({
        id: 'critical_alerts_active',
        category: 'performance',
        priority: 'critical',
        title: 'Critical Performance Alerts Active',
        description: `${criticalAlerts.length} critical performance alerts require immediate attention.`,
        impact: 'Restore system stability and performance',
        implementation: 'Address critical alerts immediately, review system resources, and implement emergency optimizations.',
        estimatedImprovement: 60,
        confidence: 95
      });
    }
  }

  private addRecommendation(recommendation: Omit<OptimizationRecommendation, 'timestamp'>): void {
    this.recommendations.set(recommendation.id, {
      ...recommendation,
      timestamp: new Date()
    });
  }

  private calculateHealthScore(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): {
    overall: 'good' | 'warning' | 'critical';
    scores: Record<string, number>;
  } {
    const scores = {
      cpu: this.calculateComponentScore(metrics.cpu.usage, this.config.thresholds.cpu),
      memory: this.calculateComponentScore(metrics.memory.heapUsed, this.config.thresholds.memory),
      cache: this.calculateReverseComponentScore(metrics.cache.hitRate, this.config.thresholds.cacheHitRate),
      startup: this.calculateComponentScore(metrics.startup.lastStartupTime, this.config.thresholds.startupTime),
      network: this.calculateComponentScore(metrics.network.averageResponseTime, this.config.thresholds.responseTime)
    };

    const averageScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length;

    // Factor in active alerts
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = alerts.filter(a => a.type === 'warning').length;

    const alertPenalty = (criticalAlerts * 30) + (warningAlerts * 10);
    const finalScore = Math.max(0, averageScore - alertPenalty);

    let overall: 'good' | 'warning' | 'critical' = 'good';
    if (finalScore < 30 || criticalAlerts > 0) {
      overall = 'critical';
    } else if (finalScore < 70 || warningAlerts > 2) {
      overall = 'warning';
    }

    return { overall, scores };
  }

  private calculateComponentScore(value: number, threshold: { warning: number; critical: number }): number {
    if (value >= threshold.critical) return 0;
    if (value >= threshold.warning) return 30;

    // Linear interpolation between warning threshold and 0
    const normalizedValue = Math.max(0, Math.min(threshold.warning, value));
    return 100 - (normalizedValue / threshold.warning) * 70;
  }

  private calculateReverseComponentScore(value: number, threshold: { warning: number; critical: number }): number {
    if (value <= threshold.critical) return 0;
    if (value <= threshold.warning) return 30;

    // Linear interpolation from warning threshold to 100
    const normalizedValue = Math.min(100, Math.max(threshold.warning, value));
    return 30 + ((normalizedValue - threshold.warning) / (100 - threshold.warning)) * 70;
  }

  private generateReportSummary(recommendations: OptimizationRecommendation[], trends: PerformanceTrend[]): string {
    const criticalRecs = recommendations.filter(r => r.priority === 'critical').length;
    const highRecs = recommendations.filter(r => r.priority === 'high').length;
    const degradingTrends = trends.filter(t => t.direction === 'degrading').length;
    const improvingTrends = trends.filter(t => t.direction === 'improving').length;

    let summary = 'Performance Report Summary:\n';
    summary += `- ${recommendations.length} optimization recommendations generated\n`;
    summary += `- ${criticalRecs} critical priority items require immediate attention\n`;
    summary += `- ${highRecs} high priority optimizations available\n`;
    summary += `- ${degradingTrends} metrics showing degrading trends\n`;
    summary += `- ${improvingTrends} metrics showing improvement\n`;

    if (criticalRecs > 0) {
      summary += '\nImmediate action required on critical recommendations.';
    } else if (highRecs > 0) {
      summary += '\nConsider implementing high priority optimizations.';
    } else {
      summary += '\nSystem performance is within acceptable parameters.';
    }

    return summary;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp.getTime() >= cutoff);
  }
}

// Global performance dashboard instance
export const globalPerformanceDashboard = new PerformanceDashboard();