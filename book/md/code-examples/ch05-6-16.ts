/**
 * Emit progress events during streaming
 */
export class ProgressStreamProducer implements StreamProducer {
  private cancelled = false;
  private tracker: ProgressTracker;

  constructor(private operation: () => Promise<void>) {
    this.tracker = new ProgressTracker(100, [
      { name: 'Initializing', weight: 10 },
      { name: 'Processing', weight: 70 },
      { name: 'Finalizing', weight: 20 }
    ]);
  }

  async* start(): AsyncGenerator<AnyStreamEvent> {
    try {
      // Stage 1: Initialize
      yield this.createProgressEvent(this.tracker.update(0, 'Initializing...'));
      await this.sleep(500);

      // Stage 2: Process
      yield this.createProgressEvent(this.tracker.nextStage());

      for (let i = 10; i <= 80; i += 10) {
        if (this.cancelled) break;

        yield this.createProgressEvent(
          this.tracker.update(i, `Processing ${i}%...`)
        );

        await this.sleep(200);
      }

      // Stage 3: Finalize
      yield this.createProgressEvent(this.tracker.nextStage());
      await this.sleep(300);

      // Complete
      yield this.createProgressEvent(
        this.tracker.complete('Operation complete')
      );

      yield {
        type: StreamEventType.DONE,
        timestamp: new Date(),
        metadata: { durationMs: this.tracker.getProgress().elapsed }
      };
    } catch (error: any) {
      yield {
        type: StreamEventType.ERROR,
        timestamp: new Date(),
        error: {
          message: error.message,
          recoverable: false
        }
      };
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  isActive(): boolean {
    return !this.cancelled;
  }

  private createProgressEvent(update: ProgressUpdate): ToolProgressEvent {
    return {
      type: StreamEventType.TOOL_PROGRESS,
      timestamp: new Date(),
      toolId: 'operation',
      progress: update.percentage,
      message: update.message
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}