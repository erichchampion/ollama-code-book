// Define a producer
class AIResponseProducer implements StreamProducer {
  private cancelled = false;

  async* start(): AsyncGenerator<AnyStreamEvent> {
    yield {
      type: StreamEventType.METADATA,
      timestamp: new Date(),
      metadata: { model: 'claude-3-5-sonnet', provider: 'anthropic' }
    };

    // Simulate streaming content
    const words = ['Hello', ' world', '!', ' How', ' can', ' I', ' help?'];
    for (const word of words) {
      if (this.cancelled) break;

      yield {
        type: StreamEventType.CONTENT,
        timestamp: new Date(),
        content: word,
        delta: word
      };

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    yield {
      type: StreamEventType.DONE,
      timestamp: new Date(),
      metadata: { tokensGenerated: 7, durationMs: 700 }
    };
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  isActive(): boolean {
    return !this.cancelled;
  }
}

// Define a consumer
class TerminalConsumer implements StreamConsumer {
  private buffer = '';

  onEvent(event: AnyStreamEvent): void {
    switch (event.type) {
      case StreamEventType.CONTENT:
        this.buffer += event.content;
        process.stdout.write(event.content);
        break;

      case StreamEventType.METADATA:
        console.log(`[Using ${event.metadata.model}]`);
        break;

      case StreamEventType.DONE:
        console.log(`\n[Done in ${event.metadata?.durationMs}ms]`);
        break;
    }
  }

  onComplete(): void {
    console.log('\nStream completed successfully');
  }

  onError(error: Error): void {
    console.error(`\nStream error: ${error.message}`);
  }
}

// Use the stream
const producer = new AIResponseProducer();
const processor = new StreamProcessor(producer);
processor.addConsumer(new TerminalConsumer());

await processor.start();

// Output:
// [Using claude-3-5-sonnet]
// Hello world! How can I help?
// [Done in 700ms]
// Stream completed successfully