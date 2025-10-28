/**
 * Directory Management Utility
 *
 * Provides centralized directory creation and management functionality
 * to eliminate duplicate directory initialization logic across providers.
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface DirectoryStructure {
  [key: string]: string | DirectoryStructure;
}

export class DirectoryManager {
  /**
   * Ensure multiple directories exist, creating them if necessary
   */
  static async ensureDirectories(...paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(dirPath => fs.mkdir(dirPath, { recursive: true }))
    );
  }

  /**
   * Create a directory structure from a nested object definition
   */
  static async createStructure(basePath: string, structure: DirectoryStructure): Promise<void> {
    const createDir = async (currentPath: string, obj: DirectoryStructure): Promise<void> => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path.join(currentPath, key);

        if (typeof value === 'string') {
          // It's a file path or final directory
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
        } else {
          // It's a nested directory structure
          await fs.mkdir(fullPath, { recursive: true });
          await createDir(fullPath, value);
        }
      }
    };

    await fs.mkdir(basePath, { recursive: true });
    await createDir(basePath, structure);
  }

  /**
   * Ensure workspace directories for AI providers
   */
  static async ensureWorkspace(workspaceDir: string, subdirs: string[]): Promise<void> {
    const allDirs = [workspaceDir, ...subdirs.map(sub => path.join(workspaceDir, sub))];
    await this.ensureDirectories(...allDirs);
  }

  /**
   * Clean up empty directories in a path
   */
  static async cleanupEmptyDirectories(basePath: string): Promise<void> {
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });

      // Recursively clean subdirectories first
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(basePath, entry.name);
          await this.cleanupEmptyDirectories(subPath);
        }
      }

      // Check if directory is now empty and remove if so
      const currentEntries = await fs.readdir(basePath);
      if (currentEntries.length === 0) {
        await fs.rmdir(basePath);
      }
    } catch (error) {
      // Directory doesn't exist or can't be accessed - ignore
    }
  }

  /**
   * Check if directory exists and is writable
   */
  static async isDirectoryAccessible(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath, fs.constants.F_OK | fs.constants.W_OK);
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get directory size in bytes
   */
  static async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const calculateSize = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await calculateSize(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };

    await calculateSize(dirPath);
    return totalSize;
  }
}