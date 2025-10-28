/**
 * Basic Security Testing - Simplified Version
 *
 * Minimal security tests to identify blocking issues before running full OWASP tests
 */

import { describe, test, expect } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Basic Security Tests', () => {
  const cliPath = path.resolve(__dirname, '../../dist/src/cli-selector.js');
  const timeout = 10000;

  function execCLI(args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        env: {
          ...process.env,
          OLLAMA_HOST: 'http://localhost:99999', // Non-existent host to avoid real connections
          NODE_ENV: 'test'
        },
        stdio: 'pipe',
        timeout: options.timeout || timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({
          exitCode: -1,
          stdout: stdout.trim(),
          stderr: stderr.trim() + '\nTEST_TIMEOUT',
          timedOut: true
        });
      }, options.timeout || timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut: false
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          exitCode: 1,
          stdout: '',
          stderr: error.message,
          timedOut: false
        });
      });
    });
  }

  test('should prevent directory traversal in file operations', async () => {
    const result = await execCLI(['explain', '../../../etc/passwd'], { timeout: 5000 });

    // Should either fail or handle safely
    expect(result.timedOut).toBe(false);
    // Security fix should block the attack (logged in stderr)
    expect(result.stderr.includes('Directory traversal attempt blocked') ||
           result.stderr.includes('Access denied')).toBe(true);
  }, 15000);

  test('should reject dangerous command execution', async () => {
    const result = await execCLI(['run', 'echo "test"; rm -rf /'], { timeout: 5000 });

    // Should prevent dangerous command execution
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).not.toBe(0);
  }, 15000);

  test('should handle help command safely', async () => {
    const result = await execCLI(['help'], { timeout: 5000 });

    // Help should work without hanging
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  }, 15000);

  test('should handle invalid commands gracefully', async () => {
    const result = await execCLI(['nonexistent-command'], { timeout: 5000 });

    // Should handle invalid commands without hanging
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).not.toBe(0);
  }, 15000);

  test('should prevent command injection in search', async () => {
    const result = await execCLI(['search', '"; rm -rf /'], { timeout: 5000 });

    // Should handle search input safely
    expect(result.timedOut).toBe(false);
    // Search should sanitize the input (logged in stderr)
    expect(result.stderr.includes('Search term sanitized')).toBe(true);
    // Command should complete without executing the injection (exit 0)
    expect(result.exitCode).toBe(0);
  }, 15000);
});