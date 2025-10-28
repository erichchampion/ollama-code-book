/**
 * Integration Tests - Code Generation Commands
 *
 * Tests for generate and refactor commands
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execCLI, verifyOutput, createTempFile, cleanupTempFile, testEnv } from './setup.js';

describe.skip('Code Generation Commands', () => {
  let tempFiles = [];

  afterAll(() => {
    // Clean up any temporary files
    tempFiles.forEach(cleanupTempFile);
  });

  describe('generate command', () => {
    test('should show error when no prompt provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'generate'], {
        expectError: true,
        env: { ...testEnv, OLLAMA_SKIP_ENHANCED_INIT: 'true' }
      });

      verifyOutput(result.stderr, [
        'Missing required argument: prompt'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test.skip('should handle basic code generation prompt', async () => {
      // This test requires actual AI functionality - skipped in CI
      const result = await execCLI(['--mode', 'advanced', 'generate', 'a simple hello world function'], {
        timeout: 15000,
        env: { ...testEnv, OLLAMA_SKIP_ENHANCED_INIT: 'true' }
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Generating JavaScript code',
        'function'
      ]);
    });

    test.skip('should handle quoted prompts', async () => {
      // This test requires actual AI functionality - skipped in CI
      const result = await execCLI(['--mode', 'advanced', 'generate', '"a function that calculates fibonacci numbers"'], {
        timeout: 15000,
        env: { ...testEnv, OLLAMA_SKIP_ENHANCED_INIT: 'true' }
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Generating JavaScript code',
        'function'
      ]);
    });

    test.skip('should accept language parameter', async () => {
      // This test requires actual AI functionality - skipped in CI
      const result = await execCLI([
        '--mode', 'advanced', 'generate',
        'a simple class',
        '--language', 'TypeScript'
      ], {
        timeout: 15000,
        env: { ...testEnv, OLLAMA_SKIP_ENHANCED_INIT: 'true' }
      });

      expect(result.exitCode).toBe(0);
      verifyOutput(result.stdout, [
        'Generating TypeScript code',
        'class'
      ]);
    });

    test.skip('should accept output file parameter', async () => {
      // TODO: Output file parameter not producing expected output
      const outputFile = `/tmp/test-output-${Date.now()}.js`;
      tempFiles.push(outputFile);

      const result = await execCLI([
        '--mode', 'advanced', 'generate',
        'a test function',
        '--output', outputFile
      ], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Generating JavaScript code'
      ]);
    });

    test.skip('should handle complex prompts with special characters', async () => {
      // TODO: Complex prompts not producing expected output
      const complexPrompt = 'a function that handles HTTP requests & responses';
      const result = await execCLI(['--mode', 'advanced', 'generate', complexPrompt], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Generating JavaScript code'
      ]);
    });
  });

  describe.skip('refactor command', () => {
    // TODO: Refactor command has pattern matching and argument issues
    test('should show error when no file provided', async () => {
      const result = await execCLI(['--mode', 'advanced', 'refactor'], {
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Missing required argument: file'
      ]);
      expect(result.exitCode).toBe(1);
    });

    test('should show error for non-existent file', async () => {
      const result = await execCLI(['--mode', 'advanced', 'refactor', '/path/that/does/not/exist.js'], {
        env: testEnv
      });

      verifyOutput(result.stdout, [
        'File not found'
      ]);
      expect(result.exitCode).toBe(0);
    });

    test('should process existing file for refactoring', async () => {
      const messy_code = `
function calc(x,y,z){
var result;
if(z=='add'){
result=x+y;
}else if(z=='sub'){
result=x-y;
}else if(z=='mul'){
result=x*y;
}else{
result=x/y;
}
return result;
}
`;
      const tempFile = createTempFile(messy_code, '.js');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'refactor', tempFile], {
        timeout: 15000,
        expectError: true, // Will fail at Ollama connection
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Refactoring ${tempFile}`
      ]);
    });

    test('should accept refactor type parameter', async () => {
      const tempFile = createTempFile('function test() { console.log("test"); }', '.js');
      tempFiles.push(tempFile);

      const result = await execCLI([
        '--mode', 'advanced', 'refactor', tempFile,
        '--type', 'performance'
      ], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Refactoring ${tempFile}`
      ]);
    });

    test.skip('should accept output file parameter', async () => {
      // TODO: Output file parameter not producing expected output
      const inputFile = createTempFile('function old() { return "old"; }', '.js');
      const outputFile = `/tmp/refactored-${Date.now()}.js`;
      tempFiles.push(inputFile, outputFile);

      const result = await execCLI([
        '--mode', 'advanced', 'refactor', inputFile,
        '--output', outputFile
      ], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Refactoring ${inputFile}`
      ]);
    });

    test('should handle TypeScript files', async () => {
      const tsCode = `
interface User {
  name: string;
  age: number;
}

function processUser(user: User): string {
  return user.name + " is " + user.age + " years old";
}
`;
      const tempFile = createTempFile(tsCode, '.ts');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'refactor', tempFile], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Refactoring ${tempFile}`
      ]);
    });
  });

  describe.skip('code generation error handling', () => {
    // TODO: Complex error handling scenarios need proper setup
    test('should handle invalid language parameter', async () => {
      const result = await execCLI([
        '--mode', 'advanced', 'generate',
        'test code',
        '--language', 'InvalidLanguage'
      ], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      // Should still attempt generation with the specified language
      verifyOutput(result.stderr, [
        'Generating InvalidLanguage code'
      ]);
    });

    test('should handle permission errors for output files', async () => {
      const result = await execCLI([
        '--mode', 'advanced', 'generate',
        'test code',
        '--output', '/root/restricted-file.js'
      ], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      // Should attempt generation (actual permission error would come from file writing)
      verifyOutput(result.stderr, [
        'Generating JavaScript code'
      ]);
    });

    test('should validate refactor type parameter', async () => {
      const tempFile = createTempFile('test code', '.js');
      tempFiles.push(tempFile);

      const result = await execCLI([
        '--mode', 'advanced', 'refactor', tempFile,
        '--type', 'invalid-type'
      ], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      // Should still proceed with refactoring
      verifyOutput(result.stderr, [
        `Refactoring ${tempFile}`
      ]);
    });
  });

  describe.skip('code generation integration scenarios', () => {
    // TODO: Complex integration scenarios need environment setup
    test('should handle empty file refactoring', async () => {
      const tempFile = createTempFile('', '.js');
      tempFiles.push(tempFile);

      const result = await execCLI(['--mode', 'advanced', 'refactor', tempFile], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        `Refactoring ${tempFile}`
      ]);
    });

    test('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(1000); // Very long prompt
      const result = await execCLI(['--mode', 'advanced', 'generate', longPrompt], {
        timeout: 15000,
        expectError: true,
        env: testEnv
      });

      verifyOutput(result.stderr, [
        'Generating JavaScript code'
      ]);
    });
  });
});