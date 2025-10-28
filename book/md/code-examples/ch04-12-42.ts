/**
 * Enhanced tool orchestrator with retry support
 */
export class RobustToolOrchestrator extends ToolOrchestrator {
  private retryStrategy: RetryStrategy;

  constructor(
    registry: ToolRegistry,
    logger: Logger,
    workingDirectory: string,
    options: OrchestratorOptions = {}
  ) {
    super(registry, logger, workingDirectory, options);
    this.retryStrategy = new RetryStrategy(logger, options.retry);
  }

  /**
   * Execute tool call with retry
   */
  protected async executeToolCall(
    call: ToolCall,
    options: ExecutionOptions
  ): Promise<ToolResult> {
    const tool = this.registry.get(call.toolName);

    // Only retry if tool is marked as retryable
    if (!tool.retryable) {
      return await super.executeToolCall(call, options);
    }

    // Execute with retry
    try {
      return await this.retryStrategy.executeWithRetry(
        async () => await super.executeToolCall(call, options),
        {
          name: `Tool ${call.toolName}`,
          toolName: call.toolName,
          callId: call.id
        }
      );
    } catch (error: any) {
      // If all retries failed, return error result
      return {
        callId: call.id,
        toolName: call.toolName,
        success: false,
        error: {
          message: error.message,
          code: categorizeError(error),
          recoverable: false,
          suggestion: this.getSuggestion(error)
        },
        metadata: {
          durationMs: 0,
          cached: false,
          timestamp: new Date(),
          retriesAttempted: this.retryStrategy['maxRetries']
        }
      };
    }
  }

  /**
   * Get suggestion based on error
   */
  private getSuggestion(error: any): string {
    const category = categorizeError(error);

    switch (category) {
      case ToolErrorCategory.NOT_FOUND:
        return 'Check that the file or resource exists';

      case ToolErrorCategory.PERMISSION:
        return 'Check file permissions or access rights';

      case ToolErrorCategory.TIMEOUT:
        return 'Try increasing the timeout or check system resources';

      case ToolErrorCategory.NETWORK:
        return 'Check network connectivity and try again';

      case ToolErrorCategory.VALIDATION:
        return 'Check parameter values and format';

      default:
        return 'Check logs for more details';
    }
  }
}