/**
 * A/B Testing Framework for AI Providers
 *
 * Enables controlled testing of different AI providers with statistical
 * analysis and automatic winner selection based on performance metrics.
 */

import { EventEmitter } from 'events';
import { ProviderManager } from './provider-manager.js';
import { logger } from '../../utils/logger.js';
import { providerConfig } from './provider-config.js';

export interface ABTestConfig {
  name: string;
  description: string;
  controlProvider: string;
  testProvider: string;
  trafficSplit: number; // Percentage for test provider (0-100)
  startDate: Date;
  endDate: Date;
  minSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  primaryMetric: 'success_rate' | 'response_time' | 'cost' | 'user_satisfaction';
  secondaryMetrics: string[];
  enabled: boolean;
}

export interface ABTestResult {
  testId: string;
  status: 'running' | 'completed' | 'cancelled' | 'inconclusive';
  winner: 'control' | 'test' | 'no_significant_difference' | null;
  confidence: number;
  significance: number; // p-value
  controlMetrics: {
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    confidenceInterval: [number, number];
  };
  testMetrics: {
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    confidenceInterval: [number, number];
  };
  effectSize: number; // Cohen's d
  powerAnalysis: {
    power: number;
    recommendedSampleSize: number;
  };
  endedAt?: Date;
  reason?: string;
}

export interface ABTestAssignment {
  userId: string;
  testId: string;
  variant: 'control' | 'test';
  assignedAt: Date;
  providerId: string;
}

export interface ABTestMetrics {
  testId: string;
  variant: 'control' | 'test';
  providerId: string;
  userId: string;
  timestamp: Date;
  metrics: {
    responseTime: number;
    success: boolean;
    cost: number;
    userSatisfaction?: number;
    errorType?: string;
  };
}

export class ABTestingFramework extends EventEmitter {
  private providerManager: ProviderManager;
  private tests = new Map<string, ABTestConfig>();
  private assignments = new Map<string, ABTestAssignment>(); // userId -> assignment
  private metrics: ABTestMetrics[] = [];
  private results = new Map<string, ABTestResult>();
  private usageTrackedHandler?: (data: any) => void;

  constructor(providerManager: ProviderManager) {
    super();
    this.providerManager = providerManager;

    // Set up provider usage tracking
    this.setupUsageTracking();
  }

  /**
   * Set up usage tracking from provider manager
   */
  private setupUsageTracking(): void {
    // Store handler reference for proper cleanup
    this.usageTrackedHandler = (data) => {
      this.recordMetrics(data);
    };

    this.providerManager.on('usage_tracked', this.usageTrackedHandler);
  }

  /**
   * Create a new A/B test
   */
  createTest(config: ABTestConfig): string {
    const testId = this.generateTestId(config.name);

    // Validate configuration
    this.validateTestConfig(config);

    // Store test configuration
    this.tests.set(testId, { ...config });

    // Initialize result tracking
    this.results.set(testId, {
      testId,
      status: 'running',
      winner: null,
      confidence: 0,
      significance: 1,
      controlMetrics: {
        sampleSize: 0,
        mean: 0,
        standardDeviation: 0,
        confidenceInterval: [0, 0]
      },
      testMetrics: {
        sampleSize: 0,
        mean: 0,
        standardDeviation: 0,
        confidenceInterval: [0, 0]
      },
      effectSize: 0,
      powerAnalysis: {
        power: 0,
        recommendedSampleSize: config.minSampleSize
      }
    });

    this.emit('test_created', { testId, config });
    logger.info(`Created A/B test: ${config.name} (${testId})`);

    return testId;
  }

