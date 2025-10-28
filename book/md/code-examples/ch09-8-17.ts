import fs from 'fs/promises';

/**
 * Stores audit events for compliance
 */
export class AuditStorage {
  private logPath: string;
  private rotateSize: number; // bytes
  private maxFiles: number;

  constructor(
    logPath: string,
    rotateSize: number = 10 * 1024 * 1024, // 10 MB
    maxFiles: number = 10
  ) {
    this.logPath = logPath;
    this.rotateSize = rotateSize;
    this.maxFiles = maxFiles;
  }

  /**
   * Store audit event
   */
  async store(event: AuditEvent): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.logPath);
    await fs.mkdir(dir, { recursive: true });

    // Append to log file
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(this.logPath, line);

    // Check if rotation needed
    await this.rotateIfNeeded();
  }

  /**
   * Query audit events
   */
  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    const events: AuditEvent[] = [];

    // Read all log files
    const files = await this.getLogFiles();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          if (this.matchesFilter(event, filter)) {
            events.push(event);
          }
        } catch (error) {
          // Skip invalid lines
        }
      }
    }

    return events;
  }

  /**
   * Rotate log file if needed
   */
  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.logPath);

      if (stats.size >= this.rotateSize) {
        await this.rotate();
      }
    } catch (error) {
      // File doesn't exist yet
    }
  }

  /**
   * Rotate log files
   */
  private async rotate(): Promise<void> {
    // Move existing files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldPath = `${this.logPath}.${i}`;
      const newPath = `${this.logPath}.${i + 1}`;

      try {
        await fs.rename(oldPath, newPath);
      } catch (error) {
        // File doesn't exist
      }
    }

    // Move current file to .1
    await fs.rename(this.logPath, `${this.logPath}.1`);

    // Delete oldest file if needed
    const oldestPath = `${this.logPath}.${this.maxFiles + 1}`;
    try {
      await fs.unlink(oldestPath);
    } catch (error) {
      // File doesn't exist
    }
  }

  /**
   * Get all log files
   */
  private async getLogFiles(): Promise<string[]> {
    const files = [this.logPath];

    for (let i = 1; i <= this.maxFiles; i++) {
      const path = `${this.logPath}.${i}`;

      try {
        await fs.access(path);
        files.push(path);
      } catch (error) {
        // File doesn't exist
        break;
      }
    }

    return files;
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: AuditEvent, filter: AuditFilter): boolean {
    if (filter.type && event.type !== filter.type) {
      return false;
    }

    if (filter.operation && event.operation !== filter.operation) {
      return false;
    }

    if (filter.user && event.user !== filter.user) {
      return false;
    }

    if (filter.startTime && event.timestamp < filter.startTime) {
      return false;
    }

    if (filter.endTime && event.timestamp > filter.endTime) {
      return false;
    }

    return true;
  }
}

export interface AuditFilter {
  type?: string;
  operation?: string;
  user?: string;
  startTime?: Date;
  endTime?: Date;
}