/**
 * Object Helper Utilities
 *
 * Consolidated object manipulation helpers including secure deep merge
 */

export interface DeepMergeOptions {
  /** Whether to allow undefined values to overwrite (default: false) */
  allowUndefined?: boolean;
}

/** Dangerous keys that could lead to prototype pollution */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Check if a value is a plain object (not array, Date, RegExp, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // Exclude arrays
  if (Array.isArray(value)) {
    return false;
  }

  // Exclude special objects
  if (value instanceof Date) {
    return false;
  }

  if (value instanceof RegExp) {
    return false;
  }

  // Accept plain objects and objects with no prototype
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Deep merge two objects with security features
 *
 * Features:
 * - Recursively merges nested objects
 * - Replaces arrays (doesn't merge them)
 * - Detects and prevents circular references
 * - Prevents prototype pollution
 * - Does not mutate source objects
 * - Handles special objects (Date, RegExp) correctly
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @param options - Merge options
 * @returns A new merged object
 * @throws Error if circular reference detected
 *
 * @example
 * ```typescript
 * const config = deepMerge(defaults, userConfig);
 *
 * const result = deepMerge(
 *   { a: 1, nested: { x: 10 } },
 *   { b: 2, nested: { y: 20 } }
 * );
 * // Result: { a: 1, b: 2, nested: { x: 10, y: 20 } }
 * ```
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
  options: DeepMergeOptions = {}
): T {
  return deepMergeWithTracking(target, source, options, new WeakSet());
}

/**
 * Internal deep merge implementation with circular reference tracking
 */
function deepMergeWithTracking<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
  options: DeepMergeOptions,
  seen: WeakSet<object>
): T {
  // Check for circular reference
  if (seen.has(source as object)) {
    throw new Error('Circular reference detected in source object');
  }

  // Track this object to detect circular references
  if (typeof source === 'object' && source !== null) {
    seen.add(source as object);
  }

  // Start with a shallow copy of target
  const result = { ...target };

  // Process string keys
  for (const key in source) {
    // Skip dangerous keys to prevent prototype pollution
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }

    // Only process own properties
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const sourceValue = source[key];

    // Skip undefined unless explicitly allowed
    if (!options.allowUndefined && sourceValue === undefined) {
      continue;
    }

    // Check for circular reference in source value if it's an object
    if (isPlainObject(sourceValue) && seen.has(sourceValue as object)) {
      throw new Error('Circular reference detected in source object');
    }

    const targetValue = result[key];

    // If both values are plain objects, merge recursively
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      (result as any)[key] = deepMergeWithTracking(
        targetValue as any,
        sourceValue as any,
        options,
        seen // Pass the same WeakSet to track circular references
      );
    } else if (isPlainObject(sourceValue)) {
      // Source is object but target is not - deep clone the source object
      (result as any)[key] = deepMergeWithTracking(
        {} as any,
        sourceValue as any,
        options,
        seen
      );
    } else {
      // For primitives, arrays, special objects, or when replacing object with non-object:
      // - Arrays are replaced, not merged
      // - Dates, RegExps, functions are replaced
      // - Primitives overwrite
      if (Array.isArray(sourceValue)) {
        // Clone the array to avoid reference sharing
        (result as any)[key] = [...sourceValue];
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }

  // Process symbol keys
  const symbolKeys = Object.getOwnPropertySymbols(source);
  for (const sym of symbolKeys) {
    const sourceValue = (source as any)[sym];

    // Skip undefined unless explicitly allowed
    if (!options.allowUndefined && sourceValue === undefined) {
      continue;
    }

    // Check for circular reference in source value if it's an object
    if (isPlainObject(sourceValue) && seen.has(sourceValue as object)) {
      throw new Error('Circular reference detected in source object');
    }

    const targetValue = (result as any)[sym];

    // If both values are plain objects, merge recursively
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      (result as any)[sym] = deepMergeWithTracking(
        targetValue as any,
        sourceValue as any,
        options,
        seen
      );
    } else if (isPlainObject(sourceValue)) {
      // Source is object but target is not - deep clone the source object
      (result as any)[sym] = deepMergeWithTracking(
        {} as any,
        sourceValue as any,
        options,
        seen
      );
    } else {
      if (Array.isArray(sourceValue)) {
        (result as any)[sym] = [...sourceValue];
      } else {
        (result as any)[sym] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Merge multiple objects from left to right
 *
 * @param objects - Objects to merge
 * @returns Merged object
 *
 * @example
 * ```typescript
 * const result = mergeAll(defaults, envConfig, userConfig);
 * ```
 */
export function mergeAll<T extends Record<string, any>>(
  ...objects: Array<Partial<T> | null | undefined>
): T {
  let result: any = {};

  for (const obj of objects) {
    if (obj) {
      result = deepMerge(result, obj);
    }
  }

  return result;
}

/**
 * Clone an object deeply
 *
 * @param obj - Object to clone
 * @returns Deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }

  if (isPlainObject(obj)) {
    return deepMerge({} as any, obj as any);
  }

  // For other objects, return as-is (Maps, Sets, etc.)
  return obj;
}
