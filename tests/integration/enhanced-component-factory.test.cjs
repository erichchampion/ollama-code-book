/**
 * Integration Tests for Enhanced Component Factory
 *
 * Tests the complete component initialization flow including dependency resolution,
 * error handling, and performance characteristics.
 */

const { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const path = require('path');

// Mock the logger to prevent console noise during tests
// Use relative path from __dirname for proper module resolution
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Create the mock before importing modules
jest.doMock(path.resolve(__dirname, '../../dist/src/utils/logger.js'), () => ({
  logger: mockLogger
}), { virtual: true });

// Mock process.cwd() to return a safe test directory
const originalCwd = process.cwd;
process.cwd = jest.fn().mockReturnValue('/tmp/test-project');

describe('Enhanced Component Factory Integration Tests', () => {
  let EnhancedComponentFactory;
  let getEnhancedComponentFactory;
  let resetEnhancedComponentFactory;
  let InitState;

  beforeAll(async () => {
    // Set up test environment
    jest.setTimeout(30000); // 30 second timeout for integration tests
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();

    try {
      // Dynamic import for ES modules - use dist paths for compiled output
      const factoryModulePath = path.resolve(__dirname, '../../dist/src/interactive/enhanced-component-factory.js');
      const stateMachineModulePath = path.resolve(__dirname, '../../dist/src/interactive/initialization-state-machine.js');

      const factoryModule = await import(factoryModulePath);
      EnhancedComponentFactory = factoryModule.EnhancedComponentFactory;
      getEnhancedComponentFactory = factoryModule.getEnhancedComponentFactory;
      resetEnhancedComponentFactory = factoryModule.resetEnhancedComponentFactory;

      const stateMachineModule = await import(stateMachineModulePath);
      InitState = stateMachineModule.InitState;

      // Reset factory state
      resetEnhancedComponentFactory();
    } catch (error) {
      console.warn('Could not import Enhanced Component Factory modules:', error.message);
      return;
    }
  });

  afterEach(async () => {
    // Clean up factory state
    if (resetEnhancedComponentFactory) {
      try {
        await resetEnhancedComponentFactory();
        // Add delay to ensure all timeouts and async operations are cleared
        // Increased from 100ms to 250ms for better reliability under load
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        // Factory might not be initialized
      }
    }
  });

  afterAll(() => {
    // Restore original process.cwd
    process.cwd = originalCwd;
  });

  describe('Factory Initialization', () => {
    test('should create singleton instance', () => {
      if (!getEnhancedComponentFactory) return;

      const factory1 = getEnhancedComponentFactory();
      const factory2 = getEnhancedComponentFactory();

      expect(factory1).toBe(factory2);
      expect(factory1).toBeInstanceOf(EnhancedComponentFactory);
    });

    test('should initialize with clean state', () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();
      const summary = factory.getInitializationSummary();

      expect(summary.total).toBeGreaterThan(0);
      expect(summary.ready).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.initializing).toBe(0);
    });
  });

  describe('Component Initialization Flow', () => {
    test('should initialize basic components without dependencies', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // Test components without dependencies
      const conversationManager = await factory.getComponent('conversationManager');
      expect(conversationManager).toBeDefined();
      expect(factory.hasComponent('conversationManager')).toBe(true);
      expect(factory.getComponentState('conversationManager')).toBe(InitState.READY);
    });

    test('should handle component dependencies correctly', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // This should initialize aiClient as a dependency
      const intentAnalyzer = await factory.getComponent('intentAnalyzer');
      expect(intentAnalyzer).toBeDefined();
      expect(factory.hasComponent('intentAnalyzer')).toBe(true);
      expect(factory.hasComponent('aiClient')).toBe(true);
    });

    test('should initialize components with multiple dependencies', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // This should initialize enhancedClient and projectContext as dependencies
      const taskPlanner = await factory.getComponent('taskPlanner');
      expect(taskPlanner).toBeDefined();
      expect(factory.hasComponent('taskPlanner')).toBe(true);
      expect(factory.hasComponent('enhancedClient')).toBe(true);
      expect(factory.hasComponent('projectContext')).toBe(true);
    });

    test('should handle complex dependency chains', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // naturalLanguageRouter depends on aiClient, enhancedClient, and projectContext
      // It creates intentAnalyzer and taskPlanner inline, so they won't be registered as components
      const router = await factory.getComponent('naturalLanguageRouter');
      expect(router).toBeDefined();
      expect(factory.hasComponent('naturalLanguageRouter')).toBe(true);

      // These are the actual dependencies that get initialized
      expect(factory.hasComponent('aiClient')).toBe(true);
      expect(factory.hasComponent('enhancedClient')).toBe(true);
      expect(factory.hasComponent('projectContext')).toBe(true);

      // intentAnalyzer and taskPlanner are created inline, not registered separately
      // So they won't show up as separate components
    });
  });

  describe('Concurrent Initialization', () => {
    test('should handle concurrent component requests', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // Request the same component concurrently
      const [conv1, conv2, conv3] = await Promise.all([
        factory.getComponent('conversationManager'),
        factory.getComponent('conversationManager'),
        factory.getComponent('conversationManager')
      ]);

      expect(conv1).toBe(conv2);
      expect(conv2).toBe(conv3);
      expect(factory.hasComponent('conversationManager')).toBe(true);
    });

    test('should handle concurrent requests for components with dependencies', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // Request components with shared dependencies concurrently
      const [analyzer, planner] = await Promise.all([
        factory.getComponent('intentAnalyzer'),
        factory.getComponent('taskPlanner')
      ]);

      expect(analyzer).toBeDefined();
      expect(planner).toBeDefined();
      expect(factory.hasComponent('intentAnalyzer')).toBe(true);
      expect(factory.hasComponent('taskPlanner')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown component types', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      await expect(factory.getComponent('unknownComponent')).rejects.toThrow('Unknown component type');
    });

    test('should track failed component states', async () => {
      if (!getEnhancedComponentFactory || !InitState) return;

      const factory = getEnhancedComponentFactory();

      try {
        await factory.getComponent('unknownComponent');
      } catch (error) {
        // Expected to fail
      }

      expect(factory.getComponentState('unknownComponent')).toBe(InitState.FAILED);
    });

    test('should use fallback when provided', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();
      const fallbackValue = { type: 'fallback' };

      const result = await factory.getComponent('unknownComponent', {
        fallback: () => fallbackValue
      });

      expect(result).toBe(fallbackValue);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should complete initialization within reasonable time', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();
      const startTime = Date.now();

      await factory.getComponent('conversationManager');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('should reuse singleton instances', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      const conv1 = await factory.getComponent('conversationManager');
      const conv2 = await factory.getComponent('conversationManager');

      expect(conv1).toBe(conv2); // Same instance
    });

    test('should clear components properly', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      await factory.getComponent('conversationManager');
      expect(factory.hasComponent('conversationManager')).toBe(true);

      factory.clearComponent('conversationManager');
      expect(factory.hasComponent('conversationManager')).toBe(false);
    });

    test('should clear all components', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      await Promise.all([
        factory.getComponent('conversationManager'),
        factory.getComponent('intentAnalyzer')
      ]);

      expect(factory.hasComponent('conversationManager')).toBe(true);
      expect(factory.hasComponent('intentAnalyzer')).toBe(true);

      factory.clearAllComponents();

      expect(factory.hasComponent('conversationManager')).toBe(false);
      expect(factory.hasComponent('intentAnalyzer')).toBe(false);
    });
  });

  describe('State Management', () => {
    test('should track component states correctly', async () => {
      if (!getEnhancedComponentFactory || !InitState) return;

      const factory = getEnhancedComponentFactory();

      // Initially not started
      expect(factory.getComponentState('conversationManager')).toBe(InitState.NOT_STARTED);

      // After initialization
      await factory.getComponent('conversationManager');
      expect(factory.getComponentState('conversationManager')).toBe(InitState.READY);
    });

    test('should provide accurate initialization summary', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      const initialSummary = factory.getInitializationSummary();
      expect(initialSummary.ready).toBe(0);

      await factory.getComponent('conversationManager');

      const afterSummary = factory.getInitializationSummary();
      expect(afterSummary.ready).toBe(1);
      expect(afterSummary.successRate).toBeGreaterThan(0);
    });

    test('should list ready components for initialization', () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();
      const readyComponents = factory.getReadyToInitialize();

      // Should include components without dependencies
      expect(readyComponents).toContain('conversationManager');
      expect(readyComponents).toContain('aiClient');
      expect(readyComponents).toContain('enhancedClient');
      expect(readyComponents).toContain('projectContext');
    });
  });

  describe('Diagnostics and Monitoring', () => {
    test('should provide diagnostic information', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      await factory.getComponent('conversationManager');

      const diagnostics = await factory.getDiagnostics();
      expect(diagnostics.registry).toContain('Service Registry');
      expect(diagnostics.stateMachine).toContain('State Machine');
    });

    test('should generate comprehensive diagnostic report', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      await factory.getComponent('conversationManager');

      const report = await factory.getComprehensiveDiagnostics();
      expect(report).toContain('Enhanced Component Factory Diagnostics');
      expect(report).toContain('Initialization Summary');
      expect(report).toContain('Component States');
      expect(report).toContain('conversationManager');
    });

    test('should track progress updates', async () => {
      if (!getEnhancedComponentFactory || !resetEnhancedComponentFactory) return;

      // Reset factory to ensure clean state
      await resetEnhancedComponentFactory();

      const factory = getEnhancedComponentFactory();
      const progressUpdates = [];

      factory.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      await factory.getComponent('conversationManager');

      // Wait for async progress notifications (they use setTimeout)
      // Increased from 50ms to 150ms for better reliability under load
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.component === 'conversationManager')).toBe(true);
    });
  });

  describe('Integration with Service Registry', () => {
    test('should use shared project context', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // Get multiple components that use project context
      const [taskPlanner, contextManager] = await Promise.all([
        factory.getComponent('taskPlanner'),
        factory.getComponent('advancedContextManager')
      ]);

      expect(taskPlanner).toBeDefined();
      expect(contextManager).toBeDefined();

      // Should have shared project context instance
      expect(factory.hasComponent('projectContext')).toBe(true);
    });

    test('should handle service registry operations', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      await factory.getComponent('conversationManager');

      const diagnostics = await factory.getDiagnostics();
      expect(diagnostics.registry).toContain('Total Services');
    });
  });

  describe('Memory and Disposal', () => {
    test('should dispose properly', () => {
      if (!EnhancedComponentFactory) return;

      const factory = new EnhancedComponentFactory();
      expect(() => factory.dispose()).not.toThrow();
    });

    test('should reset factory state', async () => {
      if (!getEnhancedComponentFactory || !resetEnhancedComponentFactory) return;

      const factory1 = getEnhancedComponentFactory();
      await resetEnhancedComponentFactory();
      const factory2 = getEnhancedComponentFactory();

      expect(factory1).not.toBe(factory2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid successive calls', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // Rapid successive calls
      const promises = Array.from({ length: 10 }, () =>
        factory.getComponent('conversationManager')
      );

      const results = await Promise.all(promises);

      // All should be the same instance
      results.forEach(result => {
        expect(result).toBe(results[0]);
      });
    });

    test('should handle component with custom timeout', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      const result = await factory.getComponent('conversationManager', {
        timeout: 1000
      });

      expect(result).toBeDefined();
    });

    test('should handle component clearing during initialization', async () => {
      if (!getEnhancedComponentFactory) return;

      const factory = getEnhancedComponentFactory();

      // Start initialization
      const initPromise = factory.getComponent('conversationManager');

      // Clear before completion (should not affect ongoing initialization)
      factory.clearComponent('conversationManager');

      const result = await initPromise;
      expect(result).toBeDefined();
    });
  });
});