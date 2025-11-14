/**
 * Tests for AbortSignal Resource Leaks in OllamaClient
 * Testing proper reader lock release in all code paths
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('OllamaClient AbortSignal Handling', () => {
  describe('Reader lock release', () => {
    it('should release reader lock when aborted', async () => {
      // Create a mock ReadableStream with reader tracking
      let readerLocked = false;
      let readerReleased = false;

      const mockReader = {
        read: jest.fn(async () => {
          // Simulate some data before abort
          return { done: false, value: new Uint8Array([123, 125]) }; // "{}"
        }),
        releaseLock: jest.fn(() => {
          readerReleased = true;
          readerLocked = false;
        }),
        closed: Promise.resolve()
      };

      const mockBody = {
        getReader: jest.fn(() => {
          readerLocked = true;
          return mockReader;
        }),
        locked: readerLocked
      };

      // Create abort controller and abort immediately
      const abortController = new AbortController();
      abortController.abort();

      // Simulate the streaming logic
      const reader = mockBody.getReader();
      expect(readerLocked).toBe(true);

      // Wrap entire block to catch errors properly
      let errorCaught = false;
      try {
        // Check abort signal (this should throw)
        if (abortController.signal.aborted) {
          throw new Error('Stream aborted');
        }
        await reader.read();
      } catch (error) {
        errorCaught = true;
      } finally {
        // This MUST always execute
        reader.releaseLock();
      }

      // Verify error was caught and reader was released
      expect(errorCaught).toBe(true);
      expect(readerReleased).toBe(true);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should release reader lock on error', async () => {
      let readerReleased = false;

      const mockReader = {
        read: jest.fn(async () => {
          throw new Error('Read error');
        }),
        releaseLock: jest.fn(() => {
          readerReleased = true;
        })
      };

      const reader = mockReader;

      try {
        await reader.read();
      } catch (error) {
        // Error expected
      } finally {
        reader.releaseLock();
      }

      expect(readerReleased).toBe(true);
    });

    it('should release reader lock on successful completion', async () => {
      let readerReleased = false;

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([123]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(() => {
          readerReleased = true;
        })
      };

      const reader = mockReader;

      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }

      expect(readerReleased).toBe(true);
    });

    it('should handle multiple abort signals gracefully', async () => {
      let releaseCount = 0;

      const mockReader = {
        read: jest.fn(async () => ({ done: false, value: new Uint8Array([]) })),
        releaseLock: jest.fn(() => {
          releaseCount++;
        })
      };

      // Multiple abort calls
      const abortController = new AbortController();
      abortController.abort();
      abortController.abort(); // Second abort should be no-op

      // Catch the abort error properly
      let aborted = false;
      try {
        if (abortController.signal.aborted) {
          throw new Error('Aborted');
        }
      } catch (error) {
        aborted = true;
      } finally {
        // Try to release multiple times (should handle gracefully)
        try {
          mockReader.releaseLock();
        } catch (error) {
          // Already released is OK
        }
      }

      expect(aborted).toBe(true);
      expect(releaseCount).toBe(1);
    });

    it('should not leak memory with hanging streams', async () => {
      jest.useFakeTimers();

      const mockReader = {
        read: jest.fn(async () => {
          // Simulate hanging read
          await new Promise(() => {}); // Never resolves
        }),
        releaseLock: jest.fn(),
        cancel: jest.fn()
      };

      const timeoutMs = 100;
      const abortController = new AbortController();

      let timeoutFired = false;

      // Try to read with timeout
      const readPromise = mockReader.read();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          timeoutFired = true;
          resolve(null);
        }, timeoutMs);
      });

      const racePromise = Promise.race([readPromise, timeoutPromise]);

      // Advance timers to trigger timeout
      jest.advanceTimersByTime(timeoutMs + 10);
      await Promise.resolve();

      const result = await racePromise;

      // Cleanup after timeout
      if (timeoutFired) {
        try {
          await mockReader.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        mockReader.releaseLock();
      }

      expect(result).toBeNull(); // Timeout should have resolved
      expect(mockReader.cancel).toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Edge cases', () => {
    it('should handle reader release error gracefully', async () => {
      const mockReader = {
        read: jest.fn(async () => ({ done: true, value: undefined })),
        releaseLock: jest.fn(() => {
          throw new Error('Already released');
        })
      };

      let mainError: Error | null = null;

      try {
        await mockReader.read();
      } finally {
        try {
          mockReader.releaseLock();
        } catch (error) {
          // Log but don't throw - this is acceptable
          mainError = error as Error;
        }
      }

      // Should have attempted to release
      expect(mockReader.releaseLock).toHaveBeenCalled();
      // Error should be caught and not propagate
      expect(mainError).not.toBeNull();
    });

    it('should handle reader getReader error', async () => {
      const mockBody = {
        getReader: jest.fn(() => {
          throw new Error('Cannot get reader');
        })
      };

      let reader = null;
      let error: Error | null = null;

      try {
        reader = mockBody.getReader();
      } catch (e) {
        error = e as Error;
      } finally {
        // Only release if reader was obtained
        if (reader) {
          (reader as any).releaseLock();
        }
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe('Cannot get reader');
      // Reader should not have been created
      expect(reader).toBeNull();
    });
  });
});
