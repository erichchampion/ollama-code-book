class RateLimiter {
  private limits = new Map<string, RateLimit>();

  async checkLimit(userId: string): Promise<RateLimitResult> {
    const limit = this.limits.get(userId) || this.createLimit(userId);

    // Check limits
    if (limit.requestsThisMinute >= 60) {
      return {
        allowed: false,
        retryAfter: 60 - (Date.now() - limit.minuteStart) / 1000,
        reason: 'Per-minute limit exceeded'
      };
    }

    if (limit.requestsThisHour >= 1000) {
      return {
        allowed: false,
        retryAfter: 3600 - (Date.now() - limit.hourStart) / 1000,
        reason: 'Per-hour limit exceeded'
      };
    }

    // Update counters
    limit.requestsThisMinute++;
    limit.requestsThisHour++;

    return { allowed: true };
  }
}