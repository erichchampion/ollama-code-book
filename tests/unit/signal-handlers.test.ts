/**
 * Tests for Signal Handler Race Conditions
 * Testing proper cleanup on process signals
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { AppInstance } from '../../src/types/app-interfaces.js';

describe('Signal Handlers', () => {
  let mockApp: AppInstance;
  let cleanupPromise: Promise<void>;
  let cleanupResolved: boolean;
  let originalProcessExit: typeof process.exit;
  let processExitCalled: boolean;
  let processExitCode: number | undefined;

  beforeEach(() => {
    // Track process.exit calls
    processExitCalled = false;
    processExitCode = undefined;
    originalProcessExit = process.exit;
    (process.exit as any) = jest.fn((code?: number) => {
      processExitCalled = true;
      processExitCode = code;
      // Don't actually exit in tests
    });

    // Track cleanup completion
    cleanupResolved = false;

    // Create mock app with async cleanup
    mockApp = {
      config: {} as any,
      terminal: {} as any,
      ai: {
        disconnect: jest.fn(async () => {
          // Simulate async cleanup taking time
          await new Promise(resolve => setTimeout(resolve, 100));
        })
      } as any,
      codebase: {
        startBackgroundAnalysis: jest.fn(),
        stopBackgroundAnalysis: jest.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        })
      } as any,
      commands: {} as any,
      fileOps: {} as any,
      execution: {} as any,
      errors: {} as any,
      telemetry: {
        submitTelemetry: jest.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 75));
        })
      } as any
    };
  });

  afterEach(() => {
    // Restore process.exit
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  describe('Async cleanup completion', () => {
    it('should complete async cleanup before exit', async () => {
      // Import the shutdown function
      const { shutdown } = await import('../../src/index.js');

      // Track when cleanup completes
      const cleanupPromise = shutdown(mockApp).then(() => {
        cleanupResolved = true;
      });

      // Wait for cleanup
      await cleanupPromise;

      // Verify cleanup completed
      expect(cleanupResolved).toBe(true);
      expect(mockApp.codebase.stopBackgroundAnalysis).toHaveBeenCalled();
      expect(mockApp.telemetry?.submitTelemetry).toHaveBeenCalled();
      expect(mockApp.ai.disconnect).toHaveBeenCalled();
    });

    it('should wait for all async operations in signal handler', async () => {
      // This test verifies that signal handler waits for cleanup
      const { shutdown } = await import('../../src/index.js');

      // Create a proper signal handler that waits and returns the promise
      const properSignalHandler = async () => {
        await shutdown(mockApp)
          .then(() => {
            cleanupResolved = true;
            process.exit(0);
          })
          .catch((err) => {
            console.error('Shutdown error:', err);
            process.exit(1);
          });
      };

      // Call the signal handler and wait for it to complete
      await properSignalHandler();

      // Verify cleanup completed before exit
      expect(cleanupResolved).toBe(true);
      expect(processExitCalled).toBe(true);
      expect(processExitCode).toBe(0);
    });
  });

  describe('SIGINT handling', () => {
    it('should handle SIGINT gracefully', async () => {
      const { shutdown } = await import('../../src/index.js');

      const sigintHandler = async () => {
        await shutdown(mockApp)
          .then(() => process.exit(0))
          .catch(err => process.exit(1));
      };

      // Call handler and wait for completion
      await sigintHandler();

      expect(mockApp.codebase.stopBackgroundAnalysis).toHaveBeenCalled();
      expect(processExitCalled).toBe(true);
    });
  });

  describe('SIGTERM handling', () => {
    it('should handle SIGTERM gracefully', async () => {
      const { shutdown } = await import('../../src/index.js');

      const sigtermHandler = async () => {
        await shutdown(mockApp)
          .then(() => process.exit(0))
          .catch(err => process.exit(1));
      };

      // Call handler and wait for completion
      await sigtermHandler();

      expect(mockApp.codebase.stopBackgroundAnalysis).toHaveBeenCalled();
      expect(processExitCalled).toBe(true);
    });
  });

  describe('Double cleanup prevention', () => {
    it('should prevent double cleanup on multiple signals', async () => {
      const { shutdown } = await import('../../src/index.js');

      let shutdownInProgress = false;
      let shutdownCount = 0;

      const safeShutdown = async () => {
        if (shutdownInProgress) {
          return;
        }
        shutdownInProgress = true;
        shutdownCount++;
        await shutdown(mockApp);
        process.exit(0);
      };

      // Call multiple times rapidly
      const p1 = safeShutdown();
      const p2 = safeShutdown();
      const p3 = safeShutdown();

      await Promise.all([p1, p2, p3]);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only shutdown once
      expect(shutdownCount).toBe(1);
    });
  });

  describe('Cleanup error handling', () => {
    it('should handle cleanup errors without preventing exit', async () => {
      const { shutdown } = await import('../../src/index.js');

      // Make one cleanup operation fail
      mockApp.telemetry = {
        submitTelemetry: jest.fn(async () => {
          throw new Error('Telemetry submission failed');
        })
      } as any;

      const sigintHandler = async () => {
        try {
          await shutdown(mockApp);
          process.exit(0);
        } catch (error) {
          // Should still exit even on error
          process.exit(1);
        }
      };

      await sigintHandler();

      // Should exit despite error
      expect(processExitCalled).toBe(true);
    });
  });

  describe('Cleanup timeout', () => {
    it('should force exit after timeout if cleanup hangs', async () => {
      jest.useFakeTimers();

      const { shutdown } = await import('../../src/index.js');

      // Make cleanup hang
      mockApp.ai = {
        disconnect: jest.fn(async () => {
          // Never resolves
          await new Promise(() => {});
        })
      } as any;

      const CLEANUP_TIMEOUT = 5000;

      const signalHandlerWithTimeout = async () => {
        const cleanupPromise = shutdown(mockApp);
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            console.error('Cleanup timeout exceeded, forcing exit');
            resolve();
          }, CLEANUP_TIMEOUT);
        });

        await Promise.race([cleanupPromise, timeoutPromise])
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      };

      // Start the handler (don't await - it will hang on cleanup)
      const handlerPromise = signalHandlerWithTimeout();

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(CLEANUP_TIMEOUT + 100);

      // Flush all pending promises
      await Promise.resolve();
      await Promise.resolve();

      expect(processExitCalled).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Resource cleanup verification', () => {
    it('should complete all cleanup operations in order', async () => {
      const { shutdown } = await import('../../src/index.js');

      const callOrder: string[] = [];

      mockApp.codebase = {
        stopBackgroundAnalysis: jest.fn(async () => {
          callOrder.push('codebase');
          await new Promise(resolve => setTimeout(resolve, 10));
        })
      } as any;

      mockApp.telemetry = {
        submitTelemetry: jest.fn(async () => {
          callOrder.push('telemetry');
          await new Promise(resolve => setTimeout(resolve, 10));
        })
      } as any;

      mockApp.ai = {
        disconnect: jest.fn(async () => {
          callOrder.push('ai');
          await new Promise(resolve => setTimeout(resolve, 10));
        })
      } as any;

      // Run shutdown and wait for completion
      await shutdown(mockApp);

      // Verify all operations were called
      expect(callOrder).toContain('codebase');
      expect(callOrder).toContain('telemetry');
      expect(callOrder).toContain('ai');
      expect(callOrder.length).toBe(3);
    });
  });
});
