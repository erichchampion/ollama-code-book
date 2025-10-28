/**
 * Collects and aggregates metrics
 */
export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * Record a counter metric
   */
  incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value,
      tags: tags || {},
      timestamp: Date.now()
    });
  }

  /**
   * Record a gauge metric
   */
  setGauge(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      tags: tags || {},
      timestamp: Date.now()
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      tags: tags || {},
      timestamp: Date.now()
    });
  }

  /**
   * Record a timing metric
   */
  recordTiming(
    name: string,
    durationMs: number,
    tags?: Record<string, string>
  ): void {
    this.recordHistogram(name, durationMs, tags);
  }

  /**
   * Store metric
   */
  private recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    this.metrics.get(metric.name)!.push(metric);

    // Log metric
    this.logger.debug('Metric recorded', {
      metric: metric.name,
      value: metric.value,
      type: metric.type,
      tags: metric.tags
    });
  }

  /**
   * Get metric statistics
   */
  getStats(
    name: string,
    timeRange: TimeRange
  ): MetricStats | null {
    const metrics = this.metrics.get(name);

    if (!metrics) return null;

    // Filter by time range
    const filtered = metrics.filter(m =>
      m.timestamp >= timeRange.start.getTime() &&
      m.timestamp <= timeRange.end.getTime()
    );

    if (filtered.length === 0) return null;

    const values = filtered.map(m => m.value).sort((a, b) => a - b);

    return {
      count: filtered.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }

  /**
   * Export metrics to monitoring system
   */
  exportMetrics(): void {
    // Would export to Prometheus, CloudWatch, etc.
    for (const [name, metrics] of this.metrics.entries()) {
      this.logger.info('Exporting metrics', {
        metric: name,
        count: metrics.length
      });
    }
  }
}

enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram'
}

interface Metric {
  name: string;
  type: MetricType;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

interface MetricStats {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}