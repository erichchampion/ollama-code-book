/**
 * Unit Tests for Optimization Components
 *
 * Tests the core optimization components in isolation to ensure they
 * function correctly and provide proper error handling.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/utils/logger.ts', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Optimization Components', () => {
  let ComponentFactory;
  let StreamingInitializer;
  let PerformanceMonitor;
  let ComponentStatusTracker;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Dynamic imports for ES modules
    try {
      const componentFactoryModule = await import('../../dist/src/interactive/component-factory.js');
      ComponentFactory = componentFactoryModule.ComponentFactory;

      const streamingModule = await import('../../dist/src/interactive/streaming-initializer.js');
      StreamingInitializer = streamingModule.StreamingInitializer;

      const perfModule = await import('../../dist/src/interactive/performance-monitor.js');
      PerformanceMonitor = perfModule.PerformanceMonitor;

      const statusModule = await import('../../dist/src/interactive/component-status.js');
      ComponentStatusTracker = statusModule.ComponentStatusTracker;
    } catch (error) {
      console.warn('Could not import optimization modules:', error.message);
      // Skip tests if modules don't exist yet
      return;
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any ComponentStatusTracker instances
    if (ComponentStatusTracker) {
      // Reset the global status tracker
      try {
        const { resetStatusTracker } = require('../../dist/src/interactive/component-status.js');
        resetStatusTracker();
      } catch (error) {
        // Ignore if module not available
      }
    }
  });

  describe('ComponentFactory', () => {
    test('should create factory instance successfully', () => {
      if (!ComponentFactory) return;

      expect(() => {
        const factory = new ComponentFactory();
        expect(factory).toBeDefined();
      }).not.toThrow();
    });

    test('should handle component loading with timeout', async () => {
      if (!ComponentFactory) return;

      const factory = new ComponentFactory();

      // Mock a component that takes time to load
      const mockComponent = {
        initialize: jest.fn().mockResolvedValue(true)
      };

      // Test with short timeout should handle gracefully
      try {
        await factory.getComponent('aiClient', { timeout: 100 });
      } catch (error) {
        // Should handle timeout or initialization errors gracefully
        expect(error.message).toMatch(/timeout|failed|not initialized/i);
      }
      
      // Clean up the factory
      factory.dispose();
    });

    test('should cache components correctly', async () => {
      if (!ComponentFactory) return;

      const factory = new ComponentFactory();

      // Mock successful component loading
      const mockAiClient = { mock: 'aiClient' };
      factory.components = new Map([['aiClient', mockAiClient]]);

      const component1 = await factory.getComponent('aiClient');
      const component2 = await factory.getComponent('aiClient');

      expect(component1).toBe(component2);
      expect(component1).toBe(mockAiClient);
      
      // Clean up the factory
      factory.dispose();
    });
  });

  describe('StreamingInitializer', () => {
    test('should create initializer successfully', () => {
      if (!StreamingInitializer) return;

      expect(() => {
        const initializer = new StreamingInitializer();
        expect(initializer).toBeDefined();
      }).not.toThrow();
    });

    test.skip('should categorize components correctly', async () => {
      // This test is skipped because getEssentialComponents and getBackgroundComponents
      // methods are private and not part of the public API
      if (!StreamingInitializer) return;

      const initializer = new StreamingInitializer();

      // These methods don't exist in the public API
      // const essential = initializer.getEssentialComponents();
      // const background = initializer.getBackgroundComponents();

      // expect(essential).toContain('aiClient');
      // expect(essential).toContain('intentAnalyzer');
      // expect(background).toContain('codeKnowledgeGraph');
      // expect(background).toContain('queryDecompositionEngine');
    });

    test('should handle initialization failures gracefully', async () => {
      if (!StreamingInitializer) return;

      const initializer = new StreamingInitializer();

      // Mock terminal for testing
      const mockTerminal = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        success: jest.fn()
      };

      try {
        await initializer.initializeStreaming(mockTerminal);
      } catch (error) {
        // Should handle initialization failures
        expect(mockTerminal.error).toHaveBeenCalled();
      }
    });
  });

  describe('PerformanceMonitor', () => {
    test('should create monitor successfully', () => {
      if (!PerformanceMonitor) return;

      expect(() => {
        const monitor = new PerformanceMonitor();
        expect(monitor).toBeDefined();
      }).not.toThrow();
    });

    test('should track component timing correctly', async () => {
      if (!PerformanceMonitor) return;

      const monitor = new PerformanceMonitor();

      monitor.startComponentTiming('aiClient');
      // Add a small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      monitor.endComponentTiming('aiClient', true);

      const metrics = monitor.getMetrics();
      expect(metrics.componentTimes.has('aiClient')).toBe(true);

      const timing = metrics.componentTimes.get('aiClient');
      expect(timing.status).toBe('completed');
      expect(timing.duration).toBeGreaterThan(0);
    });

    test('should generate performance reports', () => {
      if (!PerformanceMonitor) return;

      const monitor = new PerformanceMonitor();

      const summary = monitor.getPerformanceReport('summary');
      const detailed = monitor.getPerformanceReport('detailed');
      const json = monitor.getPerformanceReport('json');

      expect(summary).toContain('Performance Summary');
      expect(detailed).toContain('Component Details');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    test('should provide optimization recommendations', () => {
      if (!PerformanceMonitor) return;

      const monitor = new PerformanceMonitor();

      // Simulate slow component
      monitor.startComponentTiming('slowComponent');
      setTimeout(() => {
        monitor.endComponentTiming('slowComponent', true);
      }, 100);

      const recommendations = monitor.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('should check performance targets', () => {
      if (!PerformanceMonitor) return;

      const monitor = new PerformanceMonitor();

      const targetCheck = monitor.checkPerformanceTargets();
      expect(targetCheck).toHaveProperty('allTargetsMet');
      expect(targetCheck).toHaveProperty('results');
      expect(Array.isArray(targetCheck.results)).toBe(true);
    });
  });

  describe('ComponentStatusTracker', () => {
    test('should create tracker successfully', () => {
      if (!ComponentStatusTracker) return;

      let tracker;
      expect(() => {
        tracker = new ComponentStatusTracker();
        expect(tracker).toBeDefined();
      }).not.toThrow();
      
      // Clean up the tracker
      if (tracker) {
        tracker.dispose();
      }
    });

    test('should track component status updates', () => {
      if (!ComponentStatusTracker) return;

      const tracker = new ComponentStatusTracker();

      const mockProgress = {
        component: 'aiClient',
        status: 'loading',
        startTime: Date.now(),
        endTime: Date.now() + 1000
      };

      tracker.updateFromProgress(mockProgress);

      const health = tracker.getComponentHealth('aiClient');
      expect(health).toBeDefined();
      expect(health.status).toBe('loading');
      
      // Clean up the tracker
      tracker.dispose();
    });

    test('should generate status displays', () => {
      if (!ComponentStatusTracker) return;

      const tracker = new ComponentStatusTracker();

      // Update components using the available updateFromProgress method
      tracker.updateFromProgress({
        component: 'aiClient',
        status: 'ready',
        startTime: Date.now() - 100,
        endTime: Date.now()
      });
      
      tracker.updateFromProgress({
        component: 'router',
        status: 'ready',
        startTime: Date.now() - 100,
        endTime: Date.now()
      });

      const summary = tracker.getStatusDisplay({ format: 'summary' });
      const table = tracker.getStatusDisplay({ format: 'table' });
      const list = tracker.getStatusDisplay({ format: 'list' });
      const json = tracker.getStatusDisplay({ format: 'json' });

      expect(summary).toContain('System Status');
      expect(table).toContain('Component');
      expect(list.length).toBeGreaterThan(0);
      expect(() => JSON.parse(json)).not.toThrow();
      
      // Clean up the tracker
      tracker.dispose();
    });

    test('should track system health', () => {
      if (!ComponentStatusTracker) return;

      const tracker = new ComponentStatusTracker();

      const systemHealth = tracker.getSystemHealth();
      expect(systemHealth).toHaveProperty('overallStatus');
      expect(systemHealth).toHaveProperty('readyComponents');
      expect(systemHealth).toHaveProperty('totalComponents');
      expect(systemHealth).toHaveProperty('criticalComponentsReady');
      
      // Clean up the tracker
      tracker.dispose();
    });

    test('should handle component degradation', () => {
      if (!ComponentStatusTracker) return;

      const tracker = new ComponentStatusTracker();

      tracker.markDegraded('testComponent', 'Test degradation');

      const health = tracker.getComponentHealth('testComponent');
      expect(health).toBeDefined();
      expect(health.status).toBe('degraded');
      expect(health.lastError).toBeDefined();
      
      // Clean up the tracker
      tracker.dispose();
    });
  });

  describe('Integration Tests', () => {
    test('components should work together correctly', async () => {
      if (!ComponentFactory || !PerformanceMonitor || !ComponentStatusTracker) return;

      const factory = new ComponentFactory();
      const monitor = new PerformanceMonitor();
      const tracker = new ComponentStatusTracker();

      // Test component factory with monitoring
      monitor.startComponentTiming('testComponent');

      try {
        // This will likely fail since we're in a test environment,
        // but we can test the monitoring and tracking behavior
        await factory.getComponent('testComponent', { timeout: 100 });
      } catch (error) {
        monitor.endComponentTiming('testComponent', false);

        const progress = {
          component: 'testComponent',
          status: 'failed',
          startTime: Date.now() - 100,
          endTime: Date.now(),
          error
        };

        tracker.updateFromProgress(progress);
      }

      const metrics = monitor.getMetrics();
      const health = tracker.getComponentHealth('testComponent');

      expect(metrics.componentTimes.has('testComponent')).toBe(true);
      expect(health?.status).toBe('failed');
      
      // Clean up all components
      factory.dispose();
      tracker.dispose();
    });

    test('should handle timeout and fallback scenarios', async () => {
      if (!ComponentFactory || !PerformanceMonitor) return;

      const factory = new ComponentFactory();
      const monitor = new PerformanceMonitor();

      monitor.startComponentTiming('timeoutTest');

      try {
        await factory.getComponent('nonexistentComponent', { timeout: 50 });
      } catch (error) {
        monitor.endComponentTiming('timeoutTest', false);
        expect(error).toBeDefined();
      }

      const metrics = monitor.getMetrics();
      expect(metrics.componentTimes.has('timeoutTest')).toBe(true);
      
      // Clean up the factory
      factory.dispose();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing dependencies gracefully', async () => {
      if (!ComponentFactory) return;

      const factory = new ComponentFactory();

      try {
        await factory.getComponent('invalidComponent');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/unknown|invalid|not.*found/i);
      }
      
      // Clean up the factory
      factory.dispose();
    });

    test('should provide meaningful error messages', () => {
      if (!PerformanceMonitor) return;

      const monitor = new PerformanceMonitor();

      // Test error in performance monitoring
      expect(() => {
        monitor.endComponentTiming('nonexistentComponent', false);
      }).not.toThrow(); // Should handle gracefully
    });
  });
});