/**
 * Shared File Utilities
 * Common file system operations used across all test types
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Check if a file or directory exists
 * @param filePath Path to check
 * @returns Promise that resolves to true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content as UTF-8 string
 * @param filePath Path to file
 * @returns Promise that resolves with file content
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write content to file as UTF-8
 * @param filePath Path to file
 * @param content Content to write
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Create directory recursively if it doesn't exist
 * @param dirPath Directory path to create
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Remove file or directory recursively
 * @param targetPath Path to remove
 * @param force Don't throw error if path doesn't exist
 */
export async function remove(targetPath: string, force: boolean = true): Promise<void> {
  try {
    await fs.rm(targetPath, { recursive: true, force });
  } catch (error) {
    if (!force) {
      throw error;
    }
  }
}

/**
 * Copy file or directory recursively
 * @param source Source path
 * @param destination Destination path
 */
export async function copy(source: string, destination: string): Promise<void> {
  await fs.cp(source, destination, { recursive: true });
}

/**
 * List files in directory
 * @param dirPath Directory path
 * @param options Options for listing
 * @returns Promise that resolves with array of file names
 */
export async function listFiles(
  dirPath: string,
  options?: { recursive?: boolean }
): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory() && options?.recursive) {
      const nestedFiles = await listFiles(fullPath, options);
      files.push(...nestedFiles);
    }
  }

  return files;
}

/**
 * Get file stats
 * @param filePath Path to file
 * @returns Promise that resolves with file stats
 */
export async function getStats(filePath: string): Promise<{
  size: number;
  created: Date;
  modified: Date;
  isFile: boolean;
  isDirectory: boolean;
}> {
  const stats = await fs.stat(filePath);

  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
}

/**
 * Create a temporary directory for testing
 * @param prefix Prefix for temp directory name
 * @param baseDir Base directory for temp directories (default: test-results)
 * @returns Promise that resolves with path to temp directory
 */
export async function createTempDir(
  prefix: string = 'temp-',
  baseDir: string = 'test-results'
): Promise<string> {
  const tmpDir = path.join(process.cwd(), baseDir, `${prefix}${Date.now()}`);
  await ensureDir(tmpDir);
  return tmpDir;
}

/**
 * Clean up temporary directory
 * @param dirPath Path to directory to clean up
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await remove(dirPath, true);
  } catch (error) {
    console.warn(`Failed to cleanup temp directory: ${dirPath}`, error);
  }
}
