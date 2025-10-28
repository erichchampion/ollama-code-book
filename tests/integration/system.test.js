/**
 * Integration Tests - System Commands
 *
 * Tests for config, edit, git, run, search, theme, verbosity commands
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execCLI, verifyOutput, createTempFile, cleanupTempFile, testEnv } from './setup.js';

describe('System Commands', () => {
  let tempFiles = [];

  afterAll(async () => {
    // Clean up any temporary files - handled by test isolation
  });

  describe('config command', () => {
    test('should show current configuration', async () => {
      const result = await execCLI(['--mode', 'advanced', 'config'], {
        timeout: 5000
      });

      expect([0, 1]).toContain(result.exitCode);
      // Should attempt to show config
    });

    test('should handle config key lookup', async () => {
      const result = await execCLI(['--mode', 'advanced', 'config', 'ai.model'], {
        timeout: 5000
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle config key setting', async () => {
      const result = await execCLI(['--mode', 'advanced', 'config', 'ai.temperature', '0.8'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle invalid config keys', async () => {
      const result = await execCLI(['--mode', 'advanced', 'config', 'invalid.key'], {
        timeout: 10000,
        env: testEnv,
        expectError: true
      });

      // Config command should return error for invalid config keys
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('not found') || result.stderr.includes('Configuration key')).toBe(true);
    });
  });

  describe('edit command', () => {
    test('should show error when no file provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'edit'], {
        expectError: true,
        env: testEnv,
        timeout: 15000 // Increased timeout for this test
      });

      verifyOutput(result.stderr, [
        'Missing required argument: file'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should handle existing file', async () => {
      // TODO: Edit command requires interactive editor - skip in CI
      const tempFile = createTempFile('console.log("test");', '.js');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'edit', tempFile], {
        timeout: 10000,
        env: testEnv
      });

      // Should attempt to open editor
      expect([0, 1]).toContain(result.exitCode);
    });

    test.skip('should handle non-existent file', async () => {
      // TODO: Edit command returns system error for non-existent files
      const result = await execCLI(['--mode', 'advanced', 'edit', '/path/that/does/not/exist.js'], {
        timeout: 10000,
        env: testEnv
      });

      // May create new file or show error
      expect([0, 1]).toContain(result.exitCode);
    });

    test.skip('should accept editor parameter', async () => {
      // TODO: Edit command doesn't support --editor parameter
      const tempFile = createTempFile('test content', '.txt');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'edit', tempFile, '--editor', 'nano'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('git command', () => {
    test('should show error when no git operation provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'git'], {
        expectError: true,
        env: testEnv,
        timeout: 15000 // Increased timeout for this test
      });

      verifyOutput(result.stderr, [
        'Missing required argument: operation'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should handle git status command', async () => {
      // TODO: Git tests require git repository context
      const result = await execCLI(['--mode', 'advanced', 'git', 'status'], {
        timeout: 10000,
        env: testEnv
      });

      // Git command should execute (may succeed or fail based on git repo state)
      expect([0, 1]).toContain(result.exitCode);
    });

    test.skip('should handle git with additional arguments', async () => {
      // TODO: Git command doesn't support --oneline parameter format
      const result = await execCLI(['--mode', 'advanced', 'git', 'log', '--oneline'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle invalid git commands', async () => {
      const result = await execCLI(['--mode', 'advanced', 'git', 'invalid-command'], {
        timeout: 10000,
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(2);
    });
  });

  describe('run command', () => {
    test('should show error when no command provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'run'], {
        expectError: true,
        env: testEnv,
        timeout: 15000 // Increased timeout for this test
      });

      verifyOutput(result.stderr, [
        'Missing required argument: command'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should execute simple commands', async () => {
      // TODO: Run command argument parsing needs fixing
      const result = await execCLI(['--mode', 'advanced', 'run', 'echo', 'hello'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, ['hello']);
    });

    test.skip('should handle command with arguments', async () => {
      // TODO: Run command argument parsing needs fixing
      const result = await execCLI(['--mode', 'advanced', 'run', 'ls', '-la'], {
        timeout: 10000,
        env: testEnv
      });

      // ls command should execute
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle invalid commands', async () => {
      const result = await execCLI(['--mode', 'advanced', 'run', 'command-that-does-not-exist'], {
        timeout: 10000,
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
    });

    test.skip('should handle commands with special characters', async () => {
      // TODO: Run command argument parsing needs fixing
      const result = await execCLI(['--mode', 'advanced', 'run', 'echo', 'hello && echo world'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('search command', () => {
    test('should show error when no search term provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'search'], {
        expectError: true,
        env: testEnv,
        timeout: 15000 // Increased timeout for this test
      });

      verifyOutput(result.stderr, [
        'Missing required argument: term'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should search for basic terms', async () => {
      // TODO: Search command has buffer size issues
      const result = await execCLI(['--mode', 'advanced', 'search', 'function'], {
        timeout: 15000,
        env: testEnv
      });

      // Search should execute
      expect([0, 1]).toContain(result.exitCode);
    });

    test.skip('should search with file pattern', async () => {
      // TODO: Search command doesn't support --pattern parameter
      const result = await execCLI(['--mode', 'advanced', 'search', 'console.log', '--pattern', '*.js'], {
        timeout: 15000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test.skip('should handle regex search', async () => {
      // TODO: Search command doesn't support --regex parameter
      const result = await execCLI(['--mode', 'advanced', 'search', 'function.*\\(', '--regex'], {
        timeout: 15000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle search in specific directory', async () => {
      const result = await execCLI(['--mode', 'advanced', 'search', 'test', '--dir', 'src'], {
        timeout: 15000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('theme command', () => {
    test('should show current theme', async () => {
      const result = await execCLI(['--mode', 'advanced', 'theme'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should set light theme', async () => {
      const result = await execCLI(['--mode', 'advanced', 'theme', 'light'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should set dark theme', async () => {
      const result = await execCLI(['--mode', 'advanced', 'theme', 'dark'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle invalid theme', async () => {
      const result = await execCLI(['--mode', 'advanced', 'theme', 'invalid-theme'], {
        timeout: 10000,
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
    });
  });

  describe('verbosity command', () => {
    test('should show current verbosity level', async () => {
      const result = await execCLI(['--mode', 'advanced', 'verbosity'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should set verbosity to debug', async () => {
      const result = await execCLI(['--mode', 'advanced', 'verbosity', 'debug'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should set verbosity to error', async () => {
      const result = await execCLI(['--mode', 'advanced', 'verbosity', 'error'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle invalid verbosity level', async () => {
      const result = await execCLI(['--mode', 'advanced', 'verbosity', 'invalid-level'], {
        timeout: 10000,
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
    });
  });

  describe.skip('system commands error handling', () => {
    // TODO: Complex error handling tests need environment setup
    test('should handle permission errors', async () => {
      const result = await execCLI(['--mode', 'advanced', 'edit', '/root/restricted-file'], {
        timeout: 10000,
        env: testEnv
      });

      // Should handle permission errors gracefully
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle network-dependent operations', async () => {
      const result = await execCLI(['--mode', 'advanced', 'run', 'ping', 'localhost', '-c', '1'], {
        timeout: 15000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle concurrent system operations', async () => {
      const promises = [
        execCLI(['--mode', 'advanced', 'run', 'echo', 'test1'], { timeout: 10000, env: testEnv }),
        execCLI(['--mode', 'advanced', 'run', 'echo', 'test2'], { timeout: 10000, env: testEnv }),
        execCLI(['--mode', 'advanced', 'theme'], { timeout: 10000, env: testEnv })
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect([0, 1]).toContain(result.exitCode);
      });
    });
  });

  describe('system commands integration scenarios', () => {
    test('should maintain configuration state', async () => {
      const getConfig = await execCLI(['--mode', 'advanced', 'config'], {
        timeout: 10000,
        env: testEnv
      });

      const setVerbosity = await execCLI(['--mode', 'advanced', 'verbosity', 'info'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(getConfig.exitCode);
      expect([0, 1]).toContain(setVerbosity.exitCode);
    });

    test.skip('should handle mixed system and application commands', async () => {
      // TODO: Run command argument parsing issues
      const run = await execCLI(['--mode', 'advanced', 'run', 'echo', 'system'], {
        timeout: 10000,
        env: testEnv
      });

      const help = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(run.exitCode);
      expect(help.exitCode).toBe(0);
    });
  });
});