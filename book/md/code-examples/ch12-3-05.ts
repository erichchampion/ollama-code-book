/**
 * Logs AI requests with full context
 */
export class RequestLogger {
  constructor(private logger: StructuredLogger) {}

  /**
   * Log AI request start
   */
  logRequestStart(request: CompletionRequest, context: RequestContext): void {
    this.logger.info('AI request started', {
      requestId: context.requestId,
      userId: context.userId,
      provider: request.model?.split('/')[0],
      model: request.model,
      messageCount: request.messages.length,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      operation: context.operation
    });
  }

  /**
   * Log AI request completion
   */
  logRequestComplete(
    request: CompletionRequest,
    response: CompletionResponse,
    context: RequestContext,
    duration: number
  ): void {
    this.logger.info('AI request completed', {
      requestId: context.requestId,
      userId: context.userId,
      provider: response.metadata?.provider,
      model: response.model,
      duration,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      totalTokens: response.usage?.totalTokens,
      cost: this.calculateCost(response),
      fromCache: response.metadata?.fromCache || false,
      operation: context.operation
    });
  }

  /**
   * Log AI request error
   */
  logRequestError(
    request: CompletionRequest,
    error: Error,
    context: RequestContext,
    duration: number
  ): void {
    this.logger.error('AI request failed', error, {
      requestId: context.requestId,
      userId: context.userId,
      model: request.model,
      duration,
      operation: context.operation,
      errorType: error.name,
      retryable: this.isRetryable(error)
    });
  }

  /**
   * Log tool execution
   */
  logToolExecution(
    tool: string,
    params: Record<string, any>,
    result: ToolResult,
    duration: number,
    context: RequestContext
  ): void {
    this.logger.info('Tool executed', {
      requestId: context.requestId,
      tool,
      params: this.sanitizeParams(params),
      success: result.success,
      duration,
      fromCache: result.fromCache || false,
      operation: context.operation
    });
  }

  /**
   * Calculate request cost
   */
  private calculateCost(response: CompletionResponse): number {
    if (!response.usage) return 0;

    // Approximate costs (would use actual provider pricing)
    const inputCost = response.usage.inputTokens * 0.00001;
    const outputCost = response.usage.outputTokens * 0.00003;

    return inputCost + outputCost;
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: Error): boolean {
    const retryableErrors = [
      'RateLimitError',
      'TimeoutError',
      'NetworkError',
      'ServiceUnavailableError'
    ];

    return retryableErrors.includes(error.name);
  }

  /**
   * Sanitize sensitive parameters
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized = { ...params };

    // Redact sensitive fields
    const sensitiveFields = ['apiKey', 'password', 'token', 'secret'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

interface RequestContext {
  requestId: string;
  userId?: string;
  operation: string;
}