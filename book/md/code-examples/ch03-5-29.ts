// Good: Idempotent disposal
async dispose(): Promise<void> {
  if (this.disposed) return;
  this.disposed = true;

  // Clean up resources
  if (this.interval) {
    clearInterval(this.interval);
    this.interval = null;
  }

  if (this.connection) {
    await this.connection.close();
    this.connection = null;
  }
}