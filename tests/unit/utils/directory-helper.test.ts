/**
 * Tests for Directory Helper Utility
 * Testing consolidated directory creation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ensureDirectory } from '../../../src/utils/file-operation-helpers.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Directory Helper', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `dir-helper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Creating new directories', () => {
    it('should create a new directory', async () => {
      const dirPath = path.join(testDir, 'new-dir');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'level1', 'level2', 'level3');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create deeply nested directories', async () => {
      const dirPath = path.join(testDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Idempotent behavior', () => {
    it('should succeed if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing');

      // Create first time
      await ensureDirectory(dirPath);

      // Create again - should not throw
      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle parent directory already existing', async () => {
      const parentPath = path.join(testDir, 'parent');
      const childPath = path.join(parentPath, 'child');

      // Create parent
      await ensureDirectory(parentPath);

      // Create child - parent already exists
      await ensureDirectory(childPath);

      const stats = await fs.stat(childPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle entire path already existing', async () => {
      const dirPath = path.join(testDir, 'level1', 'level2');

      // Create entire path
      await fs.mkdir(dirPath, { recursive: true });

      // Ensure again - should not throw
      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should reject invalid paths', async () => {
      const invalidPath = '\0invalid\0path';

      await expect(ensureDirectory(invalidPath)).rejects.toThrow();
    });

    it('should handle permission errors gracefully', async () => {
      // This test is platform-specific, so we'll skip on Windows
      if (process.platform === 'win32') {
        return;
      }

      const restrictedPath = '/root/test-dir-no-permission';

      await expect(ensureDirectory(restrictedPath)).rejects.toThrow();
    });

    it('should provide clear error messages', async () => {
      const invalidPath = '\0invalid';

      try {
        await ensureDirectory(invalidPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('should handle file existing at directory path', async () => {
      const filePath = path.join(testDir, 'file.txt');

      // Create parent directory first
      await fs.mkdir(testDir, { recursive: true });

      // Create a file at the path
      await fs.writeFile(filePath, 'content');

      // Try to create directory where file exists
      await expect(ensureDirectory(filePath)).rejects.toThrow();
    });
  });

  describe('Concurrent creation', () => {
    it('should handle concurrent creation of same directory', async () => {
      const dirPath = path.join(testDir, 'concurrent');

      // Create directory concurrently multiple times
      await Promise.all([
        ensureDirectory(dirPath),
        ensureDirectory(dirPath),
        ensureDirectory(dirPath),
        ensureDirectory(dirPath),
        ensureDirectory(dirPath)
      ]);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle concurrent creation of nested directories', async () => {
      const paths = [
        path.join(testDir, 'a', 'b', 'c'),
        path.join(testDir, 'a', 'b', 'd'),
        path.join(testDir, 'a', 'e', 'f'),
        path.join(testDir, 'g', 'h', 'i')
      ];

      await Promise.all(paths.map(p => ensureDirectory(p)));

      for (const dirPath of paths) {
        const stats = await fs.stat(dirPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string path', async () => {
      await expect(ensureDirectory('')).rejects.toThrow();
    });

    it('should handle relative paths', async () => {
      const relativePath = path.join(testDir, './relative/path');

      await ensureDirectory(relativePath);

      const stats = await fs.stat(relativePath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle paths with spaces', async () => {
      const dirPath = path.join(testDir, 'path with spaces', 'and more');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle paths with special characters', async () => {
      const dirPath = path.join(testDir, 'special-chars_@#$', 'more');

      await ensureDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should normalize paths', async () => {
      const dirPath = path.join(testDir, 'level1', '..', 'level1', 'level2');

      await ensureDirectory(dirPath);

      const normalizedPath = path.normalize(dirPath);
      const stats = await fs.stat(normalizedPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should create cache directory', async () => {
      const cacheDir = path.join(testDir, '.cache', 'app-data');

      await ensureDirectory(cacheDir);

      const stats = await fs.stat(cacheDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create log directory', async () => {
      const logDir = path.join(testDir, 'logs', '2024', '01');

      await ensureDirectory(logDir);

      const stats = await fs.stat(logDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create output directory for builds', async () => {
      const outputDir = path.join(testDir, 'dist', 'assets', 'images');

      await ensureDirectory(outputDir);

      const stats = await fs.stat(outputDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create temp directory', async () => {
      const tempDir = path.join(testDir, 'tmp', 'uploads', 'user-123');

      await ensureDirectory(tempDir);

      const stats = await fs.stat(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should efficiently create many directories', async () => {
      const startTime = Date.now();
      const dirs: string[] = [];

      for (let i = 0; i < 50; i++) {
        dirs.push(path.join(testDir, `dir-${i}`));
      }

      await Promise.all(dirs.map(dir => ensureDirectory(dir)));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify all created
      for (const dir of dirs) {
        const stats = await fs.stat(dir);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });
});
