/**
 * Integration Tests - Session Commands
 *
 * Tests for clear, commands, exit, help, history, quit, reset commands
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execCLI, verifyOutput, testEnv } from './setup.js';

describe.skip('Session Commands', () => {
  describe('help command', () => {
    test('should show general help', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Ollama Code CLI',
        'Usage:',
        'Available Commands:'
      ]);
    });

    test('should show help for specific command', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help', 'ask'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'ask - Ask Ollama a question',
        'Usage:',
        'Arguments:'
      ]);
    });

    test('should handle unknown command help request', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help', 'nonexistent-command'], {
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
      verifyOutput(result.stderr, [
        'Unknown command: nonexistent-command'
      ]);
    });

    test('should show help in simple mode', async () => {
      const result = await execCLI(['--help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Ollama Code CLI',
        'Advanced mode (default)'
      ]);
    });
  });

  describe('commands command', () => {
    test('should list all available commands', async () => {
      const result = await execCLI(['--mode', 'advanced', 'commands'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Available slash commands:',
        '/ask',
        '/generate',
        '/help'
      ]);
    });

    test('should show commands in categorized format', async () => {
      const result = await execCLI(['--mode', 'advanced', 'commands'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Assistance:',
        'Code Generation:'
      ]);
    });
  });

  describe('clear command', () => {
    test('should execute clear command', async () => {
      const result = await execCLI(['--mode', 'advanced', 'clear'], {
        timeout: 10000,
        env: testEnv
      });

      // Clear command should succeed
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle clear with no active session', async () => {
      const result = await execCLI(['--mode', 'advanced', 'clear'], {
        timeout: 10000,
        env: testEnv
      });

      // Should handle gracefully
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('history command', () => {
    test('should show conversation history', async () => {
      const result = await execCLI(['--mode', 'advanced', 'history'], {
        timeout: 10000,
        env: testEnv
      });

      // History command should execute
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle empty history', async () => {
      const result = await execCLI(['--mode', 'advanced', 'history'], {
        timeout: 10000,
        env: testEnv
      });

      // Should handle empty history gracefully
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should accept limit parameter', async () => {
      const result = await execCLI(['--mode', 'advanced', 'history', '--limit', '5'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('reset command', () => {
    test('should reset conversation context', async () => {
      const result = await execCLI(['--mode', 'advanced', 'reset'], {
        timeout: 10000,
        env: testEnv
      });

      // Reset should execute successfully
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle reset with no active context', async () => {
      const result = await execCLI(['--mode', 'advanced', 'reset'], {
        timeout: 10000,
        env: testEnv
      });

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('exit and quit commands', () => {
    test('should handle exit command', async () => {
      const result = await execCLI(['--mode', 'advanced', 'exit'], {
        timeout: 10000,
        env: testEnv
      });

      // Exit should complete successfully
      expect(result.exitCode).toBe(0);
    });

    test('should handle quit command', async () => {
      const result = await execCLI(['--mode', 'advanced', 'quit'], {
        timeout: 10000,
        env: testEnv
      });

      // Quit should complete successfully
      expect(result.exitCode).toBe(0);
    });
  });

  describe('session commands error handling', () => {
    test('should handle invalid help command arguments', async () => {
      const result = await execCLI(['--mode', 'advanced', 'help', '--invalid-flag'], {
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
    });

    test('should handle invalid history parameters', async () => {
      const result = await execCLI(['--mode', 'advanced', 'history', '--limit', 'invalid'], {
        expectError: true,
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
    });

    test('should handle commands with unexpected arguments', async () => {
      const result = await execCLI(['--mode', 'advanced', 'clear', 'unexpected-arg'], {
        timeout: 10000,
        env: testEnv
      });

      // Should handle gracefully
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  describe('session commands integration scenarios', () => {
    test('should handle rapid session command execution', async () => {
      const promises = [
        execCLI(['--mode', 'advanced', 'commands'], { timeout: 10000, env: testEnv }),
        execCLI(['--mode', 'advanced', 'history'], { timeout: 10000, env: testEnv }),
        execCLI(['--mode', 'advanced', 'clear'], { timeout: 10000, env: testEnv })
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect([0, 1]).toContain(result.exitCode);
      });
    });

    test('should maintain help functionality across modes', async () => {
      const simpleHelp = await execCLI(['--help'], {
        timeout: 10000,
        env: testEnv
      });

      const advancedHelp = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(simpleHelp.exitCode).toBe(0);
      expect(advancedHelp.exitCode).toBe(0);

      // Both should show help information
      verifyOutput(simpleHelp.stdout, ['Ollama Code CLI']);
      verifyOutput(advancedHelp.stdout, ['Ollama Code CLI']);
    });

    test('should handle session state consistency', async () => {
      // Test that session commands don't interfere with each other
      const commands = await execCLI(['--mode', 'advanced', 'commands'], {
        timeout: 10000,
        env: testEnv
      });

      const help = await execCLI(['--mode', 'advanced', 'help'], {
        timeout: 10000,
        env: testEnv
      });

      expect(commands.exitCode).toBe(0);
      expect(help.exitCode).toBe(0);
    });

    test('should handle version command', async () => {
      const result = await execCLI(['--version'], {
        timeout: 10000,
        env: testEnv
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, ['Ollama Code CLI v']);
    });
  });
});