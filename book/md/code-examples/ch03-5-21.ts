export class Logger implements IDisposable {
  private fileHandle: FileHandle | null = null;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  async initialize(logFilePath: string): Promise<void> {
    // Open log file
    this.fileHandle = await fs.open(logFilePath, 'a');

    // Flush buffer periodically
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);
  }

  info(message: string): void {
    this.buffer.push(`[INFO] ${new Date().toISOString()} ${message}\n`);
  }

  error(message: string, error?: any): void {
    const errorMsg = error ? ` ${error.stack || error.message}` : '';
    this.buffer.push(`[ERROR] ${new Date().toISOString()} ${message}${errorMsg}\n`);
  }

  async flush(): Promise<void> {
    if (!this.fileHandle || this.buffer.length === 0) return;

    const content = this.buffer.join('');
    this.buffer = [];

    await this.fileHandle.write(content);
  }

  /**
   * Dispose: flush buffer, close file, clear interval
   */
  async dispose(): Promise<void> {
    // Stop flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    await this.flush();

    // Close file handle
    if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = null;
    }
  }
}