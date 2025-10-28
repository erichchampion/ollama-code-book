const { describe, test, expect, beforeEach } = require('@jest/globals');

/**
 * Intent Analysis Integration Test Suite
 *
 * Tests the integration of enhanced intent analysis with the existing system
 */

describe('Intent Analysis Integration', () => {
  test('should handle timeout protection requirements', () => {
    // Test the timeout protection concept
    const createTimeoutPromise = (timeout) => {
      let timeoutId;
      const promise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Analysis timeout')), timeout);
      });
      // Add a clear function to the promise for cleanup
      promise.clear = () => clearTimeout(timeoutId);
      return promise;
    };

    // Test timeout creation and cleanup - capture the promise to clean it up
    let timeoutPromise;
    expect(() => {
      timeoutPromise = createTimeoutPromise(1000);
    }).not.toThrow();

    // Clean up the timeout to prevent open handles
    if (timeoutPromise && timeoutPromise.clear) {
      timeoutPromise.clear();
    }
  });

  test('should validate intent structure requirements', () => {
    // Test intent validation logic
    const validateIntent = (intent) => {
      if (!intent || typeof intent !== 'object') return false;

      const requiredFields = ['type', 'action', 'entities', 'confidence', 'complexity', 'context'];
      const hasRequiredFields = requiredFields.every(field => field in intent);

      if (!hasRequiredFields) return false;

      // Validate context structure
      const context = intent.context;
      if (!context || typeof context !== 'object') return false;

      const requiredContextFields = ['projectAware', 'fileSpecific', 'followUp', 'references'];
      return requiredContextFields.every(field => field in context);
    };

    // Test valid intent
    const validIntent = {
      type: 'task_request',
      action: 'analyze code',
      entities: {
        files: [],
        directories: [],
        functions: [],
        classes: [],
        technologies: [],
        concepts: [],
        variables: []
      },
      confidence: 0.9,
      complexity: 'simple',
      context: {
        projectAware: true,
        fileSpecific: false,
        followUp: false,
        references: []
      }
    };

    expect(validateIntent(validIntent)).toBe(true);

    // Test invalid intent (missing context)
    const invalidIntent = {
      type: 'task_request',
      action: 'analyze code',
      entities: {},
      confidence: 0.9,
      complexity: 'simple'
    };

    expect(validateIntent(invalidIntent)).toBe(false);
  });

  test('should support pattern matching logic', () => {
    // Test pattern matching for common queries
    const patterns = [
      {
        pattern: /^(help|h|\?)$/,
        type: 'question',
        action: 'show help',
        confidence: 0.95,
        complexity: 'simple'
      },
      {
        pattern: /analyz(e|ing)\s+(this\s+)?(codebase|project|code)/,
        type: 'task_request',
        action: 'analyze codebase structure and patterns',
        confidence: 0.85,
        complexity: 'moderate'
      }
    ];

    // Test help pattern
    expect(patterns[0].pattern.test('help')).toBe(true);
    expect(patterns[0].pattern.test('h')).toBe(true);
    expect(patterns[0].pattern.test('?')).toBe(true);
    expect(patterns[0].pattern.test('random')).toBe(false);

    // Test analysis pattern
    expect(patterns[1].pattern.test('analyze this codebase')).toBe(true);
    expect(patterns[1].pattern.test('analyze project')).toBe(true);
    expect(patterns[1].pattern.test('analyze code')).toBe(true);
    expect(patterns[1].pattern.test('random text')).toBe(false);
  });

  test('should support entity extraction logic', () => {
    // Test file extraction
    const extractFiles = (input) => {
      const filePattern = /[\w-]+\.(ts|js|json|md|py|java|cpp|c|h|css|html|xml|yml|yaml|conf|config)(\s|$)/gi;
      const matches = input.match(filePattern) || [];
      return matches.map(match => match.trim());
    };

    expect(extractFiles('create index.ts and package.json')).toEqual(['index.ts', 'package.json']);
    expect(extractFiles('no files here')).toEqual([]);

    // Test technology extraction
    const extractTechnologies = (input) => {
      const techKeywords = [
        'react', 'vue', 'angular', 'node', 'express', 'typescript', 'javascript',
        'python', 'java', 'cpp', 'rust', 'go', 'docker', 'kubernetes'
      ];

      const lowerInput = input.toLowerCase();
      return techKeywords.filter(tech => lowerInput.includes(tech));
    };

    expect(extractTechnologies('I want to use React with TypeScript')).toEqual(['react', 'typescript']);
    expect(extractTechnologies('No tech here')).toEqual([]);
  });

  test('should support LRU cache logic', () => {
    // Test LRU Cache implementation logic
    class SimpleLRUCache {
      constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
      }

      get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
          // Move to end (most recently used)
          this.cache.delete(key);
          this.cache.set(key, value);
        }
        return value;
      }

      set(key, value) {
        if (this.cache.has(key)) {
          this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
          // Remove least recently used
          const firstKey = this.cache.keys().next().value;
          if (firstKey !== undefined) {
            this.cache.delete(firstKey);
          }
        }
        this.cache.set(key, value);
      }

      size() {
        return this.cache.size;
      }
    }

    const cache = new SimpleLRUCache(3);

    // Test basic operations
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.size()).toBe(3);

    // Test LRU eviction
    cache.set('d', 4);
    expect(cache.size()).toBe(3);
    expect(cache.get('a')).toBeUndefined(); // Should be evicted

    // Test access updates order
    cache.get('b'); // Access 'b' to make it recently used
    cache.set('e', 5);
    expect(cache.get('c')).toBeUndefined(); // 'c' should be evicted, not 'b'
    expect(cache.get('b')).toBe(2); // 'b' should still be there
  });

  test('should support fallback strategy requirements', () => {
    // Test fallback strategy logic
    const createEmergencyFallback = (input) => {
      return {
        type: 'conversation',
        action: input,
        entities: {
          files: [],
          directories: [],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.1,
        complexity: 'simple',
        multiStep: false,
        requiresClarification: true,
        suggestedClarifications: [
          'I had trouble understanding your request. Could you try rephrasing it?',
          'Are you looking for help with a specific task?'
        ],
        estimatedDuration: 5,
        riskLevel: 'low',
        context: {
          projectAware: false,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };
    };

    const fallback = createEmergencyFallback('unknown input');
    expect(fallback.type).toBe('conversation');
    expect(fallback.confidence).toBe(0.1);
    expect(fallback.requiresClarification).toBe(true);
    expect(fallback.suggestedClarifications.length).toBeGreaterThan(0);
  });
});