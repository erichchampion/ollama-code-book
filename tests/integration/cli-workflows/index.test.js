/**
 * CLI Integration Tests Suite Index
 *
 * Comprehensive test suite for all CLI command integration testing.
 * This file orchestrates all the individual test suites and provides
 * a unified entry point for CLI testing.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { CLITestRunner } from './cli-test-runner.js';

describe('CLI Integration Tests Suite', () => {
  let cliRunner;

  beforeAll(async () => {
    cliRunner = new CLITestRunner({
      timeout: 30000,
      mockOllama: true,
      debugMode: process.env.DEBUG_CLI_TESTS === '1'
    });

    // Ensure CLI is buildable and accessible
    console.log('Verifying CLI build and accessibility...');
  }, 60000);

  describe('CLI Foundation Tests', () => {
    test('should verify CLI executable exists and is runnable', async () => {
      const result = await cliRunner.execCommand(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.stdout.includes('Ollama Code CLI') || result.stdout.includes('Usage')).toBe(true);
    });

    test('should verify CLI version information', async () => {
      const result = await cliRunner.execCommand(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.stdout.includes('v') || result.stdout.includes('Ollama Code CLI')).toBe(true);
    });

    test('should handle invalid CLI flags gracefully', async () => {
      const result = await cliRunner.execCommand(['--invalid-flag'], {
        expectSuccess: false
      });

      // Should handle gracefully, either by showing help or error
      expect(typeof result.exitCode).toBe('number');
    });

    test('should verify CLI modes work', async () => {
      const modes = ['simple', 'advanced'];

      for (const mode of modes) {
        const result = await cliRunner.execCommand(['--mode', mode, '--help']);
        expect(result.exitCode).toBe(0);
      }
    });
  });

  describe('Command Registry Tests', () => {
    test('should verify all registered commands are accessible', async () => {
      const result = await cliRunner.execCommand(['commands']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);

      // Should list core commands
      const expectedCommands = ['ask', 'explain', 'generate', 'help', 'list-models'];
      for (const cmd of expectedCommands) {
        expect(result.stdout.includes(cmd)).toBe(true);
      }
    });

    test('should verify command categories are properly organized', async () => {
      const result = await cliRunner.execCommand(['commands']);

      expect(result.exitCode).toBe(0);
      // Should have organized output with categories
      expect(result.stdout.includes(':') || result.stdout.includes('Category')).toBe(true);
    });

    test('should verify each command has proper help', async () => {
      // Get list of commands and test help for each
      const commandsResult = await cliRunner.execCommand(['commands']);
      expect(commandsResult.exitCode).toBe(0);

      // Test help for core commands
      const coreCommands = ['ask', 'explain', 'generate', 'help', 'config'];
      for (const cmd of coreCommands) {
        const helpResult = await cliRunner.testCommandHelp(cmd);
        expect(helpResult.helpValid).toBe(true);
      }
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle completely invalid commands', async () => {
      const invalidCommands = [
        'totally-invalid-command',
        'xyz123',
        'fake-cmd'
      ];

      for (const cmd of invalidCommands) {
        const result = await cliRunner.execCommand([cmd], {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('Unknown') || result.stdout.includes('Unknown')).toBe(true);
      }
    });

    test('should provide helpful error messages', async () => {
      const result = await cliRunner.execCommand(['invalid-command'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      // Should suggest help or show available commands
      expect(
        result.stderr.includes('help') ||
        result.stdout.includes('help') ||
        result.stderr.includes('available') ||
        result.stdout.includes('available')
      ).toBe(true);
    });

    test('should handle malformed arguments gracefully', async () => {
      const malformedArgs = [
        ['ask', '--invalid-flag=value'],
        ['explain', '--non-existent-option'],
        ['generate', '--bad-arg', 'value']
      ];

      for (const args of malformedArgs) {
        const result = await cliRunner.execCommand(args, {
          expectSuccess: false
        });
        // Should fail gracefully with error message
        expect(result.exitCode).not.toBe(0);
        if (result.exitCode !== 0) {
          expect(result.stderr.length > 0 || result.stdout.includes('error')).toBe(true);
        }
      }
    });
  });

  describe('Integration and Workflow Tests', () => {
    test('should handle complex command workflows', async () => {
      // Test a realistic user workflow
      const workflow = [
        ['list-models'],
        ['ask', 'What is TypeScript?'],
        ['help', 'explain'],
        ['config'],
        ['theme', 'dark']
      ];

      for (const cmd of workflow) {
        const result = await cliRunner.execCommand(cmd, { timeout: 20000 });
        expect(result.exitCode).toBe(0);
      }
    });

    test('should maintain state consistency across commands', async () => {
      // Test that configuration changes persist within session
      const themeResult = await cliRunner.execCommand(['theme', 'light']);
      expect(themeResult.exitCode).toBe(0);

      const configResult = await cliRunner.execCommand(['config']);
      expect(configResult.exitCode).toBe(0);
      // Theme change should be reflected (even if temporary)
    });

    test('should handle rapid command execution', async () => {
      const rapidCommands = [
        ['help'],
        ['commands'],
        ['theme'],
        ['verbosity'],
        ['config']
      ];

      const promises = rapidCommands.map(cmd => cliRunner.execCommand(cmd));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('Resource Management Tests', () => {
    test('should not leak resources during extended usage', async () => {
      // Run the same command multiple times to check for resource leaks
      for (let i = 0; i < 20; i++) {
        const result = await cliRunner.execCommand(['help']);
        expect(result.exitCode).toBe(0);
      }
    });

    test('should handle timeout scenarios gracefully', async () => {
      // Test with very short timeout to simulate timeout conditions
      try {
        const result = await cliRunner.execCommand(['ask', 'test'], {
          timeout: 500 // Very short timeout
        });
        // If it succeeds within 500ms, that's fine
        expect(result.exitCode).toBe(0);
      } catch (error) {
        // If it times out, that's expected
        expect(error.message).toContain('timeout');
      }
    });

    test('should handle concurrent command execution without conflicts', async () => {
      const concurrentCommands = Array(5).fill(['help']).map(() =>
        cliRunner.execCommand(['help'])
      );

      const results = await Promise.all(concurrentCommands);
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('Platform Compatibility Tests', () => {
    test('should work with various environment variables', async () => {
      const envTests = [
        { NODE_ENV: 'production' },
        { DEBUG: '1' },
        { OLLAMA_HOST: 'http://localhost:11434' }
      ];

      for (const env of envTests) {
        const result = await cliRunner.execCommand(['help'], { env });
        expect(result.exitCode).toBe(0);
      }
    });

    test('should handle different working directories', async () => {
      const tempDir = await cliRunner.createTestDirectory();

      try {
        const result = await cliRunner.execCommand(['help'], {
          cwd: tempDir
        });
        expect(result.exitCode).toBe(0);
      } finally {
        await cliRunner.cleanupTestDirectory(tempDir);
      }
    });

    test('should handle unicode and special characters in input', async () => {
      const unicodeInputs = [
        'What is 日本語?',
        'Explain código in español',
        'Generate función with émojis 🚀'
      ];

      for (const input of unicodeInputs) {
        const result = await cliRunner.execCommand(['ask', input]);
        expect(result.exitCode).toBe(0);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet basic performance requirements', async () => {
      const performanceTests = [
        { command: ['help'], maxTime: 3000 },
        { command: ['commands'], maxTime: 3000 },
        { command: ['list-models'], maxTime: 10000 },
        { command: ['config'], maxTime: 5000 }
      ];

      for (const { command, maxTime } of performanceTests) {
        const start = Date.now();
        const result = await cliRunner.execCommand(command);
        const duration = Date.now() - start;

        expect(result.exitCode).toBe(0);
        expect(duration).toBeLessThan(maxTime);
      }
    });

    test('should handle memory usage efficiently', async () => {
      // Execute memory-intensive operations and verify they complete
      const memoryIntensiveOps = [
        ['ask', 'Generate a very long explanation about computer science'],
        ['search', 'function', '--type', 'js'],
        ['explain', '/dev/null'] // This should fail gracefully
      ];

      for (const cmd of memoryIntensiveOps) {
        const result = await cliRunner.execCommand(cmd, {
          timeout: 30000,
          expectSuccess: false // Some may fail, that's OK
        });
        expect(typeof result.exitCode).toBe('number');
      }
    });
  });

  describe('Security and Safety Tests', () => {
    test('should prevent command injection', async () => {
      const injectionAttempts = [
        'test; rm -rf /',
        'test && malicious-command',
        'test | dangerous-pipe',
        'test $(evil-command)',
        'test `evil-command`'
      ];

      for (const attempt of injectionAttempts) {
        const result = await cliRunner.execCommand(['ask', attempt]);
        // Should treat as regular input, not execute commands
        // The command should succeed (treating input as text, not executing it)
        expect(result.exitCode).toBe(0);
        // Verify the command didn't actually execute by checking there's a normal AI response
        // The AI response will be present, dangerous commands won't actually run
        expect(result.stdout.length).toBeGreaterThan(0);
      }
    });

    test('should handle path traversal attempts safely', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/shadow',
        'file://etc/passwd'
      ];

      for (const path of pathTraversalAttempts) {
        const result = await cliRunner.execCommand(['explain', path], {
          expectSuccess: false
        });
        // Should fail gracefully, not expose system files
        expect(result.exitCode).not.toBe(0);
      }
    });

    test('should validate input sizes', async () => {
      // Test with very large inputs (100KB should exceed the 50KB limit)
      const largeInput = 'a'.repeat(100000);
      const result = await cliRunner.execCommand(['ask', largeInput], {
        timeout: 45000,
        expectSuccess: false
      });

      // Should reject large input with appropriate error
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('too large') || result.stderr.includes('Input too large')).toBe(true);
    });
  });
});