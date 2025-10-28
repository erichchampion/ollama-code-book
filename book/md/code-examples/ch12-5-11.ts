/**
 * Tracks key metrics for AI systems
 */
export class AIMetrics {
  constructor(private collector: MetricsCollector) {}

  /**
   * Record request metrics
   */
  recordRequest(
    provider: string,
    duration: number,
    success: boolean,
    cached: boolean
  ): void {
    // Request count
    this.collector.incrementCounter('ai.requests.total', 1, {
      provider,
      status: success ? 'success' : 'error',
      cached: cached.toString()
    });

    // Request duration
    this.collector.recordTiming('ai.requests.duration', duration, {
      provider
    });

    // Cache hit rate
    if (cached) {
      this.collector.incrementCounter('ai.cache.hits', 1, { provider });
    } else {
      this.collector.incrementCounter('ai.cache.misses', 1, { provider });
    }
  }

  /**
   * Record token usage
   */
  recordTokens(
    provider: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    this.collector.incrementCounter('ai.tokens.input', inputTokens, {
      provider
    });

    this.collector.incrementCounter('ai.tokens.output', outputTokens, {
      provider
    });
  }

  /**
   * Record cost
   */
  recordCost(provider: string, cost: number): void {
    this.collector.incrementCounter('ai.cost.total', cost, {
      provider
    });
  }

  /**
   * Record error
   */
  recordError(provider: string, errorType: string): void {
    this.collector.incrementCounter('ai.errors.total', 1, {
      provider,
      errorType
    });
  }

  /**
   * Record tool execution
   */
  recordToolExecution(
    tool: string,
    duration: number,
    success: boolean
  ): void {
    this.collector.incrementCounter('tools.executions.total', 1, {
      tool,
      status: success ? 'success' : 'error'
    });

    this.collector.recordTiming('tools.executions.duration', duration, {
      tool
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    const usage = process.memoryUsage();

    this.collector.setGauge('system.memory.heap_used', usage.heapUsed);
    this.collector.setGauge('system.memory.heap_total', usage.heapTotal);
    this.collector.setGauge('system.memory.external', usage.external);
    this.collector.setGauge('system.memory.rss', usage.rss);
  }
}