/**
 * Path Security Utilities
 *
 * Centralized path validation to prevent directory traversal attacks
 * and ensure operations stay within project boundaries.
 */

import path from 'path';

/**
 * Check if a target path is safe (within project boundaries)
 *
 * @param targetPath - The path to validate
 * @param projectRoot - The root directory that contains all allowed paths
 * @returns true if the path is safe, false otherwise
 *
 * @example
 * ```typescript
 * isPathSafe('/home/user/project/src/file.ts', '/home/user/project') // true
 * isPathSafe('/home/user/other/file.ts', '/home/user/project') // false
 * isPathSafe('../../../etc/passwd', '/home/user/project') // false
 * ```
 */
export function isPathSafe(targetPath: string, projectRoot: string): boolean {
  const resolved = path.resolve(targetPath);
  const root = path.resolve(projectRoot);
  return resolved.startsWith(root);
}

/**
 * Validate multiple paths at once
 *
 * @param targetPaths - Array of paths to validate
 * @param projectRoot - The root directory
 * @returns Object with safe and unsafe paths
 */
export function validatePaths(
  targetPaths: string[],
  projectRoot: string
): { safe: string[]; unsafe: string[] } {
  const safe: string[] = [];
  const unsafe: string[] = [];

  for (const targetPath of targetPaths) {
    if (isPathSafe(targetPath, projectRoot)) {
      safe.push(targetPath);
    } else {
      unsafe.push(targetPath);
    }
  }

  return { safe, unsafe };
}

/**
 * Assert that a path is safe, throwing an error if not
 *
 * @param targetPath - The path to validate
 * @param projectRoot - The root directory
 * @throws Error if the path is outside project boundaries
 */
export function assertPathSafe(targetPath: string, projectRoot: string): void {
  if (!isPathSafe(targetPath, projectRoot)) {
    throw new Error(
      `Path '${targetPath}' is outside project boundaries ('${projectRoot}')`
    );
  }
}
