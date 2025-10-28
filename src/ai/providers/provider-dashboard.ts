/**
 * Provider Performance Dashboard
 *
 * Provides comprehensive performance monitoring, analytics, and reporting
 * for AI provider usage, costs, and performance metrics.
 */

import { EventEmitter } from 'events';
import { ProviderManager, ProviderUsageStats, ProviderPerformanceMetrics, ProviderBudget } from './provider-manager.js';
import { logger } from '../../utils/logger.js';

export interface DashboardConfig {
  refreshInterval?: number;
  retentionDays?: number;
  alertThresholds?: {
    errorRate: number;
    responseTime: number;
    costPercentage: number;
  };
}

export interface DashboardSnapshot {
  timestamp: Date;
  providers: {
    [providerId: string]: {
      usage: ProviderUsageStats;
      performance: ProviderPerformanceMetrics;
      budget?: ProviderBudget;
      healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
      alerts: DashboardAlert[];
    };
  };
  summary: {
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
    overallSuccessRate: number;
    activeProviders: number;
    healthyProviders: number;
  };
}

export interface DashboardAlert {
  id: string;
  providerId: string;
  type: 'error_rate' | 'response_time' | 'budget_exceeded' | 'provider_down' | 'quota_exceeded';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ProviderComparison {
  providerId: string;
  successRate: number;
  avgResponseTime: number;
  costPerRequest: number;
  reliability: number;
  score: number; // Composite score for ranking
}

export interface CostAnalysis {
  providerId: string;
  dailyCost: number;
  monthlyCost: number;
  projectedMonthlyCost: number;
  costPerRequest: number;
  costPerToken: number;
  budgetUtilization: number; // Percentage of budget used
  costTrend: 'increasing' | 'decreasing' | 'stable';
}

export class ProviderDashboard extends EventEmitter {
  private providerManager: ProviderManager;
  private config: DashboardConfig;
  private alerts = new Map<string, DashboardAlert>();
  private snapshots: DashboardSnapshot[] = [];
  private refreshTimer?: ReturnType<typeof setInterval>;

  // Store event handlers for proper cleanup
  private eventHandlers: {
    usageTracked?: (data: any) => void;
    budgetLimitReached?: (data: any) => void;
    budgetThresholdReached?: (data: any) => void;
    healthCheckFailed?: (data: any) => void;
    healthCheckCompleted?: (data: any) => void;
  } = {};

  constructor(providerManager: ProviderManager, config: DashboardConfig = {}) {
    super();
    this.providerManager = providerManager;
    this.config = {
      refreshInterval: 30000, // 30 seconds
      retentionDays: 30,
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 10000, // 10 seconds
        costPercentage: 80 // 80% of budget
      },
      ...config
    };

    // Set up event listeners
    this.setupEventListeners();

    // Start periodic refresh
    this.startPeriodicRefresh();
  }

  /**
   * Set up event listeners from provider manager
   */
  private setupEventListeners(): void {
    // Store handler references for proper cleanup
    this.eventHandlers.usageTracked = (data) => {
      this.checkAlerts(data.id);
    };

    this.eventHandlers.budgetLimitReached = (data) => {
      this.createAlert(data.id, 'budget_exceeded', 'error',
        `Budget limit reached: ${data.type} (${data.usage}/${data.limit})`);
    };

    this.eventHandlers.budgetThresholdReached = (data) => {
      this.createAlert(data.id, 'budget_exceeded', 'warning',
        `Budget threshold reached: ${data.percentage.toFixed(1)}% of ${data.type}`);
    };

    this.eventHandlers.healthCheckFailed = (data) => {
      this.createAlert(data.id, 'provider_down', 'critical',
        `Provider health check failed: ${data.error}`);
    };

    this.eventHandlers.healthCheckCompleted = (data) => {
      if (data.status === 'healthy') {
        this.resolveAlerts(data.id, 'provider_down');
      }
    };

    // Register event listeners
    this.providerManager.on('usage_tracked', this.eventHandlers.usageTracked);
    this.providerManager.on('budget_limit_reached', this.eventHandlers.budgetLimitReached);
    this.providerManager.on('budget_threshold_reached', this.eventHandlers.budgetThresholdReached);
    this.providerManager.on('health_check_failed', this.eventHandlers.healthCheckFailed);
    this.providerManager.on('health_check_completed', this.eventHandlers.healthCheckCompleted);
  }

