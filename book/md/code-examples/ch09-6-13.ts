/**
 * Manages budget limits for AI API calls
 */
export class BudgetManager {
  private usage: UsageTracker;
  private logger: Logger;

  constructor(
    private limits: BudgetLimits,
    logger: Logger
  ) {
    this.usage = new UsageTracker();
    this.logger = logger;
  }

  /**
   * Check if request is within budget
   */
  async checkBudget(estimatedCost: number): Promise<BudgetCheckResult> {
    const current = this.usage.getCurrentUsage();

    // Check hourly limit
    if (this.limits.hourlyLimit) {
      const hourlyUsage = this.usage.getUsageInWindow(3600000); // 1 hour

      if (hourlyUsage.cost + estimatedCost > this.limits.hourlyLimit) {
        return {
          allowed: false,
          reason: 'Hourly budget limit exceeded',
          current: hourlyUsage.cost,
          limit: this.limits.hourlyLimit
        };
      }
    }

    // Check daily limit
    if (this.limits.dailyLimit) {
      const dailyUsage = this.usage.getUsageInWindow(86400000); // 24 hours

      if (dailyUsage.cost + estimatedCost > this.limits.dailyLimit) {
        return {
          allowed: false,
          reason: 'Daily budget limit exceeded',
          current: dailyUsage.cost,
          limit: this.limits.dailyLimit
        };
      }
    }

    // Check monthly limit
    if (this.limits.monthlyLimit) {
      const monthlyUsage = this.usage.getUsageInWindow(2592000000); // 30 days

      if (monthlyUsage.cost + estimatedCost > this.limits.monthlyLimit) {
        return {
          allowed: false,
          reason: 'Monthly budget limit exceeded',
          current: monthlyUsage.cost,
          limit: this.limits.monthlyLimit
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record usage
   */
  async recordUsage(cost: number, tokens: number, provider: string): Promise<void> {
    this.usage.record({
      timestamp: Date.now(),
      cost,
      tokens,
      provider
    });

    this.logger.info('API usage recorded:', { cost, tokens, provider });
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): UsageStats {
    return {
      hourly: this.usage.getUsageInWindow(3600000),
      daily: this.usage.getUsageInWindow(86400000),
      monthly: this.usage.getUsageInWindow(2592000000),
      total: this.usage.getCurrentUsage()
    };
  }
}

export interface BudgetLimits {
  hourlyLimit?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

export interface UsageStats {
  hourly: { cost: number; tokens: number };
  daily: { cost: number; tokens: number };
  monthly: { cost: number; tokens: number };
  total: { cost: number; tokens: number };
}

/**
 * Tracks API usage over time
 */
class UsageTracker {
  private records: UsageRecord[] = [];

  record(record: UsageRecord): void {
    this.records.push(record);

    // Clean old records (older than 30 days)
    const cutoff = Date.now() - 2592000000;
    this.records = this.records.filter(r => r.timestamp > cutoff);
  }

  getUsageInWindow(windowMs: number): { cost: number; tokens: number } {
    const cutoff = Date.now() - windowMs;

    const filtered = this.records.filter(r => r.timestamp > cutoff);

    return {
      cost: filtered.reduce((sum, r) => sum + r.cost, 0),
      tokens: filtered.reduce((sum, r) => sum + r.tokens, 0)
    };
  }

  getCurrentUsage(): { cost: number; tokens: number } {
    return {
      cost: this.records.reduce((sum, r) => sum + r.cost, 0),
      tokens: this.records.reduce((sum, r) => sum + r.tokens, 0)
    };
  }
}

interface UsageRecord {
  timestamp: number;
  cost: number;
  tokens: number;
  provider: string;
}