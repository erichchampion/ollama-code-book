/**
 * Backpressure controller
 */
export class BackpressureController {
  private bufferSize = 0;
  private maxBufferSize: number;
  private paused = false;
  private pauseCallback?: () => void;
  private resumeCallback?: () => void;

  constructor(maxBufferSize: number = 100) {
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Add item to buffer
   */
  async add(): Promise<void> {
    this.bufferSize++;

    // Check if we need to pause producer
    if (this.bufferSize >= this.maxBufferSize && !this.paused) {
      this.paused = true;
      if (this.pauseCallback) {
        this.pauseCallback();
      }

      // Wait until consumer catches up
      await this.waitForResume();
    }
  }

  /**
   * Remove item from buffer
   */
  remove(): void {
    this.bufferSize--;

    // Check if we can resume producer
    if (this.bufferSize < this.maxBufferSize / 2 && this.paused) {
      this.paused = false;
      if (this.resumeCallback) {
        this.resumeCallback();
      }
    }
  }

  /**
   * Set callbacks
   */
  onPause(callback: () => void): void {
    this.pauseCallback = callback;
  }

  onResume(callback: () => void): void {
    this.resumeCallback = callback;
  }

  /**
   * Wait for resume signal
   */
  private waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.paused) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
    });
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.bufferSize;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }
}