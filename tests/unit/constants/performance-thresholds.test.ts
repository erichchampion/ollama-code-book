/**
 * Tests for Performance Threshold Configuration
 * Ensures all performance thresholds are properly configured and accessible
 */

import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';
import {
  COMPLEXITY_THRESHOLDS,
  MEMORY_THRESHOLDS,
  PATTERN_THRESHOLDS,
  SCORE_MULTIPLIERS,
  PERFORMANCE_WEIGHTS,
  PATTERN_IMPACT_ESTIMATES,
  HOTSPOT_IMPACT_ESTIMATES,
  MEMORY_IMPACT_ESTIMATES,
  CPU_IMPACT_ESTIMATES,
  getPerformanceThreshold
} from '../../../src/constants/performance-thresholds.js';

describe('Performance Threshold Configuration', () => {
  describe('COMPLEXITY_THRESHOLDS', () => {
    it('should have high complexity threshold defined', () => {
      expect(COMPLEXITY_THRESHOLDS.HIGH).toBe(15);
      expect(COMPLEXITY_THRESHOLDS.HIGH).toBeGreaterThan(0);
    });

    it('should have moderate complexity threshold defined', () => {
      expect(COMPLEXITY_THRESHOLDS.MODERATE).toBe(10);
      expect(COMPLEXITY_THRESHOLDS.MODERATE).toBeLessThan(COMPLEXITY_THRESHOLDS.HIGH);
    });

    it('should have low complexity threshold defined', () => {
      expect(COMPLEXITY_THRESHOLDS.LOW).toBe(5);
      expect(COMPLEXITY_THRESHOLDS.LOW).toBeLessThan(COMPLEXITY_THRESHOLDS.MODERATE);
    });

    it('should have thresholds in ascending order', () => {
      expect(COMPLEXITY_THRESHOLDS.LOW).toBeLessThan(COMPLEXITY_THRESHOLDS.MODERATE);
      expect(COMPLEXITY_THRESHOLDS.MODERATE).toBeLessThan(COMPLEXITY_THRESHOLDS.HIGH);
    });
  });

  describe('MEMORY_THRESHOLDS', () => {
    it('should have high memory threshold defined', () => {
      expect(MEMORY_THRESHOLDS.HIGH).toBe(70);
      expect(MEMORY_THRESHOLDS.HIGH).toBeGreaterThan(0);
    });

    it('should have warning memory threshold defined', () => {
      expect(MEMORY_THRESHOLDS.WARNING).toBe(50);
      expect(MEMORY_THRESHOLDS.WARNING).toBeLessThan(MEMORY_THRESHOLDS.HIGH);
    });

    it('should have large array size threshold defined', () => {
      expect(MEMORY_THRESHOLDS.LARGE_ARRAY_SIZE).toBe(10000);
      expect(MEMORY_THRESHOLDS.LARGE_ARRAY_SIZE).toBeGreaterThan(0);
    });
  });

  describe('PATTERN_THRESHOLDS', () => {
    it('should have string concatenation count threshold', () => {
      expect(PATTERN_THRESHOLDS.STRING_CONCATENATION_COUNT).toBe(5);
      expect(PATTERN_THRESHOLDS.STRING_CONCATENATION_COUNT).toBeGreaterThan(0);
    });

    it('should have nested loop depth threshold', () => {
      expect(PATTERN_THRESHOLDS.NESTED_LOOP_DEPTH).toBe(2);
      expect(PATTERN_THRESHOLDS.NESTED_LOOP_DEPTH).toBeGreaterThan(0);
    });
  });

  describe('SCORE_MULTIPLIERS', () => {
    describe('Memory multipliers', () => {
      it('should have array allocation multiplier', () => {
        expect(SCORE_MULTIPLIERS.MEMORY.ARRAY_ALLOCATION).toBe(10);
        expect(SCORE_MULTIPLIERS.MEMORY.ARRAY_ALLOCATION).toBeGreaterThan(0);
      });

      it('should have buffer allocation multiplier', () => {
        expect(SCORE_MULTIPLIERS.MEMORY.BUFFER_ALLOCATION).toBe(15);
        expect(SCORE_MULTIPLIERS.MEMORY.BUFFER_ALLOCATION).toBeGreaterThan(0);
      });

      it('should have map operation multiplier', () => {
        expect(SCORE_MULTIPLIERS.MEMORY.MAP_OPERATION).toBe(2);
        expect(SCORE_MULTIPLIERS.MEMORY.MAP_OPERATION).toBeGreaterThan(0);
      });

      it('should have filter operation multiplier', () => {
        expect(SCORE_MULTIPLIERS.MEMORY.FILTER_OPERATION).toBe(2);
        expect(SCORE_MULTIPLIERS.MEMORY.FILTER_OPERATION).toBeGreaterThan(0);
      });

      it('should have maximum score cap', () => {
        expect(SCORE_MULTIPLIERS.MEMORY.MAX_SCORE).toBe(100);
        expect(SCORE_MULTIPLIERS.MEMORY.MAX_SCORE).toBeGreaterThan(0);
      });
    });

    describe('CPU multipliers', () => {
      it('should have for loop multiplier', () => {
        expect(SCORE_MULTIPLIERS.CPU.FOR_LOOP).toBe(2);
        expect(SCORE_MULTIPLIERS.CPU.FOR_LOOP).toBeGreaterThan(0);
      });

      it('should have while loop multiplier', () => {
        expect(SCORE_MULTIPLIERS.CPU.WHILE_LOOP).toBe(3);
        expect(SCORE_MULTIPLIERS.CPU.WHILE_LOOP).toBeGreaterThan(0);
      });

      it('should have sort operation multiplier', () => {
        expect(SCORE_MULTIPLIERS.CPU.SORT_OPERATION).toBe(5);
        expect(SCORE_MULTIPLIERS.CPU.SORT_OPERATION).toBeGreaterThan(0);
      });

      it('should have JSON operation multiplier', () => {
        expect(SCORE_MULTIPLIERS.CPU.JSON_OPERATION).toBe(3);
        expect(SCORE_MULTIPLIERS.CPU.JSON_OPERATION).toBeGreaterThan(0);
      });

      it('should have complexity multiplier', () => {
        expect(SCORE_MULTIPLIERS.CPU.COMPLEXITY_MULTIPLIER).toBe(2);
        expect(SCORE_MULTIPLIERS.CPU.COMPLEXITY_MULTIPLIER).toBeGreaterThan(0);
      });

      it('should have maximum score cap', () => {
        expect(SCORE_MULTIPLIERS.CPU.MAX_SCORE).toBe(100);
        expect(SCORE_MULTIPLIERS.CPU.MAX_SCORE).toBeGreaterThan(0);
      });
    });

    describe('I/O multipliers', () => {
      it('should have file system operation multiplier', () => {
        expect(SCORE_MULTIPLIERS.IO.FS_OPERATION).toBe(5);
        expect(SCORE_MULTIPLIERS.IO.FS_OPERATION).toBeGreaterThan(0);
      });

      it('should have file read/write multiplier', () => {
        expect(SCORE_MULTIPLIERS.IO.FILE_READ_WRITE).toBe(8);
        expect(SCORE_MULTIPLIERS.IO.FILE_READ_WRITE).toBeGreaterThan(0);
      });

      it('should have network request multiplier', () => {
        expect(SCORE_MULTIPLIERS.IO.NETWORK_REQUEST).toBe(10);
        expect(SCORE_MULTIPLIERS.IO.NETWORK_REQUEST).toBeGreaterThan(0);
      });

      it('should have maximum score cap', () => {
        expect(SCORE_MULTIPLIERS.IO.MAX_SCORE).toBe(100);
        expect(SCORE_MULTIPLIERS.IO.MAX_SCORE).toBeGreaterThan(0);
      });
    });
  });

  describe('PERFORMANCE_WEIGHTS', () => {
    it('should have critical issue weight', () => {
      expect(PERFORMANCE_WEIGHTS.CRITICAL_ISSUE).toBe(20);
      expect(PERFORMANCE_WEIGHTS.CRITICAL_ISSUE).toBeGreaterThan(0);
    });

    it('should have major issue weight', () => {
      expect(PERFORMANCE_WEIGHTS.MAJOR_ISSUE).toBe(10);
      expect(PERFORMANCE_WEIGHTS.MAJOR_ISSUE).toBeGreaterThan(0);
    });

    it('should have moderate issue weight', () => {
      expect(PERFORMANCE_WEIGHTS.MODERATE_ISSUE).toBe(5);
      expect(PERFORMANCE_WEIGHTS.MODERATE_ISSUE).toBeGreaterThan(0);
    });

    it('should have bottleneck weight', () => {
      expect(PERFORMANCE_WEIGHTS.BOTTLENECK).toBe(5);
      expect(PERFORMANCE_WEIGHTS.BOTTLENECK).toBeGreaterThan(0);
    });

    it('should have base score', () => {
      expect(PERFORMANCE_WEIGHTS.BASE_SCORE).toBe(100);
      expect(PERFORMANCE_WEIGHTS.BASE_SCORE).toBeGreaterThan(0);
    });

    it('should have weights in descending severity order', () => {
      expect(PERFORMANCE_WEIGHTS.CRITICAL_ISSUE).toBeGreaterThan(PERFORMANCE_WEIGHTS.MAJOR_ISSUE);
      expect(PERFORMANCE_WEIGHTS.MAJOR_ISSUE).toBeGreaterThan(PERFORMANCE_WEIGHTS.MODERATE_ISSUE);
    });
  });

  describe('PATTERN_IMPACT_ESTIMATES', () => {
    it('should have nested loops impact estimate', () => {
      expect(PATTERN_IMPACT_ESTIMATES.NESTED_LOOPS).toBe(500);
      expect(PATTERN_IMPACT_ESTIMATES.NESTED_LOOPS).toBeGreaterThan(0);
    });

    it('should have sync I/O impact estimate', () => {
      expect(PATTERN_IMPACT_ESTIMATES.SYNC_IO).toBe(200);
      expect(PATTERN_IMPACT_ESTIMATES.SYNC_IO).toBeGreaterThan(0);
    });

    it('should have large array impact estimate', () => {
      expect(PATTERN_IMPACT_ESTIMATES.LARGE_ARRAY).toBe(100);
      expect(PATTERN_IMPACT_ESTIMATES.LARGE_ARRAY).toBeGreaterThan(0);
    });

    it('should have string concatenation impact estimate', () => {
      expect(PATTERN_IMPACT_ESTIMATES.STRING_CONCATENATION).toBe(50);
      expect(PATTERN_IMPACT_ESTIMATES.STRING_CONCATENATION).toBeGreaterThan(0);
    });

    it('should have N+1 query impact estimate', () => {
      expect(PATTERN_IMPACT_ESTIMATES.N_PLUS_ONE).toBe(1000);
      expect(PATTERN_IMPACT_ESTIMATES.N_PLUS_ONE).toBeGreaterThan(0);
    });

    it('should have N+1 as highest impact', () => {
      expect(PATTERN_IMPACT_ESTIMATES.N_PLUS_ONE).toBeGreaterThan(PATTERN_IMPACT_ESTIMATES.NESTED_LOOPS);
      expect(PATTERN_IMPACT_ESTIMATES.N_PLUS_ONE).toBeGreaterThan(PATTERN_IMPACT_ESTIMATES.SYNC_IO);
    });
  });

  describe('HOTSPOT_IMPACT_ESTIMATES', () => {
    it('should have regex complexity impact estimate', () => {
      expect(HOTSPOT_IMPACT_ESTIMATES.REGEX_COMPLEXITY).toBe(100);
      expect(HOTSPOT_IMPACT_ESTIMATES.REGEX_COMPLEXITY).toBeGreaterThan(0);
    });

    it('should have sync in async impact estimate', () => {
      expect(HOTSPOT_IMPACT_ESTIMATES.SYNC_IN_ASYNC).toBe(150);
      expect(HOTSPOT_IMPACT_ESTIMATES.SYNC_IN_ASYNC).toBeGreaterThan(0);
    });

    it('should have JSON operations impact estimate', () => {
      expect(HOTSPOT_IMPACT_ESTIMATES.JSON_OPERATIONS).toBe(80);
      expect(HOTSPOT_IMPACT_ESTIMATES.JSON_OPERATIONS).toBeGreaterThan(0);
    });

    it('should have default impact estimate', () => {
      expect(HOTSPOT_IMPACT_ESTIMATES.DEFAULT).toBe(50);
      expect(HOTSPOT_IMPACT_ESTIMATES.DEFAULT).toBeGreaterThan(0);
    });
  });

  describe('MEMORY_IMPACT_ESTIMATES', () => {
    it('should have large array memory impact', () => {
      expect(MEMORY_IMPACT_ESTIMATES.LARGE_ARRAY).toBe(10000000); // 10MB
      expect(MEMORY_IMPACT_ESTIMATES.LARGE_ARRAY).toBeGreaterThan(0);
    });

    it('should have string concatenation memory impact', () => {
      expect(MEMORY_IMPACT_ESTIMATES.STRING_CONCATENATION).toBe(1000000); // 1MB
      expect(MEMORY_IMPACT_ESTIMATES.STRING_CONCATENATION).toBeGreaterThan(0);
    });

    it('should have large array as higher impact', () => {
      expect(MEMORY_IMPACT_ESTIMATES.LARGE_ARRAY).toBeGreaterThan(MEMORY_IMPACT_ESTIMATES.STRING_CONCATENATION);
    });
  });

  describe('CPU_IMPACT_ESTIMATES', () => {
    it('should have nested loops CPU impact', () => {
      expect(CPU_IMPACT_ESTIMATES.NESTED_LOOPS).toBe(80);
      expect(CPU_IMPACT_ESTIMATES.NESTED_LOOPS).toBeGreaterThan(0);
      expect(CPU_IMPACT_ESTIMATES.NESTED_LOOPS).toBeLessThanOrEqual(100);
    });

    it('should have string concatenation CPU impact', () => {
      expect(CPU_IMPACT_ESTIMATES.STRING_CONCATENATION).toBe(30);
      expect(CPU_IMPACT_ESTIMATES.STRING_CONCATENATION).toBeGreaterThan(0);
      expect(CPU_IMPACT_ESTIMATES.STRING_CONCATENATION).toBeLessThanOrEqual(100);
    });

    it('should have sync I/O CPU impact', () => {
      expect(CPU_IMPACT_ESTIMATES.SYNC_IO).toBe(10);
      expect(CPU_IMPACT_ESTIMATES.SYNC_IO).toBeGreaterThan(0);
      expect(CPU_IMPACT_ESTIMATES.SYNC_IO).toBeLessThanOrEqual(100);
    });

    it('should have large array CPU impact', () => {
      expect(CPU_IMPACT_ESTIMATES.LARGE_ARRAY).toBe(20);
      expect(CPU_IMPACT_ESTIMATES.LARGE_ARRAY).toBeGreaterThan(0);
      expect(CPU_IMPACT_ESTIMATES.LARGE_ARRAY).toBeLessThanOrEqual(100);
    });

    it('should have N+1 query CPU impact', () => {
      expect(CPU_IMPACT_ESTIMATES.N_PLUS_ONE).toBe(50);
      expect(CPU_IMPACT_ESTIMATES.N_PLUS_ONE).toBeGreaterThan(0);
      expect(CPU_IMPACT_ESTIMATES.N_PLUS_ONE).toBeLessThanOrEqual(100);
    });

    it('should have default CPU impact', () => {
      expect(CPU_IMPACT_ESTIMATES.DEFAULT).toBe(20);
      expect(CPU_IMPACT_ESTIMATES.DEFAULT).toBeGreaterThan(0);
      expect(CPU_IMPACT_ESTIMATES.DEFAULT).toBeLessThanOrEqual(100);
    });

    it('should have all CPU impacts as valid percentages', () => {
      Object.values(CPU_IMPACT_ESTIMATES).forEach(impact => {
        expect(impact).toBeGreaterThanOrEqual(0);
        expect(impact).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getPerformanceThreshold helper', () => {
    it('should return threshold value when key exists', () => {
      const thresholds = { TEST: 50, ANOTHER: 100 };
      expect(getPerformanceThreshold(thresholds, 'TEST')).toBe(50);
    });

    it('should return fallback when key does not exist', () => {
      const thresholds = { TEST: 50 };
      expect(getPerformanceThreshold(thresholds, 'MISSING')).toBe(0);
    });

    it('should return custom fallback when provided', () => {
      const thresholds = { TEST: 50 };
      expect(getPerformanceThreshold(thresholds, 'MISSING', 42)).toBe(42);
    });

    it('should work with nested threshold objects', () => {
      const thresholds = SCORE_MULTIPLIERS.MEMORY as any;
      expect(getPerformanceThreshold(thresholds, 'ARRAY_ALLOCATION')).toBe(10);
    });
  });

  describe('Threshold value reasonableness', () => {
    it('should have all complexity thresholds as positive numbers', () => {
      Object.values(COMPLEXITY_THRESHOLDS).forEach(threshold => {
        expect(threshold).toBeGreaterThan(0);
        expect(typeof threshold).toBe('number');
      });
    });

    it('should have all memory thresholds as positive numbers', () => {
      Object.values(MEMORY_THRESHOLDS).forEach(threshold => {
        expect(threshold).toBeGreaterThan(0);
        expect(typeof threshold).toBe('number');
      });
    });

    it('should have all pattern thresholds as positive numbers', () => {
      Object.values(PATTERN_THRESHOLDS).forEach(threshold => {
        expect(threshold).toBeGreaterThan(0);
        expect(typeof threshold).toBe('number');
      });
    });

    it('should have all score multipliers as positive numbers', () => {
      Object.values(SCORE_MULTIPLIERS.MEMORY).forEach(multiplier => {
        expect(multiplier).toBeGreaterThan(0);
        expect(typeof multiplier).toBe('number');
      });

      Object.values(SCORE_MULTIPLIERS.CPU).forEach(multiplier => {
        expect(multiplier).toBeGreaterThan(0);
        expect(typeof multiplier).toBe('number');
      });

      Object.values(SCORE_MULTIPLIERS.IO).forEach(multiplier => {
        expect(multiplier).toBeGreaterThan(0);
        expect(typeof multiplier).toBe('number');
      });
    });

    it('should have all performance weights as positive numbers', () => {
      Object.values(PERFORMANCE_WEIGHTS).forEach(weight => {
        expect(weight).toBeGreaterThan(0);
        expect(typeof weight).toBe('number');
      });
    });

    it('should have all impact estimates as positive numbers', () => {
      Object.values(PATTERN_IMPACT_ESTIMATES).forEach(estimate => {
        expect(estimate).toBeGreaterThan(0);
        expect(typeof estimate).toBe('number');
      });

      Object.values(HOTSPOT_IMPACT_ESTIMATES).forEach(estimate => {
        expect(estimate).toBeGreaterThan(0);
        expect(typeof estimate).toBe('number');
      });

      Object.values(MEMORY_IMPACT_ESTIMATES).forEach(estimate => {
        expect(estimate).toBeGreaterThan(0);
        expect(typeof estimate).toBe('number');
      });

      Object.values(CPU_IMPACT_ESTIMATES).forEach(estimate => {
        expect(estimate).toBeGreaterThan(0);
        expect(typeof estimate).toBe('number');
      });
    });
  });

  describe('Threshold constant exports', () => {
    it('should export all threshold constant groups', () => {
      expect(COMPLEXITY_THRESHOLDS).toBeDefined();
      expect(MEMORY_THRESHOLDS).toBeDefined();
      expect(PATTERN_THRESHOLDS).toBeDefined();
      expect(SCORE_MULTIPLIERS).toBeDefined();
      expect(PERFORMANCE_WEIGHTS).toBeDefined();
      expect(PATTERN_IMPACT_ESTIMATES).toBeDefined();
      expect(HOTSPOT_IMPACT_ESTIMATES).toBeDefined();
      expect(MEMORY_IMPACT_ESTIMATES).toBeDefined();
      expect(CPU_IMPACT_ESTIMATES).toBeDefined();
    });

    it('should export getPerformanceThreshold helper function', () => {
      expect(typeof getPerformanceThreshold).toBe('function');
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

    it('should use default values when env vars not set', async () => {
      const { COMPLEXITY_THRESHOLDS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.HIGH).toBe(15);
      expect(fresh.MODERATE).toBe(10);
    });

    it('should override complexity thresholds with environment variables', async () => {
      process.env.PERF_COMPLEXITY_HIGH = '20';
      process.env.PERF_COMPLEXITY_MODERATE = '12';

      const { COMPLEXITY_THRESHOLDS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.HIGH).toBe(20);
      expect(fresh.MODERATE).toBe(12);
    });

    it('should override memory thresholds with environment variables', async () => {
      process.env.PERF_MEMORY_HIGH = '80';
      process.env.PERF_MEMORY_LARGE_ARRAY = '20000';

      const { MEMORY_THRESHOLDS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.HIGH).toBe(80);
      expect(fresh.LARGE_ARRAY_SIZE).toBe(20000);
    });

    it('should override score multipliers with environment variables', async () => {
      process.env.PERF_SCORE_MEMORY_ARRAY = '15';
      process.env.PERF_SCORE_CPU_FOR_LOOP = '3';

      const { SCORE_MULTIPLIERS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.MEMORY.ARRAY_ALLOCATION).toBe(15);
      expect(fresh.CPU.FOR_LOOP).toBe(3);
    });

    it('should override performance weights with environment variables', async () => {
      process.env.PERF_WEIGHT_CRITICAL = '25';
      process.env.PERF_WEIGHT_MAJOR = '15';

      const { PERFORMANCE_WEIGHTS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.CRITICAL_ISSUE).toBe(25);
      expect(fresh.MAJOR_ISSUE).toBe(15);
    });

    it('should ignore invalid environment variable values', async () => {
      process.env.PERF_COMPLEXITY_HIGH = 'invalid';
      process.env.PERF_MEMORY_HIGH = '-50';

      const {
        COMPLEXITY_THRESHOLDS: freshComplexity,
        MEMORY_THRESHOLDS: freshMemory
      } = await import('../../../src/constants/performance-thresholds.js');

      // Should fall back to defaults for invalid values
      expect(freshComplexity.HIGH).toBe(15);
      expect(freshMemory.HIGH).toBe(70);
    });

    it('should handle partial environment variable overrides', async () => {
      process.env.PERF_COMPLEXITY_HIGH = '25';
      // Don't set PERF_COMPLEXITY_MODERATE

      const { COMPLEXITY_THRESHOLDS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.HIGH).toBe(25); // Overridden
      expect(fresh.MODERATE).toBe(10); // Default
    });

    it('should support decimal values for thresholds', async () => {
      process.env.PERF_COMPLEXITY_HIGH = '15.5';

      const { COMPLEXITY_THRESHOLDS: fresh } = await import('../../../src/constants/performance-thresholds.js');

      expect(fresh.HIGH).toBe(15.5);
    });
  });
});
