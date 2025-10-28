/**
 * Async Mutex for Thread-Safe Operations
 *
 * Provides mutual exclusion for async operations to prevent race conditions
 * in scenarios where multiple async operations might access shared resources.
 */

export class AsyncMutex {
  private promise = Promise.resolve();

  /**
   * Acquire the mutex and execute the provided function
   */
  async lock<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Acquire the mutex
   */
  private async acquire(): Promise<() => void> {
    let release: (() => void) | undefined;
    const acquiredPromise = new Promise<void>(resolve => {
      release = resolve;
    });

    const currentPromise = this.promise;
    this.promise = this.promise.then(() => acquiredPromise);

    await currentPromise;

    // Ensure release function is defined before returning
    if (!release) {
      throw new Error('Mutex release function not properly initialized');
    }

    return release;
  }
}

/**
 * Simple semaphore for limiting concurrent operations
 */
export class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * Acquire a permit
   */
  async acquire(): Promise<() => void> {
    return new Promise<() => void>(resolve => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  /**
   * Release a permit
   */
  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }

  /**
   * Execute function with semaphore
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}