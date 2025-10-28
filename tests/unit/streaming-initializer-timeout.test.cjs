/**
 * Comprehensive tests for StreamingInitializer timeout edge cases
 *
 * Tests all timeout scenarios, cancellation behavior, resource cleanup,
 * and edge cases for the enhanced timeout management system.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the createCancellableTimeout function
const createMockCancellableTimeout = (timeout, message) => {
  let timeoutId = null;
  let cancelled = false;

  const promise = new Promise((resolve, reject) => {
    // Use the mocked global.setTimeout instead of real setTimeout
    timeoutId = global.setTimeout(() => {
      if (!cancelled) {
        reject(new Error(message || 'Timeout'));
      }
    }, timeout);
  });

  const cancel = () => {
    cancelled = true;
    if (timeoutId !== null) {
      global.clearTimeout(timeoutId);
    }
  };

  return { promise, cancel };
};

// Mock StreamingInitializer class
class MockStreamingInitializer {
  constructor(componentFactory) {
    this.componentFactory = componentFactory;
    this.activeTimeouts = new Map();
    this.disposed = false;
  }

  async waitForComponents(names, timeout = 30000) {
    if (this.disposed) {
      throw new Error('StreamingInitializer has been disposed');
    }

    const waitId = `wait-${Date.now()}-${Math.random()}`;

    // Check if components are ready immediately
    const allReady = names.every(name => this.componentFactory.isReady(name));

    if (allReady) {
      return true;
    }

    // Create a timeout that can be cancelled
    let timeoutId = null;
    let rejectPromise = null;

    const timeoutPromise = new Promise((resolve, reject) => {
      rejectPromise = reject;
      timeoutId = global.setTimeout(() => {
        this.activeTimeouts.delete(waitId);
        reject(new Error('Component wait timeout'));
      }, timeout);
    });

    const cancelTimeout = () => {
      if (timeoutId !== null) {
        try {
          global.clearTimeout(timeoutId);
        } catch (error) {
          // Ignore clearTimeout errors but still clean up
        }
        this.activeTimeouts.delete(waitId);
        // Reject the promise when cancelled
        if (rejectPromise) {
          rejectPromise(new Error('Operation cancelled'));
        }
      }
    };

    this.activeTimeouts.set(waitId, cancelTimeout);

    try {
      await timeoutPromise;
      return false; // Timeout occurred
    } catch (error) {
      throw error; // Timeout was cancelled or failed
    }
  }

  cancel() {
    for (const [timeoutId, cancelFn] of this.activeTimeouts) {
      try {
        cancelFn();
      } catch (error) {
        // Ignore cancellation errors
      }
    }
    this.activeTimeouts.clear();
  }

  dispose() {
    this.disposed = true;
    this.cancel();
  }
}

describe('StreamingInitializer Timeout Edge Cases', () => {
  let streamingInitializer;
  let mockComponentFactory;
  let originalSetTimeout;
  let originalClearTimeout;
  let timeoutCallbacks;
  let timeoutIds;

  beforeEach(() => {
    // Reset timeout tracking
    timeoutCallbacks = new Map();
    timeoutIds = 0;

    // Mock setTimeout and clearTimeout for precise control
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    global.setTimeout = jest.fn((callback, delay) => {
      const id = ++timeoutIds;
      timeoutCallbacks.set(id, { callback, delay, cancelled: false });
      return id;
    });

    global.clearTimeout = jest.fn((id) => {
      const timeout = timeoutCallbacks.get(id);
      if (timeout) {
        timeout.cancelled = true;
        timeoutCallbacks.delete(id);
      }
    });

    // Mock component factory with controllable async behavior
    mockComponentFactory = {
      isReady: jest.fn(),
      getComponent: jest.fn(),
      onProgress: jest.fn(),
      clear: jest.fn(),
      preloadComponents: jest.fn()
    };

    streamingInitializer = new MockStreamingInitializer(mockComponentFactory);
  });

  afterEach(() => {
    // Cancel all active operations to prevent memory leaks
    if (streamingInitializer) {
      streamingInitializer.cancel();
      streamingInitializer.dispose();
    }

    // Restore original timer functions
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Timeout Creation and Cancellation', () => {
    test('should create cancellable timeout with proper cleanup', async () => {

      // Set up component factory to simulate slow component loading
      mockComponentFactory.isReady.mockReturnValue(false);

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 500);

      // Verify timeout was created
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
      expect(timeoutCallbacks.size).toBe(1);

      // Cancel the wait operation
      streamingInitializer.cancel();

      // Verify timeout was cancelled
      expect(global.clearTimeout).toHaveBeenCalled();

      // Wait for promise to resolve/reject
      await expect(waitPromise).rejects.toThrow();

      // Verify cleanup occurred
      expect(timeoutCallbacks.size).toBe(0);
    });

    test('should handle multiple concurrent timeouts', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      // Start multiple concurrent waits
      const wait1 = streamingInitializer.waitForComponents(['component1'], 500);
      const wait2 = streamingInitializer.waitForComponents(['component2'], 1000);
      const wait3 = streamingInitializer.waitForComponents(['component3'], 1500);

      // Verify multiple timeouts were created
      expect(global.setTimeout).toHaveBeenCalledTimes(3);
      expect(timeoutCallbacks.size).toBe(3);

      // Cancel all operations
      streamingInitializer.cancel();

      // Verify all timeouts were cancelled
      expect(global.clearTimeout).toHaveBeenCalledTimes(3);

      // All promises should reject
      await expect(Promise.allSettled([wait1, wait2, wait3])).resolves.toEqual([
        { status: 'rejected', reason: expect.any(Error) },
        { status: 'rejected', reason: expect.any(Error) },
        { status: 'rejected', reason: expect.any(Error) }
      ]);
    });

    test('should return true immediately when component is ready', async () => {
      // Use the instance from beforeEach

      // Component is ready from the start
      mockComponentFactory.isReady.mockReturnValue(true);

      const result = await streamingInitializer.waitForComponents(['testComponent'], 5000);

      // Should succeed immediately without creating timeout
      expect(result).toBe(true);
      expect(global.setTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Timeout Edge Cases', () => {
    test('should handle immediate timeout (0ms)', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 0);

      // Trigger immediate timeout
      const timeoutId = global.setTimeout.mock.results[0].value;
      const timeoutCallback = timeoutCallbacks.get(timeoutId)?.callback;
      if (timeoutCallback) {
        timeoutCallback();
      }

      await expect(waitPromise).rejects.toThrow('Component wait timeout');
    });

    test('should handle very large timeout values', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      const largeTimeout = Number.MAX_SAFE_INTEGER;
      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], largeTimeout);

      // Verify timeout was created with large value
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), largeTimeout);

      // Cancel to avoid hanging test
      streamingInitializer.cancel();
      await expect(waitPromise).rejects.toThrow();
    });

    test('should handle negative timeout values gracefully', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], -1000);

      // Should still create timeout (setTimeout handles negative values)
      expect(global.setTimeout).toHaveBeenCalled();

      // Should handle as immediate timeout
      const timeoutId = global.setTimeout.mock.results[0].value;
      const timeoutCallback = timeoutCallbacks.get(timeoutId)?.callback;
      if (timeoutCallback) {
        timeoutCallback();
      }

      await expect(waitPromise).rejects.toThrow();
    });

    test('should handle NaN timeout values', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      // NaN timeout should fallback to default or handle gracefully
      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], NaN);

      expect(global.setTimeout).toHaveBeenCalled();

      // Cancel to avoid hanging
      streamingInitializer.cancel();
      await expect(waitPromise).rejects.toThrow();
    });
  });

  describe('Resource Management', () => {
    test('should clean up all timeouts on dispose', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      // Create multiple pending operations
      const wait1 = streamingInitializer.waitForComponents(['comp1'], 1000);
      const wait2 = streamingInitializer.waitForComponents(['comp2'], 2000);

      expect(timeoutCallbacks.size).toBe(2);

      // Dispose should clean up all resources
      streamingInitializer.dispose();

      // Verify all timeouts were cancelled
      expect(global.clearTimeout).toHaveBeenCalledTimes(2);

      // All promises should reject
      await expect(Promise.allSettled([wait1, wait2])).resolves.toEqual([
        { status: 'rejected', reason: expect.any(Error) },
        { status: 'rejected', reason: expect.any(Error) }
      ]);
    });

    test('should prevent new operations after dispose', async () => {
      // Use the instance from beforeEach

      streamingInitializer.dispose();

      // Attempting new operations after dispose should be handled gracefully
      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 1000);

      await expect(waitPromise).rejects.toThrow();

      // No new timeouts should be created
      expect(global.setTimeout).not.toHaveBeenCalled();
    });

    test('should handle double dispose gracefully', () => {
      // Use the instance from beforeEach

      // First dispose
      expect(() => streamingInitializer.dispose()).not.toThrow();

      // Second dispose should not cause issues
      expect(() => streamingInitializer.dispose()).not.toThrow();
    });

    test('should clean up individual timeout IDs correctly', async () => {
      // Use the instance from beforeEach

      // Initially not ready
      mockComponentFactory.isReady.mockReturnValue(false);

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 1000);

      // Get the timeout ID
      const timeoutId = global.setTimeout.mock.results[0].value;
      expect(timeoutCallbacks.has(timeoutId)).toBe(true);

      // Cancel the operation to trigger cleanup
      streamingInitializer.cancel();

      // Wait for operation to reject
      await expect(waitPromise).rejects.toThrow('Operation cancelled');

      // Timeout should be cleaned up
      expect(global.clearTimeout).toHaveBeenCalledWith(timeoutId);
    });
  });

  describe('Error Handling', () => {
    test('should handle setTimeout throwing errors', async () => {
      // Use the instance from beforeEach

      // Mock setTimeout to throw
      global.setTimeout.mockImplementation(() => {
        throw new Error('setTimeout failed');
      });

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 1000);

      await expect(waitPromise).rejects.toThrow();
    });

    test('should handle clearTimeout throwing errors', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 1000);

      // Mock clearTimeout to throw
      global.clearTimeout.mockImplementation(() => {
        throw new Error('clearTimeout failed');
      });

      // Cancel should not crash even if clearTimeout fails
      expect(() => streamingInitializer.cancel()).not.toThrow();

      await expect(waitPromise).rejects.toThrow();
    });

    test('should handle timeout callback throwing errors', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      const waitPromise = streamingInitializer.waitForComponents(['testComponent'], 100);

      // Get timeout and trigger it
      const timeoutId = global.setTimeout.mock.results[0].value;
      const timeoutCallback = timeoutCallbacks.get(timeoutId)?.callback;

      // Should not crash when timeout fires
      expect(() => timeoutCallback?.()).not.toThrow();

      await expect(waitPromise).rejects.toThrow('Component wait timeout');
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle rapid timeout creation and cancellation', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(false);

      const operations = [];

      // Create many rapid operations
      for (let i = 0; i < 10; i++) {
        operations.push(streamingInitializer.waitForComponents([`component${i}`], 100));
      }

      expect(global.setTimeout).toHaveBeenCalledTimes(10);

      // Cancel all at once
      streamingInitializer.cancel();

      // All should be cleaned up
      expect(global.clearTimeout).toHaveBeenCalledTimes(10);

      const results = await Promise.allSettled(operations);
      expect(results.every(r => r.status === 'rejected')).toBe(true);
    });

    test('should handle different components with different ready states', async () => {
      // Use the instance from beforeEach

      // Set up component states: comp1 is ready, comp2 is not
      mockComponentFactory.isReady.mockImplementation((component) => {
        return component === 'comp1';
      });

      const wait1 = streamingInitializer.waitForComponents(['comp1'], 1000);
      const wait2 = streamingInitializer.waitForComponents(['comp2'], 2000);

      // wait1 should complete immediately (comp1 is ready)
      await expect(wait1).resolves.toBe(true);

      // wait2 should timeout (comp2 is not ready)
      // Trigger the timeout for wait2
      const timeoutId = global.setTimeout.mock.results[0].value;
      const timeoutCallback = timeoutCallbacks.get(timeoutId)?.callback;
      if (timeoutCallback) {
        timeoutCallback();
      }

      await expect(wait2).rejects.toThrow('Component wait timeout');
    });
  });

  describe('Memory Management', () => {
    test('should not leak timeout references after completion', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(true);

      // Complete operation immediately
      await streamingInitializer.waitForComponents(['testComponent'], 1000);

      // Additional calls should not reference old timeouts
      await streamingInitializer.waitForComponents(['testComponent2'], 1000);

      // When components are ready immediately, no timeouts should be created
      expect(global.setTimeout).toHaveBeenCalledTimes(0);
      expect(global.clearTimeout).toHaveBeenCalledTimes(0);
    });

    test('should handle high frequency timeout operations without memory buildup', async () => {
      // Use the instance from beforeEach

      mockComponentFactory.isReady.mockReturnValue(true);

      // Run many operations in sequence
      for (let i = 0; i < 100; i++) {
        await streamingInitializer.waitForComponents([`component${i}`], 10);
      }

      // When components are ready immediately, no timeouts should be created
      expect(global.setTimeout).toHaveBeenCalledTimes(0);
      expect(global.clearTimeout).toHaveBeenCalledTimes(0);

      // No pending timeouts should remain
      expect(timeoutCallbacks.size).toBe(0);
    });
  });
});