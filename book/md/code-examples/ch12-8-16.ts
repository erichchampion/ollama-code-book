/**
 * Circuit breaker prevents cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private options: CircuitBreakerOptions,
    private logger: StructuredLogger
  ) {}

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      // Check if we should try again
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.logger.info('Circuit breaker: Entering half-open state');
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      // Success
      this.onSuccess();

      return result;

    } catch (error) {
      // Failure
      this.onFailure();

      throw error;
    }
  }

  /**
   * Handle success
   */
  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.logger.info('Circuit breaker: Closing circuit');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failure
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.logger.warn('Circuit breaker: Opening circuit', {
        failures: this.failures
      });

      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Get circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
}

enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Reject all requests
  HALF_OPEN = 'half_open' // Try limited requests
}

interface CircuitBreakerOptions {
  failureThreshold: number;    // Failures before opening
  successThreshold: number;    // Successes before closing
  resetTimeout: number;        // ms before trying again
}