/**
 * Stream producer - generates events
 */
export interface StreamProducer {
  /**
   * Start producing events
   */
  start(): AsyncGenerator<AnyStreamEvent, void, unknown>;

  /**
   * Cancel the stream
   */
  cancel(): Promise<void>;

  /**
   * Check if stream is active
   */
  isActive(): boolean;
}

/**
 * Stream consumer - processes events
 */
export interface StreamConsumer {
  /**
   * Handle a stream event
   */
  onEvent(event: AnyStreamEvent): Promise<void> | void;

  /**
   * Stream completed successfully
   */
  onComplete?(metadata?: any): Promise<void> | void;

  /**
   * Stream failed with error
   */
  onError?(error: Error): Promise<void> | void;
}