/**
 * Test Utility Functions
 * Common utilities for testing (replaces missing ../../../../tests/shared/test-utils.js)
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to become true
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Polling interval in milliseconds
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(condition());
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Ensure directory exists, creating it if necessary
 * @param dirPath - Path to directory
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Remove file or directory
 * @param targetPath - Path to remove
 * @param recursive - Whether to remove recursively (for directories)
 */
export async function remove(targetPath: string, recursive: boolean = false): Promise<void> {
  try {
    const stats = await fsPromises.stat(targetPath);

    if (stats.isDirectory()) {
      if (recursive) {
        await fsPromises.rm(targetPath, { recursive: true, force: true });
      } else {
        await fsPromises.rmdir(targetPath);
      }
    } else {
      await fsPromises.unlink(targetPath);
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Write file asynchronously
 * @param filePath - Path to file
 * @param content - File content
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fsPromises.writeFile(filePath, content, 'utf8');
}