  /**
   * Validate test configuration
   */
  private validateTestConfig(config: ABTestConfig): void {
    if (!this.providerManager.getProvider(config.controlProvider)) {
      throw new Error(`Control provider not found: ${config.controlProvider}`);
    }

    if (!this.providerManager.getProvider(config.testProvider)) {
      throw new Error(`Test provider not found: ${config.testProvider}`);
    }

    if (config.trafficSplit < 0 || config.trafficSplit > 100) {
      throw new Error('Traffic split must be between 0 and 100');
    }

    if (config.startDate >= config.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (config.minSampleSize < 10) {
      throw new Error('Minimum sample size must be at least 10');
    }
  }

  /**
   * Generate test ID
   */
  private generateTestId(name: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now().toString(36);
    return `${sanitizedName}_${timestamp}`;
  }

  /**
   * Assign user to test variant
   */
  assignUser(userId: string, testId: string): ABTestAssignment | null {
    const test = this.tests.get(testId);
    if (!test || !test.enabled) {
      return null;
    }

    const now = new Date();
    if (now < test.startDate || now > test.endDate) {
      return null;
    }

    // Check if user already assigned
    const existingAssignment = this.assignments.get(userId);
    if (existingAssignment && existingAssignment.testId === testId) {
      return existingAssignment;
    }

    // Determine variant based on traffic split
    const hash = this.hashUserId(userId + testId);
    const variant = hash < (test.trafficSplit / 100) ? 'test' : 'control';
    const providerId = variant === 'test' ? test.testProvider : test.controlProvider;

    const assignment: ABTestAssignment = {
      userId,
      testId,
      variant,
      assignedAt: now,
      providerId
    };

    this.assignments.set(userId, assignment);
    this.emit('user_assigned', assignment);

    return assignment;
  }

  /**
   * Hash user ID for consistent assignment
   */
  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash | 0; // Convert to 32-bit signed integer (safer than & hash)
    }
    // Use unsigned shift to ensure positive result, then normalize to 0-1
    const config = providerConfig.getABTestingConfig();
    return (hash >>> 0) / config.hashNormalizationFactor;
  }

  /**
   * Record metrics for A/B test
   */
  recordMetrics(data: any): void {
    // Find relevant test assignments
    const assignments = Array.from(this.assignments.values()).filter(a => {
      const test = this.tests.get(a.testId);
      return test && test.enabled && a.providerId === data.id;
    });

    for (const assignment of assignments) {
      const testMetrics: ABTestMetrics = {
        testId: assignment.testId,
        variant: assignment.variant,
        providerId: assignment.providerId,
        userId: assignment.userId,
        timestamp: new Date(),
        metrics: {
          responseTime: data.responseTime || 0,
          success: data.success || false,
          cost: data.cost || 0,
          userSatisfaction: data.userSatisfaction,
          errorType: data.error ? data.error.type : undefined
        }
      };

      this.metrics.push(testMetrics);
      this.emit('metrics_recorded', testMetrics);

      // Update test results
      this.updateTestResults(assignment.testId);
    }
  }

  /**
   * Update test results with statistical analysis
   */
  private updateTestResults(testId: string): void {
    const test = this.tests.get(testId);
    const result = this.results.get(testId);

    if (!test || !result) return;

    // Get metrics for this test
    const controlMetrics = this.metrics.filter(m => m.testId === testId && m.variant === 'control');
    const testMetrics = this.metrics.filter(m => m.testId === testId && m.variant === 'test');

    if (controlMetrics.length === 0 && testMetrics.length === 0) return;

    // Extract primary metric values
    const controlValues = controlMetrics.map(m => this.extractMetricValue(m, test.primaryMetric));
    const testValues = testMetrics.map(m => this.extractMetricValue(m, test.primaryMetric));

    // Calculate statistics
    const controlStats = this.calculateStatistics(controlValues);
    const testStats = this.calculateStatistics(testValues);

    // Update result
    result.controlMetrics = controlStats;
    result.testMetrics = testStats;

    // Perform statistical tests if we have enough samples
    if (controlValues.length >= test.minSampleSize && testValues.length >= test.minSampleSize) {
      const testResult = this.performTTest(controlValues, testValues, test.confidenceLevel);
      result.significance = testResult.pValue;
      result.confidence = 1 - testResult.pValue;

      // Calculate effect size (Cohen's d)
      result.effectSize = this.calculateCohenD(controlValues, testValues);

      // Determine winner
      if (testResult.pValue < (1 - test.confidenceLevel)) {
        if (test.primaryMetric === 'response_time' || test.primaryMetric === 'cost') {
          // Lower is better
          result.winner = testStats.mean < controlStats.mean ? 'test' : 'control';
        } else {
          // Higher is better
          result.winner = testStats.mean > controlStats.mean ? 'test' : 'control';
        }
      } else {
        result.winner = 'no_significant_difference';
      }

      // Check if test should end
      this.checkTestCompletion(testId);
    }

    this.emit('test_updated', { testId, result });
  }

  /**
   * Extract metric value based on type
   */
  private extractMetricValue(metrics: ABTestMetrics, metricType: string): number {
    switch (metricType) {
      case 'success_rate':
        return metrics.metrics.success ? 1 : 0;
      case 'response_time':
        return metrics.metrics.responseTime;
      case 'cost':
        return metrics.metrics.cost;
      case 'user_satisfaction':
        return metrics.metrics.userSatisfaction || 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate basic statistics
   */
  private calculateStatistics(values: number[]): {
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    confidenceInterval: [number, number];
  } {
    if (values.length === 0) {
      return {
        sampleSize: 0,
        mean: 0,
        standardDeviation: 0,
        confidenceInterval: [0, 0]
      };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // 95% confidence interval (simplified)
    const margin = 1.96 * (standardDeviation / Math.sqrt(values.length));
    const confidenceInterval: [number, number] = [mean - margin, mean + margin];

    return {
      sampleSize: values.length,
      mean,
      standardDeviation,
      confidenceInterval
    };
  }

  /**
   * Perform t-test using Welch's t-test for unequal variances
   */
  private performTTest(
    controlValues: number[],
    testValues: number[],
    _confidenceLevel: number
  ): { pValue: number; tStatistic: number } {
    if (controlValues.length === 0 || testValues.length === 0) {
      return { pValue: 1, tStatistic: 0 };
    }

    const controlMean = controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length;
    const testMean = testValues.reduce((sum, val) => sum + val, 0) / testValues.length;

    // Use sample variance (n-1 denominator) for unbiased estimation
    const controlVar = controlValues.length > 1
      ? controlValues.reduce((sum, val) => sum + Math.pow(val - controlMean, 2), 0) / (controlValues.length - 1)
      : 0;
    const testVar = testValues.length > 1
      ? testValues.reduce((sum, val) => sum + Math.pow(val - testMean, 2), 0) / (testValues.length - 1)
      : 0;

    // Welch's t-test (handles unequal variances)
    const s1Squared = controlVar / controlValues.length;
    const s2Squared = testVar / testValues.length;
    const standardError = Math.sqrt(s1Squared + s2Squared);

    if (standardError === 0) {
      return { pValue: controlMean === testMean ? 1 : 0, tStatistic: 0 };
    }

    const tStatistic = (testMean - controlMean) / standardError;

    // Degrees of freedom for Welch's t-test (Welch-Satterthwaite equation)
    const degreesOfFreedom = Math.pow(s1Squared + s2Squared, 2) /
      ((s1Squared * s1Squared) / (controlValues.length - 1) + (s2Squared * s2Squared) / (testValues.length - 1));

    // Use t-distribution CDF approximation (more accurate than normal for small samples)
    const pValue = 2 * (1 - this.tDistributionCDF(Math.abs(tStatistic), degreesOfFreedom));

    return { pValue: Math.max(0.001, Math.min(0.999, pValue)), tStatistic };
  }

  /**
   * T-distribution cumulative distribution function approximation
   */
  private tDistributionCDF(t: number, df: number): number {
    // For large df (>30), t-distribution approximates normal distribution
    if (df > 30) {
      return this.normalCDF(t);
    }

    // For small df, use approximation based on incomplete beta function
    // This is a simplified approximation - in production, use a proper statistical library
    const x = df / (df + t * t);
    const a = df / 2;
    const b = 0.5;

    // Approximate incomplete beta function using continued fraction
    const betaApprox = this.incompleteBeta(x, a, b);
    return 1 - 0.5 * betaApprox;
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const poly = ((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530) * t;
    const cdf = 1 - 0.398942280401432 * Math.exp(-0.5 * x * x) * poly;
    return x >= 0 ? cdf : 1 - cdf;
  }

  /**
   * Simplified incomplete beta function approximation
   */
  private incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use series expansion for small x, continued fraction for large x
    if (x < (a + 1) / (a + b + 2)) {
      return this.betaSeriesExpansion(x, a, b);
    } else {
      return 1 - this.betaSeriesExpansion(1 - x, b, a);
    }
  }

  /**
   * Beta series expansion
   */
  private betaSeriesExpansion(x: number, a: number, b: number): number {
    const logBeta = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    let term = Math.exp(a * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta) / a;
    let sum = term;

    for (let n = 1; n < 100; n++) {
      term *= x * (n - b) / (n * (a + n - 1));
      if (Math.abs(term) < 1e-15) break;
      sum += term;
    }

    return sum;
  }

  /**
   * Log gamma function approximation
   */
  private logGamma(x: number): number {
    // Stirling's approximation for log(gamma(x))
    if (x < 12) {
      return Math.log(this.gamma(x));
    }
    return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) +
           1 / (12 * x) - 1 / (360 * x * x * x);
  }

  /**
   * Gamma function approximation for small values
   */
  private gamma(x: number): number {
    // Lanczos approximation
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
               771.32342877765313, -176.61502916214059, 12.507343278686905,
               -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

    if (x < 0.5) {
      return Math.PI / (Math.sin(Math.PI * x) * this.gamma(1 - x));
    }

    x -= 1;
    let a = c[0];
    for (let i = 1; i < g + 2; i++) {
      a += c[i] / (x + i);
    }

    const t = x + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
  }

  /**
   * Calculate Cohen's d effect size
   */
  private calculateCohenD(controlValues: number[], testValues: number[]): number {
    const controlMean = controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length;
    const testMean = testValues.reduce((sum, val) => sum + val, 0) / testValues.length;

    const controlVar = controlValues.reduce((sum, val) => sum + Math.pow(val - controlMean, 2), 0) / (controlValues.length - 1);
    const testVar = testValues.reduce((sum, val) => sum + Math.pow(val - testMean, 2), 0) / (testValues.length - 1);

    const pooledStd = Math.sqrt((controlVar + testVar) / 2);
    return pooledStd === 0 ? 0 : (testMean - controlMean) / pooledStd;
  }

  /**
   * Check if test should be completed
   */
  private checkTestCompletion(testId: string): void {
    const test = this.tests.get(testId);
    const result = this.results.get(testId);

    if (!test || !result) return;

    const now = new Date();
    let shouldComplete = false;
    let reason = '';

    // Check if test period ended
    if (now > test.endDate) {
      shouldComplete = true;
      reason = 'Test period ended';
    }

    // Check if we have a significant result with sufficient power
    const config = providerConfig.getABTestingConfig();
    if (result.significance < (1 - test.confidenceLevel) && Math.abs(result.effectSize) > config.effectSizeThreshold) {
      shouldComplete = true;
      reason = 'Significant result achieved';
    }

    if (shouldComplete) {
      this.completeTest(testId, reason);
    }
  }

  /**
   * Complete a test
   */
  completeTest(testId: string, reason: string): void {
    const result = this.results.get(testId);
    if (!result) return;

    result.status = 'completed';
    result.endedAt = new Date();
    result.reason = reason;

    // Remove user assignments for this test
    // Collect user IDs to delete first to avoid modifying Map during iteration
    const userIdsToRemove: string[] = [];
    for (const [userId, assignment] of this.assignments) {
      if (assignment.testId === testId) {
        userIdsToRemove.push(userId);
      }
    }

    // Now safely delete the collected user IDs
    for (const userId of userIdsToRemove) {
      this.assignments.delete(userId);
    }

    this.emit('test_completed', { testId, result });
    logger.info(`A/B test completed: ${testId} - Winner: ${result.winner} (${reason})`);
  }

  /**
   * Get test result
   */
  getTestResult(testId: string): ABTestResult | undefined {
    return this.results.get(testId);
  }

  /**
   * Get active tests
   */
  getActiveTests(): ABTestConfig[] {
    const now = new Date();
    return Array.from(this.tests.values()).filter(test =>
      test.enabled && now >= test.startDate && now <= test.endDate
    );
  }

  /**
   * Cancel a test
   */
  cancelTest(testId: string, reason: string): void {
    const test = this.tests.get(testId);
    const result = this.results.get(testId);

    if (!test || !result) return;

    result.status = 'cancelled';
    result.endedAt = new Date();
    result.reason = reason;

    test.enabled = false;

    this.emit('test_cancelled', { testId, reason });
    logger.info(`A/B test cancelled: ${testId} - ${reason}`);
  }

  /**
   * Export test data
   */
  exportTestData(testId: string): {
    config: ABTestConfig;
    result: ABTestResult;
    assignments: ABTestAssignment[];
    metrics: ABTestMetrics[];
  } | null {
    const config = this.tests.get(testId);
    const result = this.results.get(testId);

    if (!config || !result) return null;

    const assignments = Array.from(this.assignments.values()).filter(a => a.testId === testId);
    const metrics = this.metrics.filter(m => m.testId === testId);

    return { config, result, assignments, metrics };
  }

  /**
   * Dispose of A/B testing resources
   */
  dispose(): void {
    // Remove specific event listener from providerManager to prevent memory leaks
    if (this.usageTrackedHandler) {
      this.providerManager.off('usage_tracked', this.usageTrackedHandler);
    }

    // Remove our own listeners
    this.removeAllListeners();

    // Clear data structures
    this.tests.clear();
    this.assignments.clear();
    this.metrics = [];
    this.results.clear();

    logger.info('A/B Testing Framework disposed');
  }
}