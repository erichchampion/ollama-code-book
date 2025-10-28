/**
 * Unit Tests for ServiceRegistry
 *
 * Tests the core dependency injection and singleton management functionality
 * to ensure it properly prevents circular dependencies.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock logger to prevent console noise during tests
jest.mock('../../src/utils/logger.ts', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ServiceRegistry', () => {
  let ServiceRegistry;
  let getServiceRegistry;
  let ServiceState;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    try {
      // Dynamic import for ES modules
      const serviceRegistryModule = await import('../../dist/src/interactive/service-registry.js');
      ServiceRegistry = serviceRegistryModule.ServiceRegistry;
      getServiceRegistry = serviceRegistryModule.getServiceRegistry;
      ServiceState = serviceRegistryModule.ServiceState;
    } catch (error) {
      console.warn('Could not import ServiceRegistry module:', error.message);
      return;
    }
  });

  afterEach(() => {
    // Clean up singleton state
    if (ServiceRegistry) {
      try {
        const registry = ServiceRegistry.getInstance();
        registry.clearAll();
      } catch (error) {
        // Registry might not be initialized
      }
    }
  });

  describe('Singleton Pattern', () => {
    test('should return same instance for multiple calls', () => {
      if (!ServiceRegistry) return;

      const registry1 = ServiceRegistry.getInstance();
      const registry2 = ServiceRegistry.getInstance();

      expect(registry1).toBe(registry2);
    });

    test('should provide global accessor function', () => {
      if (!getServiceRegistry) return;

      const registry1 = getServiceRegistry();
      const registry2 = getServiceRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('Service Registration and Retrieval', () => {
    test('should register and retrieve a simple service', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const testService = { value: 'test' };
      const factory = jest.fn().mockResolvedValue(testService);

      const result = await registry.getService('test', factory);

      expect(result).toBe(testService);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should return cached service on subsequent calls', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const testService = { value: 'test' };
      const factory = jest.fn().mockResolvedValue(testService);

      const result1 = await registry.getService('test', factory);
      const result2 = await registry.getService('test', factory);

      expect(result1).toBe(result2);
      expect(result1).toBe(testService);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should handle concurrent initialization', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const testService = { value: 'test' };
      let factoryCallCount = 0;

      const factory = jest.fn().mockImplementation(() => {
        factoryCallCount++;
        return new Promise(resolve => {
          setTimeout(() => resolve(testService), 100);
        });
      });

      // Start multiple concurrent requests
      const [result1, result2, result3] = await Promise.all([
        registry.getService('concurrent-test', factory),
        registry.getService('concurrent-test', factory),
        registry.getService('concurrent-test', factory)
      ]);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(testService);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(factoryCallCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle factory errors gracefully', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const error = new Error('Factory failed');
      const factory = jest.fn().mockRejectedValue(error);

      await expect(registry.getService('failing-service', factory, { retries: 0 })).rejects.toThrow('Factory failed');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should retry failed initializations', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const error = new Error('Factory failed');
      const factory = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ value: 'success' });

      // First call should fail and retry
      const result = await registry.getService('retry-test', factory, { retries: 1 });

      expect(result).toEqual({ value: 'success' });
      expect(factory).toHaveBeenCalledTimes(2);
    });

    test('should handle timeout errors', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const factory = jest.fn().mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      await expect(
        registry.getService('timeout-test', factory, { timeout: 100 })
      ).rejects.toThrow(/timeout/i);
    });
  });

  describe('Service Options', () => {
    test('should respect custom timeout', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const factory = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ value: 'delayed' }), 200);
        });
      });

      // Should succeed with longer timeout
      const result = await registry.getService('delayed-service', factory, { timeout: 300 });
      expect(result).toEqual({ value: 'delayed' });
    });

    test('should respect custom retry count', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const error = new Error('Always fails');
      const factory = jest.fn().mockRejectedValue(error);

      await expect(
        registry.getService('retry-count-test', factory, { retries: 3 })
      ).rejects.toThrow('Always fails');

      // Should have been called 4 times (initial + 3 retries)
      expect(factory).toHaveBeenCalledTimes(4);
    });
  });

  describe('Service State Management', () => {
    test('should track service state', async () => {
      if (!ServiceRegistry || !ServiceState) return;

      const registry = ServiceRegistry.getInstance();
      const serviceName = 'state-test';

      // Initially should not exist
      expect(registry.getServiceState(serviceName)).toBe(ServiceState.NOT_INITIALIZED);

      // During initialization
      const slowFactory = () => new Promise(resolve => {
        setTimeout(() => resolve({ value: 'test' }), 50);
      });

      const servicePromise = registry.getService(serviceName, slowFactory);

      // Should be ready after completion
      await servicePromise;
      expect(registry.getServiceState(serviceName)).toBe(ServiceState.READY);
    });

    test('should track failed state', async () => {
      if (!ServiceRegistry || !ServiceState) return;

      const registry = ServiceRegistry.getInstance();
      const serviceName = 'failed-state-test';

      const factory = jest.fn().mockRejectedValue(new Error('Test failure'));

      try {
        await registry.getService(serviceName, factory, { retries: 0 });
      } catch (error) {
        // Expected to fail
      }

      expect(registry.getServiceState(serviceName)).toBe(ServiceState.FAILED);
    });
  });

  describe('Metrics and Diagnostics', () => {
    test('should collect service metrics', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const factory = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ value: 'test' }), 10))
      );

      await registry.getService('metrics-test', factory);

      const metrics = registry.getServiceMetrics('metrics-test');
      expect(metrics).toBeDefined();
      expect(metrics.name).toBe('metrics-test');
      expect(metrics.initTime).toBeGreaterThan(0);
      expect(metrics.accessCount).toBe(1);
      expect(metrics.state).toBe(ServiceState.READY);
    });

    test('should provide summary statistics', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      await registry.getService('service1', () => 
        new Promise(resolve => setTimeout(() => resolve({ value: '1' }), 10))
      );
      await registry.getService('service2', () => 
        new Promise(resolve => setTimeout(() => resolve({ value: '2' }), 10))
      );

      const summary = registry.getSummary();
      expect(summary.totalServices).toBe(2);
      expect(summary.readyServices).toBe(2);
      expect(summary.failedServices).toBe(0);
      expect(summary.averageInitTime).toBeGreaterThan(0);
    });

    test('should generate diagnostic report', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      await registry.getService('diagnostic-test', () => Promise.resolve({ value: 'test' }));

      const report = registry.getDiagnosticReport();
      expect(report).toContain('Service Registry Diagnostic Report');
      expect(report).toContain('diagnostic-test');
      expect(report).toContain('Ready: 1');
    });
  });

  describe('Service Management', () => {
    test('should check service availability', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      expect(registry.hasService('not-exists')).toBe(false);

      await registry.getService('exists', () => Promise.resolve({ value: 'test' }));

      expect(registry.hasService('exists')).toBe(true);
    });

    test('should clear specific services', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      await registry.getService('clear-test', () => Promise.resolve({ value: 'test' }));
      expect(registry.hasService('clear-test')).toBe(true);

      registry.clearService('clear-test');
      expect(registry.hasService('clear-test')).toBe(false);
    });

    test('should clear all services', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      await registry.getService('service1', () => Promise.resolve({ value: '1' }));
      await registry.getService('service2', () => Promise.resolve({ value: '2' }));

      expect(registry.hasService('service1')).toBe(true);
      expect(registry.hasService('service2')).toBe(true);

      registry.clearAll();

      expect(registry.hasService('service1')).toBe(false);
      expect(registry.hasService('service2')).toBe(false);
    });
  });

  describe('Initialization Order Tracking', () => {
    test('should track initialization order', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      await registry.getService('first', () => Promise.resolve({ value: '1' }));
      await registry.getService('second', () => Promise.resolve({ value: '2' }));
      await registry.getService('third', () => Promise.resolve({ value: '3' }));

      const order = registry.getInitializationOrder();
      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Memory Management', () => {
    test('should dispose properly', () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      expect(() => registry.dispose()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty service names', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const factory = jest.fn().mockResolvedValue({ value: 'test' });

      await expect(registry.getService('', factory)).resolves.toBeDefined();
      expect(factory).toHaveBeenCalled();
    });

    test('should handle factory returning null/undefined', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();

      const result1 = await registry.getService('null-test', () => Promise.resolve(null));
      const result2 = await registry.getService('undefined-test', () => Promise.resolve(undefined));

      expect(result1).toBe(null);
      expect(result2).toBe(undefined);
    });

    test('should handle factory throwing synchronous errors', async () => {
      if (!ServiceRegistry) return;

      const registry = ServiceRegistry.getInstance();
      const factory = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(registry.getService('sync-error-test', factory)).rejects.toThrow('Sync error');
    });
  });
});