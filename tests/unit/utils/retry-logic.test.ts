/**
 * Tests for Retry Logic Consolidation
 * Testing unified retry utility with exponential backoff
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Retry Logic', () => {
  let mockOperation: jest.Mock;
  let callCount: number;

  beforeEach(() => {
    callCount = 0;
    mockOperation = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Successful operations', () => {
    it('should succeed on first attempt without retry', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockResolvedValue('success');

      const promise = withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      });

      // Flush promises
      await Promise.resolve();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should succeed on second attempt after one retry', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      });

      // Use runAllTimersAsync to properly handle async timer operations
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should succeed on final attempt', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      });

      // Use runAllTimersAsync to properly handle async timer operations
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Exponential backoff timing', () => {
    it('should use exponential backoff between retries', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      const delays: number[] = [];
      let startTime = Date.now();

      mockOperation.mockImplementation(() => {
        const now = Date.now();
        if (callCount > 0) {
          delays.push(now - startTime);
        }
        startTime = now;
        callCount++;

        if (callCount < 4) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const promise = withRetry(mockOperation, {
        maxAttempts: 4,
        baseDelayMs: 100,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      });

      // Advance through all retries
      jest.advanceTimersByTime(100); // 100ms
      await Promise.resolve();

      jest.advanceTimersByTime(200); // 200ms
      await Promise.resolve();

      jest.advanceTimersByTime(400); // 400ms
      await Promise.resolve();

      await promise;

      expect(mockOperation).toHaveBeenCalledTimes(4);
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[2]).toBeGreaterThanOrEqual(400);
    });

    it('should respect max delay cap', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      const delays: number[] = [];
      let startTime = Date.now();

      mockOperation.mockImplementation(() => {
        const now = Date.now();
        if (callCount > 0) {
          delays.push(now - startTime);
        }
        startTime = now;
        callCount++;

        if (callCount < 5) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const promise = withRetry(mockOperation, {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 300, // Cap at 300ms
        backoffMultiplier: 2
      });

      // Advance through all retries
      jest.advanceTimersByTime(100); // 100ms
      await Promise.resolve();

      jest.advanceTimersByTime(200); // 200ms
      await Promise.resolve();

      jest.advanceTimersByTime(300); // Should be capped at 300ms (not 400ms)
      await Promise.resolve();

      jest.advanceTimersByTime(300); // Should be capped at 300ms (not 800ms)
      await Promise.resolve();

      await promise;

      expect(delays[2]).toBeLessThanOrEqual(300);
      expect(delays[3]).toBeLessThanOrEqual(300);
    });
  });

  describe('Failure scenarios', () => {
    it('should throw after max attempts exceeded', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockRejectedValue(new Error('Always fails'));

      const promise = withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      });

      // Set up rejection expectation before advancing timers to catch the error
      const rejectExpectation = expect(promise).rejects.toThrow('Always fails');
      await jest.runAllTimersAsync();
      await rejectExpectation;

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should include attempt count in error message', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockRejectedValue(new Error('Operation failed'));

      const promise = withRetry(mockOperation, {
        maxAttempts: 2,
        baseDelayMs: 50,
        maxDelayMs: 500,
        backoffMultiplier: 2
      });

      // Set up rejection expectation before advancing timers to catch the error
      const rejectExpectation = expect(promise).rejects.toThrow();
      await jest.runAllTimersAsync();
      await rejectExpectation;

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom retry conditions', () => {
    it('should stop retrying on non-retryable errors', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      class NonRetryableError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'NonRetryableError';
        }
      }

      mockOperation.mockRejectedValue(new NonRetryableError('Do not retry'));

      const promise = withRetry(mockOperation, {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        shouldRetry: (error: unknown) => {
          return !(error instanceof NonRetryableError);
        }
      });

      await Promise.resolve();

      await expect(promise).rejects.toThrow('Do not retry');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should continue retrying on retryable errors', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      class RetryableError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'RetryableError';
        }
      }

      mockOperation
        .mockRejectedValueOnce(new RetryableError('Retry this'))
        .mockRejectedValueOnce(new RetryableError('Retry this too'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 50,
        maxDelayMs: 500,
        backoffMultiplier: 2,
        shouldRetry: (error: unknown) => {
          return error instanceof RetryableError;
        }
      });

      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Timeout handling', () => {
    it('should timeout long-running operations', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return 'too slow';
      });

      const promise = withRetry(mockOperation, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        timeoutMs: 500
      });

      // Set up rejection expectation before advancing timers to catch the error
      const rejectExpectation = expect(promise).rejects.toThrow();
      await jest.runAllTimersAsync();
      await rejectExpectation;
    });
  });

  describe('Simplified API with defaults', () => {
    it('should work with minimal configuration', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockResolvedValue('success');

      const result = await withRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use default values when not specified', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(mockOperation);

      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle immediate success with maxAttempts = 1', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockResolvedValue('success');

      const result = await withRetry(mockOperation, {
        maxAttempts: 1,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error rejections', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockRejectedValue('string error');

      const promise = withRetry(mockOperation, {
        maxAttempts: 2,
        baseDelayMs: 50,
        maxDelayMs: 500,
        backoffMultiplier: 2
      });

      // Set up rejection expectation before advancing timers to catch the error
      const rejectExpectation = expect(promise).rejects.toBe('string error');
      await jest.runAllTimersAsync();
      await rejectExpectation;
    });

    it('should handle async operations that return undefined', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockResolvedValue(undefined);

      const result = await withRetry(mockOperation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      });

      expect(result).toBeUndefined();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent retry operations', async () => {
      const { withRetry } = await import('../../../src/utils/async-helpers.js');

      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        withRetry(op1, { maxAttempts: 2, baseDelayMs: 50, maxDelayMs: 500, backoffMultiplier: 2 }),
        withRetry(op2, { maxAttempts: 2, baseDelayMs: 50, maxDelayMs: 500, backoffMultiplier: 2 })
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });
  });

  describe('Backward compatibility', () => {
    it('should support legacy retryWithBackoff signature', async () => {
      const { retryWithBackoff } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockResolvedValue('success');

      const result = await retryWithBackoff(mockOperation, 3, 100);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use defaults when only operation provided to retryWithBackoff', async () => {
      const { retryWithBackoff } = await import('../../../src/utils/async-helpers.js');

      mockOperation.mockResolvedValue('success');

      const result = await retryWithBackoff(mockOperation);

      expect(result).toBe('success');
    });
  });
});
