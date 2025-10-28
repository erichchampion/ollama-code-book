/**
 * Trace context for distributed tracing
 */
export class TraceContext {
  constructor(
    public readonly traceId: string,
    public readonly spanId: string,
    public readonly parentSpanId?: string
  ) {}

  /**
   * Create root trace context
   */
  static createRoot(): TraceContext {
    return new TraceContext(
      this.generateId(),
      this.generateId()
    );
  }

  /**
   * Create child span
   */
  createChild(): TraceContext {
    return new TraceContext(
      this.traceId,
      TraceContext.generateId(),
      this.spanId
    );
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}