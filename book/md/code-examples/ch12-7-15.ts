/**
 * Database health check
 */
export class DatabaseHealthCheck implements HealthCheck {
  constructor(private db: any) {}

  async check(): Promise<boolean> {
    try {
      await this.db.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * AI provider health check
 */
export class AIProviderHealthCheck implements HealthCheck {
  constructor(private provider: AIProvider) {}

  async check(): Promise<boolean> {
    try {
      const health = await this.provider.healthCheck();
      return health.healthy;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Disk space health check
 */
export class DiskSpaceHealthCheck implements HealthCheck {
  constructor(private minFreeGB: number = 1) {}

  async check(): Promise<boolean> {
    const { available } = await import('fs').promises.statfs('/');
    const freeGB = available / 1024 / 1024 / 1024;

    return freeGB >= this.minFreeGB;
  }
}

/**
 * Memory health check
 */
export class MemoryHealthCheck implements HealthCheck {
  constructor(private maxUsagePercent: number = 80) {}

  async check(): Promise<boolean> {
    const usage = process.memoryUsage();
    const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    return usagePercent < this.maxUsagePercent;
  }
}