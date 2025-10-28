/**
 * Shared Test Utilities
 * Common utility functions used across all test types
 */

/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 * @param condition Function that returns boolean or Promise<boolean> to check
 * @param timeout Maximum time to wait in milliseconds (default: 10000)
 * @param interval Polling interval in milliseconds (default: 100)
 * @returns Promise that resolves when condition is true
 * @throws Error if timeout is reached before condition becomes true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 10000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Retry an async operation with exponential backoff
 * @param operation Function to retry
 * @param maxAttempts Maximum number of attempts (default: 3)
 * @param baseDelay Base delay between retries in milliseconds (default: 1000)
 * @returns Promise that resolves with the operation result
 * @throws Error if all attempts fail
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Create a deferred promise that can be resolved or rejected externally
 * @returns Object with promise and resolve/reject functions
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Wait for multiple promises with timeout
 * @param promises Array of promises to wait for
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves with array of results
 * @throws Error if timeout is reached
 */
export async function waitForAll<T>(
  promises: Promise<T>[],
  timeout: number
): Promise<T[]> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
  });

  return Promise.race([
    Promise.all(promises),
    timeoutPromise
  ]);
}
