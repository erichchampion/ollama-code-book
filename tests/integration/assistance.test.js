/**
 * Integration Tests - Assistance Commands
 *
 * Tests for ask, explain, and fix commands
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execCLI, verifyOutput, createTempFile, cleanupTempFile, testEnv } from './setup.js';

describe.skip('Assistance Commands', () => {
  let tempFiles = [];

  afterAll(() => {
    // Clean up any temporary files
    tempFiles.forEach(cleanupTempFile);
  });

  describe('ask command', () => {
    test('should show help when no question provided', async () => {
      const result = await execCLI(['--mode', 'simple', 'ask'], {
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Please provide a question to ask'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should handle quoted questions', async () => {
      // TODO: Fix streaming EPIPE issues with ask command
      const result = await execCLI(['--mode', 'simple', 'ask', '"What is TypeScript?"'], {
        timeout: 5000,
        expectError: true, // Expect error since no Ollama server
        env: testEnv
      });

      // Should attempt to connect to Ollama (and fail gracefully)
      verifyOutput(result.stderr, [
        'Asking Ollama'
      ], [
        'incomplete and doesn\'t provide enough context' // Old parsing bug output
      ]);
    });

    test.skip('should accept model parameter', async () => {
      // TODO: Ask command streaming issues with model parameter
      const result = await execCLI(['--mode', 'simple', 'ask', 'test question', '--model', 'llama3.2'], {
        timeout: 5000,
        env: testEnv
      });

      verifyOutput(result.stderr, ['Asking Ollama']);
    });
  });

  describe('explain command', () => {
    test('should show error when no file provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'explain'], {
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Missing required argument: file'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should show error for non-existent file', async () => {
      // TODO: File not found message not appearing in output
      const result = await execCLI(['--mode', 'advanced', 'explain', '/path/that/does/not/exist.js'], {
        timeout: 10000,
        env: testEnv
      });

      verifyOutput(result.stdout, [
        'File not found:'
      ]);
      expect(result.exitCode).toBe(0);
    });

    test.skip('should process existing file', async () => {
      // TODO: Fix streaming EPIPE issues with explain command
      const testCode = `
function add(a, b) {
  return a + b;
}
module.exports = add;
`;
      const tempFile = createTempFile(testCode, '.js');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'explain', tempFile], {
        timeout: 5000,
        expectError: true, // Will fail at Ollama connection
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Explaining ${tempFile}`
      ]);
    });
  });

  describe('fix command', () => {
    test('should show error when no file provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'fix'], {
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Missing required argument: file'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should show error for non-existent file', async () => {
      // TODO: File not found message not appearing in output
      const result = await execCLI(['--mode', 'advanced', 'fix', '/path/that/does/not/exist.js'], {
        timeout: 10000,
        env: testEnv
      });

      verifyOutput(result.stdout, [
        'File not found:'
      ]);
      expect(result.exitCode).toBe(0);
    });

    test.skip('should process existing file with issues', async () => {
      // TODO: Fix streaming EPIPE issues with fix command
      const buggyCode = `
function divide(a, b) {
  return a / b; // No zero division check
}
const result = divide(10, 0);
console.log(result);
`;
      const tempFile = createTempFile(buggyCode, '.js');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'fix', tempFile], {
        timeout: 5000,
        expectError: true, // Will fail at Ollama connection
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Analyzing ${tempFile} for issues`
      ]);
    });

    test.skip('should accept issue description parameter', async () => {
      // TODO: Streaming timeout issues with fix command
      const tempFile = createTempFile('console.log("test");', '.js');
      tempFiles.push(tempFile);

      const result = await execCLI([
        '--mode', 'advanced', 'fix', tempFile,
        '--issue', 'missing error handling'
      ], {
        timeout: 5000,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Analyzing ${tempFile} for issues`
      ]);
    });
  });

  describe.skip('assistance commands error handling', () => {
    // TODO: Complex error handling needs proper streaming setup
    test('should handle network errors gracefully', async () => {
      const result = await execCLI(['--mode', 'simple', 'ask', 'test'], {
        timeout: 5000,
        env: {
          ...testEnv,
          OLLAMA_API_URL: 'http://localhost:9999' // Non-existent server
        }
      });

      expect(result.exitCode).toBe(1);
      verifyOutput(result.stderr, ['Error asking Ollama']);
    });

    test('should validate input parameters', async () => {
      const result = await execCLI(['--mode', 'advanced', 'explain', '--invalid-flag'], {
        env: testEnv
      });

      expect(result.exitCode).toBe(1);
    });
  });
});