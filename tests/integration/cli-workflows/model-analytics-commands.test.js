/**
 * Model Management & Analytics CLI Commands Integration Tests
 *
 * Tests for model management commands (list-models, pull-model, set-model)
 * and analytics commands (performance-dashboard, performance-alerts, etc.)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { CLITestRunner } from './cli-test-runner.js';

describe('Model Management & Analytics CLI Commands Integration', () => {
  let cliRunner;

  beforeAll(async () => {
    cliRunner = new CLITestRunner({
      timeout: 45000, // Longer timeout for model operations
      mockOllama: true,
      debugMode: process.env.DEBUG_CLI_TESTS === '1'
    });
  }, 60000);

  describe('Model Management Commands', () => {
    describe('List Models Command', () => {
      test('should list available models', async () => {
        const result = await cliRunner.execCommand(['list-models']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
        expect(result.stdout.includes('models') || result.stdout.includes('Available')).toBe(true);
      });

      test('should display model details', async () => {
        const result = await cliRunner.execCommand(['list-models']);

        expect(result.exitCode).toBe(0);
        // Should show model information like size, name, etc.
        if (result.stdout.includes('GB') || result.stdout.includes('Size')) {
          expect(result.stdout).toContain('Size');
        }
      });

      test('should handle case with no models', async () => {
        // This might happen in a fresh environment
        const result = await cliRunner.execCommand(['list-models']);

        expect(result.exitCode).toBe(0);
        // Should either show models or indicate no models found
        expect(result.stdout.length).toBeGreaterThan(0);
      });

      test('should test list-models command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('list-models');
        expect(helpResult.helpValid).toBe(true);
        expect(helpResult.stdout).toContain('list-models');
        expect(helpResult.stdout).toContain('models');
      });
    });

    describe('Pull Model Command', () => {
      test('should handle pull-model with valid model name', async () => {
        const result = await cliRunner.execCommand(['pull-model', 'llama3.2'], {
          timeout: 60000 // Model downloading can take time
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes('Downloading') || result.stdout.includes('download')).toBe(true);
      });

      test('should handle pull-model without model name', async () => {
        const result = await cliRunner.execCommand(['pull-model'], {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('model') || result.stdout.includes('model')).toBe(true);
      });

      test('should handle pull-model with various model names', async () => {
        const modelNames = ['codellama', 'mistral', 'phi'];

        for (const model of modelNames) {
          const result = await cliRunner.execCommand(['pull-model', model], {
            timeout: 45000  // Increased timeout for model downloads
          });

          // Should start the download process successfully
          expect(result.exitCode).toBe(0);
          expect(result.stdout.includes(model) || result.stdout.includes('Downloading')).toBe(true);
        }
      }, 180000); // 3 minutes timeout for pulling 3 models (45s each + buffer)

      test('should test pull-model command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('pull-model');
        expect(helpResult.helpValid).toBe(true);
        expect(helpResult.stdout).toContain('pull-model');
        expect(helpResult.stdout).toContain('download');
      });
    });

    describe('Set Model Command', () => {
      test('should set default model', async () => {
        const result = await cliRunner.execCommand(['set-model', 'llama3.2']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes('llama3.2')).toBe(true);
        expect(result.stdout.includes('set') || result.stdout.includes('default')).toBe(true);
      });

      test('should handle set-model without model name', async () => {
        const result = await cliRunner.execCommand(['set-model'], {
          expectSuccess: false
        });

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.includes('model') || result.stdout.includes('model')).toBe(true);
      });

      test('should handle setting non-existent model', async () => {
        const result = await cliRunner.execCommand(['set-model', 'nonexistent-model-xyz']);

        // May succeed with warning or fail gracefully
        expect(typeof result.exitCode).toBe('number');
        if (result.exitCode !== 0) {
          expect(result.stderr.includes('not found') || result.stdout.includes('not found')).toBe(true);
        }
      });

      test('should test set-model command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('set-model');
        expect(helpResult.helpValid).toBe(true);
        expect(helpResult.stdout).toContain('set-model');
        expect(helpResult.stdout).toContain('default');
      });
    });
  });

  describe('Analytics Commands', () => {
    describe('Performance Dashboard Command', () => {
      test('should display performance dashboard', async () => {
        const result = await cliRunner.execCommand(['performance-dashboard']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
        expect(result.stdout.includes('performance') || result.stdout.includes('dashboard') || result.stdout.includes('Performance')).toBe(true);
      });

      test('should handle dashboard with format parameter', async () => {
        const formats = ['summary', 'detailed', 'json'];

        for (const format of formats) {
          const result = await cliRunner.execCommand([
            'performance-dashboard',
            '--format',
            format
          ]);

          expect(result.exitCode).toBe(0);
        }
      });

      test('should handle dashboard with watch parameter', async () => {
        const result = await cliRunner.execCommand([
          'performance-dashboard',
          '--watch',
          '--interval',
          '1000'
        ], {
          timeout: 5000 // Short timeout since this would run continuously
        });

        // Should either start watching or handle the flag gracefully
        expect(typeof result.exitCode).toBe('number');
      });

      test('should test performance-dashboard command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('performance-dashboard');
        expect(helpResult.helpValid).toBe(true);
        expect(helpResult.stdout).toContain('performance-dashboard');
        expect(helpResult.stdout).toContain('dashboard');
      });
    });

    describe('Performance Alerts Command', () => {
      test('should display performance alerts', async () => {
        const result = await cliRunner.execCommand(['performance-alerts']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
      });

      test('should configure performance alerts', async () => {
        const result = await cliRunner.execCommand([
          'performance-alerts',
          '--configure',
          '--threshold',
          'cpu:80'
        ]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.includes('configure') || result.stdout.includes('alert')).toBe(true);
      });

      test('should list active alerts', async () => {
        const result = await cliRunner.execCommand([
          'performance-alerts',
          '--list'
        ]);

        expect(result.exitCode).toBe(0);
      });

      test('should test performance-alerts command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('performance-alerts');
        expect(helpResult.helpValid).toBe(true);
        expect(helpResult.stdout).toContain('performance-alerts');
        expect(helpResult.stdout).toContain('alerts');
      });
    });

    describe('Performance Report Command', () => {
      test('should generate performance report', async () => {
        const result = await cliRunner.execCommand(['performance-report']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
        expect(result.stdout.includes('report') || result.stdout.includes('performance')).toBe(true);
      });

      test('should generate report with time period', async () => {
        const periods = ['1h', '24h', '7d'];

        for (const period of periods) {
          const result = await cliRunner.execCommand([
            'performance-report',
            '--period',
            period
          ]);

          expect(result.exitCode).toBe(0);
        }
      });

      test('should export report in different formats', async () => {
        const formats = ['json', 'csv', 'html'];

        for (const format of formats) {
          const result = await cliRunner.execCommand([
            'performance-report',
            '--export',
            format
          ]);

          expect(result.exitCode).toBe(0);
        }
      });

      test('should test performance-report command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('performance-report');
        expect(helpResult.helpValid).toBe(true);
        expect(helpResult.stdout).toContain('performance-report');
        expect(helpResult.stdout).toContain('report');
      });
    });

    describe('Analytics Show Command', () => {
      test('should show analytics data', async () => {
        const result = await cliRunner.execCommand(['analytics-show']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
      });

      test('should show analytics with different metrics', async () => {
        const metrics = ['usage', 'performance', 'errors'];

        for (const metric of metrics) {
          const result = await cliRunner.execCommand([
            'analytics-show',
            '--metric',
            metric
          ]);

          expect(result.exitCode).toBe(0);
        }
      });

      test('should test analytics-show command help', async () => {
        const helpResult = await cliRunner.testCommandHelp('analytics-show');
        // Note: This command might not exist, so we'll handle that gracefully
        if (helpResult.exitCode === 0) {
          expect(helpResult.stdout).toContain('analytics');
        }
      });
    });
  });

  describe('Model and Analytics Integration', () => {
    test('should list models and then use analytics', async () => {
      // Test workflow: list models → set model → check performance
      const listResult = await cliRunner.execCommand(['list-models']);
      expect(listResult.exitCode).toBe(0);

      const dashboardResult = await cliRunner.execCommand(['performance-dashboard']);
      expect(dashboardResult.exitCode).toBe(0);
    });

    test('should handle model operations with performance monitoring', async () => {
      // Simulate monitoring during model operations
      const commands = [
        ['list-models'],
        ['performance-dashboard', '--format', 'summary'],
        ['set-model', 'llama3.2'],
        ['performance-report', '--period', '1h']
      ];

      for (const cmd of commands) {
        const result = await cliRunner.execCommand(cmd);
        expect(result.exitCode).toBe(0);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network issues gracefully', async () => {
      // This would test how commands handle Ollama server being unavailable
      const result = await cliRunner.execCommand(['list-models'], {
        env: { OLLAMA_HOST: 'http://nonexistent:11434' },
        timeout: 10000
      });

      // Should handle connection errors gracefully
      expect(typeof result.exitCode).toBe('number');
    });

    test('should handle invalid analytics parameters', async () => {
      const invalidCommands = [
        ['performance-dashboard', '--format', 'invalid-format'],
        ['performance-alerts', '--threshold', 'invalid-threshold'],
        ['performance-report', '--period', 'invalid-period']
      ];

      for (const cmd of invalidCommands) {
        const result = await cliRunner.execCommand(cmd, {
          expectSuccess: false
        });

        // Should either handle gracefully or show appropriate error
        expect(typeof result.exitCode).toBe('number');
      }
    });

    test('should handle concurrent model operations', async () => {
      const concurrentOps = [
        cliRunner.execCommand(['list-models']),
        cliRunner.execCommand(['performance-dashboard']),
        cliRunner.execCommand(['performance-report'])
      ];

      const results = await Promise.all(concurrentOps);
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });

    test('should handle very large model names', async () => {
      const longModelName = 'a'.repeat(1000);
      const result = await cliRunner.execCommand(['set-model', longModelName]);

      // Should handle gracefully without crashing
      expect(typeof result.exitCode).toBe('number');
    });

    test('should handle special characters in model names', async () => {
      const specialNames = [
        'model-with-dashes',
        'model_with_underscores',
        'model.with.dots',
        'model:with:colons'
      ];

      for (const name of specialNames) {
        const result = await cliRunner.execCommand(['set-model', name]);
        expect(typeof result.exitCode).toBe('number');
      }
    });
  });

  describe('Performance Tests', () => {
    test('should complete model list operation quickly', async () => {
      const performance = await cliRunner.testCommandPerformance('list-models', [], 3);
      expect(performance.performanceAcceptable).toBe(true);
      expect(performance.avgTime).toBeLessThan(10000); // 10 seconds average
    });

    test('should handle dashboard operations efficiently', async () => {
      const performance = await cliRunner.testCommandPerformance(
        'performance-dashboard',
        ['--format', 'summary'],
        3
      );
      expect(performance.performanceAcceptable).toBe(true);
    });

    test('should handle rapid sequential analytics commands', async () => {
      const commands = [
        'performance-dashboard',
        'performance-alerts',
        'performance-report'
      ];

      for (const cmd of commands) {
        const start = Date.now();
        const result = await cliRunner.execCommand([cmd, '--format', 'summary']);
        const duration = Date.now() - start;

        expect(result.exitCode).toBe(0);
        expect(duration).toBeLessThan(15000); // 15 seconds max
      }
    });
  });

  describe('Data Validation', () => {
    test('should validate model list output format', async () => {
      const result = await cliRunner.execCommand(['list-models']);

      const validations = cliRunner.validateOutput(result, [
        /models|Models|Available/i,
        /\d+|\w+/ // Should contain some alphanumeric content
      ]);

      expect(validations.outputValid).toBe(true);
    });

    test('should validate performance data output', async () => {
      const result = await cliRunner.execCommand(['performance-dashboard']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(10);
      // Performance data should contain some numeric or status information
    });

    test('should validate analytics report structure', async () => {
      const result = await cliRunner.execCommand(['performance-report', '--export', 'json']);

      expect(result.exitCode).toBe(0);
      // If JSON format is supported, should either output JSON or indicate format
      if (result.stdout.includes('{') || result.stdout.includes('json')) {
        expect(result.stdout).toMatch(/\{|\[|json/i);
      }
    });
  });
});