/**
 * Cancellation token for aborting operations
 */
export class CancellationToken {
  private _cancelled = false;
  private callbacks: Array<() => void> = [];
  private reason?: string;

  /**
   * Check if cancelled
   */
  get isCancelled(): boolean {
    return this._cancelled;
  }

  /**
   * Cancel the operation
   */
  cancel(reason?: string): void {
    if (this._cancelled) return;

    this._cancelled = true;
    this.reason = reason;

    // Notify all callbacks
    for (const callback of this.callbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in cancellation callback:', error);
      }
    }

    this.callbacks = [];
  }

  /**
   * Register callback for cancellation
   */
  onCancelled(callback: () => void): void {
    if (this._cancelled) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  /**
   * Throw if cancelled
   */
  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new CancellationError(this.reason || 'Operation cancelled');
    }
  }

  /**
   * Get cancellation reason
   */
  getReason(): string | undefined {
    return this.reason;
  }
}

/**
 * Cancellation error
 */
export class CancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancellationError';
  }
}