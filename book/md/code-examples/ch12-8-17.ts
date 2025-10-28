/**
 * Retry failed operations with exponential backoff
 */
export class RetryPolicy {
  constructor(
    private options: RetryOptions,
    private logger: StructuredLogger
  ) {}

  /**
   * Execute with retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.options.maxAttempts; attempt++) {
      try {
        return await fn();

      } catch (error) {
        lastError = error as Error;

        // Check if retryable
        if (!this.isRetryable(error as Error)) {
          throw error;
        }

        // Last attempt - don't wait
        if (attempt === this.options.maxAttempts - 1) {
          break;
        }

        // Calculate backoff
        const backoffMs = this.calculateBackoff(attempt);

        this.logger.info('Retrying after error', {
          attempt: attempt + 1,
          maxAttempts: this.options.maxAttempts,
          backoffMs,
          error: (error as Error).message
        });

        // Wait before retry
        await this.sleep(backoffMs);
      }
    }

    throw lastError;
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
   * Calculate exponential backoff
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = this.options.baseDelayMs || 1000;
    const maxDelay = this.options.maxDelayMs || 30000;

    // Exponential: baseDelay * 2^attempt
    let delay = baseDelay * Math.pow(2, attempt);

    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    // Cap at max delay
    return Math.min(delay, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
}