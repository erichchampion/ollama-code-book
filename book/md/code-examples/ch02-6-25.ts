type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  /** Number of failures before opening */
  failureThreshold: number;

  /** Time to wait before trying again (ms) */
  resetTimeout: number;

  /** Number of test requests in half-open state */
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Check if we can attempt a request
   */
  canAttempt(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if reset timeout has passed
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.resetTimeout) {
        // Transition to half-open
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        return true;
      }

      return false;  // Still open
    }

    if (this.state === 'half-open') {
      // Allow limited test requests
      return this.halfOpenAttempts < this.config.halfOpenRequests;
    }

    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      // Test succeeded - close the circuit
      this.state = 'closed';
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Test failed - reopen circuit
      this.state = 'open';
      this.halfOpenAttempts = 0;
    } else if (this.state === 'closed') {
      // Check if we should open
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'open';
      }
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure statistics
   */
  getStats(): { state: CircuitState; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}