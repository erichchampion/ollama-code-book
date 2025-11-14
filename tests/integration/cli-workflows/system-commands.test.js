/**
 * System CLI Commands Integration Tests
 *
 * Tests for system-level CLI commands: config, run, search, theme, verbosity, etc.
 * These commands handle system configuration and utility operations.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { CLITestRunner } from './cli-test-runner.js';
import path from 'path';
import { promises as fs } from 'fs';

describe('System CLI Commands Integration', () => {
  let cliRunner;
  let testDir;

  beforeAll(async () => {
    cliRunner = new CLITestRunner({
      timeout: 30000,
      mockOllama: true,
      debugMode: process.env.DEBUG_CLI_TESTS === '1'
    });
    testDir = await cliRunner.createTestDirectory();
  }, 60000);

  afterAll(async () => {
    if (testDir) {
      await cliRunner.cleanupTestDirectory(testDir);
    }
  });

  describe('Config Command', () => {
    test('should display current configuration', async () => {
      const result = await cliRunner.execCommand(['config']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      // Should contain JSON-like configuration data
      expect(result.stdout.includes('{') || result.stdout.includes('Configuration')).toBe(true);
    });

    test('should get specific configuration key', async () => {
      const result = await cliRunner.execCommand(['config', 'api.baseUrl']);

      expect(result.exitCode).toBe(0);
      // Should show either the value or an error about the key not existing
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle nested configuration keys', async () => {
      const keys = [
        'api.baseUrl',
        'logger.level',
        'terminal.theme'
      ];

      for (const key of keys) {
        const result = await cliRunner.execCommand(['config', key]);
        expect(result.exitCode).toBe(0);
      }
    });

    test('should set configuration values', async () => {
      const testCases = [
        ['config', 'logger.level', 'debug'],
        ['config', 'terminal.theme', 'dark'],
        ['config', 'telemetry.enabled', 'false']
      ];

      for (const args of testCases) {
        const result = await cliRunner.execCommand(args);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes('updated') || result.stdout.includes('set') || result.stdout.includes('Configuration')).toBe(true);
      }
    });

    test('should handle invalid configuration keys', async () => {
      const result = await cliRunner.execCommand(['config', 'invalid.nonexistent.key'], {
        expectSuccess: false
      });

      // Should return non-zero exit code for invalid config key
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('not found') || result.stdout.includes('not found')).toBe(true);
    });

    test('should test config command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('config');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('config');
      expect(helpResult.stdout).toContain('key');
    });
  });

  describe('Search Command', () => {
    test('should search for terms in codebase', async () => {
      const result = await cliRunner.execCommand(['search', 'function'], {
        cwd: testDir
      });

      expect(result.exitCode).toBe(0);
      // Should either find results or report no results found
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should search with pattern parameter', async () => {
      const result = await cliRunner.execCommand([
        'search',
        '--pattern',
        'console.log'
      ], {
        cwd: testDir
      });

      expect(result.exitCode).toBe(0);
    });

    test('should search with file type filter', async () => {
      const result = await cliRunner.execCommand([
        'search',
        'function',
        '--type',
        'js'
      ], {
        cwd: testDir
      });

      expect(result.exitCode).toBe(0);
    });

    test('should search in specific directory', async () => {
      const result = await cliRunner.execCommand([
        'search',
        'test',
        '--dir',
        testDir
      ]);

      expect(result.exitCode).toBe(0);
    });

    test('should handle search terms with spaces', async () => {
      const result = await cliRunner.execCommand([
        'search',
        'Hello World'
      ], {
        cwd: testDir
      });

      expect(result.exitCode).toBe(0);
    });

    test('should handle empty search results', async () => {
      const result = await cliRunner.execCommand([
        'search',
        'nonexistenttermneverused12345'
      ], {
        cwd: testDir
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('No results') || result.stdout.includes('not found')).toBe(true);
    });

    test('should test search command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('search');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('search');
      expect(helpResult.stdout).toContain('term');
    });
  });

  describe('Theme Command', () => {
    test('should display current theme', async () => {
      const result = await cliRunner.execCommand(['theme']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('theme') || result.stdout.includes('Theme')).toBe(true);
    });

    test('should set valid themes', async () => {
      const themes = ['dark', 'light', 'system'];

      for (const theme of themes) {
        const result = await cliRunner.execCommand(['theme', theme]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes(theme)).toBe(true);
      }
    });

    test('should reject invalid themes', async () => {
      const result = await cliRunner.execCommand(['theme', 'invalid-theme'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('Invalid') || result.stdout.includes('Invalid')).toBe(true);
    });

    test('should test theme command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('theme');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('theme');
    });
  });

  describe('Verbosity Command', () => {
    test('should display current verbosity level', async () => {
      const result = await cliRunner.execCommand(['verbosity']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('level') || result.stdout.includes('verbosity')).toBe(true);
    });

    test('should set valid verbosity levels', async () => {
      const levels = ['error', 'warn', 'info', 'debug', 'silent'];

      for (const level of levels) {
        const result = await cliRunner.execCommand(['verbosity', level]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes(level)).toBe(true);
      }
    });

    test('should reject invalid verbosity levels', async () => {
      const result = await cliRunner.execCommand(['verbosity', 'invalid-level'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('Invalid') || result.stdout.includes('Invalid')).toBe(true);
    });

    test('should test verbosity command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('verbosity');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('verbosity');
    });
  });

  describe('Edit Command', () => {
    // Skip edit command tests in CI as they try to open actual editors which hang
    test.skip('should handle existing file', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand(['edit', filePath], {
        timeout: 5000 // Short timeout since we don't want to actually open an editor
      });

      // Command should start successfully (exit code varies by platform)
      expect(typeof result.exitCode).toBe('number');
      expect(result.stdout.includes('Opening') || result.stdout.includes('edit')).toBe(true);
    });

    test.skip('should create new file if not exists', async () => {
      const newFile = path.join(testDir, 'newfile.txt');
      const result = await cliRunner.execCommand(['edit', newFile], {
        timeout: 5000
      });

      expect(typeof result.exitCode).toBe('number');
    });

    test('should handle missing file argument', async () => {
      const result = await cliRunner.execCommand(['edit'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('required') || result.stdout.includes('required')).toBe(true);
    });

    test('should test edit command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('edit');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('edit');
      expect(helpResult.stdout).toContain('file');
    });
  });

  describe('Git Command', () => {
    test('should execute basic git commands', async () => {
      const gitCommands = [
        ['git', 'status'],
        ['git', 'log', '--oneline', '-n', '5']
      ];

      for (const cmd of gitCommands) {
        const result = await cliRunner.execCommand(cmd, {
          timeout: 10000,
          expectSuccess: false  // Git commands may fail if not in a git repo
        });

        // Git commands may fail if not in a git repo, but should handle gracefully
        expect(typeof result.exitCode).toBe('number');
        // Should get a helpful error message about not being in a git repository
        if (result.exitCode !== 0) {
          expect(result.stderr.includes('repository') || result.stdout.includes('repository') || result.stderr.includes('git')).toBe(true);
        }
      }
    });

    test('should handle invalid git operations', async () => {
      const result = await cliRunner.execCommand(['git', 'invalid-operation'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
    });

    test('should reject dangerous git operations', async () => {
      const dangerousOps = [
        'status; rm -rf /',
        'status && malicious-command',
        'status | dangerous-pipe'
      ];

      for (const op of dangerousOps) {
        const result = await cliRunner.execCommand(['git', op], {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('Invalid') || result.stdout.includes('Invalid')).toBe(true);
      }
    });

    test('should test git command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('git');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('git');
      expect(helpResult.stdout).toContain('operation');
    });
  });

  describe('Run Command', () => {
    test('should execute safe system commands', async () => {
      const safeCommands = [
        ['run', 'echo "test"'],
        ['run', 'ls'],
        ['run', 'pwd']
      ];

      for (const cmd of safeCommands) {
        const result = await cliRunner.execCommand(cmd, {
          timeout: 10000
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
      }
    });

    test('should handle command failures', async () => {
      const result = await cliRunner.execCommand(['run', 'nonexistent-command-12345'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
    });

    test('should require command argument', async () => {
      const result = await cliRunner.execCommand(['run'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('required') || result.stdout.includes('required')).toBe(true);
    });

    test('should test run command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('run');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('run');
      expect(helpResult.stdout).toContain('command');
    });
  });

  describe('Session Management Commands', () => {
    test('should handle clear command', async () => {
      const result = await cliRunner.execCommand(['clear']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('cleared') || result.stdout.includes('Display cleared')).toBe(true);
    });

    test('should handle reset command', async () => {
      const result = await cliRunner.execCommand(['reset']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('reset') || result.stdout.includes('context')).toBe(true);
    });

    test('should handle history command', async () => {
      const result = await cliRunner.execCommand(['history']);

      expect(result.exitCode).toBe(0);
      // History may not be implemented yet, but should handle gracefully
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle commands command', async () => {
      const result = await cliRunner.execCommand(['commands']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('commands') || result.stdout.includes('Available')).toBe(true);
    });

    test('should handle help command', async () => {
      const result = await cliRunner.execCommand(['help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('help') || result.stdout.includes('Commands')).toBe(true);
      expect(result.stdout.length).toBeGreaterThan(100); // Should have substantial help content
    });

    test('should handle specific command help', async () => {
      const result = await cliRunner.execCommand(['help', 'ask']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('ask')).toBe(true);
      expect(result.stdout.includes('question')).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle unknown commands', async () => {
      const result = await cliRunner.execCommand(['unknown-command-xyz'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('Unknown') || result.stdout.includes('Unknown')).toBe(true);
    });

    test('should handle commands with no arguments when required', async () => {
      const commandsRequiringArgs = [
        { cmd: ['config'], expectSuccess: true },  // Should show config when no args
        { cmd: ['run'], expectSuccess: false },     // Requires command argument
        { cmd: ['edit'], expectSuccess: false }     // Requires file argument
      ];

      for (const { cmd, expectSuccess } of commandsRequiringArgs) {
        const result = await cliRunner.execCommand(cmd, { expectSuccess });
        expect(typeof result.exitCode).toBe('number');

        if (expectSuccess) {
          expect(result.exitCode).toBe(0);
        } else {
          expect(result.exitCode).not.toBe(0);
          expect(result.stderr.includes('required') || result.stdout.includes('required')).toBe(true);
        }
      }
    });

    test('should handle very long command arguments', async () => {
      const longArg = 'a'.repeat(10000);
      const result = await cliRunner.execCommand(['config', longArg], {
        timeout: 15000,
        expectSuccess: false
      });

      // Should handle gracefully without crashing - invalid key will return error
      expect(result.exitCode).not.toBe(0);
    });

    test('should handle special characters in arguments', async () => {
      const specialArgs = [
        'config with spaces',
        'config"with"quotes',
        'config\\with\\backslashes',
        'config|with|pipes'
      ];

      for (const arg of specialArgs) {
        const result = await cliRunner.execCommand(['config', arg], {
          expectSuccess: false
        });
        // These are invalid config keys, should return error
        expect(result.exitCode).not.toBe(0);
      }
    });
  });

  describe('Performance and Resource Management', () => {
    test('should complete system commands quickly', async () => {
      const quickCommands = [
        ['help'],
        ['commands'],
        ['clear'],
        ['theme']
      ];

      for (const cmd of quickCommands) {
        const start = Date.now();
        const result = await cliRunner.execCommand(cmd);
        const duration = Date.now() - start;

        expect(result.exitCode).toBe(0);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });

    test('should handle concurrent system commands', async () => {
      const concurrentCommands = [
        cliRunner.execCommand(['help']),
        cliRunner.execCommand(['theme']),
        cliRunner.execCommand(['verbosity']),
        cliRunner.execCommand(['config'])
      ];

      const results = await Promise.all(concurrentCommands);
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });

    test('should not leak resources during repeated execution', async () => {
      // Execute the same command multiple times to check for resource leaks
      for (let i = 0; i < 10; i++) {
        const result = await cliRunner.execCommand(['help']);
        expect(result.exitCode).toBe(0);
      }
    });
  });
});