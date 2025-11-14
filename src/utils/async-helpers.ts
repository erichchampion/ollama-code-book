/**
 * Async Helper Utilities
 *
 * Consolidated async operation helpers including retry logic with exponential backoff
 */

import { getErrorMessage } from './error-utils.js';

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Optional function to determine if error should be retried */
  shouldRetry?: (error: unknown) => boolean;
  /** Optional timeout for each attempt in milliseconds */
  timeoutMs?: number;
}

/**
 * Execute an async operation with retry and exponential backoff
 *
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws The last error if all attempts fail
 *
 * @example
 * ```typescript
 * // Simple usage with defaults
 * const result = await withRetry(() => fetchData());
 *
 * // With configuration
 * const result = await withRetry(() => fetchData(), {
 *   maxAttempts: 5,
 *   baseDelayMs: 500,
 *   shouldRetry: (error) => error instanceof NetworkError
 * });
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    shouldRetry,
    timeoutMs
  } = options;

  let lastError: unknown;
  let delay = baseDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // If timeout is specified, race the operation against the timeout
      if (timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
        });
        return await Promise.race([operation(), timeoutPromise]);
      }

      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error should be retried
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Log retry attempt (in production, this would use a proper logger)
      if (typeof console !== 'undefined') {
        console.warn(
          `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
          getErrorMessage(error)
        );
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

/**
 * Legacy function for backward compatibility
 * Wraps withRetry with a simpler parameter signature
 *
 * @param operation - The async function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Initial delay in milliseconds (default: 1000)
 * @returns Promise resolving to the operation result
 * @throws The last error if all attempts fail
 *
 * @deprecated Use withRetry instead for more control
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: maxRetries,
    baseDelayMs: baseDelay,
    maxDelayMs: baseDelay * Math.pow(2, maxRetries),
    backoffMultiplier: 2
  });
}
