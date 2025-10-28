/**
 * Basic stream implementation
 */
export class StreamProcessor {
  private producer: StreamProducer;
  private consumers: StreamConsumer[] = [];
  private active = false;
  private abortController: AbortController;

  constructor(producer: StreamProducer) {
    this.producer = producer;
    this.abortController = new AbortController();
  }

  /**
   * Add a consumer
   */
  addConsumer(consumer: StreamConsumer): void {
    this.consumers.push(consumer);
  }

  /**
   * Start streaming
   */
  async start(): Promise<void> {
    if (this.active) {
      throw new Error('Stream already active');
    }

    this.active = true;

    try {
      // Get event stream from producer
      const stream = this.producer.start();

      // Process events
      for await (const event of stream) {
        // Check if cancelled
        if (this.abortController.signal.aborted) {
          break;
        }

        // Send to all consumers
        await this.broadcast(event);

        // Handle stream completion
        if (event.type === StreamEventType.DONE) {
          await this.complete(event.metadata);
          break;
        }

        // Handle stream error
        if (event.type === StreamEventType.ERROR) {
          throw new Error(event.error.message);
        }
      }
    } catch (error: any) {
      await this.handleError(error);
    } finally {
      this.active = false;
    }
  }

  /**
   * Cancel the stream
   */
  async cancel(): Promise<void> {
    this.abortController.abort();
    await this.producer.cancel();
    this.active = false;
  }

  /**
   * Broadcast event to all consumers
   */
  private async broadcast(event: AnyStreamEvent): Promise<void> {
    const promises = this.consumers.map(consumer =>
      consumer.onEvent(event)
    );
    await Promise.all(promises);
  }

  /**
   * Handle stream completion
   */
  private async complete(metadata?: any): Promise<void> {
    const promises = this.consumers
      .filter(c => c.onComplete)
      .map(c => c.onComplete!(metadata));

    await Promise.all(promises);
  }

  /**
   * Handle stream error
   */
  private async handleError(error: Error): Promise<void> {
    const promises = this.consumers
      .filter(c => c.onError)
      .map(c => c.onError!(error));

    await Promise.all(promises);
  }

  /**
   * Check if stream is active
   */
  isActive(): boolean {
    return this.active;
  }
}