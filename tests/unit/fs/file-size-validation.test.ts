import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readTextFile, readFileLines } from '../../../src/fs/operations.js';
import { MAX_FILE_READ_SIZE, MAX_CODE_ANALYSIS_FILE_SIZE } from '../../../src/constants.js';

describe('File Size Validation', () => {
  let testDir: string;
  let smallFile: string;
  let largeFile: string;
  let hugeFile: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-size-test-'));

    // Create small test file (1KB)
    smallFile = path.join(testDir, 'small.txt');
    await fs.writeFile(smallFile, 'a'.repeat(1024));

    // Create large test file (just under limit - 9MB)
    largeFile = path.join(testDir, 'large.txt');
    await fs.writeFile(largeFile, 'b'.repeat(9 * 1024 * 1024));

    // Create huge test file (over limit - 15MB)
    hugeFile = path.join(testDir, 'huge.txt');
    await fs.writeFile(hugeFile, 'c'.repeat(15 * 1024 * 1024));
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('readTextFile', () => {
    it('should successfully read small files', async () => {
      const content = await readTextFile(smallFile);
      expect(content).toBe('a'.repeat(1024));
      expect(content.length).toBe(1024);
    });

    it('should successfully read files just under the size limit', async () => {
      const content = await readTextFile(largeFile);
      expect(content).toBe('b'.repeat(9 * 1024 * 1024));
      expect(content.length).toBe(9 * 1024 * 1024);
    });

    it('should reject files exceeding the size limit', async () => {
      await expect(readTextFile(hugeFile)).rejects.toThrow();
      await expect(readTextFile(hugeFile)).rejects.toThrow(/too large|size limit|exceeds/i);
    });

    it('should include file size in error message', async () => {
      try {
        await readTextFile(hugeFile);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/15.*MB|15728640.*bytes/i);
      }
    });

    it('should include size limit in error message', async () => {
      try {
        await readTextFile(hugeFile);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/10.*MB|limit/i);
      }
    });

    it('should handle non-existent files', async () => {
      const nonExistentFile = path.join(testDir, 'nonexistent.txt');
      await expect(readTextFile(nonExistentFile)).rejects.toThrow(/not found/i);
    });

    it('should validate size before reading to prevent OOM', async () => {
      // This test ensures we check size BEFORE reading the entire file into memory
      const statSpy = jest.spyOn(fs, 'stat');

      try {
        await readTextFile(hugeFile);
      } catch (error) {
        // Expected to throw
      }

      // Verify we called stat to check size
      expect(statSpy).toHaveBeenCalledWith(hugeFile);
      statSpy.mockRestore();
    });

    it('should support custom size limit parameter', async () => {
      // Test with very small custom limit (1KB)
      await expect(readTextFile(largeFile, 'utf-8', 1024)).rejects.toThrow(/too large|exceeds.*limit/i);
    });

    it('should use default limit when none specified', async () => {
      // Should use MAX_FILE_READ_SIZE (10MB) by default
      await expect(readTextFile(hugeFile)).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const content = await readTextFile(emptyFile);
      expect(content).toBe('');
    });

    it('should handle different encodings', async () => {
      const utf16File = path.join(testDir, 'utf16.txt');
      await fs.writeFile(utf16File, Buffer.from('test content', 'utf16le'));

      const content = await readTextFile(utf16File, 'utf16le');
      expect(content).toContain('test content');
    });
  });

  describe('readFileLines', () => {
    it('should enforce size limits on line reading', async () => {
      await expect(readFileLines(hugeFile, 1, 10)).rejects.toThrow(/too large|exceeds.*limit|failed to read/i);
    });

    it('should successfully read lines from small files', async () => {
      const multilineFile = path.join(testDir, 'multiline.txt');
      await fs.writeFile(multilineFile, 'line1\nline2\nline3\nline4\nline5');

      const lines = await readFileLines(multilineFile, 2, 4);
      expect(lines).toEqual(['line2', 'line3', 'line4']);
    });

    it('should validate size before reading lines', async () => {
      try {
        await readFileLines(hugeFile, 1, 5);
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/too large|exceeds.*limit|failed to read/i);
      }
    });
  });

  describe('Security - DoS Protection', () => {
    it('should prevent denial of service via large file reads', async () => {
      const attackFile = path.join(testDir, 'dos-attack.txt');
      // Create a 100MB file (well over the limit)
      const stream = createWriteStream(attackFile);

      for (let i = 0; i < 100; i++) {
        stream.write('a'.repeat(1024 * 1024)); // 1MB chunks
      }
      stream.end();

      await new Promise(resolve => stream.on('finish', resolve));

      // Should reject without consuming excessive memory
      const startMem = process.memoryUsage().heapUsed;

      await expect(readTextFile(attackFile)).rejects.toThrow(/too large|exceeds.*limit/i);

      const endMem = process.memoryUsage().heapUsed;
      const memIncrease = endMem - startMem;

      // Memory increase should be minimal (< 20MB) since we rejected before reading
      expect(memIncrease).toBeLessThan(20 * 1024 * 1024);
    });

    it('should handle rapid successive large file attempts', async () => {
      const attempts = [];

      for (let i = 0; i < 10; i++) {
        attempts.push(
          readTextFile(hugeFile).catch(err => err)
        );
      }

      const results = await Promise.all(attempts);

      // All should fail with size limit error
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toMatch(/too large|exceeds.*limit/i);
      });
    });

    it('should not allow bypassing limit with multiple reads', async () => {
      // Try to read the same large file multiple times
      // Each attempt should fail independently
      await expect(readTextFile(hugeFile)).rejects.toThrow(/too large|exceeds.*limit/i);
      await expect(readTextFile(hugeFile)).rejects.toThrow(/too large|exceeds.*limit/i);
      await expect(readTextFile(hugeFile)).rejects.toThrow(/too large|exceeds.*limit/i);
    });
  });

  describe('Performance', () => {
    it('should fail fast for oversized files', async () => {
      const start = Date.now();

      try {
        await readTextFile(hugeFile);
      } catch (error) {
        // Expected
      }

      const duration = Date.now() - start;

      // Should fail in under 100ms (just checking file stats, not reading)
      expect(duration).toBeLessThan(100);
    });

    it('should not significantly impact performance for valid files', async () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await readTextFile(smallFile);
      }

      const duration = Date.now() - start;
      const avgDuration = duration / iterations;

      // Average read time should be reasonable (< 10ms per file)
      expect(avgDuration).toBeLessThan(10);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error messages', async () => {
      try {
        await readTextFile(hugeFile);
        fail('Should have thrown an error');
      } catch (error: any) {
        // Error should mention:
        // 1. File path
        // 2. Actual file size
        // 3. Size limit
        // 4. Helpful resolution
        expect(error.message.toLowerCase()).toContain('huge.txt');
        expect(error.message).toMatch(/\d+.*MB/i); // Size in MB
        expect(error.message).toMatch(/limit/i);
      }
    });

    it('should include resolution hint in error', async () => {
      try {
        await readTextFile(hugeFile);
        fail('Should have thrown an error');
      } catch (error: any) {
        // Should suggest either reducing file size or adjusting limit
        const msg = error.message.toLowerCase();
        expect(
          msg.includes('reduce') ||
          msg.includes('smaller') ||
          msg.includes('increase') ||
          msg.includes('adjust') ||
          msg.includes('limit')
        ).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle files exactly at the limit', async () => {
      const exactLimitFile = path.join(testDir, 'exact.txt');
      // Create file exactly at MAX_FILE_READ_SIZE
      await fs.writeFile(exactLimitFile, 'x'.repeat(MAX_FILE_READ_SIZE));

      // Should succeed (at the limit, not over)
      const content = await readTextFile(exactLimitFile);
      expect(content.length).toBe(MAX_FILE_READ_SIZE);
    });

    it('should handle files one byte over the limit', async () => {
      const overByOneFile = path.join(testDir, 'over-by-one.txt');
      await fs.writeFile(overByOneFile, 'x'.repeat(MAX_FILE_READ_SIZE + 1));

      // Should fail (over the limit)
      await expect(readTextFile(overByOneFile)).rejects.toThrow(/too large|exceeds.*limit/i);
    });

    it('should handle symbolic links correctly', async () => {
      const symlinkPath = path.join(testDir, 'symlink.txt');

      try {
        await fs.symlink(hugeFile, symlinkPath);

        // Should check the size of the target file, not the symlink
        await expect(readTextFile(symlinkPath)).rejects.toThrow(/too large|exceeds.*limit/i);
      } catch (error) {
        // Symlinks might not be supported on all platforms
        if ((error as NodeJS.ErrnoException).code !== 'EPERM') {
          throw error;
        }
      }
    });

    it('should handle permission errors gracefully', async () => {
      if (process.platform !== 'win32') {
        const noPermFile = path.join(testDir, 'no-perm.txt');
        await fs.writeFile(noPermFile, 'test');
        await fs.chmod(noPermFile, 0o000);

        await expect(readTextFile(noPermFile)).rejects.toThrow();

        // Cleanup
        await fs.chmod(noPermFile, 0o644);
      }
    });
  });
});
