/**
 * Result Types for Error Handling
 *
 * Provides a robust Result<T, E> pattern to eliminate exception throwing
 * and enable graceful error handling throughout the application.
 */

export interface Success<T> {
  success: true;
  data: T;
  error?: never;
}

export interface Failure<E> {
  success: false;
  data?: never;
  error: E;
}

export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface ErrorDetails {
  code: string;
  message: string;
  details?: string;
  cause?: Error;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Create a successful result
 */
export function ok<T>(data: T): Success<T> {
  return {
    success: true,
    data
  };
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Failure<E> {
  return {
    success: false,
    error
  };
}

/**
 * Create a failure result from an Error
 */
export function errFromError(error: Error, code?: string, context?: Record<string, any>): Failure<ErrorDetails> {
  return err({
    code: code || 'UNKNOWN_ERROR',
    message: error.message,
    details: error.stack,
    cause: error,
    timestamp: new Date(),
    context
  });
}

/**
 * Create a failure result from a string message
 */
export function errFromString(message: string, code = 'ERROR', context?: Record<string, any>): Failure<ErrorDetails> {
  return err({
    code,
    message,
    timestamp: new Date(),
    context
  });
}

/**
 * Check if result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

/**
 * Check if result is a failure
 */
export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}

/**
 * Map a successful result to a new value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Map an error result to a new error
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain results together (flatMap)
 */
export function andThen<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Get the data from a result, or throw if it's an error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw new Error(`Tried to unwrap error result: ${JSON.stringify(result.error)}`);
}

/**
 * Get the data from a result, or return a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Get the data from a result, or compute a default value from the error
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  if (isOk(result)) {
    return result.data;
  }
  return fn(result.error);
}

/**
 * Convert an async function that might throw to one that returns a Result
 */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, ErrorDetails>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    if (error instanceof Error) {
      return errFromError(error);
    }
    return errFromString(String(error), 'UNKNOWN_ERROR');
  }
}

/**
 * Convert a synchronous function that might throw to one that returns a Result
 */
export function trySync<T>(fn: () => T): Result<T, ErrorDetails> {
  try {
    const data = fn();
    return ok(data);
  } catch (error) {
    if (error instanceof Error) {
      return errFromError(error);
    }
    return errFromString(String(error), 'UNKNOWN_ERROR');
  }
}

/**
 * Collect multiple results into a single result containing an array
 * Fails if any individual result fails
 */
export function collectResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    data.push(result.data);
  }

  return ok(data);
}

/**
 * Partition results into successes and failures
 */
export function partitionResults<T, E>(results: Result<T, E>[]): {
  successes: T[];
  failures: E[];
} {
  const successes: T[] = [];
  const failures: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      successes.push(result.data);
    } else {
      failures.push(result.error);
    }
  }

  return { successes, failures };
}

/**
 * Combine two results into a single result containing a tuple
 */
export function combine<T1, T2, E>(
  result1: Result<T1, E>,
  result2: Result<T2, E>
): Result<[T1, T2], E> {
  if (isErr(result1)) return result1;
  if (isErr(result2)) return result2;
  return ok([result1.data, result2.data]);
}

/**
 * Apply a function that returns a Result to each item in an array
 * Returns the first error encountered, or an array of all successes
 */
export function mapResults<T, U, E>(
  items: T[],
  fn: (item: T, index: number) => Result<U, E>
): Result<U[], E> {
  const results: U[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = fn(items[i], i);
    if (isErr(result)) {
      return result;
    }
    results.push(result.data);
  }

  return ok(results);
}