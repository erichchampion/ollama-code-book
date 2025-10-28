/**
 * Error recovery strategy
 */
export enum RecoveryStrategy {
  // Fail immediately
  FAIL_FAST = 'fail_fast',

  // Retry with backoff
  RETRY = 'retry',

  // Skip error and continue
  CONTINUE = 'continue',

  // Use fallback
  FALLBACK = 'fallback'
}

/**
 * Error recovery handler
 */
export class ErrorRecoveryHandler {
  private strategy: RecoveryStrategy;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    strategy: RecoveryStrategy = RecoveryStrategy.RETRY,
    options: RecoveryOptions = {}
  ) {
    this.strategy = strategy;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelayMs || 1000;
  }

  /**
   * Handle stream error
   */
  async handle(
    error: Error,
    context: ErrorContext,
    retryFn: () => Promise<any>
  ): Promise<RecoveryResult> {
    switch (this.strategy) {
      case RecoveryStrategy.FAIL_FAST:
        return { recovered: false, error };

      case RecoveryStrategy.RETRY:
        return await this.retry(error, context, retryFn);

      case RecoveryStrategy.CONTINUE:
        console.warn(`⚠️  Error in stream (continuing): ${error.message}`);
        return { recovered: true };

      case RecoveryStrategy.FALLBACK:
        return await this.fallback(error, context);

      default:
        return { recovered: false, error };
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retry(
    error: Error,
    context: ErrorContext,
    retryFn: () => Promise<any>
  ): Promise<RecoveryResult> {
    let lastError = error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.warn(
        `⚠️  Stream error (attempt ${attempt}/${this.maxRetries}): ${error.message}`
      );

      // Calculate delay with exponential backoff
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      await this.sleep(delay);

      try {
        await retryFn();
        console.log(`✓ Recovered after ${attempt} attempts`);
        return { recovered: true, retriesAttempted: attempt };
      } catch (retryError: any) {
        lastError = retryError;
      }
    }

    return {
      recovered: false,
      error: lastError,
      retriesAttempted: this.maxRetries
    };
  }

  /**
   * Use fallback
   */
  private async fallback(
    error: Error,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    console.warn(`⚠️  Using fallback due to error: ${error.message}`);

    // Return partial results if available
    if (context.partialResults) {
      return {
        recovered: true,
        fallbackUsed: true,
        data: context.partialResults
      };
    }

    return {
      recovered: true,
      fallbackUsed: true,
      data: { message: 'Fallback response - original request failed' }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RecoveryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

interface ErrorContext {
  eventType: StreamEventType;
  partialResults?: any;
  metadata?: any;
}

interface RecoveryResult {
  recovered: boolean;
  error?: Error;
  retriesAttempted?: number;
  fallbackUsed?: boolean;
  data?: any;
}