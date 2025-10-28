/**
 * Stream with cancellation support
 */
export class CancellableStreamProcessor extends BackpressureStreamProcessor {
  private cancellationToken: CancellationToken;

  constructor(
    producer: StreamProducer,
    options: BackpressureOptions = {}
  ) {
    super(producer, options);
    this.cancellationToken = new CancellationToken();

    // Register cancellation handler
    this.cancellationToken.onCancelled(() => {
      console.log('🛑 Stream cancelled by user');
      this.producer.cancel();
    });
  }

  /**
   * Start streaming with cancellation support
   */
  async start(): Promise<void> {
    try {
      await super.start();
    } catch (error: any) {
      if (error instanceof CancellationError) {
        // Handle graceful cancellation
        await this.handleCancellation(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Cancel the stream
   */
  async cancel(reason?: string): Promise<void> {
    this.cancellationToken.cancel(reason);
    await super.cancel();
  }

  /**
   * Check cancellation token periodically
   */
  protected async broadcast(event: AnyStreamEvent): Promise<void> {
    // Check if cancelled before processing
    this.cancellationToken.throwIfCancelled();

    await super.broadcast(event);
  }

  /**
   * Handle graceful cancellation
   */
  private async handleCancellation(error: CancellationError): Promise<void> {
    // Notify consumers of cancellation
    const cancellationEvent: ErrorEvent = {
      type: StreamEventType.ERROR,
      timestamp: new Date(),
      error: {
        message: error.message,
        code: 'CANCELLED',
        recoverable: false
      }
    };

    await this.broadcast(cancellationEvent);
  }

  /**
   * Get cancellation token (for external cancellation)
   */
  getCancellationToken(): CancellationToken {
    return this.cancellationToken;
  }
}