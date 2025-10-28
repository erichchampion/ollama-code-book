/**
 * Validation Utilities
 *
 * Shared validation functions to eliminate duplicate validation logic
 * across the extension codebase.
 */

import { VALIDATION_LIMITS } from '../config/serviceConstants';
import { createError } from './errorUtils';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate port number
 */
export function validatePort(port: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(port)) {
    errors.push('Port must be an integer');
  }

  if (port < VALIDATION_LIMITS.PORT_MIN || port > VALIDATION_LIMITS.PORT_MAX) {
    errors.push(`Port must be between ${VALIDATION_LIMITS.PORT_MIN} and ${VALIDATION_LIMITS.PORT_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(timeout)) {
    errors.push('Timeout must be an integer');
  }

  if (timeout < VALIDATION_LIMITS.TIMEOUT_MIN || timeout > VALIDATION_LIMITS.TIMEOUT_MAX) {
    errors.push(`Timeout must be between ${VALIDATION_LIMITS.TIMEOUT_MIN} and ${VALIDATION_LIMITS.TIMEOUT_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate context lines
 */
export function validateContextLines(contextLines: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(contextLines)) {
    errors.push('Context lines must be an integer');
  }

  if (contextLines < VALIDATION_LIMITS.CONTEXT_LINES_MIN || contextLines > VALIDATION_LIMITS.CONTEXT_LINES_MAX) {
    errors.push(`Context lines must be between ${VALIDATION_LIMITS.CONTEXT_LINES_MIN} and ${VALIDATION_LIMITS.CONTEXT_LINES_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate cache size
 */
export function validateCacheSize(cacheSize: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(cacheSize)) {
    errors.push('Cache size must be an integer');
  }

  if (cacheSize < VALIDATION_LIMITS.CACHE_SIZE_MIN || cacheSize > VALIDATION_LIMITS.CACHE_SIZE_MAX) {
    errors.push(`Cache size must be between ${VALIDATION_LIMITS.CACHE_SIZE_MIN} and ${VALIDATION_LIMITS.CACHE_SIZE_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate concurrent requests
 */
export function validateConcurrentRequests(concurrentRequests: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(concurrentRequests)) {
    errors.push('Concurrent requests must be an integer');
  }

  if (concurrentRequests < VALIDATION_LIMITS.CONCURRENT_REQUESTS_MIN || concurrentRequests > VALIDATION_LIMITS.CONCURRENT_REQUESTS_MAX) {
    errors.push(`Concurrent requests must be between ${VALIDATION_LIMITS.CONCURRENT_REQUESTS_MIN} and ${VALIDATION_LIMITS.CONCURRENT_REQUESTS_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate string is not empty
 */
export function validateNotEmpty(value: string, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (!value || value.trim().length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  try {
    new URL(url);
  } catch {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate JSON format
 */
export function validateJson(jsonString: string): ValidationResult {
  const errors: string[] = [];

  try {
    JSON.parse(jsonString);
  } catch (error) {
    errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate array has minimum length
 */
export function validateArrayMinLength<T>(array: T[], minLength: number, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(array)) {
    errors.push(`${fieldName} must be an array`);
  } else if (array.length < minLength) {
    errors.push(`${fieldName} must have at least ${minLength} items`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate object has required properties
 */
export function validateRequiredProperties(obj: any, requiredProps: string[]): ValidationResult {
  const errors: string[] = [];

  if (typeof obj !== 'object' || obj === null) {
    errors.push('Value must be an object');
    return { isValid: false, errors };
  }

  for (const prop of requiredProps) {
    if (!(prop in obj) || obj[prop] === undefined || obj[prop] === null) {
      errors.push(`Required property '${prop}' is missing`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(result => result.errors);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate and throw error if invalid
 */
export function validateOrThrow(result: ValidationResult, context?: string): void {
  if (!result.isValid) {
    const contextPrefix = context ? `${context}: ` : '';
    throw createError(`${contextPrefix}${result.errors.join(', ')}`);
  }
}

/**
 * Create validation wrapper function
 */
export function createValidator<T>(
  validationFn: (value: T) => ValidationResult
): (value: T, throwOnError?: boolean) => ValidationResult {
  return (value: T, throwOnError = false): ValidationResult => {
    const result = validationFn(value);

    if (throwOnError && !result.isValid) {
      throw createError(result.errors.join(', '));
    }

    return result;
  };
}