/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private logger: Logger
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens
   * @returns true if tokens available, false if rate limited
   */
  async tryConsume(tokensNeeded: number = 1): Promise<boolean> {
    // Refill tokens based on time elapsed
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    this.logger.warn('Rate limit exceeded:', {
      available: this.tokens,
      needed: tokensNeeded
    });

    return false;
  }

  /**
   * Wait until tokens are available
   */
  async consume(tokensNeeded: number = 1): Promise<void> {
    while (true) {
      if (await this.tryConsume(tokensNeeded)) {
        return;
      }

      // Calculate wait time
      const tokensToWait = tokensNeeded - this.tokens;
      const waitMs = (tokensToWait / this.refillRate) * 1000;

      // Wait
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedSeconds = elapsedMs / 1000;

    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}