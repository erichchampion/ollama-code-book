/**
 * Tracks and categorizes errors
 */
export class ErrorTracker {
  private errors: Map<string, ErrorEntry[]> = new Map();
  private logger: StructuredLogger;
  private alerting: AlertingService;

  constructor(
    logger: StructuredLogger,
    alerting: AlertingService
  ) {
    this.logger = logger;
    this.alerting = alerting;
  }

  /**
   * Track error
   */
  async trackError(
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    const entry: ErrorEntry = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: Date.now(),
      fingerprint: this.generateFingerprint(error, context)
    };

    // Store error
    if (!this.errors.has(entry.fingerprint)) {
      this.errors.set(entry.fingerprint, []);
    }

    this.errors.get(entry.fingerprint)!.push(entry);

    // Log error
    this.logger.error('Error tracked', error, {
      fingerprint: entry.fingerprint,
      operation: context.operation,
      requestId: context.requestId
    });

    // Check if alert needed
    await this.checkAlerts(entry.fingerprint);
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    // Group errors by name, message pattern, and operation
    const parts = [
      error.name,
      this.normalizeMessage(error.message),
      context.operation
    ];

    return crypto
      .createHash('sha256')
      .update(parts.join(':'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Normalize error message to group similar errors
   */
  private normalizeMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N')           // Numbers -> N
      .replace(/[a-f0-9-]{36}/g, 'UUID') // UUIDs -> UUID
      .replace(/"[^"]*"/g, 'STR');    // Strings -> STR
  }

  /**
   * Check if alerts should be sent
   */
  private async checkAlerts(fingerprint: string): Promise<void> {
    const errors = this.errors.get(fingerprint) || [];

    // Alert on first occurrence
    if (errors.length === 1) {
      await this.alerting.send({
        severity: AlertSeverity.INFO,
        title: 'New error type detected',
        message: `${errors[0].error.name}: ${errors[0].error.message}`,
        context: errors[0].context
      });
    }

    // Alert on spike (>10 in last 5 minutes)
    const recentErrors = errors.filter(
      e => Date.now() - e.timestamp < 5 * 60 * 1000
    );

    if (recentErrors.length >= 10) {
      await this.alerting.send({
        severity: AlertSeverity.WARNING,
        title: 'Error spike detected',
        message: `${recentErrors.length} occurrences in 5 minutes`,
        context: errors[0].context
      });
    }

    // Alert on sustained high rate (>50 in last hour)
    const lastHourErrors = errors.filter(
      e => Date.now() - e.timestamp < 60 * 60 * 1000
    );

    if (lastHourErrors.length >= 50) {
      await this.alerting.send({
        severity: AlertSeverity.CRITICAL,
        title: 'High error rate',
        message: `${lastHourErrors.length} occurrences in last hour`,
        context: errors[0].context
      });
    }
  }

  /**
   * Get error statistics
   */
  getStats(timeRange: TimeRange): ErrorStats {
    let totalErrors = 0;
    const errorsByType = new Map<string, number>();
    const errorsByOperation = new Map<string, number>();

    for (const [fingerprint, entries] of this.errors.entries()) {
      const filtered = entries.filter(
        e => e.timestamp >= timeRange.start.getTime() &&
             e.timestamp <= timeRange.end.getTime()
      );

      totalErrors += filtered.length;

      for (const entry of filtered) {
        // Count by type
        const type = entry.error.name;
        errorsByType.set(type, (errorsByType.get(type) || 0) + 1);

        // Count by operation
        const op = entry.context.operation;
        errorsByOperation.set(op, (errorsByOperation.get(op) || 0) + 1);
      }
    }

    return {
      totalErrors,
      uniqueErrors: this.errors.size,
      errorsByType: Object.fromEntries(errorsByType),
      errorsByOperation: Object.fromEntries(errorsByOperation)
    };
  }
}

interface ErrorEntry {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  timestamp: number;
  fingerprint: string;
}

interface ErrorContext {
  requestId?: string;
  userId?: string;
  operation: string;
  [key: string]: any;
}

interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  errorsByType: Record<string, number>;
  errorsByOperation: Record<string, number>;
}