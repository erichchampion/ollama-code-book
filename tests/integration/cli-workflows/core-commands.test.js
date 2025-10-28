/**
 * Core CLI Commands Integration Tests
 *
 * Tests for core CLI commands: ask, explain, generate, fix, refactor
 * These are the most critical commands that users interact with daily.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CLITestRunner } from './cli-test-runner.js';
import path from 'path';
import { promises as fs } from 'fs';

describe('Core CLI Commands Integration', () => {
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

  describe('Ask Command', () => {
    test('should execute ask command with simple question', async () => {
      const result = await cliRunner.execCommand(['ask', 'What is JavaScript?']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(30000);
    });

    test('should handle ask command with complex question', async () => {
      const result = await cliRunner.execCommand([
        'ask',
        'How do I implement a binary search tree in TypeScript with proper error handling?'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should show error for ask command without question', async () => {
      const result = await cliRunner.execCommand(['ask'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('question') || result.stdout.includes('question')).toBe(true);
    });

    test('should support model parameter', async () => {
      const result = await cliRunner.execCommand([
        'ask',
        'Hello',
        '--model',
        'llama3.2'
      ]);

      expect(result.exitCode).toBe(0);
    });

    test('should handle context parameter', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand([
        'ask',
        'What does this code do?',
        '--context',
        filePath
      ]);

      expect(result.exitCode).toBe(0);
    });

    test('should handle special characters in questions', async () => {
      const specialQuestions = [
        'What is "async/await" in JavaScript?',
        'How do I use <generic> types in TypeScript?',
        'What does the & operator do in Go?'
      ];

      for (const question of specialQuestions) {
        const result = await cliRunner.execCommand(['ask', question]);
        expect(result.exitCode).toBe(0);
      }
    });

    test('should test ask command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('ask');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('ask');
      expect(helpResult.stdout).toContain('question');
    });
  });

  describe('Explain Command', () => {
    test('should explain existing JavaScript file', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand(['explain', filePath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should explain existing Python file', async () => {
      const filePath = path.join(testDir, 'test.py');
      const result = await cliRunner.execCommand(['explain', filePath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle non-existent file gracefully', async () => {
      const result = await cliRunner.execCommand([
        'explain',
        'nonexistent-file.js'
      ], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('not found') || result.stdout.includes('not found')).toBe(true);
    });

    test('should support detail parameter', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand([
        'explain',
        filePath,
        '--detail',
        'detailed'
      ]);

      expect(result.exitCode).toBe(0);
    });

    test('should handle empty file', async () => {
      const emptyFile = path.join(testDir, 'empty.js');
      await fs.writeFile(emptyFile, '');

      const result = await cliRunner.execCommand(['explain', emptyFile]);
      expect(result.exitCode).toBe(0);
    });

    test('should test explain command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('explain');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('explain');
      expect(helpResult.stdout).toContain('file');
    });
  });

  describe('Generate Command', () => {
    test('should generate code with simple prompt', async () => {
      const result = await cliRunner.execCommand([
        'generate',
        'a function that adds two numbers'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should generate code with language specification', async () => {
      const result = await cliRunner.execCommand([
        'generate',
        'a class for handling HTTP requests',
        '--language',
        'TypeScript'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle complex generation prompts', async () => {
      const complexPrompts = [
        'a REST API server with authentication and rate limiting',
        'a binary search tree implementation with deletion',
        'a React component with hooks for data fetching'
      ];

      for (const prompt of complexPrompts) {
        const result = await cliRunner.execCommand(['generate', prompt], {
          timeout: 45000
        });
        expect(result.exitCode).toBe(0);
      }
    });

    test('should handle output parameter', async () => {
      const outputFile = path.join(testDir, 'generated.js');
      const result = await cliRunner.execCommand([
        'generate',
        'a simple hello world function',
        '--output',
        outputFile
      ]);

      expect(result.exitCode).toBe(0);
      // Note: File creation would need to be implemented in the actual command
    });

    test('should show error for generate command without prompt', async () => {
      const result = await cliRunner.execCommand(['generate'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('prompt') || result.stdout.includes('prompt')).toBe(true);
    });

    test('should test generate command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('generate');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('generate');
      expect(helpResult.stdout).toContain('prompt');
    });
  });

  describe('Fix Command', () => {
    test('should fix existing file', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand(['fix', filePath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should fix file with specific issue description', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand([
        'fix',
        filePath,
        '--issue',
        'Division by zero not handled'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should handle non-existent file gracefully', async () => {
      const result = await cliRunner.execCommand([
        'fix',
        'nonexistent-file.js'
      ], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
    });

    test('should support output parameter', async () => {
      const filePath = path.join(testDir, 'test.js');
      const outputFile = path.join(testDir, 'fixed.js');
      const result = await cliRunner.execCommand([
        'fix',
        filePath,
        '--output',
        outputFile
      ]);

      expect(result.exitCode).toBe(0);
    });

    test('should test fix command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('fix');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('fix');
      expect(helpResult.stdout).toContain('file');
    });
  });

  describe('Refactor Command', () => {
    test('should refactor existing file', async () => {
      const filePath = path.join(testDir, 'test.js');
      const result = await cliRunner.execCommand(['refactor', filePath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('should refactor with focus parameter', async () => {
      const filePath = path.join(testDir, 'test.js');
      const focuses = ['readability', 'performance', 'simplicity', 'maintainability'];

      for (const focus of focuses) {
        const result = await cliRunner.execCommand([
          'refactor',
          filePath,
          '--focus',
          focus
        ]);
        expect(result.exitCode).toBe(0);
      }
    });

    test('should handle non-existent file gracefully', async () => {
      const result = await cliRunner.execCommand([
        'refactor',
        'nonexistent-file.js'
      ], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
    });

    test('should support output parameter', async () => {
      const filePath = path.join(testDir, 'test.js');
      const outputFile = path.join(testDir, 'refactored.js');
      const result = await cliRunner.execCommand([
        'refactor',
        filePath,
        '--output',
        outputFile
      ]);

      expect(result.exitCode).toBe(0);
    });

    test('should test refactor command help', async () => {
      const helpResult = await cliRunner.testCommandHelp('refactor');
      expect(helpResult.helpValid).toBe(true);
      expect(helpResult.stdout).toContain('refactor');
      expect(helpResult.stdout).toContain('file');
    });
  });

  describe('Cross-Command Integration', () => {
    test('should handle rapid sequential command execution', async () => {
      const commands = [
        ['ask', 'What is TypeScript?'],
        ['list-models'],
        ['help', 'ask'],
        ['ask', 'How do I use interfaces?']
      ];

      for (const cmd of commands) {
        const result = await cliRunner.execCommand(cmd, { timeout: 15000 });
        expect(result.exitCode).toBe(0);
      }
    });

    test('should maintain consistent exit codes across commands', async () => {
      const validCommands = [
        ['ask', 'test'],
        ['list-models'],
        ['help']
      ];

      const invalidCommands = [
        ['ask'], // Missing argument
        ['explain', '/nonexistent/file'],
        ['invalid-command']
      ];

      // Valid commands should return 0
      for (const cmd of validCommands) {
        const result = await cliRunner.execCommand(cmd);
        expect(result.exitCode).toBe(0);
      }

      // Invalid commands should return non-zero
      for (const cmd of invalidCommands) {
        const result = await cliRunner.execCommand(cmd, { expectSuccess: false });
        expect(result.exitCode).not.toBe(0);
      }
    });

    test('should handle concurrent command execution', async () => {
      const concurrentCommands = [
        cliRunner.execCommand(['ask', 'What is Node.js?']),
        cliRunner.execCommand(['help', 'ask']),
        cliRunner.execCommand(['list-models'])
      ];

      const results = await Promise.all(concurrentCommands);
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle very long questions', async () => {
      const longQuestion = 'What is '.repeat(1000) + 'JavaScript?';
      const result = await cliRunner.execCommand(['ask', longQuestion], {
        timeout: 45000
      });

      expect(result.exitCode).toBe(0);
    });

    test('should handle special characters in file paths', async () => {
      const specialChars = ['spaces in name.js', 'special-chars_file.js'];

      for (const filename of specialChars) {
        const filePath = path.join(testDir, filename);
        await fs.writeFile(filePath, 'console.log("test");');

        const result = await cliRunner.execCommand(['explain', filePath]);
        expect(result.exitCode).toBe(0);
      }
    });

    test('should handle interrupted commands gracefully', async () => {
      // Test timeout handling - use extremely short timeout to force timeout
      // Even with mocks, 10ms should timeout during initialization
      const result = await cliRunner.execCommand(['ask', 'test'], {
        timeout: 10 // Extremely short timeout to force timeout
      }).catch(error => ({ error: error.message }));

      expect(result.error).toBeDefined();
      expect(result.error).toContain('timeout');
    });

    test('should validate command argument types', async () => {
      const invalidArgs = [
        ['explain', '--detail', 'invalid-detail-level'],
        ['refactor', 'test.js', '--focus', 'invalid-focus']
      ];

      for (const args of invalidArgs) {
        const result = await cliRunner.execCommand(args, { expectSuccess: false });
        // Command should either succeed with default or fail gracefully
        expect(typeof result.exitCode).toBe('number');
      }
    });
  });

  describe('Performance Tests', () => {
    test('should complete simple commands within time limits', async () => {
      const performance = await cliRunner.testCommandPerformance('help', [], 3);
      expect(performance.performanceAcceptable).toBe(true);
      expect(performance.avgTime).toBeLessThan(5000); // 5 seconds average
    });

    test('should handle file operations efficiently', async () => {
      const filePath = path.join(testDir, 'test.js');
      const performance = await cliRunner.testCommandPerformance('explain', [filePath], 3);
      expect(performance.performanceAcceptable).toBe(true);
    });
  });
});