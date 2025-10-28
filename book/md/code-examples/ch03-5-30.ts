// Good: Error handling in disposal
async dispose(): Promise<void> {
  const errors: Error[] = [];

  try {
    await this.flushLogs();
  } catch (error) {
    errors.push(error as Error);
  }

  try {
    await this.closeConnections();
  } catch (error) {
    errors.push(error as Error);
  }

  // Continue cleanup even if some steps fail
  this.cleanup();

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Disposal encountered errors');
  }
}