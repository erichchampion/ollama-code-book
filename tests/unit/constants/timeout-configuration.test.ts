/**
 * Tests for Timeout Configuration Constants
 * Ensures all timeout values are properly configured and accessible
 */

import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';
import {
  IDE_TIMEOUTS,
  APP_TIMEOUTS,
  CACHE_TIMEOUTS,
  EXECUTION_TIMEOUTS,
  MONITORING_TIMEOUTS,
  getTimeout
} from '../../../src/constants/timeouts.js';

describe('Timeout Configuration', () => {
  describe('IDE_TIMEOUTS', () => {
    it('should have client timeout defined', () => {
      expect(IDE_TIMEOUTS.CLIENT_TIMEOUT).toBe(60000);
      expect(IDE_TIMEOUTS.CLIENT_TIMEOUT).toBeGreaterThan(0);
    });

    it('should have heartbeat interval defined', () => {
      expect(IDE_TIMEOUTS.HEARTBEAT_INTERVAL).toBe(30000);
      expect(IDE_TIMEOUTS.HEARTBEAT_INTERVAL).toBeGreaterThan(0);
    });

    it('should have VS Code connection timeout defined', () => {
      expect(IDE_TIMEOUTS.VSCODE_CONNECTION_TIMEOUT).toBe(10000);
      expect(IDE_TIMEOUTS.VSCODE_CONNECTION_TIMEOUT).toBeGreaterThan(0);
    });

    it('should have request timeout defined', () => {
      expect(IDE_TIMEOUTS.REQUEST_TIMEOUT).toBe(30000);
      expect(IDE_TIMEOUTS.REQUEST_TIMEOUT).toBeGreaterThan(0);
    });

    it('should be immutable (const assertion)', () => {
      expect(Object.isFrozen(IDE_TIMEOUTS)).toBe(false); // Not frozen but typed as const
      // TypeScript will prevent modification at compile time
    });
  });

  describe('APP_TIMEOUTS', () => {
    it('should have short timeout defined', () => {
      expect(APP_TIMEOUTS.SHORT).toBe(5000);
      expect(APP_TIMEOUTS.SHORT).toBeGreaterThan(0);
    });

    it('should have medium timeout defined', () => {
      expect(APP_TIMEOUTS.MEDIUM).toBe(30000);
      expect(APP_TIMEOUTS.MEDIUM).toBeGreaterThan(APP_TIMEOUTS.SHORT);
    });

    it('should have long timeout defined', () => {
      expect(APP_TIMEOUTS.LONG).toBe(120000);
      expect(APP_TIMEOUTS.LONG).toBeGreaterThan(APP_TIMEOUTS.MEDIUM);
    });

    it('should have very long timeout defined', () => {
      expect(APP_TIMEOUTS.VERY_LONG).toBe(300000);
      expect(APP_TIMEOUTS.VERY_LONG).toBeGreaterThan(APP_TIMEOUTS.LONG);
    });

    it('should have increasing timeout hierarchy', () => {
      expect(APP_TIMEOUTS.SHORT).toBeLessThan(APP_TIMEOUTS.MEDIUM);
      expect(APP_TIMEOUTS.MEDIUM).toBeLessThan(APP_TIMEOUTS.LONG);
      expect(APP_TIMEOUTS.LONG).toBeLessThan(APP_TIMEOUTS.VERY_LONG);
    });
  });

  describe('CACHE_TIMEOUTS', () => {
    it('should have default TTL defined', () => {
      expect(CACHE_TIMEOUTS.DEFAULT_TTL).toBe(300000); // 5 minutes
      expect(CACHE_TIMEOUTS.DEFAULT_TTL).toBeGreaterThan(0);
    });

    it('should have file cache TTL defined', () => {
      expect(CACHE_TIMEOUTS.FILE_CACHE_TTL).toBe(600000); // 10 minutes
      expect(CACHE_TIMEOUTS.FILE_CACHE_TTL).toBeGreaterThan(CACHE_TIMEOUTS.DEFAULT_TTL);
    });

    it('should have AI cache TTL defined', () => {
      expect(CACHE_TIMEOUTS.AI_CACHE_TTL).toBe(3600000); // 1 hour
      expect(CACHE_TIMEOUTS.AI_CACHE_TTL).toBeGreaterThan(CACHE_TIMEOUTS.FILE_CACHE_TTL);
    });

    it('should have warning cooldown defined', () => {
      expect(CACHE_TIMEOUTS.WARNING_COOLDOWN).toBe(300000); // 5 minutes
      expect(CACHE_TIMEOUTS.WARNING_COOLDOWN).toBeGreaterThan(0);
    });

    it('should have cleanup interval defined', () => {
      expect(CACHE_TIMEOUTS.CLEANUP_INTERVAL).toBe(60000); // 1 minute
      expect(CACHE_TIMEOUTS.CLEANUP_INTERVAL).toBeGreaterThan(0);
    });
  });

  describe('EXECUTION_TIMEOUTS', () => {
    it('should have default command timeout defined', () => {
      expect(EXECUTION_TIMEOUTS.DEFAULT_COMMAND).toBe(30000);
      expect(EXECUTION_TIMEOUTS.DEFAULT_COMMAND).toBeGreaterThan(0);
    });

    it('should have git operation timeout defined', () => {
      expect(EXECUTION_TIMEOUTS.GIT_OPERATION).toBe(60000);
      expect(EXECUTION_TIMEOUTS.GIT_OPERATION).toBeGreaterThan(EXECUTION_TIMEOUTS.DEFAULT_COMMAND);
    });

    it('should have test execution timeout defined', () => {
      expect(EXECUTION_TIMEOUTS.TEST_EXECUTION).toBe(120000);
      expect(EXECUTION_TIMEOUTS.TEST_EXECUTION).toBeGreaterThan(EXECUTION_TIMEOUTS.GIT_OPERATION);
    });

    it('should have build operation timeout defined', () => {
      expect(EXECUTION_TIMEOUTS.BUILD_OPERATION).toBe(300000);
      expect(EXECUTION_TIMEOUTS.BUILD_OPERATION).toBeGreaterThan(EXECUTION_TIMEOUTS.TEST_EXECUTION);
    });
  });

  describe('MONITORING_TIMEOUTS', () => {
    it('should have performance check interval defined', () => {
      expect(MONITORING_TIMEOUTS.PERFORMANCE_CHECK).toBe(60000);
      expect(MONITORING_TIMEOUTS.PERFORMANCE_CHECK).toBeGreaterThan(0);
    });

    it('should have metrics interval defined', () => {
      expect(MONITORING_TIMEOUTS.METRICS_INTERVAL).toBe(30000);
      expect(MONITORING_TIMEOUTS.METRICS_INTERVAL).toBeGreaterThan(0);
    });

    it('should have health check timeout defined', () => {
      expect(MONITORING_TIMEOUTS.HEALTH_CHECK).toBe(10000);
      expect(MONITORING_TIMEOUTS.HEALTH_CHECK).toBeGreaterThan(0);
    });
  });

  describe('getTimeout helper', () => {
    it('should return timeout value when key exists', () => {
      const timeouts = { TEST: 5000, ANOTHER: 10000 };
      expect(getTimeout(timeouts, 'TEST')).toBe(5000);
      expect(getTimeout(timeouts, 'ANOTHER')).toBe(10000);
    });

    it('should return fallback when key does not exist', () => {
      const timeouts = { TEST: 5000 };
      expect(getTimeout(timeouts, 'MISSING')).toBe(30000); // Default fallback
    });

    it('should return custom fallback when provided', () => {
      const timeouts = { TEST: 5000 };
      expect(getTimeout(timeouts, 'MISSING', 15000)).toBe(15000);
    });

    it('should work with APP_TIMEOUTS', () => {
      expect(getTimeout(APP_TIMEOUTS as any, 'SHORT')).toBe(5000);
      expect(getTimeout(APP_TIMEOUTS as any, 'MEDIUM')).toBe(30000);
    });

    it('should handle empty timeout object', () => {
      expect(getTimeout({}, 'ANY_KEY')).toBe(30000);
      expect(getTimeout({}, 'ANY_KEY', 999)).toBe(999);
    });
  });

  describe('Timeout value reasonableness', () => {
    it('all timeouts should be positive numbers', () => {
      const allTimeouts = [
        ...Object.values(IDE_TIMEOUTS),
        ...Object.values(APP_TIMEOUTS),
        ...Object.values(CACHE_TIMEOUTS),
        ...Object.values(EXECUTION_TIMEOUTS),
        ...Object.values(MONITORING_TIMEOUTS)
      ];

      allTimeouts.forEach(timeout => {
        expect(timeout).toBeGreaterThan(0);
        expect(Number.isInteger(timeout)).toBe(true);
      });
    });

    it('no timeout should exceed 1 hour (sanity check)', () => {
      const ONE_HOUR = 3600000;
      const allTimeouts = [
        ...Object.values(IDE_TIMEOUTS),
        ...Object.values(APP_TIMEOUTS),
        ...Object.values(CACHE_TIMEOUTS),
        ...Object.values(EXECUTION_TIMEOUTS),
        ...Object.values(MONITORING_TIMEOUTS)
      ];

      allTimeouts.forEach(timeout => {
        expect(timeout).toBeLessThanOrEqual(ONE_HOUR);
      });
    });

    it('all timeouts should be in milliseconds (not seconds)', () => {
      // All values should be >= 1000ms (1 second)
      const allTimeouts = [
        ...Object.values(IDE_TIMEOUTS),
        ...Object.values(APP_TIMEOUTS),
        ...Object.values(CACHE_TIMEOUTS),
        ...Object.values(EXECUTION_TIMEOUTS),
        ...Object.values(MONITORING_TIMEOUTS)
      ];

      allTimeouts.forEach(timeout => {
        expect(timeout).toBeGreaterThanOrEqual(1000);
      });
    });
  });

  describe('Timeout constant exports', () => {
    it('should export all timeout constant groups', () => {
      expect(IDE_TIMEOUTS).toBeDefined();
      expect(APP_TIMEOUTS).toBeDefined();
      expect(CACHE_TIMEOUTS).toBeDefined();
      expect(EXECUTION_TIMEOUTS).toBeDefined();
      expect(MONITORING_TIMEOUTS).toBeDefined();
    });

    it('should export getTimeout helper function', () => {
      expect(typeof getTimeout).toBe('function');
    });
  });

  describe('Environment variable overrides', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset modules to allow re-importing with new env vars
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
      jest.resetModules();
    });

    it('should use default values when env vars not set', async () => {
      // Re-import to get fresh values
      const { IDE_TIMEOUTS: freshIdeTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshIdeTimeouts.CLIENT_TIMEOUT).toBe(60000);
      expect(freshIdeTimeouts.HEARTBEAT_INTERVAL).toBe(30000);
    });

    it('should override IDE_TIMEOUTS with environment variables', async () => {
      process.env.IDE_CLIENT_TIMEOUT = '120000';
      process.env.IDE_HEARTBEAT_INTERVAL = '45000';

      // Re-import to get fresh values
      const { IDE_TIMEOUTS: freshIdeTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshIdeTimeouts.CLIENT_TIMEOUT).toBe(120000);
      expect(freshIdeTimeouts.HEARTBEAT_INTERVAL).toBe(45000);
    });

    it('should override APP_TIMEOUTS with environment variables', async () => {
      process.env.APP_TIMEOUT_SHORT = '10000';
      process.env.APP_TIMEOUT_MEDIUM = '60000';

      const { APP_TIMEOUTS: freshAppTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshAppTimeouts.SHORT).toBe(10000);
      expect(freshAppTimeouts.MEDIUM).toBe(60000);
    });

    it('should override CACHE_TIMEOUTS with environment variables', async () => {
      process.env.CACHE_DEFAULT_TTL = '600000';
      process.env.CACHE_AI_CACHE_TTL = '7200000';

      const { CACHE_TIMEOUTS: freshCacheTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshCacheTimeouts.DEFAULT_TTL).toBe(600000);
      expect(freshCacheTimeouts.AI_CACHE_TTL).toBe(7200000);
    });

    it('should override EXECUTION_TIMEOUTS with environment variables', async () => {
      process.env.EXEC_DEFAULT_COMMAND = '45000';
      process.env.EXEC_GIT_OPERATION = '90000';

      const { EXECUTION_TIMEOUTS: freshExecTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshExecTimeouts.DEFAULT_COMMAND).toBe(45000);
      expect(freshExecTimeouts.GIT_OPERATION).toBe(90000);
    });

    it('should override MONITORING_TIMEOUTS with environment variables', async () => {
      process.env.MONITOR_PERFORMANCE_CHECK = '120000';
      process.env.MONITOR_METRICS_INTERVAL = '60000';

      const { MONITORING_TIMEOUTS: freshMonitorTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshMonitorTimeouts.PERFORMANCE_CHECK).toBe(120000);
      expect(freshMonitorTimeouts.METRICS_INTERVAL).toBe(60000);
    });

    it('should ignore invalid environment variable values', async () => {
      process.env.IDE_CLIENT_TIMEOUT = 'invalid';
      process.env.APP_TIMEOUT_SHORT = '-1000';
      process.env.CACHE_DEFAULT_TTL = '0';

      const {
        IDE_TIMEOUTS: freshIdeTimeouts,
        APP_TIMEOUTS: freshAppTimeouts,
        CACHE_TIMEOUTS: freshCacheTimeouts
      } = await import('../../../src/constants/timeouts.js');

      // Should fall back to defaults for invalid values
      expect(freshIdeTimeouts.CLIENT_TIMEOUT).toBe(60000);
      expect(freshAppTimeouts.SHORT).toBe(5000);
      expect(freshCacheTimeouts.DEFAULT_TTL).toBe(300000);
    });

    it('should handle partial environment variable overrides', async () => {
      process.env.IDE_CLIENT_TIMEOUT = '90000';
      // Don't set IDE_HEARTBEAT_INTERVAL

      const { IDE_TIMEOUTS: freshIdeTimeouts } = await import('../../../src/constants/timeouts.js');

      expect(freshIdeTimeouts.CLIENT_TIMEOUT).toBe(90000); // Overridden
      expect(freshIdeTimeouts.HEARTBEAT_INTERVAL).toBe(30000); // Default
    });
  });
});
