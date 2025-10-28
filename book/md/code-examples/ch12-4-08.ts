/**
 * Distributed tracer
 */
export class Tracer {
  private spans: Map<string, Span> = new Map();
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * Start a span
   */
  startSpan(
    name: string,
    context: TraceContext,
    attributes?: Record<string, any>
  ): Span {
    const span: Span = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      name,
      startTime: Date.now(),
      attributes: attributes || {},
      events: [],
      status: SpanStatus.UNSET
    };

    this.spans.set(span.spanId, span);

    this.logger.debug('Span started', {
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name
    });

    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, status: SpanStatus = SpanStatus.OK): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.logger.info('Span completed', {
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
      duration: span.duration,
      status: span.status
    });

    // Export span to trace collector
    this.exportSpan(span);
  }

  /**
   * Add event to span
   */
  addEvent(span: Span, name: string, attributes?: Record<string, any>): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes: attributes || {}
    });
  }

  /**
   * Set span error
   */
  setError(span: Span, error: Error): void {
    span.status = SpanStatus.ERROR;
    span.attributes.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  /**
   * Get trace
   */
  async getTrace(traceId: string): Promise<Trace> {
    const spans = Array.from(this.spans.values())
      .filter(s => s.traceId === traceId)
      .sort((a, b) => a.startTime - b.startTime);

    return {
      traceId,
      spans,
      duration: this.calculateTraceDuration(spans),
      status: this.calculateTraceStatus(spans)
    };
  }

  /**
   * Export span to trace collector
   */
  private exportSpan(span: Span): void {
    // Would export to OpenTelemetry, Jaeger, etc.
    // For now, just log
    this.logger.debug('Span exported', {
      span: JSON.stringify(span)
    });
  }

  /**
   * Calculate total trace duration
   */
  private calculateTraceDuration(spans: Span[]): number {
    if (spans.length === 0) return 0;

    const start = Math.min(...spans.map(s => s.startTime));
    const end = Math.max(...spans.map(s => s.endTime || s.startTime));

    return end - start;
  }

  /**
   * Calculate trace status
   */
  private calculateTraceStatus(spans: Span[]): SpanStatus {
    if (spans.some(s => s.status === SpanStatus.ERROR)) {
      return SpanStatus.ERROR;
    }

    return SpanStatus.OK;
  }
}

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, any>;
  events: SpanEvent[];
  status: SpanStatus;
}

interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, any>;
}

enum SpanStatus {
  UNSET = 'unset',
  OK = 'ok',
  ERROR = 'error'
}

interface Trace {
  traceId: string;
  spans: Span[];
  duration: number;
  status: SpanStatus;
}