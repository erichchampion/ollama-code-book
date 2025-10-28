/**
 * AI service with distributed tracing
 */
export class TracedAIService {
  constructor(
    private provider: AIProvider,
    private tracer: Tracer,
    private logger: StructuredLogger
  ) {}

  /**
   * Complete with tracing
   */
  async complete(
    request: CompletionRequest,
    context: TraceContext
  ): Promise<CompletionResponse> {
    // Create span for AI request
    const span = this.tracer.startSpan('ai.complete', context, {
      provider: this.provider.constructor.name,
      model: request.model,
      messageCount: request.messages.length,
      temperature: request.temperature
    });

    try {
      // Add event for request start
      this.tracer.addEvent(span, 'request.started', {
        inputTokens: this.estimateTokens(request.messages)
      });

      // Call AI provider
      const response = await this.provider.complete(request);

      // Add event for response
      this.tracer.addEvent(span, 'response.received', {
        outputTokens: response.usage?.outputTokens,
        fromCache: response.metadata?.fromCache
      });

      // Update span attributes
      span.attributes.outputTokens = response.usage?.outputTokens;
      span.attributes.totalTokens = response.usage?.totalTokens;
      span.attributes.cost = this.calculateCost(response);

      // End span successfully
      this.tracer.endSpan(span, SpanStatus.OK);

      return response;

    } catch (error) {
      // Record error in span
      this.tracer.setError(span, error as Error);
      this.tracer.endSpan(span, SpanStatus.ERROR);

      throw error;
    }
  }

  /**
   * Execute tool with tracing
   */
  async executeTool(
    tool: Tool,
    params: Record<string, any>,
    context: TraceContext
  ): Promise<ToolResult> {
    // Create child span for tool
    const childContext = context.createChild();
    const span = this.tracer.startSpan(`tool.${tool.name}`, childContext, {
      tool: tool.name,
      params: this.sanitizeParams(params)
    });

    try {
      const result = await tool.execute(params, {
        traceContext: childContext
      });

      span.attributes.success = result.success;
      span.attributes.fromCache = result.fromCache || false;

      this.tracer.endSpan(span, SpanStatus.OK);

      return result;

    } catch (error) {
      this.tracer.setError(span, error as Error);
      this.tracer.endSpan(span, SpanStatus.ERROR);

      throw error;
    }
  }

  private estimateTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      return total + msg.content.split(/\s+/).length;
    }, 0);
  }

  private calculateCost(response: CompletionResponse): number {
    if (!response.usage) return 0;

    const inputCost = response.usage.inputTokens * 0.00001;
    const outputCost = response.usage.outputTokens * 0.00003;

    return inputCost + outputCost;
  }

  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    // Redact sensitive fields
    const sanitized = { ...params };
    const sensitiveFields = ['apiKey', 'password', 'token'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}