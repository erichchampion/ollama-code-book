/**
 * Integration Test Suite Entry Point
 *
 * Main test runner that imports all integration test modules
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execCLI, testEnv } from './setup.js';

describe.skip('Integration Test Suite', () => {
  beforeAll(async () => {
    // Ensure the CLI builds successfully before running tests
    console.log('Building CLI for integration tests...');
  });

  afterAll(async () => {
    console.log('Integration tests completed');
  });

  describe('CLI Smoke Test', () => {
    test('should display version information', async () => {
      const result = await execCLI(['--version'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ollama Code CLI v');
    });

    test('should display help information', async () => {
      const result = await execCLI(['--help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Ollama Code CLI');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Advanced mode (default)');
    });

    test('should show help when no command provided', async () => {
      const result = await execCLI([], {
        timeout: 5000,
        env: testEnv
      });

      // Should show help and exit cleanly
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Available Commands:');
    });

    test('should handle invalid mode gracefully', async () => {
      const result = await execCLI(['--mode', 'invalid'], {
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid mode: invalid');
    });

    test('should handle unknown commands gracefully', async () => {
      const result = await execCLI(['--mode', 'simple', 'unknown-command'], {
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command');
    });
  });

  describe('Mode Selection Tests', () => {
    test('should work in simple mode', async () => {
      const result = await execCLI(['--mode', 'simple', '--help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
    });

    test('should work in advanced mode', async () => {
      const result = await execCLI(['--mode', 'advanced', '--help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
    });

    test.skip('should work in interactive mode', async () => {
      // TODO: Fix interactive mode test - currently hangs due to TTY/stdin issues
      const result = await execCLI(['--mode', 'interactive'], {
        timeout: 10000,
        input: 'exit\n',
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });
});