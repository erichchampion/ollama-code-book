/**
 * Health check system
 */
export class HealthCheckSystem {
  private checks: Map<string, HealthCheck> = new Map();
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * Register health check
   */
  register(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<HealthReport> {
    const results: Record<string, HealthCheckResult> = {};

    for (const [name, check] of this.checks.entries()) {
      try {
        const startTime = performance.now();

        const result = await Promise.race([
          check.check(),
          this.timeout(5000) // 5 second timeout
        ]);

        const duration = performance.now() - startTime;

        results[name] = {
          status: result ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          duration,
          message: result ? 'OK' : 'Failed'
        };

      } catch (error) {
        results[name] = {
          status: HealthStatus.UNHEALTHY,
          duration: 0,
          message: (error as Error).message
        };
      }
    }

    const overallStatus = Object.values(results).every(
      r => r.status === HealthStatus.HEALTHY
    ) ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY;

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), ms)
    );
  }
}

interface HealthCheck {
  check(): Promise<boolean>;
}

interface HealthCheckResult {
  status: HealthStatus;
  duration: number;
  message: string;
}

enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded'
}

interface HealthReport {
  status: HealthStatus;
  checks: Record<string, HealthCheckResult>;
  timestamp: string;
}