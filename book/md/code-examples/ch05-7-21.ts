/**
 * Enable Ctrl+C cancellation
 */
export class KeyboardCancellation {
  private cancellationToken: CancellationToken;
  private listener?: NodeJS.SignalsListener;

  constructor(cancellationToken: CancellationToken) {
    this.cancellationToken = cancellationToken;
  }

  /**
   * Enable keyboard cancellation
   */
  enable(): void {
    this.listener = () => {
      console.log('\n\n🛑 Cancelling operation (Ctrl+C pressed)...');
      this.cancellationToken.cancel('User pressed Ctrl+C');

      // Remove listener to allow force quit on second Ctrl+C
      if (this.listener) {
        process.off('SIGINT', this.listener);
      }

      // Set timeout to force quit if graceful shutdown fails
      setTimeout(() => {
        console.error('❌ Force quitting (graceful shutdown timed out)');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', this.listener);
  }

  /**
   * Disable keyboard cancellation
   */
  disable(): void {
    if (this.listener) {
      process.off('SIGINT', this.listener);
      this.listener = undefined;
    }
  }
}