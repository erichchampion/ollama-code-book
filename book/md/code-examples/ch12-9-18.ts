/**
 * Provides data for dashboards
 */
export class DashboardDataProvider {
  constructor(
    private metrics: MetricsCollector,
    private logs: LogQuery,
    private tracer: Tracer
  ) {}

  /**
   * Get overview metrics
   */
  async getOverview(timeRange: TimeRange): Promise<DashboardOverview> {
    return {
      requests: await this.getRequestMetrics(timeRange),
      errors: await this.getErrorMetrics(timeRange),
      performance: await this.getPerformanceMetrics(timeRange),
      cost: await this.getCostMetrics(timeRange)
    };
  }

  /**
   * Get request metrics
   */
  private async getRequestMetrics(timeRange: TimeRange): Promise<RequestMetrics> {
    const totalRequests = this.metrics.getStats('ai.requests.total', timeRange);
    const successRate = await this.calculateSuccessRate(timeRange);
    const cacheHitRate = await this.calculateCacheHitRate(timeRange);

    return {
      total: totalRequests?.count || 0,
      successRate,
      cacheHitRate
    };
  }

  /**
   * Get error metrics
   */
  private async getErrorMetrics(timeRange: TimeRange): Promise<ErrorMetrics> {
    const errorRate = await this.logs.getErrorRate(timeRange);
    const errorStats = await this.logs.query({
      level: 'error',
      startTime: timeRange.start,
      endTime: timeRange.end
    });

    return {
      rate: errorRate,
      total: errorStats.length
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(timeRange: TimeRange): Promise<PerformanceMetrics> {
    const durationStats = this.metrics.getStats('ai.requests.duration', timeRange);

    return {
      avgLatency: durationStats?.avg || 0,
      p95Latency: durationStats?.p95 || 0,
      p99Latency: durationStats?.p99 || 0
    };
  }

  /**
   * Get cost metrics
   */
  private async getCostMetrics(timeRange: TimeRange): Promise<CostMetrics> {
    const costStats = this.metrics.getStats('ai.cost.total', timeRange);
    const tokenStats = this.metrics.getStats('ai.tokens.input', timeRange);

    return {
      total: costStats?.sum || 0,
      avgPerRequest: costStats?.avg || 0,
      totalTokens: tokenStats?.sum || 0
    };
  }

  private async calculateSuccessRate(timeRange: TimeRange): Promise<number> {
    // Implementation would query actual metrics
    return 0.98; // 98% success rate
  }

  private async calculateCacheHitRate(timeRange: TimeRange): Promise<number> {
    const hits = this.metrics.getStats('ai.cache.hits', timeRange);
    const misses = this.metrics.getStats('ai.cache.misses', timeRange);

    const totalHits = hits?.sum || 0;
    const totalMisses = misses?.sum || 0;
    const total = totalHits + totalMisses;

    return total > 0 ? totalHits / total : 0;
  }
}

interface DashboardOverview {
  requests: RequestMetrics;
  errors: ErrorMetrics;
  performance: PerformanceMetrics;
  cost: CostMetrics;
}

interface RequestMetrics {
  total: number;
  successRate: number;
  cacheHitRate: number;
}

interface ErrorMetrics {
  rate: number;
  total: number;
}

interface PerformanceMetrics {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
}

interface CostMetrics {
  total: number;
  avgPerRequest: number;
  totalTokens: number;
}