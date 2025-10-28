/**
 * Standardized Error Handling for Interactive Components
 *
 * Provides consistent error normalization, logging, and context management
 * across all interactive mode components.
 */

import { logger } from '../utils/logger.js';
import { normalizeError, getErrorMessage } from '../utils/error-utils.js';

// Re-export for backward compatibility
export { normalizeError, getErrorMessage };

/**
 * Standard error context information
 */
export interface ErrorContext {
  component: string;
  operation: string;
  metadata?: Record<string, any>;
}

/**
 * Standard error types for interactive components
 */
export class ComponentError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(message: string, context: ErrorContext, originalError?: unknown) {
    super(message);
    this.name = 'ComponentError';
    this.context = context;
    this.timestamp = new Date();

    if (originalError instanceof Error) {
      this.originalError = originalError;
      this.stack = originalError.stack;
    } else if (originalError) {
      this.originalError = new Error(String(originalError));
    }
  }

  /**
   * Get a formatted error message with context
   */
  getFormattedMessage(): string {
    const contextStr = `[${this.context.component}:${this.context.operation}]`;
    return `${contextStr} ${this.message}`;
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics(): string {
    let diagnostics = `Component Error Diagnostics:
  Component: ${this.context.component}
  Operation: ${this.context.operation}
  Message: ${this.message}
  Timestamp: ${this.timestamp.toISOString()}`;

    if (this.context.metadata) {
      diagnostics += `\n  Metadata: ${JSON.stringify(this.context.metadata, null, 2)}`;
    }

    if (this.originalError) {
      diagnostics += `\n  Original Error: ${this.originalError.message}`;
      if (this.originalError.stack) {
        diagnostics += `\n  Stack: ${this.originalError.stack}`;
      }
    }

    return diagnostics;
  }
}

/**
 * Enhanced error handler for interactive components
 */
export class InteractiveErrorHandler {
  /**
   * Handle error with standardized logging and context
   */
  static handleError(
    error: unknown,
    context: ErrorContext,
    options: {
      logLevel?: 'error' | 'warn' | 'debug';
      includeStack?: boolean;
      rethrow?: boolean;
    } = {}
  ): ComponentError {
    const {
      logLevel = 'error',
      includeStack = false,
      rethrow = true
    } = options;

    const normalizedError = normalizeError(error);
    const componentError = new ComponentError(
      normalizedError.message,
      context,
      error
    );

    // Log with appropriate level
    const logMessage = componentError.getFormattedMessage();
    switch (logLevel) {
      case 'error':
        logger.error(logMessage, includeStack ? { stack: normalizedError.stack } : undefined);
        break;
      case 'warn':
        logger.warn(logMessage);
        break;
      case 'debug':
        logger.debug(logMessage);
        break;
    }

    // Log diagnostics at debug level
    logger.debug(componentError.getDiagnostics());

    if (rethrow) {
      throw componentError;
    }

    return componentError;
  }

  /**
   * Wrap an async operation with standardized error handling
   */
  static async wrapOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      logLevel?: 'error' | 'warn' | 'debug';
      fallback?: () => T | Promise<T>;
      retries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T> {
    const {
      logLevel = 'error',
      fallback,
      retries = 0,
      retryDelay = 1000
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < retries) {
          logger.debug(`Operation ${context.operation} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${retryDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // Final attempt failed
        if (fallback) {
          logger.warn(`Operation ${context.operation} failed, using fallback`);
          try {
            return await fallback();
          } catch (fallbackError) {
            // Log both original and fallback errors
            this.handleError(error, context, { logLevel, rethrow: false });
            this.handleError(fallbackError, { ...context, operation: `${context.operation}:fallback` }, { logLevel, rethrow: false });
            throw normalizeError(fallbackError);
          }
        }

        // No fallback, handle and rethrow
        this.handleError(error, context, { logLevel, rethrow: true });
      }
    }

    // This should never be reached due to the throw above, but TypeScript needs it
    throw normalizeError(lastError);
  }

  /**
   * Create a timeout error with context
   */
  static createTimeoutError(operation: string, timeoutMs: number, context: ErrorContext): ComponentError {
    return new ComponentError(
      `Operation timed out after ${timeoutMs}ms`,
      { ...context, operation: `${operation}:timeout` },
      new Error(`Timeout after ${timeoutMs}ms`)
    );
  }

  /**
   * Create a dependency error with context
   */
  static createDependencyError(dependency: string, context: ErrorContext): ComponentError {
    return new ComponentError(
      `Required dependency '${dependency}' is not available`,
      { ...context, operation: 'dependency-check' },
      new Error(`Missing dependency: ${dependency}`)
    );
  }

  /**
   * Create a validation error with context
   */
  static createValidationError(field: string, value: any, context: ErrorContext): ComponentError {
    return new ComponentError(
      `Validation failed for field '${field}': ${String(value)}`,
      { ...context, operation: 'validation' },
      new Error(`Invalid ${field}: ${String(value)}`)
    );
  }
}

/**
 * Convenience function for handling errors in interactive components
 */
export function handleComponentError(
  error: unknown,
  component: string,
  operation: string,
  metadata?: Record<string, any>
): never {
  InteractiveErrorHandler.handleError(error, { component, operation, metadata });
  // This should never be reached due to rethrow, but TypeScript needs it
  throw normalizeError(error);
}

/**
 * Convenience function for wrapping operations
 */
export function wrapComponentOperation<T>(
  operation: () => Promise<T>,
  component: string,
  operationName: string,
  options?: {
    fallback?: () => T | Promise<T>;
    retries?: number;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  return InteractiveErrorHandler.wrapOperation(
    operation,
    {
      component,
      operation: operationName,
      metadata: options?.metadata
    },
    {
      fallback: options?.fallback,
      retries: options?.retries
    }
  );
}