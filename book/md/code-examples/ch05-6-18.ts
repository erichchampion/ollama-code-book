// Progress consumer
class ProgressConsumer implements StreamConsumer {
  private progressBar = new ProgressBar(40);

  onEvent(event: AnyStreamEvent): void {
    if (event.type === StreamEventType.TOOL_PROGRESS) {
      this.progressBar.render({
        current: event.progress,
        total: 100,
        percentage: event.progress,
        message: event.message || '',
        elapsed: 0
      });
    } else if (event.type === StreamEventType.DONE) {
      this.progressBar.complete('✓ Done!');
    }
  }
}

// Use it
const producer = new ProgressStreamProducer(async () => {
  // Your long operation
});

const processor = new StreamProcessor(producer);
processor.addConsumer(new ProgressConsumer());

await processor.start();

// Output (animated):
// [████████████████████░░░░░░░░░░░░░░░░░░░░] 50.0% Processing 50%... ~3s remaining
// [████████████████████████████████████████] 100.0% ✓ Done!