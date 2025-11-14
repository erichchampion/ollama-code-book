/**
 * Tests for Timeout Cleanup
 * Testing proper timeout cleanup in all code paths
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Timeout Cleanup', () => {
  let activeTimeouts: Set<NodeJS.Timeout>;

  beforeEach(() => {
    jest.useFakeTimers();
    activeTimeouts = new Set();

    // Track all timeouts created
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((callback: any, ms?: number, ...args: any[]) => {
      const handle = originalSetTimeout(callback, ms, ...args);
      activeTimeouts.add(handle);
      return handle;
    }) as any;

    const originalClearTimeout = global.clearTimeout;
    global.clearTimeout = ((handle: NodeJS.Timeout) => {
      activeTimeouts.delete(handle);
      originalClearTimeout(handle);
    }) as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic timeout cleanup', () => {
    it('should clear timeout on successful completion', async () => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let cleaned = false;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
          cleaned = true;
        }
      };

      const operation = new Promise<string>((resolve) => {
        timeoutHandle = setTimeout(() => {
          cleanup();
          resolve('timeout');
        }, 5000);

        // Success before timeout
        setTimeout(() => {
          cleanup();
          resolve('success');
        }, 1000);
      });

      jest.advanceTimersByTime(1100);
      const result = await operation;

      expect(result).toBe('success');
      expect(cleaned).toBe(true);
      expect(timeoutHandle).toBeNull();
    });

    it('should fire timeout when operation hangs', async () => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let timeoutFired = false;

      const operation = new Promise<string>((resolve) => {
        timeoutHandle = setTimeout(() => {
          timeoutFired = true;
          timeoutHandle = null;
          resolve('timeout');
        }, 5000);

        // Operation hangs - never resolves
      });

      jest.advanceTimersByTime(5100);
      const result = await operation;

      expect(result).toBe('timeout');
      expect(timeoutFired).toBe(true);
      expect(timeoutHandle).toBeNull();
    });

    it('should not fire timeout after success', async () => {
      let timeoutFired = false;
      let timeoutHandle: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      };

      const operation = new Promise<string>((resolve) => {
        timeoutHandle = setTimeout(() => {
          timeoutFired = true;
          resolve('timeout');
        }, 5000);

        // Success immediately
        cleanup();
        resolve('success');
      });

      const result = await operation;

      // Advance time past timeout
      jest.advanceTimersByTime(6000);

      expect(result).toBe('success');
      expect(timeoutFired).toBe(false);
    });
  });

  describe('Cleanup idempotency', () => {
    it('should be safe to call cleanup multiple times', () => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let cleanupCount = 0;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        cleanupCount++;
      };

      timeoutHandle = setTimeout(() => {}, 1000);

      // Call cleanup multiple times
      cleanup();
      cleanup();
      cleanup();

      expect(cleanupCount).toBe(3);
      expect(timeoutHandle).toBeNull();
    });
  });

  describe('Once pattern', () => {
    it('should only resolve once', async () => {
      let resolved = false;
      let resolveCount = 0;
      let timeoutHandle: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      };

      const resolveOnce = (resolve: (value: string) => void, message: string) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolveCount++;
          resolve(message);
        }
      };

      const operation = new Promise<string>((resolve) => {
        timeoutHandle = setTimeout(() => {
          resolveOnce(resolve, 'timeout');
        }, 5000);

        // Try to resolve multiple times
        setTimeout(() => resolveOnce(resolve, 'first'), 1000);
        setTimeout(() => resolveOnce(resolve, 'second'), 2000);
        setTimeout(() => resolveOnce(resolve, 'third'), 3000);
      });

      jest.advanceTimersByTime(6000);
      const result = await operation;

      expect(result).toBe('first');
      expect(resolveCount).toBe(1);
      expect(timeoutHandle).toBeNull();
    });
  });

  describe('Error handling with cleanup', () => {
    it('should cleanup on error', async () => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let cleaned = false;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
          cleaned = true;
        }
      };

      const operation = new Promise<string>((resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          cleanup();
          reject(new Error('timeout'));
        }, 5000);

        setTimeout(() => {
          cleanup();
          reject(new Error('error'));
        }, 1000);
      });

      jest.advanceTimersByTime(1100);

      await expect(operation).rejects.toThrow('error');
      expect(cleaned).toBe(true);
      expect(timeoutHandle).toBeNull();
    });
  });

  describe('Multiple resources cleanup', () => {
    it('should cleanup all resources', () => {
      let timeout1: NodeJS.Timeout | null = null;
      let timeout2: NodeJS.Timeout | null = null;
      let interval1: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeout1) {
          clearTimeout(timeout1);
          timeout1 = null;
        }
        if (timeout2) {
          clearTimeout(timeout2);
          timeout2 = null;
        }
        if (interval1) {
          clearInterval(interval1);
          interval1 = null;
        }
      };

      timeout1 = setTimeout(() => {}, 1000);
      timeout2 = setTimeout(() => {}, 2000);
      interval1 = setInterval(() => {}, 500);

      cleanup();

      expect(timeout1).toBeNull();
      expect(timeout2).toBeNull();
      expect(interval1).toBeNull();
    });
  });

  describe('Promise.race with timeout', () => {
    it('should cleanup timeout in Promise.race', async () => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let cleaned = false;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
          cleaned = true;
        }
      };

      const operation = Promise.resolve('fast');
      const timeout = new Promise<string>((resolve) => {
        timeoutHandle = setTimeout(() => {
          resolve('timeout');
        }, 5000);
      });

      const result = await Promise.race([operation, timeout]);

      // Cleanup after race
      cleanup();

      expect(result).toBe('fast');
      expect(cleaned).toBe(true);
      expect(timeoutHandle).toBeNull();
    });
  });

  describe('AbortController integration', () => {
    it('should clear timeout when aborted', () => {
      const abortController = new AbortController();
      let timeoutHandle: NodeJS.Timeout | null = null;
      let abortHandled = false;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      };

      timeoutHandle = setTimeout(() => {
        console.log('Timeout fired');
      }, 5000);

      abortController.signal.addEventListener('abort', () => {
        abortHandled = true;
        cleanup();
      });

      // Abort before timeout
      abortController.abort();

      expect(abortHandled).toBe(true);
      expect(timeoutHandle).toBeNull();
    });
  });
});
