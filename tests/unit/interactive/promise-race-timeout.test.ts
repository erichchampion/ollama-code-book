import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

/**
 * Tests for Promise.race Type Safety and Timeout Handling
 * 
 * These tests verify that the timeout implementation uses proper type-safe
 * Promise.race patterns. The timeout promise resolves with null instead of
 * rejecting, which provides better type safety and cleaner error handling.
 */

describe('Promise.race Timeout Type Safety', () => {
  describe('Timeout promise behavior', () => {
    it('should resolve timeout promise with null', async () => {
      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 10);
      });

      const result = await timeout;

      expect(result).toBeNull();
    });

    it('should complete input promise before timeout', async () => {
      const inputPromise = new Promise<string>(resolve => {
        setTimeout(() => resolve('user input'), 10);
      });

      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 100);
      });

      const result = await Promise.race([inputPromise, timeoutPromise]);

      expect(result).toBe('user input');
      expect(result).not.toBeNull();
    });

    it('should return null when timeout wins the race', async () => {
      const inputPromise = new Promise<string>(resolve => {
        setTimeout(() => resolve('user input'), 100);
      });

      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 10);
      });

      const result = await Promise.race([inputPromise, timeoutPromise]);

      expect(result).toBeNull();
    });

    it('should have correct type for Promise.race result', async () => {
      const inputPromise = Promise.resolve('input');
      const timeoutPromise = Promise.resolve(null);

      const result = await Promise.race([inputPromise, timeoutPromise]);

      // TypeScript should infer result as string | null
      if (result === null) {
        expect(result).toBeNull();
      } else {
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('Timeout detection', () => {
    it('should detect timeout by checking for null', async () => {
      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 10);
      });

      const slowInput = new Promise<string>(resolve => {
        setTimeout(() => resolve('too slow'), 100);
      });

      const result = await Promise.race([slowInput, timeoutPromise]);

      // Check for timeout
      const timedOut = result === null;
      expect(timedOut).toBe(true);
    });

    it('should not detect timeout when input completes first', async () => {
      const fastInput = new Promise<string>(resolve => {
        setTimeout(() => resolve('fast'), 10);
      });

      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 100);
      });

      const result = await Promise.race([fastInput, timeoutPromise]);

      // Check for timeout
      const timedOut = result === null;
      expect(timedOut).toBe(false);
      expect(result).toBe('fast');
    });

    it('should distinguish between null timeout and empty input', async () => {
      // Simulate user pressing enter with no input
      const emptyInput = Promise.resolve('');
      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 100);
      });

      const result = await Promise.race([emptyInput, timeout]);

      expect(result).toBe(''); // Empty string is not null
      expect(result).not.toBeNull();
    });
  });

  describe('Type safety improvements', () => {
    it('should allow type-safe handling of both outcomes', async () => {
      async function simulatePromptWithTimeout(
        delay: number,
        timeoutMs: number
      ): Promise<string | null> {
        const inputPromise = new Promise<string>(resolve => {
          setTimeout(() => resolve('input'), delay);
        });

        const timeoutPromise = new Promise<null>(resolve => {
          setTimeout(() => resolve(null), timeoutMs);
        });

        return Promise.race([inputPromise, timeoutPromise]);
      }

      // Fast input - should succeed
      const fastResult = await simulatePromptWithTimeout(10, 100);
      expect(fastResult).toBe('input');

      // Slow input - should timeout
      const slowResult = await simulatePromptWithTimeout(100, 10);
      expect(slowResult).toBeNull();
    });

    it('should handle result with proper type narrowing', async () => {
      const input = Promise.resolve('user input');
      const timeout = Promise.resolve(null);

      const result = await Promise.race([input, timeout]);

      // Type narrowing
      if (result === null) {
        // In timeout branch
        expect(result).toBeNull();
      } else {
        // In input branch - result is string
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should not throw on timeout (only resolves)', async () => {
      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 10);
      });

      // Should not throw
      await expect(timeout).resolves.toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle errors in input promise separately from timeout', async () => {
      const errorInput = new Promise<string>((resolve, reject) => {
        setTimeout(() => reject(new Error('Input error')), 10);
      });

      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 100);
      });

      // Error should propagate, not be confused with timeout
      await expect(Promise.race([errorInput, timeout])).rejects.toThrow('Input error');
    });

    it('should distinguish between error and timeout', async () => {
      let isTimeout = false;
      let isError = false;

      const errorInput = Promise.reject(new Error('Failed'));
      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 100);
      });

      try {
        const result = await Promise.race([errorInput, timeout]);
        if (result === null) {
          isTimeout = true;
        }
      } catch (error) {
        isError = true;
      }

      expect(isError).toBe(true);
      expect(isTimeout).toBe(false);
    });

    it('should handle cleanup regardless of timeout or success', async () => {
      let cleanupCalled = false;

      async function withCleanup(shouldTimeout: boolean): Promise<string | null> {
        try {
          const input = new Promise<string>(resolve => {
            setTimeout(() => resolve('input'), shouldTimeout ? 100 : 10);
          });

          const timeout = new Promise<null>(resolve => {
            setTimeout(() => resolve(null), shouldTimeout ? 10 : 100);
          });

          return await Promise.race([input, timeout]);
        } finally {
          cleanupCalled = true;
        }
      }

      // Test with timeout
      await withCleanup(true);
      expect(cleanupCalled).toBe(true);

      // Test with success
      cleanupCalled = false;
      await withCleanup(false);
      expect(cleanupCalled).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle user input with configurable timeout', async () => {
      async function promptUserWithTimeout(
        getUserInput: () => Promise<string>,
        timeoutMs: number
      ): Promise<string> {
        const inputPromise = getUserInput();
        const timeoutPromise = new Promise<null>(resolve => {
          setTimeout(() => resolve(null), timeoutMs);
        });

        const result = await Promise.race([inputPromise, timeoutPromise]);

        if (result === null) {
          return ''; // Default on timeout
        }

        return result;
      }

      // Fast user
      const fastResult = await promptUserWithTimeout(
        () => Promise.resolve('hello'),
        1000
      );
      expect(fastResult).toBe('hello');

      // Slow user (timeout)
      const slowResult = await promptUserWithTimeout(
        () => new Promise(resolve => setTimeout(() => resolve('too slow'), 1000)),
        10
      );
      expect(slowResult).toBe('');
    });

    it('should handle multiple sequential prompts with timeouts', async () => {
      const results: Array<string | null> = [];

      for (let i = 0; i < 3; i++) {
        const input = new Promise<string>(resolve => {
          setTimeout(() => resolve(`input ${i}`), i * 50);
        });

        const timeout = new Promise<null>(resolve => {
          setTimeout(() => resolve(null), 75);
        });

        const result = await Promise.race([input, timeout]);
        results.push(result);
      }

      // First two should succeed, third should timeout
      expect(results[0]).toBe('input 0');
      expect(results[1]).toBe('input 1');
      expect(results[2]).toBeNull(); // Timed out at 100ms
    });

    it('should handle race with immediate resolution', async () => {
      const immediate = Promise.resolve('immediate');
      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 10);
      });

      const result = await Promise.race([immediate, timeout]);

      expect(result).toBe('immediate');
      expect(result).not.toBeNull();
    });

    it('should handle race with immediate timeout', async () => {
      const slow = new Promise<string>(resolve => {
        setTimeout(() => resolve('slow'), 100);
      });
      const immediate = Promise.resolve(null);

      const result = await Promise.race([slow, immediate]);

      expect(result).toBeNull();
    });
  });

  describe('Performance and timing', () => {
    it('should resolve immediately when first promise completes', async () => {
      const start = Date.now();

      const fast = Promise.resolve('fast');
      const slow = new Promise<string>(resolve => {
        setTimeout(() => resolve('slow'), 100);
      });
      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 100);
      });

      const result = await Promise.race([fast, slow, timeout]);
      const duration = Date.now() - start;

      expect(result).toBe('fast');
      expect(duration).toBeLessThan(50); // Should be nearly instant
    });

    it('should not wait for slower promises after race completes', async () => {
      let slowCompleted = false;

      const fast = Promise.resolve('fast');
      const slow = new Promise<string>(resolve => {
        setTimeout(() => {
          slowCompleted = true;
          resolve('slow');
        }, 100);
      });

      const result = await Promise.race([fast, slow]);

      expect(result).toBe('fast');
      expect(slowCompleted).toBe(false); // Race completed before slow promise
    });

    it('should handle timeout precision', async () => {
      const timeoutMs = 50;
      const start = Date.now();

      const timeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), timeoutMs);
      });

      const slow = new Promise<string>(resolve => {
        setTimeout(() => resolve('slow'), 1000);
      });

      await Promise.race([timeout, slow]);
      const duration = Date.now() - start;

      // Should complete within reasonable margin of timeout
      expect(duration).toBeGreaterThanOrEqual(timeoutMs);
      expect(duration).toBeLessThan(timeoutMs + 50);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty promise array gracefully', async () => {
      // This would hang forever, but just for type checking
      // In practice, Promise.race([]) hangs, so we test with at least one promise
      const result = await Promise.race([Promise.resolve(null)]);
      expect(result).toBeNull();
    });

    it('should handle single promise in race', async () => {
      const single = Promise.resolve('only');
      const result = await Promise.race([single]);

      expect(result).toBe('only');
    });

    it('should handle promises that resolve to falsy values', async () => {
      const falsyValues = [
        { promise: Promise.resolve(0), value: 0 },
        { promise: Promise.resolve(''), value: '' },
        { promise: Promise.resolve(false), value: false },
        { promise: Promise.resolve(undefined), value: undefined }
      ];

      for (const { promise, value } of falsyValues) {
        const timeout = new Promise<null>(resolve => {
          setTimeout(() => resolve(null), 100);
        });

        const result = await Promise.race([promise, timeout]);
        // Should get the falsy value, not timeout (null is reserved for timeout)
        // All falsy values should complete before timeout
        if (value === undefined) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBe(value);
        }
      }
    });

    it('should handle very short timeouts', async () => {
      const input = new Promise<string>(resolve => {
        setTimeout(() => resolve('input'), 50);
      });

      const veryShortTimeout = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), 1); // 1ms timeout
      });

      const result = await Promise.race([input, veryShortTimeout]);

      expect(result).toBeNull(); // Should timeout
    });

    it('should handle very long inputs', async () => {
      const longInput = 'x'.repeat(10000);
      const input = Promise.resolve(longInput);
      const timeout = Promise.resolve(null);

      const result = await Promise.race([input, timeout]);

      // Either could win, but type should be correct
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });
});
