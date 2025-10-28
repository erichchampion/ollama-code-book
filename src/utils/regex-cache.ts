/**
 * Regex Cache Utility
 *
 * Provides efficient caching of compiled regular expressions to avoid
 * repeated compilation overhead in hot code paths.
 */

import { logger } from './logger.js';

/**
 * Cache for compiled regular expressions
 */
class RegexCache {
  private cache: Map<string, RegExp> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Get or compile a regex pattern with optional flags
   */
  getOrCompile(pattern: string, flags: string = ''): RegExp {
    const key = `${pattern}:${flags}`;

    let regex = this.cache.get(key);
    if (!regex) {
      // Check cache size limit
      if (this.cache.size >= this.maxSize) {
        // Evict oldest entry (first in map)
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
          logger.debug('Evicted regex from cache due to size limit', { pattern: firstKey });
        }
      }

      regex = new RegExp(pattern, flags);
      this.cache.set(key, regex);
      logger.debug('Compiled and cached regex', { pattern, flags });
    }

    return regex;
  }

  /**
   * Get or compile a global regex (with 'g' flag)
   */
  getOrCompileGlobal(pattern: string, additionalFlags: string = ''): RegExp {
    const flags = additionalFlags.includes('g') ? additionalFlags : `g${additionalFlags}`;
    return this.getOrCompile(pattern, flags);
  }

  /**
   * Clear a specific pattern from cache
   */
  clear(pattern: string, flags: string = ''): void {
    const key = `${pattern}:${flags}`;
    this.cache.delete(key);
  }

  /**
   * Clear all cached regexes
   */
  clearAll(): void {
    this.cache.clear();
    logger.debug('Cleared all regex cache entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Check if a pattern is cached
   */
  has(pattern: string, flags: string = ''): boolean {
    const key = `${pattern}:${flags}`;
    return this.cache.has(key);
  }
}

// Export singleton instance
export const regexCache = new RegexCache();

/**
 * Get or compile a regex pattern
 *
 * @param pattern - The regex pattern string
 * @param flags - Optional regex flags (g, i, m, etc.)
 * @returns Compiled RegExp object
 */
export function getOrCompileRegex(pattern: string, flags: string = ''): RegExp {
  return regexCache.getOrCompile(pattern, flags);
}

/**
 * Get or compile a global regex (with 'g' flag)
 *
 * @param pattern - The regex pattern string
 * @param additionalFlags - Additional flags to combine with 'g'
 * @returns Compiled RegExp object with global flag
 */
export function getOrCompileGlobalRegex(pattern: string, additionalFlags: string = ''): RegExp {
  return regexCache.getOrCompileGlobal(pattern, additionalFlags);
}

/**
 * Convert glob pattern to regex and cache it
 *
 * @param globPattern - Glob pattern (e.g., "*.js", "src/**​/*.ts")
 * @returns Compiled RegExp object
 */
export function globToRegex(globPattern: string): RegExp {
  // Convert glob to regex pattern
  const regexPattern = globPattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*\*/g, '___DOUBLESTAR___')  // Temporarily replace **
    .replace(/\*/g, '[^/]*')  // * matches anything except /
    .replace(/___DOUBLESTAR___/g, '.*')  // ** matches anything including /
    .replace(/\?/g, '.');  // ? matches single character

  return getOrCompileRegex(`^${regexPattern}$`);
}

/**
 * Clear the regex cache
 */
export function clearRegexCache(): void {
  regexCache.clearAll();
}

/**
 * Get regex cache statistics
 */
export function getRegexCacheStats(): { size: number; maxSize: number } {
  return regexCache.getStats();
}