  /**
   * Start periodic dashboard refresh
   */
  private startPeriodicRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.refreshDashboard();
    }, this.config.refreshInterval);
  }

  /**
   * Create a new alert
   */
  private createAlert(
    providerId: string,
    type: DashboardAlert['type'],
    severity: DashboardAlert['severity'],
    message: string
  ): void {
    const alertId = `${providerId}-${type}-${Date.now()}`;
    const alert: DashboardAlert = {
      id: alertId,
      providerId,
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    this.emit('alert_created', alert);
    logger.warn(`Provider alert [${severity.toUpperCase()}]: ${message}`, { providerId, type });
  }

  /**
   * Resolve alerts of a specific type for a provider
   */
  private resolveAlerts(providerId: string, type: DashboardAlert['type']): void {
    for (const [alertId, alert] of this.alerts) {
      if (alert.providerId === providerId && alert.type === type) {
        this.alerts.delete(alertId);
        this.emit('alert_resolved', alert);
      }
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(providerId: string): void {
    const metrics = this.providerManager.getPerformanceMetrics(providerId);
    const usage = this.providerManager.getUsageStats(providerId);

    if (!metrics || !usage) return;

    // Check error rate
    if (this.config.alertThresholds && metrics.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert(providerId, 'error_rate', 'warning',
        `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    // Check response time
    if (this.config.alertThresholds && metrics.responseTime.avg > this.config.alertThresholds.responseTime) {
      this.createAlert(providerId, 'response_time', 'warning',
        `High response time: ${metrics.responseTime.avg.toFixed(0)}ms`);
    }
  }

  /**
   * Get current dashboard snapshot
   */
  getCurrentSnapshot(): DashboardSnapshot {
    const providerIds = this.providerManager.getProviderIds();
    const providers: DashboardSnapshot['providers'] = {};

    let totalRequests = 0;
    let totalCost = 0;
    let totalResponseTime = 0;
    let totalSuccessfulRequests = 0;
    let activeProviders = 0;
    let healthyProviders = 0;

    // Collect data for each provider
    for (const providerId of providerIds) {
      const usage = this.providerManager.getUsageStats(providerId);
      const performance = this.providerManager.getPerformanceMetrics(providerId);

      if (!usage || !performance) continue;

      activeProviders++;
      if (performance.healthStatus === 'healthy') {
        healthyProviders++;
      }

      // Get alerts for this provider
      const providerAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.providerId === providerId && !alert.acknowledged);

      providers[providerId] = {
        usage,
        performance,
        healthStatus: performance.healthStatus,
        alerts: providerAlerts
      };

      // Accumulate summary statistics
      totalRequests += usage.totalRequests;
      totalCost += usage.totalCost;
      totalResponseTime += usage.averageResponseTime * usage.totalRequests;
      totalSuccessfulRequests += usage.successfulRequests;
    }

    const snapshot: DashboardSnapshot = {
      timestamp: new Date(),
      providers,
      summary: {
        totalRequests,
        totalCost,
        averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        overallSuccessRate: totalRequests > 0 ? totalSuccessfulRequests / totalRequests : 1,
        activeProviders,
        healthyProviders
      }
    };

    return snapshot;
  }

  /**
   * Refresh dashboard data
   */
  refreshDashboard(): void {
    try {
      const snapshot = this.getCurrentSnapshot();

      // Store snapshot
      this.snapshots.push(snapshot);

      // Clean up old snapshots
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (this.config.retentionDays ?? 30));

      this.snapshots = this.snapshots.filter(s => s.timestamp >= cutoffDate);

      this.emit('dashboard_refreshed', snapshot);

    } catch (error) {
      logger.error('Failed to refresh dashboard:', error);
    }
  }

  /**
   * Get provider performance comparison
   */
  getProviderComparison(): ProviderComparison[] {
    const providerIds = this.providerManager.getProviderIds();
    const comparisons: ProviderComparison[] = [];

    for (const providerId of providerIds) {
      const usage = this.providerManager.getUsageStats(providerId);
      const performance = this.providerManager.getPerformanceMetrics(providerId);

      if (!usage || !performance) continue;

      const successRate = usage.totalRequests > 0
        ? usage.successfulRequests / usage.totalRequests
        : 1;

      const costPerRequest = usage.totalRequests > 0
        ? usage.totalCost / usage.totalRequests
        : 0;

      // Calculate reliability score (0-1)
      const reliability = performance.availability * successRate;

      // Calculate composite score
      const responseTimeScore = Math.max(0, 1 - (performance.responseTime.avg / 10000)); // Normalize to 10s max
      const costScore = costPerRequest > 0 ? Math.max(0, 1 - (costPerRequest / 0.1)) : 1; // Normalize to $0.1 max
      const score = (successRate * 0.4) + (reliability * 0.3) + (responseTimeScore * 0.2) + (costScore * 0.1);

      comparisons.push({
        providerId,
        successRate,
        avgResponseTime: performance.responseTime.avg,
        costPerRequest,
        reliability,
        score
      });
    }

    return comparisons.sort((a, b) => b.score - a.score);
  }

  /**
   * Get cost analysis for all providers
   */
  getCostAnalysis(): CostAnalysis[] {
    const providerIds = this.providerManager.getProviderIds();
    const analyses: CostAnalysis[] = [];

    for (const providerId of providerIds) {
      const usage = this.providerManager.getUsageStats(providerId);
      if (!usage) continue;

      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().substring(0, 7);

      const dailyRequests = usage.dailyUsage.get(today) || 0;
      const monthlyRequests = usage.monthlyUsage.get(thisMonth) || 0;

      // Estimate costs (simplified - would need actual billing data)
      const avgCostPerRequest = usage.totalRequests > 0 ? usage.totalCost / usage.totalRequests : 0;
      const dailyCost = dailyRequests * avgCostPerRequest;
      const monthlyCost = monthlyRequests * avgCostPerRequest;

      // Project monthly cost based on daily average
      const daysInMonth = new Date().getDate();
      const projectedMonthlyCost = (dailyCost / daysInMonth) * 30; // Simplified projection

      const costPerToken = usage.totalTokensUsed > 0 ? usage.totalCost / usage.totalTokensUsed : 0;

      // Determine cost trend (simplified - would need historical data)
      const costTrend: CostAnalysis['costTrend'] = 'stable'; // Would calculate from historical snapshots

      analyses.push({
        providerId,
        dailyCost,
        monthlyCost,
        projectedMonthlyCost,
        costPerRequest: avgCostPerRequest,
        costPerToken,
        budgetUtilization: 0, // Would calculate from budget data
        costTrend
      });
    }

    return analyses;
  }

  /**
   * Get historical snapshots
   */
  getHistoricalSnapshots(days: number = 7): DashboardSnapshot[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.snapshots.filter(s => s.timestamp >= cutoffDate);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.emit('alert_acknowledged', alert);
    return true;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): DashboardAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  /**
   * Get alerts for a specific provider
   */
  getProviderAlerts(providerId: string): DashboardAlert[] {
    return Array.from(this.alerts.values()).filter(alert =>
      alert.providerId === providerId && !alert.acknowledged
    );
  }

  /**
   * Generate dashboard report
   */
  generateReport(): {
    summary: DashboardSnapshot['summary'];
    topPerformers: ProviderComparison[];
    costBreakdown: CostAnalysis[];
    activeAlerts: DashboardAlert[];
    recommendations: string[];
  } {
    const snapshot = this.getCurrentSnapshot();
    const comparisons = this.getProviderComparison();
    const costAnalyses = this.getCostAnalysis();
    const activeAlerts = this.getActiveAlerts();

    // Generate recommendations based on data
    const recommendations: string[] = [];

    if (snapshot.summary.overallSuccessRate < 0.95) {
      recommendations.push('Overall success rate is below 95%. Consider reviewing provider configurations.');
    }

    if (snapshot.summary.averageResponseTime > 5000) {
      recommendations.push('Average response time is above 5 seconds. Consider optimizing provider selection.');
    }

    if (activeAlerts.filter(a => a.severity === 'critical').length > 0) {
      recommendations.push('Critical alerts detected. Immediate attention required.');
    }

    const topProvider = comparisons[0];
    if (topProvider && comparisons.length > 1) {
      recommendations.push(`Consider using ${topProvider.providerId} more frequently (highest performance score: ${topProvider.score.toFixed(2)})`);
    }

    return {
      summary: snapshot.summary,
      topPerformers: comparisons.slice(0, 3),
      costBreakdown: costAnalyses,
      activeAlerts,
      recommendations
    };
  }

  /**
   * Export dashboard data
   */
  exportData(): {
    snapshots: DashboardSnapshot[];
    alerts: DashboardAlert[];
    config: DashboardConfig;
    exportedAt: Date;
  } {
    return {
      snapshots: this.snapshots,
      alerts: Array.from(this.alerts.values()),
      config: this.config,
      exportedAt: new Date()
    };
  }

  /**
   * Dispose of dashboard resources
   */
  dispose(): void {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Remove event listeners from providerManager to prevent memory leaks
    if (this.eventHandlers.usageTracked) {
      this.providerManager.off('usage_tracked', this.eventHandlers.usageTracked);
    }
    if (this.eventHandlers.budgetLimitReached) {
      this.providerManager.off('budget_limit_reached', this.eventHandlers.budgetLimitReached);
    }
    if (this.eventHandlers.budgetThresholdReached) {
      this.providerManager.off('budget_threshold_reached', this.eventHandlers.budgetThresholdReached);
    }
    if (this.eventHandlers.healthCheckFailed) {
      this.providerManager.off('health_check_failed', this.eventHandlers.healthCheckFailed);
    }
    if (this.eventHandlers.healthCheckCompleted) {
      this.providerManager.off('health_check_completed', this.eventHandlers.healthCheckCompleted);
    }

    // Clear handler references
    this.eventHandlers = {};

    // Remove our own listeners
    this.removeAllListeners();

    // Clear data structures
    this.snapshots = [];
    this.alerts.clear();

    logger.info('Provider Dashboard disposed');
  }
}