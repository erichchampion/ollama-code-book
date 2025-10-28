/**
 * Error Utilities
 *
 * Shared error handling utilities to eliminate duplicate error handling patterns
 * and provide consistent error formatting across the extension.
 */

import { ERROR_MESSAGES } from '../config/serviceConstants';

/**
 * Format any error type into a user-friendly string message
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

/**
 * Create a standardized error object with context
 */
export function createError(message: string, context?: Record<string, unknown>): Error {
  const error = new Error(message);

  if (context) {
    (error as any).context = context;
  }

  return error;
}

/**
 * Wrap async functions with standardized error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorMessage?: string
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const formattedError = errorMessage || formatError(error);
      console.error(`Error in ${fn.name || 'anonymous function'}:`, formattedError);
      return null;
    }
  };
}

/**
 * Handle promise rejections with optional fallback value
 */
export async function safePromise<T>(
  promise: Promise<T>,
  fallback?: T
): Promise<T | typeof fallback> {
  try {
    return await promise;
  } catch (error) {
    console.error('Promise rejected:', formatError(error));
    return fallback as T | typeof fallback;
  }
}

/**
 * Validate required parameters and throw descriptive errors
 */
export function validateRequired<T>(
  value: T | null | undefined,
  paramName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw createError(`Required parameter '${paramName}' is missing`);
  }
}

/**
 * Create timeout error with context
 */
export function createTimeoutError(operation: string, timeout: number): Error {
  return createError(ERROR_MESSAGES.TIMEOUT_EXCEEDED, {
    operation,
    timeout,
  });
}

/**
 * Handle VS Code API errors with user-friendly messages
 */
export function handleVSCodeError(error: unknown, operation: string): string {
  const errorMessage = formatError(error);

  // Common VS Code error patterns
  if (errorMessage.includes('ENOENT')) {
    return `File not found during ${operation}`;
  }

  if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
    return `Permission denied during ${operation}`;
  }

  if (errorMessage.includes('ETIMEDOUT')) {
    return `Timeout during ${operation}`;
  }

  if (errorMessage.includes('cancelled')) {
    return `${operation} was cancelled`;
  }

  return `Error during ${operation}: ${errorMessage}`;
}