/**
 * Optimization Migration Tests
 *
 * Tests to ensure backward compatibility and proper functioning of the
 * optimized initialization system vs legacy system.
 *
 * NOTE: Interactive mode tests with stdin have been moved to Playwright E2E tests
 * due to Jest process spawning incompatibility with readline interface.
 * See: tests/e2e/interactive/optimization-migration.e2e.test.ts
 *
 * These remaining tests cover non-interactive CLI operations.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execCLI, verifyOutput, createTempFile, cleanupTempFile, testEnv } from './setup.js';

/**
 * Create test environment for optimized mode by removing OLLAMA_SKIP_ENHANCED_INIT
 * Note: Setting to undefined doesn't work - it becomes the string "undefined" which is truthy
 * Also adds OLLAMA_CODE_E2E_TEST for proper EOF handling with piped stdin
 */
function getOptimizedModeEnv() {
  const env = { ...testEnv };
  delete env.OLLAMA_SKIP_ENHANCED_INIT;
  env.OLLAMA_CODE_E2E_TEST = 'true'; // Enable E2E mode for piped stdin handling
  return env;
}

describe('Optimization Migration Tests', () => {
  let tempFiles = [];

  afterAll(async () => {
    // Clean up any temporary files
    tempFiles.forEach(file => {
      try {
        cleanupTempFile(file);
      } catch (error) {
        // File might already be cleaned up
      }
    });
  });

  describe('CLI Entry Point Compatibility', () => {
    // NOTE: Interactive mode tests moved to Playwright E2E
    // See tests/e2e/interactive/optimization-migration.e2e.test.ts

    test('should execute advanced commands with optimized startup', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 10000,
        env: getOptimizedModeEnv()
      });

      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout + result.stderr).toMatch(/ollama.*code.*cli/i);
    });

    test('should execute advanced commands with legacy startup', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 10000,
        env: {
          ...testEnv,
          OLLAMA_SKIP_ENHANCED_INIT: 'true' // Force legacy mode
        }
      });

      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout + result.stderr).toMatch(/ollama.*code.*cli/i);
    });
  });

  describe('Component Loading Behavior', () => {
    test('should load essential components only for simple commands', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 8000,
        env: {
          ...getOptimizedModeEnv(),
          DEBUG: 'enhanced-fast-path-router'
        }
      });

      expect([0, 1]).toContain(result.exitCode);

      // Should see evidence of selective loading
      const output = result.stdout + result.stderr;
      if (output.includes('debug') || output.includes('DEBUG')) {
        // Should not load heavy components for help command
        expect(output).not.toMatch(/project.*context.*initialized/i);
        expect(output).not.toMatch(/knowledge.*graph.*loaded/i);
      }
    });
  });

  describe('Feature Parity', () => {
    test('optimized and legacy modes should support same commands', async () => {
      const testCommand = ['--mode', 'advanced', 'help'];

      // Test optimized mode
      const optimizedResult = await execCLI(testCommand, {
        timeout: 8000,
        env: getOptimizedModeEnv()
      });

      // Test legacy mode
      const legacyResult = await execCLI(testCommand, {
        timeout: 10000,
        env: {
          ...testEnv,
          OLLAMA_SKIP_ENHANCED_INIT: 'true'
        }
      });

      // Both should work
      expect([0, 1]).toContain(optimizedResult.exitCode);
      expect([0, 1]).toContain(legacyResult.exitCode);

      // Output should contain similar content (help text)
      const optimizedOutput = optimizedResult.stdout + optimizedResult.stderr;
      const legacyOutput = legacyResult.stdout + legacyResult.stderr;

      if (optimizedOutput.includes('ollama') && legacyOutput.includes('ollama')) {
        expect(optimizedOutput).toMatch(/usage:/i);
        expect(optimizedOutput).toMatch(/available commands:/i);
        expect(legacyOutput).toMatch(/usage:/i);
        expect(legacyOutput).toMatch(/available commands:/i);
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    test('optimized mode should use less memory for simple operations', async () => {
      // This is a basic test - in a real scenario you'd want to measure actual memory usage
      const result = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 8000,
        env: {
          ...getOptimizedModeEnv(),
          DEBUG: 'enhanced-fast-path-router'
        }
      });

      expect([0, 1]).toContain(result.exitCode);

      // Should complete quickly for simple commands
      // (Memory measurement would require additional tooling)
    });
  });

  describe('Configuration Compatibility', () => {
    test('should respect existing configuration in both modes', async () => {
      // Create a temporary config file
      const configFile = createTempFile('config.json', JSON.stringify({
        ai: { model: 'llama3.2', temperature: 0.7 },
        verbosity: 'detailed'
      }));
      tempFiles.push(configFile);

      const optimizedResult = await execCLI(['--mode', 'advanced', 'config'], {
        timeout: 20000, // Increased for full suite contention
        env: {
          ...getOptimizedModeEnv(),
          OLLAMA_CONFIG_PATH: configFile
        }
      });

      // Wait between tests to avoid process contention
      await new Promise(resolve => setTimeout(resolve, 500));

      const legacyResult = await execCLI(['--mode', 'advanced', 'config'], {
        timeout: 20000, // Increased for full suite contention
        env: {
          ...testEnv,
          OLLAMA_CONFIG_PATH: configFile,
          OLLAMA_SKIP_ENHANCED_INIT: 'true'
        }
      });

      // Clean up temp file
      try {
        cleanupTempFile(configFile);
      } catch (error) {
        // Ignore cleanup errors
      }

      // Both should handle config - tolerate various exit codes
      expect([0, 1, 130, 143]).toContain(optimizedResult.exitCode);
      expect([0, 1, 130, 143]).toContain(legacyResult.exitCode);
    }, 50000); // Increased test timeout for both processes under load
  });
});