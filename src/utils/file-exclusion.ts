/**
 * File Exclusion Utilities
 *
 * Centralized file exclusion logic for filtering files based on
 * .gitignore and custom exclude patterns.
 */

import { globToRegex } from '../config/file-patterns.js';

/**
 * Git ignore parser interface
 */
export interface GitIgnoreParser {
  isIgnored(filePath: string): boolean;
}

/**
 * Create an exclusion checker function
 *
 * @param excludePatterns - Array of glob patterns to exclude (e.g., ['*.log', 'node_modules/**'])
 * @param gitIgnoreParser - Optional gitignore parser instance
 * @returns Function that checks if a file should be excluded
 *
 * @example
 * ```typescript
 * const gitParser = getGitIgnoreParser('/project/root');
 * const shouldExclude = createExclusionChecker(['*.log', 'dist/**'], gitParser);
 *
 * shouldExclude('test.log'); // true
 * shouldExclude('src/index.ts'); // false (unless in .gitignore)
 * ```
 */
export function createExclusionChecker(
  excludePatterns: string[],
  gitIgnoreParser: GitIgnoreParser | null = null
): (filePath: string) => boolean {
  const excludeRegexes = excludePatterns.map(pattern => globToRegex(pattern));

  return (filePath: string): boolean => {
    // Check gitignore first (if enabled)
    if (gitIgnoreParser && gitIgnoreParser.isIgnored(filePath)) {
      return true;
    }

    // Check hardcoded patterns
    return excludeRegexes.some(regex => regex.test(filePath));
  };
}

/**
 * Create an exclusion checker that tests multiple path variants
 *
 * Some tools need to check fullPath, relativePath, and name separately.
 * This helper creates a checker that tests all three.
 *
 * @param excludePatterns - Array of glob patterns to exclude
 * @param gitIgnoreParser - Optional gitignore parser instance
 * @returns Function that checks if any path variant should be excluded
 *
 * @example
 * ```typescript
 * const shouldExclude = createMultiPathExclusionChecker(['node_modules'], gitParser);
 * shouldExclude('/full/path/node_modules', 'node_modules', 'node_modules'); // true
 * ```
 */
export function createMultiPathExclusionChecker(
  excludePatterns: string[],
  gitIgnoreParser: GitIgnoreParser | null = null
): (fullPath: string, relativePath: string, name: string) => boolean {
  const checker = createExclusionChecker(excludePatterns, gitIgnoreParser);

  return (fullPath: string, relativePath: string, name: string): boolean => {
    return checker(fullPath) || checker(relativePath) || checker(name);
  };
}

/**
 * Compile patterns into RegExp array with caching
 *
 * @param patterns - Array of glob patterns
 * @returns Array of compiled RegExp objects
 */
export function compileExcludePatterns(patterns: string[]): RegExp[] {
  return patterns.map(pattern => globToRegex(pattern));
}
