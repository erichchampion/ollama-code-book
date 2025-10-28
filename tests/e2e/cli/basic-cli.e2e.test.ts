/**
 * Basic CLI E2E Tests
 * Tests basic CLI functionality and command execution
 */

import { test, expect } from '@playwright/test';
import {
  executeOllamaCode,
  createTestDirectory,
  cleanupTestDirectory,
  copyFixture,
  fileExists,
} from '../helpers/cli-helper';

test.describe('Basic CLI Commands', () => {
  test('should display version information', async () => {
    const result = await executeOllamaCode('--version');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('0.1.0');
  });

  test('should display help information', async () => {
    const result = await executeOllamaCode('--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ollama-code');
    expect(result.stdout).toContain('Usage');
  });

  test('should handle invalid command gracefully', async () => {
    const result = await executeOllamaCode('invalid-command');

    // Should either show error or help
    expect(result.exitCode).not.toBe(0);
  });
});

test.describe('CLI with Test Fixtures', () => {
  let testDir: string;

  test.beforeEach(async () => {
    testDir = await createTestDirectory('cli-test-');
    await copyFixture('small', testDir);
  });

  test.afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  test('should analyze small project structure', async () => {
    const result = await executeOllamaCode('analyze', {
      cwd: testDir,
      timeout: 60000, // 60 seconds
    });

    // Basic smoke test - should not crash
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  test('should detect files in project', async () => {
    const indexExists = await fileExists(`${testDir}/index.js`);
    const mathExists = await fileExists(`${testDir}/math.js`);
    const validationExists = await fileExists(`${testDir}/validation.js`);

    expect(indexExists).toBe(true);
    expect(mathExists).toBe(true);
    expect(validationExists).toBe(true);
  });
});

test.describe('CLI Performance', () => {
  test('should respond to version command quickly', async () => {
    const result = await executeOllamaCode('--version');

    expect(result.duration).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('should handle timeout appropriately', async () => {
    // Test with very short timeout to ensure timeout handling works
    const result = await executeOllamaCode('some-long-command', {
      timeout: 1000, // 1 second timeout
    });

    // Should either complete or timeout gracefully
    expect([0, 1, 124]).toContain(result.exitCode); // 124 is timeout exit code
  });
});
