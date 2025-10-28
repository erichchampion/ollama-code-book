/**
 * Enhanced stream processor with backpressure
 */
export class BackpressureStreamProcessor extends StreamProcessor {
  private backpressure: BackpressureController;
  private buffer: StreamBuffer;

  constructor(
    producer: StreamProducer,
    options: BackpressureOptions = {}
  ) {
    super(producer);
    this.backpressure = new BackpressureController(options.maxBufferSize);
    this.buffer = new StreamBuffer(options.bufferStrategy, options.buffer);

    // Setup backpressure callbacks
    this.backpressure.onPause(() => {
      console.warn('⚠️  Backpressure: pausing producer (buffer full)');
    });

    this.backpressure.onResume(() => {
      console.log('✓ Backpressure: resuming producer');
    });
  }

  /**
   * Broadcast event with backpressure control
   */
  protected async broadcast(event: AnyStreamEvent): Promise<void> {
    // Add to backpressure controller
    await this.backpressure.add();

    try {
      // Buffer content events
      if (event.type === StreamEventType.CONTENT) {
        this.buffer.add(event.content);
      }

      // Send to consumers
      await super.broadcast(event);
    } finally {
      // Remove from backpressure controller
      this.backpressure.remove();
    }
  }

  /**
   * Get buffered content
   */
  getBuffered(): string {
    return this.buffer.get();
  }

  /**
   * Get backpressure stats
   */
  getStats(): BackpressureStats {
    return {
      bufferSize: this.backpressure.getBufferSize(),
      isPaused: this.backpressure.isPaused(),
      bytesBuffered: this.buffer.bytes(),
      chunksBuffered: this.buffer.size()
    };
  }
}

interface BackpressureOptions {
  maxBufferSize?: number;
  bufferStrategy?: BufferStrategy;
  buffer?: BufferOptions;
}

interface BackpressureStats {
  bufferSize: number;
  isPaused: boolean;
  bytesBuffered: number;
  chunksBuffered: number;
}