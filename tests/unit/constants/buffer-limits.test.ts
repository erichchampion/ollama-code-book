import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';
import {
  EXEC_BUFFER_LIMITS,
  FILE_SIZE_LIMITS,
  STREAM_BUFFER_LIMITS,
  CHUNK_SIZE_LIMITS,
  MEMORY_LIMITS,
  BUFFER_SAFETY,
  getBufferLimit,
  isBufferSizeSafe,
  getSafeBufferSize,
  formatBytes
} from '../../../src/constants/buffer-limits.js';

describe('Buffer Limit Configuration', () => {
  describe('EXEC_BUFFER_LIMITS', () => {
    it('should have default execution buffer defined', () => {
      expect(EXEC_BUFFER_LIMITS.DEFAULT).toBe(5 * 1024 * 1024); // 5MB
      expect(EXEC_BUFFER_LIMITS.DEFAULT).toBeGreaterThan(0);
    });

    it('should have large execution buffer defined', () => {
      expect(EXEC_BUFFER_LIMITS.LARGE).toBe(10 * 1024 * 1024); // 10MB
      expect(EXEC_BUFFER_LIMITS.LARGE).toBeGreaterThan(EXEC_BUFFER_LIMITS.DEFAULT);
    });

    it('should have small execution buffer defined', () => {
      expect(EXEC_BUFFER_LIMITS.SMALL).toBe(1 * 1024 * 1024); // 1MB
      expect(EXEC_BUFFER_LIMITS.SMALL).toBeLessThan(EXEC_BUFFER_LIMITS.DEFAULT);
    });

    it('should have buffers in ascending order', () => {
      expect(EXEC_BUFFER_LIMITS.SMALL).toBeLessThan(EXEC_BUFFER_LIMITS.DEFAULT);
      expect(EXEC_BUFFER_LIMITS.DEFAULT).toBeLessThan(EXEC_BUFFER_LIMITS.LARGE);
    });

    it('should have reasonable buffer sizes', () => {
      expect(EXEC_BUFFER_LIMITS.SMALL).toBeGreaterThanOrEqual(1024 * 1024); // At least 1MB
      expect(EXEC_BUFFER_LIMITS.LARGE).toBeLessThanOrEqual(50 * 1024 * 1024); // At most 50MB
    });
  });

  describe('FILE_SIZE_LIMITS', () => {
    it('should have read limit defined', () => {
      expect(FILE_SIZE_LIMITS.READ).toBe(10 * 1024 * 1024); // 10MB
      expect(FILE_SIZE_LIMITS.READ).toBeGreaterThan(0);
    });

    it('should have analysis limit defined', () => {
      expect(FILE_SIZE_LIMITS.ANALYSIS).toBe(1 * 1024 * 1024); // 1MB
      expect(FILE_SIZE_LIMITS.ANALYSIS).toBeGreaterThan(0);
    });

    it('should have text processing limit defined', () => {
      expect(FILE_SIZE_LIMITS.TEXT_PROCESSING).toBe(5 * 1024 * 1024); // 5MB
      expect(FILE_SIZE_LIMITS.TEXT_PROCESSING).toBeGreaterThan(0);
    });

    it('should have safe limits defined', () => {
      expect(FILE_SIZE_LIMITS.SAFE).toBe(10 * 1024 * 1024); // 10MB
      expect(FILE_SIZE_LIMITS.SAFE_MAX).toBe(100 * 1024 * 1024); // 100MB
      expect(FILE_SIZE_LIMITS.SAFE).toBeLessThan(FILE_SIZE_LIMITS.SAFE_MAX);
    });

    it('should have interactive limit defined', () => {
      expect(FILE_SIZE_LIMITS.INTERACTIVE).toBe(1 * 1024 * 1024); // 1MB
      expect(FILE_SIZE_LIMITS.INTERACTIVE).toBeGreaterThan(0);
    });

    it('should have reasonable size ordering', () => {
      expect(FILE_SIZE_LIMITS.ANALYSIS).toBeLessThanOrEqual(FILE_SIZE_LIMITS.TEXT_PROCESSING);
      expect(FILE_SIZE_LIMITS.TEXT_PROCESSING).toBeLessThanOrEqual(FILE_SIZE_LIMITS.READ);
      expect(FILE_SIZE_LIMITS.SAFE).toBeLessThanOrEqual(FILE_SIZE_LIMITS.SAFE_MAX);
    });

    it('should prevent OOM with safe max limit', () => {
      expect(FILE_SIZE_LIMITS.SAFE_MAX).toBeLessThanOrEqual(500 * 1024 * 1024); // Reasonable max
    });
  });

  describe('STREAM_BUFFER_LIMITS', () => {
    it('should have WebSocket message limit defined', () => {
      expect(STREAM_BUFFER_LIMITS.WEBSOCKET_MESSAGE).toBe(1 * 1024 * 1024); // 1MB
      expect(STREAM_BUFFER_LIMITS.WEBSOCKET_MESSAGE).toBeGreaterThan(0);
    });

    it('should have tool output limit defined', () => {
      expect(STREAM_BUFFER_LIMITS.TOOL_OUTPUT).toBe(1 * 1024 * 1024); // 1MB
      expect(STREAM_BUFFER_LIMITS.TOOL_OUTPUT).toBeGreaterThan(0);
    });

    it('should have JSON payload limit defined', () => {
      expect(STREAM_BUFFER_LIMITS.JSON_PAYLOAD).toBe(1 * 1024 * 1024); // 1MB
      expect(STREAM_BUFFER_LIMITS.JSON_PAYLOAD).toBeGreaterThan(0);
    });

    it('should have consistent stream limits', () => {
      // Stream limits should be similar for consistency
      const limits = Object.values(STREAM_BUFFER_LIMITS);
      const min = Math.min(...limits);
      const max = Math.max(...limits);
      expect(max / min).toBeLessThanOrEqual(10); // Within 10x range
    });
  });

  describe('CHUNK_SIZE_LIMITS', () => {
    it('should have file read chunk size defined', () => {
      expect(CHUNK_SIZE_LIMITS.FILE_READ).toBe(64 * 1024); // 64KB
      expect(CHUNK_SIZE_LIMITS.FILE_READ).toBeGreaterThan(0);
    });

    it('should have large chunk size defined', () => {
      expect(CHUNK_SIZE_LIMITS.LARGE).toBe(256 * 1024); // 256KB
      expect(CHUNK_SIZE_LIMITS.LARGE).toBeGreaterThan(CHUNK_SIZE_LIMITS.FILE_READ);
    });

    it('should have small chunk size defined', () => {
      expect(CHUNK_SIZE_LIMITS.SMALL).toBe(16 * 1024); // 16KB
      expect(CHUNK_SIZE_LIMITS.SMALL).toBeLessThan(CHUNK_SIZE_LIMITS.FILE_READ);
    });

    it('should have chunks in ascending order', () => {
      expect(CHUNK_SIZE_LIMITS.SMALL).toBeLessThan(CHUNK_SIZE_LIMITS.FILE_READ);
      expect(CHUNK_SIZE_LIMITS.FILE_READ).toBeLessThan(CHUNK_SIZE_LIMITS.LARGE);
    });

    it('should have reasonable chunk sizes', () => {
      expect(CHUNK_SIZE_LIMITS.SMALL).toBeGreaterThanOrEqual(4096); // At least 4KB
      expect(CHUNK_SIZE_LIMITS.LARGE).toBeLessThanOrEqual(1024 * 1024); // At most 1MB
    });
  });

  describe('MEMORY_LIMITS', () => {
    it('should have default memory limit defined', () => {
      expect(MEMORY_LIMITS.DEFAULT).toBe(1024 * 1024 * 1024); // 1GB
      expect(MEMORY_LIMITS.DEFAULT).toBeGreaterThan(0);
    });

    it('should have warning threshold defined', () => {
      expect(MEMORY_LIMITS.WARNING_THRESHOLD).toBe(512 * 1024 * 1024); // 512MB
      expect(MEMORY_LIMITS.WARNING_THRESHOLD).toBeLessThan(MEMORY_LIMITS.DEFAULT);
    });

    it('should have cache max defined', () => {
      expect(MEMORY_LIMITS.CACHE_MAX).toBe(100 * 1024 * 1024); // 100MB
      expect(MEMORY_LIMITS.CACHE_MAX).toBeGreaterThan(0);
    });

    it('should have warning before limit', () => {
      expect(MEMORY_LIMITS.WARNING_THRESHOLD).toBeLessThan(MEMORY_LIMITS.DEFAULT);
    });

    it('should have reasonable memory limits', () => {
      expect(MEMORY_LIMITS.CACHE_MAX).toBeLessThan(MEMORY_LIMITS.DEFAULT);
      expect(MEMORY_LIMITS.WARNING_THRESHOLD).toBeGreaterThan(MEMORY_LIMITS.CACHE_MAX);
    });
  });

  describe('BUFFER_SAFETY', () => {
    it('should have safety margin multiplier defined', () => {
      expect(BUFFER_SAFETY.MARGIN_MULTIPLIER).toBe(1.5);
      expect(BUFFER_SAFETY.MARGIN_MULTIPLIER).toBeGreaterThan(1);
    });

    it('should have minimum buffer size defined', () => {
      expect(BUFFER_SAFETY.MINIMUM_SIZE).toBe(1024); // 1KB
      expect(BUFFER_SAFETY.MINIMUM_SIZE).toBeGreaterThan(0);
    });

    it('should have maximum buffer size defined', () => {
      expect(BUFFER_SAFETY.MAXIMUM_SIZE).toBe(500 * 1024 * 1024); // 500MB
      expect(BUFFER_SAFETY.MAXIMUM_SIZE).toBeGreaterThan(BUFFER_SAFETY.MINIMUM_SIZE);
    });

    it('should prevent OOM with reasonable maximum', () => {
      expect(BUFFER_SAFETY.MAXIMUM_SIZE).toBeLessThanOrEqual(1024 * 1024 * 1024); // At most 1GB
    });
  });

  describe('Helper Functions', () => {
    describe('getBufferLimit', () => {
      it('should retrieve existing buffer limit', () => {
        const result = getBufferLimit(EXEC_BUFFER_LIMITS, 'DEFAULT', 0);
        expect(result).toBe(EXEC_BUFFER_LIMITS.DEFAULT);
      });

      it('should return fallback for missing key', () => {
        const fallback = 999;
        const result = getBufferLimit(EXEC_BUFFER_LIMITS, 'NONEXISTENT', fallback);
        expect(result).toBe(fallback);
      });

      it('should return 0 fallback by default', () => {
        const result = getBufferLimit(EXEC_BUFFER_LIMITS, 'NONEXISTENT');
        expect(result).toBe(0);
      });

      it('should work with all buffer limit categories', () => {
        expect(getBufferLimit(FILE_SIZE_LIMITS, 'READ')).toBe(FILE_SIZE_LIMITS.READ);
        expect(getBufferLimit(STREAM_BUFFER_LIMITS, 'WEBSOCKET_MESSAGE')).toBe(STREAM_BUFFER_LIMITS.WEBSOCKET_MESSAGE);
        expect(getBufferLimit(CHUNK_SIZE_LIMITS, 'FILE_READ')).toBe(CHUNK_SIZE_LIMITS.FILE_READ);
        expect(getBufferLimit(MEMORY_LIMITS, 'DEFAULT')).toBe(MEMORY_LIMITS.DEFAULT);
      });
    });

    describe('isBufferSizeSafe', () => {
      it('should accept safe buffer sizes', () => {
        expect(isBufferSizeSafe(1024 * 1024)).toBe(true); // 1MB
        expect(isBufferSizeSafe(10 * 1024 * 1024)).toBe(true); // 10MB
        expect(isBufferSizeSafe(100 * 1024 * 1024)).toBe(true); // 100MB
      });

      it('should reject buffer sizes below minimum', () => {
        expect(isBufferSizeSafe(512)).toBe(false); // 512 bytes
        expect(isBufferSizeSafe(100)).toBe(false); // 100 bytes
        expect(isBufferSizeSafe(0)).toBe(false);
      });

      it('should reject buffer sizes above maximum', () => {
        expect(isBufferSizeSafe(600 * 1024 * 1024)).toBe(false); // 600MB > 500MB default max
        expect(isBufferSizeSafe(1024 * 1024 * 1024)).toBe(false); // 1GB
      });

      it('should accept minimum size', () => {
        expect(isBufferSizeSafe(BUFFER_SAFETY.MINIMUM_SIZE)).toBe(true);
      });

      it('should accept maximum size', () => {
        expect(isBufferSizeSafe(BUFFER_SAFETY.MAXIMUM_SIZE)).toBe(true);
      });

      it('should respect custom maximum', () => {
        const customMax = 10 * 1024 * 1024; // 10MB
        expect(isBufferSizeSafe(5 * 1024 * 1024, customMax)).toBe(true); // 5MB < 10MB
        expect(isBufferSizeSafe(15 * 1024 * 1024, customMax)).toBe(false); // 15MB > 10MB
      });
    });

    describe('getSafeBufferSize', () => {
      it('should apply safety margin to buffer size', () => {
        const baseSize = 1024 * 1024; // 1MB
        const expected = Math.ceil(baseSize * 1.5); // 1.5MB
        expect(getSafeBufferSize(baseSize)).toBe(expected);
      });

      it('should cap at maximum buffer size', () => {
        const largeSize = 600 * 1024 * 1024; // 600MB
        expect(getSafeBufferSize(largeSize)).toBe(BUFFER_SAFETY.MAXIMUM_SIZE);
      });

      it('should handle small buffers', () => {
        const smallSize = 1024; // 1KB
        const expected = Math.ceil(smallSize * 1.5); // 1.5KB
        expect(getSafeBufferSize(smallSize)).toBe(expected);
      });

      it('should handle zero base size', () => {
        expect(getSafeBufferSize(0)).toBe(0);
      });

      it('should always return integer', () => {
        const oddSize = 1000; // Will result in 1500
        const result = getSafeBufferSize(oddSize);
        expect(Number.isInteger(result)).toBe(true);
      });
    });

    describe('formatBytes', () => {
      it('should format bytes correctly', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1024 * 1024)).toBe('1 MB');
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      });

      it('should handle fractional values', () => {
        expect(formatBytes(1536)).toBe('1.5 KB'); // 1.5 KB
        expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB'); // 1.5 MB
      });

      it('should handle large values', () => {
        const result = formatBytes(500 * 1024 * 1024);
        expect(result).toContain('MB');
        expect(result).toContain('500');
      });

      it('should format all buffer limits correctly', () => {
        expect(formatBytes(EXEC_BUFFER_LIMITS.SMALL)).toContain('MB');
        expect(formatBytes(FILE_SIZE_LIMITS.READ)).toContain('MB');
        expect(formatBytes(CHUNK_SIZE_LIMITS.FILE_READ)).toContain('KB');
      });
    });
  });

  describe('Environment variable overrides', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
      jest.resetModules();
    });

    it('should override execution buffer limits with environment variables', async () => {
      process.env.BUFFER_EXEC_DEFAULT = String(20 * 1024 * 1024); // 20MB
      process.env.BUFFER_EXEC_LARGE = String(50 * 1024 * 1024); // 50MB

      const { EXEC_BUFFER_LIMITS: fresh } = await import('../../../src/constants/buffer-limits.js');

      expect(fresh.DEFAULT).toBe(20 * 1024 * 1024);
      expect(fresh.LARGE).toBe(50 * 1024 * 1024);
    });

    it('should override file size limits with environment variables', async () => {
      process.env.BUFFER_FILE_READ = String(50 * 1024 * 1024); // 50MB
      process.env.BUFFER_FILE_ANALYSIS = String(5 * 1024 * 1024); // 5MB

      const { FILE_SIZE_LIMITS: fresh } = await import('../../../src/constants/buffer-limits.js');

      expect(fresh.READ).toBe(50 * 1024 * 1024);
      expect(fresh.ANALYSIS).toBe(5 * 1024 * 1024);
    });

    it('should override stream buffer limits with environment variables', async () => {
      process.env.BUFFER_STREAM_WEBSOCKET = String(5 * 1024 * 1024); // 5MB
      process.env.BUFFER_STREAM_JSON = String(2 * 1024 * 1024); // 2MB

      const { STREAM_BUFFER_LIMITS: fresh } = await import('../../../src/constants/buffer-limits.js');

      expect(fresh.WEBSOCKET_MESSAGE).toBe(5 * 1024 * 1024);
      expect(fresh.JSON_PAYLOAD).toBe(2 * 1024 * 1024);
    });

    it('should override chunk size limits with environment variables', async () => {
      process.env.BUFFER_CHUNK_FILE_READ = String(128 * 1024); // 128KB
      process.env.BUFFER_CHUNK_LARGE = String(512 * 1024); // 512KB

      const { CHUNK_SIZE_LIMITS: fresh } = await import('../../../src/constants/buffer-limits.js');

      expect(fresh.FILE_READ).toBe(128 * 1024);
      expect(fresh.LARGE).toBe(512 * 1024);
    });

    it('should override memory limits with environment variables', async () => {
      process.env.BUFFER_MEMORY_LIMIT = String(2048 * 1024 * 1024); // 2GB
      process.env.BUFFER_MEMORY_WARNING = String(1024 * 1024 * 1024); // 1GB

      const { MEMORY_LIMITS: fresh } = await import('../../../src/constants/buffer-limits.js');

      expect(fresh.DEFAULT).toBe(2048 * 1024 * 1024);
      expect(fresh.WARNING_THRESHOLD).toBe(1024 * 1024 * 1024);
    });

    it('should ignore invalid environment variable values', async () => {
      process.env.BUFFER_EXEC_DEFAULT = 'invalid';
      process.env.BUFFER_FILE_READ = '-1000';
      process.env.BUFFER_CHUNK_FILE_READ = 'NaN';

      const {
        EXEC_BUFFER_LIMITS: freshExec,
        FILE_SIZE_LIMITS: freshFile,
        CHUNK_SIZE_LIMITS: freshChunk
      } = await import('../../../src/constants/buffer-limits.js');

      // Should use default values when env vars are invalid
      expect(freshExec.DEFAULT).toBe(5 * 1024 * 1024);
      expect(freshFile.READ).toBe(10 * 1024 * 1024);
      expect(freshChunk.FILE_READ).toBe(64 * 1024);
    });

    it('should handle fractional byte values from environment', async () => {
      process.env.BUFFER_EXEC_DEFAULT = '5242880.7'; // 5MB + 0.7 bytes

      const { EXEC_BUFFER_LIMITS: fresh } = await import('../../../src/constants/buffer-limits.js');

      // Should floor the value
      expect(fresh.DEFAULT).toBe(5242880);
    });
  });

  describe('Reasonableness validations', () => {
    it('should have all buffer limits as positive numbers', () => {
      Object.values(EXEC_BUFFER_LIMITS).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
        expect(Number.isFinite(limit)).toBe(true);
      });

      Object.values(FILE_SIZE_LIMITS).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
        expect(Number.isFinite(limit)).toBe(true);
      });

      Object.values(STREAM_BUFFER_LIMITS).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
        expect(Number.isFinite(limit)).toBe(true);
      });

      Object.values(CHUNK_SIZE_LIMITS).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
        expect(Number.isFinite(limit)).toBe(true);
      });

      Object.values(MEMORY_LIMITS).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
        expect(Number.isFinite(limit)).toBe(true);
      });
    });

    it('should have chunk sizes smaller than file sizes', () => {
      expect(CHUNK_SIZE_LIMITS.FILE_READ).toBeLessThan(FILE_SIZE_LIMITS.ANALYSIS);
      expect(CHUNK_SIZE_LIMITS.LARGE).toBeLessThan(FILE_SIZE_LIMITS.TEXT_PROCESSING);
    });

    it('should have execution buffers appropriate for operations', () => {
      // Git operations should use smaller buffer
      expect(EXEC_BUFFER_LIMITS.SMALL).toBeLessThan(EXEC_BUFFER_LIMITS.DEFAULT);

      // Search operations should use larger buffer
      expect(EXEC_BUFFER_LIMITS.LARGE).toBeGreaterThan(EXEC_BUFFER_LIMITS.DEFAULT);
    });

    it('should have memory limits larger than file limits', () => {
      expect(MEMORY_LIMITS.DEFAULT).toBeGreaterThan(FILE_SIZE_LIMITS.SAFE_MAX);
      expect(MEMORY_LIMITS.WARNING_THRESHOLD).toBeGreaterThan(FILE_SIZE_LIMITS.SAFE);
    });

    it('should have safety maximum prevent OOM', () => {
      expect(BUFFER_SAFETY.MAXIMUM_SIZE).toBeLessThan(MEMORY_LIMITS.DEFAULT);
    });
  });
});
