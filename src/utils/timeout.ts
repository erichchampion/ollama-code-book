/**
 * Timeout Promise Utilities
 *
 * Centralized timeout management for promises to replace duplicated
 * timeout patterns throughout the application.
 */

import { managedSetTimeout, clearManagedTimer } from './timer-manager.js';

export interface TimeoutConfig {
  /** Timeout duration in milliseconds */
  timeoutMs: number;
  /** Custom timeout error message */
  message?: string;
  /** Custom error class to throw */
  errorClass?: new (message: string) => Error;
  /** Cleanup function to call on timeout */
  onTimeout?: () => void | Promise<void>;
}

export interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
  isResolved: () => boolean;
  isCancelled: () => boolean;
}

/**
 * Add timeout to any promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  config: TimeoutConfig | number
): Promise<T> {
  const timeoutConfig: TimeoutConfig = typeof config === 'number'
    ? { timeoutMs: config }
    : config;

  const {
    timeoutMs,
    message = `Operation timed out after ${timeoutMs}ms`,
    errorClass = Error,
    onTimeout
  } = timeoutConfig;

  return new Promise<T>((resolve, reject) => {
    let isResolved = false;

    // Create timeout
    const timerId = managedSetTimeout(async () => {
      if (!isResolved) {
        isResolved = true;

        // Call cleanup function if provided
        if (onTimeout) {
          try {
            await onTimeout();
          } catch (cleanupError) {
            console.warn('Timeout cleanup failed:', cleanupError);
          }
        }

        reject(new errorClass(message));
      }
    }, timeoutMs);

    // Handle original promise
    promise
      .then((result) => {
        if (!isResolved) {
          isResolved = true;
          clearManagedTimer(timerId);
          resolve(result);
        }
      })
      .catch((error) => {
        if (!isResolved) {
          isResolved = true;
          clearManagedTimer(timerId);
          reject(error);
        }
      });
  });
}

/**
 * Create a cancellable promise with timeout
 */
export function cancellablePromise<T>(
  executor: (
    resolve: (value: T) => void,
    reject: (error: Error) => void,
    signal: AbortSignal
  ) => void,
  config?: TimeoutConfig
): CancellablePromise<T> {
  const abortController = new AbortController();
  let isResolved = false;
  let isCancelled = false;

  const promise = new Promise<T>((resolve, reject) => {
    // Handle cancellation
    abortController.signal.addEventListener('abort', () => {
      if (!isResolved) {
        isResolved = true;
        isCancelled = true;
        reject(new Error('Operation was cancelled'));
      }
    });

    // Execute the original operation
    try {
      executor(
        (value) => {
          if (!isResolved && !abortController.signal.aborted) {
            isResolved = true;
            resolve(value);
          }
        },
        (error) => {
          if (!isResolved && !abortController.signal.aborted) {
            isResolved = true;
            reject(error);
          }
        },
        abortController.signal
      );
    } catch (error) {
      if (!isResolved && !abortController.signal.aborted) {
        isResolved = true;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  });

  // Add timeout if specified
  const timeoutPromise = config
    ? withTimeout(promise, {
        ...config,
        onTimeout: async () => {
          abortController.abort();
          if (config.onTimeout) {
            await config.onTimeout();
          }
        }
      })
    : promise;

  return {
    promise: timeoutPromise,
    cancel: () => {
      if (!isResolved) {
        abortController.abort();
      }
    },
    isResolved: () => isResolved,
    isCancelled: () => isCancelled
  };
}

/**
 * Promise with retry and timeout
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  timeoutMs: number,
  retryDelayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(operation(), {
        timeoutMs,
        message: `Attempt ${attempt}/${maxAttempts} timed out after ${timeoutMs}ms`
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${retryDelayMs}ms:`, error);
        await delay(retryDelayMs);
      }
    }
  }

  throw new Error(`All ${maxAttempts} attempts failed. Last error: ${lastError.message}`);
}

/**
 * Simple delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    managedSetTimeout(resolve, ms);
  });
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timerId: string | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timerId) {
      clearManagedTimer(timerId);
    }

    timerId = managedSetTimeout(() => {
      fn(...args);
      timerId = null;
    }, delayMs);
  };

  debouncedFn.cancel = () => {
    if (timerId) {
      clearManagedTimer(timerId);
      timerId = null;
    }
  };

  return debouncedFn as T & { cancel: () => void };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): T & { cancel: () => void } {
  let lastCall = 0;
  let timerId: string | null = null;

  const throttledFn = (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    } else if (!timerId) {
      const remainingTime = intervalMs - (now - lastCall);
      timerId = managedSetTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timerId = null;
      }, remainingTime);
    }
  };

  throttledFn.cancel = () => {
    if (timerId) {
      clearManagedTimer(timerId);
      timerId = null;
    }
  };

  return throttledFn as T & { cancel: () => void };
}

/**
 * Race multiple promises with timeout
 */
export function raceWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    managedSetTimeout(() => {
      reject(new Error(timeoutMessage || `Race timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([...promises, timeoutPromise]);
}

/**
 * All promises with timeout
 */
export function allWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T[]> {
  return withTimeout(
    Promise.all(promises),
    {
      timeoutMs,
      message: timeoutMessage || `Promise.all timed out after ${timeoutMs}ms`
    }
  );
}

/**
 * Promise pool with concurrency limit and timeout
 */
export async function promisePool<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5,
  itemTimeoutMs?: number
): Promise<R[]> {
  const results: R[] = [];
  const errors: Error[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];

      try {
        const operation = () => processor(item);
        const result = itemTimeoutMs
          ? await withTimeout(operation(), itemTimeoutMs)
          : await operation();

        results[currentIndex] = result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        console.error(`Error processing item ${currentIndex}:`, err);
      }
    }
  });

  await Promise.all(workers);

  if (errors.length > 0) {
    throw new Error(`${errors.length} errors occurred during processing: ${errors.map(e => e.message).join(', ')}`);
  }

  return results;
}

/**
 * Common timeout configurations
 */
export const TIMEOUT_CONFIGS = {
  /** Short operations (file I/O, local operations) */
  SHORT: { timeoutMs: 5000 },
  /** Medium operations (network requests, API calls) */
  MEDIUM: { timeoutMs: 30000 },
  /** Long operations (analysis, large file processing) */
  LONG: { timeoutMs: 120000 },
  /** Very long operations (compilation, heavy analysis) */
  VERY_LONG: { timeoutMs: 300000 }
} as const;