/**
 * Query structured logs
 */
export class LogQuery {
  constructor(private logsPath: string) {}

  /**
   * Query logs by criteria
   */
  async query(criteria: QueryCriteria): Promise<LogEntry[]> {
    const logs = await this.readLogs();

    return logs.filter(log => {
      // Filter by time range
      if (criteria.startTime && new Date(log.timestamp) < criteria.startTime) {
        return false;
      }

      if (criteria.endTime && new Date(log.timestamp) > criteria.endTime) {
        return false;
      }

      // Filter by level
      if (criteria.level && log.level !== criteria.level) {
        return false;
      }

      // Filter by service
      if (criteria.service && log.service !== criteria.service) {
        return false;
      }

      // Filter by request ID
      if (criteria.requestId && log.requestId !== criteria.requestId) {
        return false;
      }

      // Filter by user ID
      if (criteria.userId && log.userId !== criteria.userId) {
        return false;
      }

      // Filter by operation
      if (criteria.operation && log.operation !== criteria.operation) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get error rate
   */
  async getErrorRate(timeRange: TimeRange): Promise<number> {
    const logs = await this.query({
      startTime: timeRange.start,
      endTime: timeRange.end
    });

    const errors = logs.filter(log => log.level === 'error').length;
    const total = logs.length;

    return total > 0 ? errors / total : 0;
  }

  /**
   * Get average duration
   */
  async getAverageDuration(
    operation: string,
    timeRange: TimeRange
  ): Promise<number> {
    const logs = await this.query({
      operation,
      startTime: timeRange.start,
      endTime: timeRange.end
    });

    const durations = logs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);

    if (durations.length === 0) return 0;

    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Read logs from file
   */
  private async readLogs(): Promise<LogEntry[]> {
    const content = await fs.readFile(this.logsPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    return lines.map(line => JSON.parse(line));
  }
}

interface QueryCriteria {
  startTime?: Date;
  endTime?: Date;
  level?: string;
  service?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
}

interface TimeRange {
  start: Date;
  end: Date;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}