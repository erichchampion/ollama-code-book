/**
 * Reusable Error Handling Utilities
 *
 * Centralized error handling patterns to reduce duplication and improve
 * consistency across the application.
 */

import { createUserError } from '../errors/formatter.js';
import { ErrorCategory, ErrorLevel } from '../errors/types.js';

export interface ErrorContext {
  operation: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: unknown) => boolean;
}

/**
 * Safe async operation wrapper with fallback value
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in ${context.operation}:`, error);

    // Create structured error for tracking
    const structuredError = createUserError(
      `Failed to ${context.operation}`,
      { category: ErrorCategory.APPLICATION }
    );

    // Log structured error
    console.error('Structured error:', structuredError);

    return fallback;
  }
}

/**
 * Safe sync operation wrapper with fallback value
 */
export function safeSync<T>(
  operation: () => T,
  fallback: T,
  context: ErrorContext
): T {
  try {
    return operation();
  } catch (error) {
    console.error(`Error in ${context.operation}:`, error);

    const structuredError = createUserError(
      `Failed to ${context.operation}`,
      { category: ErrorCategory.APPLICATION }
    );

    console.error('Structured error:', structuredError);

    return fallback;
  }
}

/**
 * Async operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  context: ErrorContext
): Promise<T> {
  let lastError: unknown;
  let delay = config.baseDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (config.retryableErrors && !config.retryableErrors(error)) {
        break;
      }

      // Don't delay on the last attempt
      if (attempt < config.maxAttempts) {
        console.warn(
          `Attempt ${attempt}/${config.maxAttempts} failed for ${context.operation}, retrying in ${delay}ms:`,
          error
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  // All attempts failed
  const finalError = createUserError(
    `Failed to ${context.operation} after ${config.maxAttempts} attempts`,
    { category: ErrorCategory.APPLICATION }
  );

  throw finalError;
}

/**
 * Graceful degradation wrapper
 */
export async function withGracefulDegradation<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  context: ErrorContext
): Promise<T | F> {
  try {
    return await primaryOperation();
  } catch (error) {
    console.warn(`Primary operation failed for ${context.operation}, falling back:`, error);

    try {
      return await fallbackOperation();
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${context.operation}:`, fallbackError);

      const combinedError = createUserError(
        `Both primary and fallback operations failed for ${context.operation}`,
        { category: ErrorCategory.APPLICATION }
      );

      throw combinedError;
    }
  }
}

/**
 * Resource cleanup wrapper
 */
export async function withCleanup<T>(
  operation: () => Promise<T>,
  cleanup: () => Promise<void> | void,
  context: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in ${context.operation}, attempting cleanup:`, error);
    throw error;
  } finally {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(`Cleanup failed for ${context.operation}:`, cleanupError);
      // Don't throw cleanup errors
    }
  }
}

/**
 * Error boundary for critical operations
 */
export async function criticalOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  onError?: (error: unknown) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const criticalError = createUserError(
      `Critical operation failed: ${context.operation}`,
      { category: ErrorCategory.SYSTEM, level: ErrorLevel.CRITICAL }
    );

    console.error('CRITICAL ERROR:', criticalError);

    if (onError) {
      try {
        onError(error);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    throw criticalError;
  }
}

/**
 * Validation error helper
 */
export function createValidationError(
  field: string,
  value: unknown,
  expectedType?: string
): Error {
  return createUserError(
    `Validation failed for field: ${field}`,
    { category: ErrorCategory.CONFIGURATION, level: ErrorLevel.WARNING }
  );
}

/**
 * Network error helper
 */
export function createNetworkError(
  operation: string,
  originalError: unknown,
  url?: string
): Error {
  return createUserError(
    `Network operation failed: ${operation}`,
    { category: ErrorCategory.NETWORK, level: ErrorLevel.ERROR }
  );
}

/**
 * File operation error helper
 */
export function createFileError(
  operation: string,
  filePath: string,
  originalError: unknown
): Error {
  return createUserError(
    `File operation failed: ${operation}`,
    { category: ErrorCategory.FILE_SYSTEM, level: ErrorLevel.ERROR }
  );
}

/**
 * Default retry configurations
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2
};

export const NETWORK_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 3000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    if (error instanceof Error) {
      // Retry on network timeouts and temporary failures
      return error.message.includes('timeout') ||
             error.message.includes('ECONNRESET') ||
             error.message.includes('ENOTFOUND') ||
             error.message.includes('503') ||
             error.message.includes('502');
    }
    return false;
  }
};

export const FILE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelayMs: 100,
  maxDelayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    if (error instanceof Error) {
      // Retry on temporary file system issues
      return error.message.includes('EBUSY') ||
             error.message.includes('EMFILE') ||
             error.message.includes('ENFILE');
    }
    return false;
  }
};