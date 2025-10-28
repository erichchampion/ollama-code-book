/**
 * Safe JSON Utilities
 *
 * Provides safe JSON serialization and parsing with protection against
 * circular references and other common JSON-related issues.
 */

import { logger } from './logger.js';
import { normalizeError } from '../utils/error-utils.js';

export interface SafeJsonOptions {
  maxDepth?: number;
  includeNonEnumerable?: boolean;
  replacer?: (key: string, value: any) => any;
  space?: string | number;
}

/**
 * Safely stringify an object, handling circular references
 */
export function safeStringify(
  obj: any,
  options: SafeJsonOptions = {}
): string {
  const {
    maxDepth = 10,
    includeNonEnumerable = false,
    replacer,
    space
  } = options;

  const seen = new Set();

  const circularReplacer = (key: string, value: any, currentDepth: number = 0): any => {
    // Handle depth limit
    if (currentDepth > maxDepth) {
      return '[Max Depth Exceeded]';
    }

    // Handle null and undefined
    if (value === null) return null;
    if (value === undefined) return undefined;

    // Handle primitive types
    if (typeof value !== 'object') {
      return replacer ? replacer(key, value) : value;
    }

    // Handle circular references
    if (seen.has(value)) {
      return '[Circular Reference]';
    }

    // Handle functions
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    // Handle special objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }

    if (value instanceof RegExp) {
      return value.toString();
    }

    // Handle arrays and objects
    seen.add(value);

    try {
      let result: any;

      if (Array.isArray(value)) {
        result = value.map((item, index) =>
          circularReplacer(index.toString(), item, currentDepth + 1)
        );
      } else {
        result = {};
        const keys = includeNonEnumerable
          ? Object.getOwnPropertyNames(value)
          : Object.keys(value);

        for (const prop of keys) {
          try {
            const descriptor = Object.getOwnPropertyDescriptor(value, prop);
            if (descriptor && descriptor.get && !descriptor.set) {
              // Skip getters without setters to avoid side effects
              result[prop] = '[Getter]';
            } else {
              result[prop] = circularReplacer(prop, value[prop], currentDepth + 1);
            }
          } catch (error) {
            result[prop] = `[Error accessing property: ${normalizeError(error).message}]`;
          }
        }
      }

      return replacer ? replacer(key, result) : result;
    } finally {
      seen.delete(value);
    }
  };

  try {
    return JSON.stringify(obj, circularReplacer, space);
  } catch (error) {
    logger.error('Safe JSON stringify failed:', error);
    return `[JSON Stringify Error: ${normalizeError(error).message}]`;
  }
}

/**
 * Safely parse JSON with error handling
 */
export function safeParse<T = any>(
  jsonString: string,
  defaultValue?: T
): T | typeof defaultValue {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.debug('JSON parse failed:', error);
    return defaultValue as T | typeof defaultValue;
  }
}

/**
 * Check if a string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely stringify with size limit
 */
export function safeStringifyWithLimit(
  obj: any,
  maxSizeBytes: number = 1024 * 1024, // 1MB default
  options: SafeJsonOptions = {}
): string {
  const result = safeStringify(obj, options);

  if (result.length > maxSizeBytes) {
    logger.warn('JSON result exceeds size limit, truncating');
    return result.substring(0, maxSizeBytes) + '...[Truncated]';
  }

  return result;
}

/**
 * Safely extract error information
 */
export function safeErrorStringify(error: any): string {
  if (error instanceof Error) {
    return safeStringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
  }

  return safeStringify(error);
}

/**
 * Deep clone an object safely
 */
export function safeDeepClone<T>(obj: T): T | null {
  try {
    return JSON.parse(safeStringify(obj));
  } catch (error) {
    logger.error('Safe deep clone failed:', error);
    return null;
  }
}