/**
 * Retry strategy for tool execution
 */
export class RetryStrategy {
  private logger: Logger;
  private maxRetries: number;
  private retryDelay: number;
  private backoffMultiplier: number;

  constructor(
    logger: Logger,
    options: RetryOptions = {}
  ) {
    this.logger = logger;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelayMs || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
  }

  /**
   * Execute with retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: RetryContext
  ): Promise<T> {
    let lastError: any;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        this.logger.debug(`${context.name}: Attempt ${attempt + 1}/${this.maxRetries + 1}`);
        return await operation();
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Categorize error
        const category = categorizeError(error);

        // Check if error is retryable
        if (!this.isRetryable(category)) {
          this.logger.error(`${context.name}: Non-retryable error (${category})`);
          throw error;
        }

        // Check if we have retries left
        if (attempt > this.maxRetries) {
          this.logger.error(`${context.name}: Max retries (${this.maxRetries}) exceeded`);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.retryDelay * Math.pow(this.backoffMultiplier, attempt - 1);

        this.logger.warn(
          `${context.name}: Attempt ${attempt} failed (${category}), ` +
          `retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error category is retryable
   */
  private isRetryable(category: ToolErrorCategory): boolean {
    switch (category) {
      case ToolErrorCategory.TIMEOUT:
      case ToolErrorCategory.NETWORK:
      case ToolErrorCategory.SYSTEM:
        return true;

      case ToolErrorCategory.VALIDATION:
      case ToolErrorCategory.PERMISSION:
      case ToolErrorCategory.NOT_FOUND:
        return false;

      case ToolErrorCategory.UNKNOWN:
        return true; // Retry unknown errors (conservative approach)

      default:
        return false;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
}

interface RetryContext {
  name: string;
  toolName: string;
  callId: string;
}