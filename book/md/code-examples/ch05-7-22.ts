// Create cancellable stream
const producer = new ProgressStreamProducer(async () => {
  // Long operation
});

const processor = new CancellableStreamProcessor(producer);
const cancellationToken = processor.getCancellationToken();

// Enable Ctrl+C cancellation
const keyboard = new KeyboardCancellation(cancellationToken);
keyboard.enable();

// Start streaming
try {
  await processor.start();
} catch (error) {
  if (error instanceof CancellationError) {
    console.log('✓ Operation cancelled gracefully');
  } else {
    throw error;
  }
} finally {
  keyboard.disable();
}