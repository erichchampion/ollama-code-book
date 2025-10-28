/**
 * Cost Budget Manager
 *
 * Provides comprehensive cost budgeting, usage limits, and spending controls
 * across different AI providers with real-time monitoring, alerts, and
 * automatic cost optimization features.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { THRESHOLD_CONSTANTS } from '../../config/constants.js';

export interface BudgetConfig {
  id: string;
  name: string;
  description?: string;
  period: BudgetPeriod;
  limits: BudgetLimits;
  providers: ProviderBudgetConfig[];
  alertThresholds: AlertThreshold[];
  autoActions: AutoAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetLimits {
  maxCost: number;
  maxRequests: number;
  maxTokens: number;
  dailyLimits?: DailyLimits;
  monthlyLimits?: MonthlyLimits;
}

export interface DailyLimits {
  maxCost: number;
  maxRequests: number;
  maxTokens: number;
}

export interface MonthlyLimits {
  maxCost: number;
  maxRequests: number;
  maxTokens: number;
}

export interface ProviderBudgetConfig {
  providerId: string;
  allocation: number; // Percentage of total budget (0-100)
  priority: 'low' | 'medium' | 'high' | 'critical';
  costPerToken?: number;
  limits?: BudgetLimits;
  enabled: boolean;
}

export interface AlertThreshold {
  type: 'cost' | 'requests' | 'tokens';
  threshold: number; // Percentage (0-100)
  action: 'notify' | 'warn' | 'throttle' | 'block';
  channels: string[]; // email, slack, webhook, etc.
}

export interface AutoAction {
  trigger: 'budget_exceeded' | 'threshold_reached' | 'cost_spike' | 'provider_error';
  condition: AutoActionCondition;
  action: 'switch_provider' | 'reduce_quality' | 'enable_caching' | 'throttle' | 'block';
  parameters: Record<string, any>;
  cooldown: number; // Minutes before action can be triggered again
  enabled: boolean;
}

export interface AutoActionCondition {
  metric: 'cost' | 'requests' | 'tokens' | 'error_rate';
  operator: '>' | '<' | '>=' | '<=' | '=';
  value: number;
  window: number; // Time window in minutes
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface UsageData {
  providerId: string;
  cost: number;
  requests: number;
  tokens: number;
  timestamp: Date;
  metadata: UsageMetadata;
}

export interface UsageMetadata {
  model: string;
  requestType: string;
  responseTime: number;
  success: boolean;
  cacheHit: boolean;
  quality?: number;
}

export interface BudgetStatus {
  budgetId: string;
  period: BudgetPeriod;
  current: UsageSummary;
  limits: BudgetLimits;
  utilization: UtilizationMetrics;
  projections: ProjectionMetrics;
  alerts: ActiveAlert[];
  recommendations: CostRecommendation[];
}

export interface UsageSummary {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  providerBreakdown: ProviderUsage[];
  timeBreakdown: TimeSeriesUsage[];
}

export interface ProviderUsage {
  providerId: string;
  cost: number;
  requests: number;
  tokens: number;
  percentage: number;
  averageCostPerRequest: number;
  averageCostPerToken: number;
}

export interface TimeSeriesUsage {
  timestamp: Date;
  cost: number;
  requests: number;
  tokens: number;
}

export interface UtilizationMetrics {
  costUtilization: number; // Percentage (0-100)
  requestUtilization: number;
  tokenUtilization: number;
  dailyAverage: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  burnRate: number; // Cost per day at current rate
}

export interface ProjectionMetrics {
  projectedMonthlyCost: number;
  daysUntilBudgetExhausted: number;
  recommendedBudgetIncrease?: number;
  costOptimizationPotential: number;
}

export interface ActiveAlert {
  id: string;
  type: AlertThreshold['type'];
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface CostRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedSavings: number;
  implementation: string[];
  priority: number;
}

export class CostBudgetManager extends EventEmitter {
  private budgets = new Map<string, BudgetConfig>();
  private usageData: UsageData[] = [];
  private activeAlerts = new Map<string, ActiveAlert>();
  private actionCooldowns = new Map<string, Date>();
  private costPredictionModel: CostPredictionModel;

  constructor() {
    super();
    this.costPredictionModel = new CostPredictionModel();
    this.startUsageTracking();
  }

  /**
   * Create a new budget configuration
   */
  createBudget(config: Omit<BudgetConfig, 'id' | 'createdAt' | 'updatedAt'>): string {
    const budgetId = this.generateBudgetId();
    const now = new Date();

    const budget: BudgetConfig = {
      ...config,
      id: budgetId,
      createdAt: now,
      updatedAt: now
    };

    this.validateBudgetConfig(budget);
    this.budgets.set(budgetId, budget);

    this.emit('budget_created', { budgetId, budget });
    logger.info(`Created budget: ${budget.name} (${budgetId})`);

    return budgetId;
  }

  /**
   * Update existing budget configuration
   */
  updateBudget(budgetId: string, updates: Partial<BudgetConfig>): boolean {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      return false;
    }

    const updatedBudget = {
      ...budget,
      ...updates,
      id: budgetId, // Prevent ID changes
      updatedAt: new Date()
    };

    this.validateBudgetConfig(updatedBudget);
    this.budgets.set(budgetId, updatedBudget);

    this.emit('budget_updated', { budgetId, budget: updatedBudget });
    return true;
  }

  /**
   * Track usage data from providers
   */
  trackUsage(data: UsageData): void {
    this.usageData.push(data);

    // Clean up old data (keep last 90 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    this.usageData = this.usageData.filter(d => d.timestamp >= cutoffDate);

    // Check budgets for this provider
    this.checkBudgetConstraints(data);

    this.emit('usage_tracked', data);
  }

  /**
   * Check if request is within budget constraints
   */
  checkRequestAllowed(
    providerId: string,
    estimatedCost: number,
    _requestType: string = 'query'
  ): { allowed: boolean; reason?: string; suggestion?: string } {
    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue;

      const providerConfig = budget.providers.find(p => p.providerId === providerId);
      if (!providerConfig || !providerConfig.enabled) continue;

      const status = this.getBudgetStatus(budget.id);
      if (!status) continue;

      // Check cost limits
      if (status.current.totalCost + estimatedCost > budget.limits.maxCost) {
        return {
          allowed: false,
          reason: 'Budget cost limit exceeded',
          suggestion: this.generateCostAlternativeSuggestion(budget, estimatedCost)
        };
      }

      // Check daily limits
      if (budget.limits.dailyLimits) {
        const todayUsage = this.getDailyUsage(budget.id);
        if (todayUsage.totalCost + estimatedCost > budget.limits.dailyLimits.maxCost) {
          return {
            allowed: false,
            reason: 'Daily cost limit exceeded',
            suggestion: 'Try again tomorrow or increase daily budget'
          };
        }
      }

      // Check provider-specific limits
      if (providerConfig.limits) {
        const providerUsage = status.current.providerBreakdown
          .find(p => p.providerId === providerId);

        if (providerUsage &&
            providerUsage.cost + estimatedCost > providerConfig.limits.maxCost) {
          return {
            allowed: false,
            reason: `Provider ${providerId} budget exceeded`,
            suggestion: this.suggestAlternativeProvider(budget, providerId)
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Get budget status
   */
  getBudgetStatus(budgetId: string): BudgetStatus | null {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      return null;
    }

    const current = this.calculateCurrentUsage(budget);
    const utilization = this.calculateUtilization(budget, current);
    const projections = this.calculateProjections(budget, current);
    const alerts = this.getActiveBudgetAlerts(budgetId);
    const recommendations = this.generateRecommendations(budget, current);

    return {
      budgetId,
      period: budget.period,
      current,
      limits: budget.limits,
      utilization,
      projections,
      alerts,
      recommendations
    };
  }

  /**
   * Generate budget ID
   */
  private generateBudgetId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `budget_${timestamp}_${random}`;
  }

  /**
   * Validate budget configuration
   */
  private validateBudgetConfig(budget: BudgetConfig): void {
    if (budget.limits.maxCost <= 0) {
      throw new Error('Maximum cost must be greater than zero');
    }

    if (budget.limits.maxRequests <= 0) {
      throw new Error('Maximum requests must be greater than zero');
    }

    // Validate provider allocations sum to 100%
    const totalAllocation = budget.providers.reduce((sum, p) => sum + p.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Provider allocations must sum to 100%');
    }

    // Validate alert thresholds
    for (const threshold of budget.alertThresholds) {
      if (threshold.threshold < 0 || threshold.threshold > 100) {
        throw new Error('Alert thresholds must be between 0 and 100');
      }
    }
  }

  /**
   * Check budget constraints for new usage
   */
  private checkBudgetConstraints(data: UsageData): void {
    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue;

      const status = this.getBudgetStatus(budget.id);
      if (!status) continue;

      // Check alert thresholds
      this.checkAlertThresholds(budget, status);

      // Execute auto actions if needed
      this.executeAutoActions(budget, status, data);
    }
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(budget: BudgetConfig, status: BudgetStatus): void {
    for (const threshold of budget.alertThresholds) {
      const currentValue = this.getCurrentValueForThreshold(threshold.type, status);
      const limitValue = this.getLimitValueForThreshold(threshold.type, budget);
      const utilizationPercent = (currentValue / limitValue) * 100;

      if (utilizationPercent >= threshold.threshold) {
        this.triggerAlert(budget, threshold, currentValue, utilizationPercent);
      }
    }
  }

  /**
   * Get current value for threshold type
   */
  private getCurrentValueForThreshold(type: AlertThreshold['type'], status: BudgetStatus): number {
    switch (type) {
      case 'cost': return status.current.totalCost;
      case 'requests': return status.current.totalRequests;
      case 'tokens': return status.current.totalTokens;
      default: return 0;
    }
  }

  /**
   * Get limit value for threshold type
   */
  private getLimitValueForThreshold(type: AlertThreshold['type'], budget: BudgetConfig): number {
    switch (type) {
      case 'cost': return budget.limits.maxCost;
      case 'requests': return budget.limits.maxRequests;
      case 'tokens': return budget.limits.maxTokens;
      default: return 1;
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(
    budget: BudgetConfig,
    threshold: AlertThreshold,
    currentValue: number,
    utilizationPercent: number
  ): void {
    const alertId = `${budget.id}_${threshold.type}_${threshold.threshold}`;

    // Check if alert already exists and is not acknowledged
    if (this.activeAlerts.has(alertId)) {
      return;
    }

    const severity = this.determineSeverity(utilizationPercent);
    const alert: ActiveAlert = {
      id: alertId,
      type: threshold.type,
      severity,
      message: `Budget ${budget.name}: ${threshold.type} is at ${utilizationPercent.toFixed(1)}% of limit`,
      threshold: threshold.threshold,
      currentValue,
      timestamp: new Date(),
      acknowledged: false
    };

    this.activeAlerts.set(alertId, alert);
    this.emit('budget_alert', { budget, threshold, alert });

    logger.warn(`Budget alert: ${alert.message}`, { budgetId: budget.id, alert });
  }

  /**
   * Determine alert severity based on utilization
   */
  private determineSeverity(utilizationPercent: number): ActiveAlert['severity'] {
    if (utilizationPercent >= 95) return 'critical';
    if (utilizationPercent >= 85) return 'error';
    if (utilizationPercent >= 70) return 'warning';
    return 'info';
  }

  /**
   * Execute automatic actions
   */
  private executeAutoActions(
    budget: BudgetConfig,
    status: BudgetStatus,
    data: UsageData
  ): void {
    for (const autoAction of budget.autoActions) {
      if (!autoAction.enabled) continue;

      // Check cooldown
      const cooldownKey = `${budget.id}_${autoAction.trigger}`;
      const lastAction = this.actionCooldowns.get(cooldownKey);
      if (lastAction) {
        const cooldownEnd = new Date(lastAction.getTime() + autoAction.cooldown * 60000);
        if (new Date() < cooldownEnd) continue;
      }

      // Check if condition is met
      if (this.isAutoActionConditionMet(autoAction.condition, status, data)) {
        this.executeAction(budget, autoAction, status);
        this.actionCooldowns.set(cooldownKey, new Date());
      }
    }
  }

  /**
   * Check if auto action condition is met
   */
  private isAutoActionConditionMet(
    condition: AutoActionCondition,
    status: BudgetStatus,
    data: UsageData
  ): boolean {
    let currentValue: number;

    switch (condition.metric) {
      case 'cost': {
        currentValue = status.current.totalCost;
        break;
      }
      case 'requests': {
        currentValue = status.current.totalRequests;
        break;
      }
      case 'tokens': {
        currentValue = status.current.totalTokens;
        break;
      }
      case 'error_rate': {
        currentValue = this.calculateErrorRate(data.providerId, condition.window);
        break;
      }
      default:
        return false;
    }

    switch (condition.operator) {
      case '>': return currentValue > condition.value;
      case '<': return currentValue < condition.value;
      case '>=': return currentValue >= condition.value;
      case '<=': return currentValue <= condition.value;
      case '=': return currentValue === condition.value;
      default: return false;
    }
  }

  /**
   * Execute auto action
   */
  private executeAction(
    budget: BudgetConfig,
    autoAction: AutoAction,
    status: BudgetStatus
  ): void {
    switch (autoAction.action) {
      case 'switch_provider': {
        this.switchProvider(budget, autoAction.parameters);
        break;
      }
      case 'reduce_quality':
        this.reduceQuality(budget, autoAction.parameters);
        break;
      case 'enable_caching':
        this.enableCaching(budget, autoAction.parameters);
        break;
      case 'throttle':
        this.enableThrottling(budget, autoAction.parameters);
        break;
      case 'block':
        this.blockRequests(budget, autoAction.parameters);
        break;
    }

    this.emit('auto_action_executed', { budget, autoAction, status });
    logger.info(`Auto action executed: ${autoAction.action}`, {
      budgetId: budget.id,
      action: autoAction.action
    });
  }

  /**
   * Switch to alternative provider
   */
  private switchProvider(budget: BudgetConfig, parameters: Record<string, any>): void {
    // Implementation would integrate with provider manager
    this.emit('provider_switch_recommended', { budget, parameters });
  }

  /**
   * Reduce response quality to save costs
   */
  private reduceQuality(budget: BudgetConfig, parameters: Record<string, any>): void {
    this.emit('quality_reduction_recommended', { budget, parameters });
  }

  /**
   * Enable aggressive caching
   */
  private enableCaching(budget: BudgetConfig, parameters: Record<string, any>): void {
    this.emit('caching_enabled', { budget, parameters });
  }

  /**
   * Enable request throttling
   */
  private enableThrottling(budget: BudgetConfig, parameters: Record<string, any>): void {
    this.emit('throttling_enabled', { budget, parameters });
  }

  /**
   * Block requests temporarily
   */
  private blockRequests(budget: BudgetConfig, parameters: Record<string, any>): void {
    this.emit('requests_blocked', { budget, parameters });
  }

  /**
   * Calculate current usage for budget period
   */
  private calculateCurrentUsage(budget: BudgetConfig): UsageSummary {
    const periodStart = this.getPeriodStart(budget.period);
    const periodData = this.usageData.filter(d => d.timestamp >= periodStart);

    const totalCost = periodData.reduce((sum, d) => sum + d.cost, 0);
    const totalRequests = periodData.length;
    const totalTokens = periodData.reduce((sum, d) => sum + d.tokens, 0);

    // Calculate provider breakdown
    const providerMap = new Map<string, ProviderUsage>();
    for (const data of periodData) {
      const existing = providerMap.get(data.providerId) || {
        providerId: data.providerId,
        cost: 0,
        requests: 0,
        tokens: 0,
        percentage: 0,
        averageCostPerRequest: 0,
        averageCostPerToken: 0
      };

      existing.cost += data.cost;
      existing.requests += 1;
      existing.tokens += data.tokens;

      providerMap.set(data.providerId, existing);
    }

    const providerBreakdown = Array.from(providerMap.values()).map(p => ({
      ...p,
      percentage: totalCost > 0 ? (p.cost / totalCost) * 100 : 0,
      averageCostPerRequest: p.requests > 0 ? p.cost / p.requests : 0,
      averageCostPerToken: p.tokens > 0 ? p.cost / p.tokens : 0
    }));

    // Calculate time series breakdown (daily)
    const timeBreakdown = this.calculateTimeSeriesUsage(periodData, 'daily');

    return {
      totalCost,
      totalRequests,
      totalTokens,
      providerBreakdown,
      timeBreakdown
    };
  }

  /**
   * Calculate utilization metrics
   */
  private calculateUtilization(budget: BudgetConfig, current: UsageSummary): UtilizationMetrics {
    const costUtilization = (current.totalCost / budget.limits.maxCost) * 100;
    const requestUtilization = (current.totalRequests / budget.limits.maxRequests) * 100;
    const tokenUtilization = (current.totalTokens / budget.limits.maxTokens) * 100;

    const dailyAverage = current.timeBreakdown.length > 0
      ? current.totalCost / current.timeBreakdown.length
      : 0;

    const trendDirection = this.calculateTrendDirection(current.timeBreakdown);
    const burnRate = dailyAverage;

    return {
      costUtilization,
      requestUtilization,
      tokenUtilization,
      dailyAverage,
      trendDirection,
      burnRate
    };
  }

  /**
   * Calculate cost projections
   */
  private calculateProjections(budget: BudgetConfig, current: UsageSummary): ProjectionMetrics {
    const projectedMonthlyCost = this.costPredictionModel.predictMonthlyCost(current.timeBreakdown);
    const dailyCost = current.timeBreakdown.length > 0
      ? current.timeBreakdown.reduce((sum, d) => sum + d.cost, 0) / current.timeBreakdown.length
      : 0;
    const remainingBudget = budget.limits.maxCost - current.totalCost;
    const daysUntilBudgetExhausted = dailyCost > 0 ? remainingBudget / dailyCost : Infinity;

    const recommendedBudgetIncrease = projectedMonthlyCost > budget.limits.maxCost
      ? projectedMonthlyCost - budget.limits.maxCost
      : undefined;

    const costOptimizationPotential = this.calculateOptimizationPotential(current);

    return {
      projectedMonthlyCost,
      daysUntilBudgetExhausted,
      recommendedBudgetIncrease,
      costOptimizationPotential
    };
  }

  /**
   * Start usage tracking
   */
  private startUsageTracking(): void {
    // This would integrate with the provider manager to receive usage events
    logger.info('Cost budget manager initialized');
  }

  /**
   * Calculate error rate for provider within time window
   */
  private calculateErrorRate(providerId: string, windowMinutes: number): number {
    const windowStart = new Date(Date.now() - windowMinutes * 60000);
    const windowData = this.usageData.filter(d =>
      d.providerId === providerId && d.timestamp >= windowStart
    );

    if (windowData.length === 0) return 0;

    const errorCount = windowData.filter(d => !d.metadata.success).length;
    return errorCount / windowData.length;
  }

  /**
   * Get daily usage for budget
   */
  private getDailyUsage(_budgetId: string): UsageSummary {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayData = this.usageData.filter(d => d.timestamp >= today);

    return {
      totalCost: todayData.reduce((sum, d) => sum + d.cost, 0),
      totalRequests: todayData.length,
      totalTokens: todayData.reduce((sum, d) => sum + d.tokens, 0),
      providerBreakdown: [],
      timeBreakdown: []
    };
  }

  /**
   * Get period start date
   */
  private getPeriodStart(period: BudgetPeriod): Date {
    const now = new Date();

    switch (period) {
      case 'daily':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        return startOfDay;

      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;

      case 'monthly':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return startOfMonth;

      case 'yearly':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return startOfYear;

      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }
  }

  /**
   * Calculate time series usage
   */
  private calculateTimeSeriesUsage(
    data: UsageData[],
    granularity: 'hourly' | 'daily' | 'weekly'
  ): TimeSeriesUsage[] {
    const timeSeriesMap = new Map<string, TimeSeriesUsage>();

    for (const usage of data) {
      const key = this.getTimeSeriesKey(usage.timestamp, granularity);
      const existing = timeSeriesMap.get(key) || {
        timestamp: this.getTimeSeriesTimestamp(usage.timestamp, granularity),
        cost: 0,
        requests: 0,
        tokens: 0
      };

      existing.cost += usage.cost;
      existing.requests += 1;
      existing.tokens += usage.tokens;

      timeSeriesMap.set(key, existing);
    }

    return Array.from(timeSeriesMap.values()).sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Get time series key for grouping
   */
  private getTimeSeriesKey(date: Date, granularity: string): string {
    switch (granularity) {
      case 'hourly':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case 'daily':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Get time series timestamp
   */
  private getTimeSeriesTimestamp(date: Date, granularity: string): Date {
    const result = new Date(date);

    switch (granularity) {
      case 'hourly':
        result.setMinutes(0, 0, 0);
        break;
      case 'daily':
        result.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        result.setDate(date.getDate() - date.getDay());
        result.setHours(0, 0, 0, 0);
        break;
    }

    return result;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(timeSeries: TimeSeriesUsage[]): 'increasing' | 'decreasing' | 'stable' {
    if (timeSeries.length < 2) return 'stable';

    const recent = timeSeries.slice(-7); // Last 7 data points
    const first = recent[0].cost;
    const last = recent[recent.length - 1].cost;

    const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;

    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate optimization potential
   */
  private calculateOptimizationPotential(current: UsageSummary): number {
    // Simplified calculation - would be more sophisticated in practice
    let potential = 0;

    // Check for cache hit opportunities
    const cacheHitRate = THRESHOLD_CONSTANTS.COST_OPTIMIZATION.EXPECTED_CACHE_HIT_RATE;
    potential += current.totalCost * (1 - cacheHitRate) * THRESHOLD_CONSTANTS.COST_OPTIMIZATION.CACHE_SAVINGS_FACTOR;

    // Check for provider optimization
    if (current.providerBreakdown.length > 1) {
      const mostExpensive = Math.max(...current.providerBreakdown.map(p => p.averageCostPerRequest));
      const cheapest = Math.min(...current.providerBreakdown.map(p => p.averageCostPerRequest));
      potential += (mostExpensive - cheapest) * current.totalRequests * THRESHOLD_CONSTANTS.COST_OPTIMIZATION.PROVIDER_SWITCH_SAVINGS;
    }

    return potential;
  }

  /**
   * Generate cost optimization recommendations
   */
  private generateRecommendations(budget: BudgetConfig, current: UsageSummary): CostRecommendation[] {
    const recommendations: CostRecommendation[] = [];

    // Provider cost optimization
    if (current.providerBreakdown.length > 1) {
      const sortedProviders = current.providerBreakdown
        .sort((a, b) => b.averageCostPerRequest - a.averageCostPerRequest);

      if (sortedProviders.length > 1) {
        const expensive = sortedProviders[0];
        const cheaper = sortedProviders[sortedProviders.length - 1];

        if (expensive.averageCostPerRequest > cheaper.averageCostPerRequest * 1.5) {
          recommendations.push({
            id: 'provider-optimization',
            title: 'Switch to Cost-Effective Provider',
            description: `Consider using ${cheaper.providerId} more often. It's ${(expensive.averageCostPerRequest / cheaper.averageCostPerRequest).toFixed(1)}x cheaper per request.`,
            impact: 'high',
            effort: 'low',
            estimatedSavings: (expensive.averageCostPerRequest - cheaper.averageCostPerRequest) * expensive.requests * THRESHOLD_CONSTANTS.COST_OPTIMIZATION.ROUTING_SAVINGS_ESTIMATE,
            implementation: [
              'Update provider routing preferences',
              'A/B test quality differences',
              'Gradually shift traffic'
            ],
            priority: 1
          });
        }
      }
    }

    // Caching recommendations
    recommendations.push({
      id: 'enable-caching',
      title: 'Enable Aggressive Caching',
      description: 'Implement smart caching to reduce duplicate requests and save costs.',
      impact: 'medium',
      effort: 'low',
      estimatedSavings: current.totalCost * THRESHOLD_CONSTANTS.COST_OPTIMIZATION.CACHING_IMPACT,
      implementation: [
        'Enable provider-specific caching',
        'Implement semantic similarity caching',
        'Configure appropriate TTL values'
      ],
      priority: 2
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate cost alternative suggestion
   */
  private generateCostAlternativeSuggestion(budget: BudgetConfig, _estimatedCost: number): string {
    const cheapestProvider = budget.providers
      .filter(p => p.enabled)
      .sort((a, b) => (a.costPerToken || 0) - (b.costPerToken || 0))[0];

    if (cheapestProvider) {
      return `Try using ${cheapestProvider.providerId} for lower cost requests`;
    }

    return 'Consider increasing your budget or using caching to reduce costs';
  }

  /**
   * Suggest alternative provider
   */
  private suggestAlternativeProvider(budget: BudgetConfig, currentProviderId: string): string {
    const alternatives = budget.providers
      .filter(p => p.providerId !== currentProviderId && p.enabled)
      .sort((a, b) => b.priority.localeCompare(a.priority));

    if (alternatives.length > 0) {
      return `Try using ${alternatives[0].providerId} instead`;
    }

    return 'No alternative providers available';
  }

  /**
   * Get active alerts for budget
   */
  private getActiveBudgetAlerts(budgetId: string): ActiveAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.id.startsWith(budgetId) && !alert.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get all budgets
   */
  getAllBudgets(): BudgetConfig[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Delete budget
   */
  deleteBudget(budgetId: string): boolean {
    const budget = this.budgets.get(budgetId);
    if (budget) {
      this.budgets.delete(budgetId);
      this.emit('budget_deleted', { budgetId, budget });
      return true;
    }
    return false;
  }
}

/**
 * Simple cost prediction model
 */
class CostPredictionModel {
  predictMonthlyCost(timeSeries: TimeSeriesUsage[]): number {
    if (timeSeries.length === 0) return 0;

    // Simple linear extrapolation based on recent trend
    const recentData = timeSeries.slice(-14); // Last 14 data points
    if (recentData.length < 2) {
      return timeSeries[0].cost * 30; // Daily cost * 30 days
    }

    const totalCost = recentData.reduce((sum, d) => sum + d.cost, 0);
    const avgDailyCost = totalCost / recentData.length;

    return avgDailyCost * 30; // 30 days
  }
}