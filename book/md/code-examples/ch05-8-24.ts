/**
 * Stream processor with error recovery
 */
export class ResilientStreamProcessor extends CancellableStreamProcessor {
  private errorHandler: ErrorRecoveryHandler;
  private partialResults: any[] = [];

  constructor(
    producer: StreamProducer,
    options: ResilientStreamOptions = {}
  ) {
    super(producer, options);
    this.errorHandler = new ErrorRecoveryHandler(
      options.recoveryStrategy,
      options.recovery
    );
  }

  /**
   * Start streaming with error recovery
   */
  async start(): Promise<void> {
    try {
      await super.start();
    } catch (error: any) {
      // Attempt recovery
      const result = await this.errorHandler.handle(
        error,
        {
          eventType: StreamEventType.ERROR,
          partialResults: this.partialResults
        },
        async () => {
          // Retry by restarting stream
          await super.start();
        }
      );

      if (!result.recovered) {
        throw result.error || error;
      }

      // Recovery successful
      if (result.fallbackUsed && result.data) {
        // Emit fallback data
        await this.broadcast({
          type: StreamEventType.CONTENT,
          timestamp: new Date(),
          content: JSON.stringify(result.data)
        });
      }
    }
  }

  /**
   * Broadcast event and collect partial results
   */
  protected async broadcast(event: AnyStreamEvent): Promise<void> {
    // Collect partial results for error recovery
    if (event.type === StreamEventType.CONTENT) {
      this.partialResults.push(event.content);
    } else if (event.type === StreamEventType.TOOL_COMPLETE) {
      this.partialResults.push(event.result);
    }

    try {
      await super.broadcast(event);
    } catch (error: any) {
      // Handle consumer errors gracefully
      console.error(`Error in consumer: ${error.message}`);
      // Continue processing other events
    }
  }

  /**
   * Get partial results
   */
  getPartialResults(): any[] {
    return this.partialResults;
  }
}

interface ResilientStreamOptions extends BackpressureOptions {
  recoveryStrategy?: RecoveryStrategy;
  recovery?: RecoveryOptions;
}