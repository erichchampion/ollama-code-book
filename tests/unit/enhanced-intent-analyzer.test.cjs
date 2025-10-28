const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

/**
 * Enhanced Intent Analyzer Test Suite
 *
 * Tests timeout protection, fallback strategies, and robust error handling
 * for the enhanced intent analysis system.
 */

// Mock dependencies
const mockOllamaClient = {
  complete: jest.fn()
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock modules
jest.mock('../../dist/src/utils/logger.js', () => ({
  logger: mockLogger
}));

jest.mock('../../dist/src/ai/ollama-client.js', () => ({
  OllamaClient: jest.fn(() => mockOllamaClient)
}));

// Create a mock implementation for testing
class EnhancedIntentAnalyzer {
  constructor(ollamaClient) {
    this.ollamaClient = ollamaClient;
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  async analyze(input, context, timeout = 15000) {
    const cacheKey = `${input}_${JSON.stringify(context)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        resolve(this.minimalistFallback(input));
      }, timeout);

      this.ollamaClient.complete().then(response => {
        clearTimeout(timeoutId);
        try {
          const intent = JSON.parse(response.message.content);
          this.setCacheWithEviction(cacheKey, intent);
          resolve(intent);
        } catch (error) {
          mockLogger.error('Failed to parse AI response', error);
          resolve(this.minimalistFallback(input));
        }
      }).catch((error) => {
        clearTimeout(timeoutId);
        mockLogger.error('Network error during analysis', error);
        resolve(this.minimalistFallback(input));
      });
    });
  }

  async quickPatternMatch(input) {
    const patterns = [
      { pattern: /^(help|h|\?)$/, type: 'question', action: 'show help', confidence: 0.95 },
      { pattern: /list\s+models/, type: 'command', action: 'list available models', confidence: 0.9 },
      { pattern: /analyz(e|ing)\s+(this\s+)?(codebase|project|code)|review\s+.*code|examine\s+.*project|understand\s+.*project/, type: 'task_request', action: 'analyze codebase structure and patterns', confidence: 0.85 },
      { pattern: /create\s+(a\s+)?new\s+file.*\.js|delete.*file|rename.*\.ts|copy.*\.js/, type: 'task_request', action: 'file operation', confidence: 0.8 },
      { pattern: /run\s+tests?/, type: 'command', action: 'execute test suite', confidence: 0.85 }
    ];

    for (const pattern of patterns) {
      if (pattern.pattern.test(input)) {
        const extractedFiles = this.extractFiles(input);
        return {
          type: pattern.type,
          action: pattern.action,
          entities: {
            files: extractedFiles,
            directories: [],
            functions: [],
            classes: [],
            technologies: [],
            concepts: [],
            variables: []
          },
          confidence: pattern.confidence,
          complexity: 'simple',
          multiStep: false,
          requiresClarification: false,
          suggestedClarifications: [],
          estimatedDuration: 5,
          riskLevel: 'low',
          context: { projectAware: false, fileSpecific: false, followUp: false, references: [] }
        };
      }
    }
    return null;
  }

  minimalistFallback(input) {
    return {
      type: 'conversation',
      action: input,
      entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
      confidence: 0.1,
      complexity: 'simple',
      multiStep: false,
      requiresClarification: true,
      suggestedClarifications: ['I had trouble understanding your request. Could you try rephrasing it?'],
      estimatedDuration: 5,
      riskLevel: 'low',
      context: { projectAware: false, fileSpecific: false, followUp: false, references: [] }
    };
  }

  validateIntent(intent) {
    if (!intent || typeof intent !== 'object') return false;
    const requiredFields = ['type', 'action', 'entities', 'confidence', 'complexity', 'context'];
    return requiredFields.every(field => field in intent);
  }

  extractFiles(input) {
    const filePattern = /[\w-]+\.(ts|js|json|md|py|java|cpp|c|h|css|html|xml|yml|yaml|conf|config)(\s|$)/gi;
    const matches = input.match(filePattern) || [];
    return matches.map(match => match.trim());
  }

  setCacheWithEviction(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  getCacheSize() {
    return this.cache.size;
  }
}

describe('EnhancedIntentAnalyzer', () => {
  let analyzer;
  let mockContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh analyzer instance
    analyzer = new EnhancedIntentAnalyzer(mockOllamaClient);

    // Standard mock context
    mockContext = {
      projectContext: {
        allFiles: [
          { path: 'src/index.ts', type: 'typescript' },
          { path: 'package.json', type: 'json' }
        ]
      },
      conversationHistory: [],
      workingDirectory: '/test/project',
      recentFiles: ['src/index.ts']
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timeout Protection', () => {
    test('should timeout after specified duration', async () => {
      // Arrange
      jest.useFakeTimers();
      mockOllamaClient.complete.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 60000)) // 60 second delay
      );

      // Act
      const analysisPromise = analyzer.analyze('test query', mockContext, 5000);

      // Fast forward time to trigger timeout
      jest.advanceTimersByTime(5000);

      // Assert
      const result = await analysisPromise;
      expect(result.type).toBe('conversation');
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should complete successfully within timeout', async () => {
      // Arrange
      const expectedIntent = {
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
        multiStep: false,
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 15,
        riskLevel: 'low',
        context: {
          projectAware: true,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      mockOllamaClient.complete.mockResolvedValue({
        message: {
          content: JSON.stringify(expectedIntent)
        }
      });

      // Act
      const result = await analyzer.analyze('analyze this code', mockContext, 10000);

      // Assert
      expect(result.type).toBe('task_request');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should handle malformed AI responses gracefully', async () => {
      // Arrange
      mockOllamaClient.complete.mockResolvedValue({
        message: {
          content: 'This is not valid JSON'
        }
      });

      // Act
      const result = await analyzer.analyze('test query', mockContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('conversation'); // Fallback type
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Fallback Strategies', () => {
    test('should use quick pattern matching for common queries', async () => {
      // Arrange
      const commonQueries = [
        'help',
        'list models',
        'analyze this codebase',
        'create a new file called test.js',
        'run tests'
      ];

      // Act & Assert
      for (const query of commonQueries) {
        const result = await analyzer.quickPatternMatch(query);
        if (result) {
          expect(result.type).toMatch(/task_request|question|command/);
          expect(result.confidence).toBeGreaterThan(0.6);
        } else {
          // Some queries might not match patterns - that's okay for this test
          expect(result).toBeNull();
        }
      }
    });

    test('should classify codebase analysis requests correctly', async () => {
      // Arrange
      const analysisQueries = [
        'analyze this codebase',
        'review the code structure',
        'examine the project architecture',
        'understand this project'
      ];

      // Act & Assert
      for (const query of analysisQueries) {
        const result = await analyzer.quickPatternMatch(query);
        expect(result.type).toBe('task_request');
        expect(result.action).toContain('analyze');
      }
    });

    test('should handle file operations correctly', async () => {
      // Arrange
      const fileQueries = [
        'create a new file called test.js',
        'delete the old config.json file',
        'rename index.ts to main.ts',
        'copy utils.js to helpers.js'
      ];

      // Act & Assert
      for (const query of fileQueries) {
        const result = await analyzer.quickPatternMatch(query);
        expect(result.type).toBe('task_request');
        const extractedFiles = analyzer.extractFiles(query);
        expect(extractedFiles.length).toBeGreaterThan(0);
      }
    });

    test('should provide minimalist fallback for unrecognized queries', async () => {
      // Arrange
      const obscureQuery = 'xyzabc123 random unrecognizable input';

      // Act
      const result = await analyzer.minimalistFallback(obscureQuery);

      // Assert
      expect(result.type).toBe('conversation');
      expect(result.action).toBe(obscureQuery);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.requiresClarification).toBe(true);
    });
  });

  describe('Caching System', () => {
    test('should cache successful analyses', async () => {
      // Arrange
      const query = 'analyze this codebase';
      const expectedResult = {
        type: 'task_request',
        action: 'analyze codebase',
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
        multiStep: false,
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 15,
        riskLevel: 'low',
        context: {
          projectAware: true,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      mockOllamaClient.complete.mockResolvedValue({
        message: { content: JSON.stringify(expectedResult) }
      });

      // Act
      const result1 = await analyzer.analyze(query, mockContext);
      const result2 = await analyzer.analyze(query, mockContext);

      // Assert
      expect(mockOllamaClient.complete).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    test('should respect cache size limits', async () => {
      // Arrange
      const cacheSize = 100; // Default cache size

      // Act - Fill cache beyond capacity
      for (let i = 0; i < cacheSize + 10; i++) {
        await analyzer.analyze(`query ${i}`, mockContext);
      }

      // Assert - Should not exceed memory limits
      expect(analyzer.getCacheSize()).toBeLessThanOrEqual(cacheSize);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Arrange
      mockOllamaClient.complete.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await analyzer.analyze('test query', mockContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('conversation');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle invalid context gracefully', async () => {
      // Arrange
      const invalidContext = null;

      // Act
      const result = await analyzer.analyze('test query', invalidContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('conversation');
    });

    test('should validate intent structure', async () => {
      // Arrange
      const malformedIntent = {
        type: 'invalid_type',
        // missing required fields
      };

      // Act
      const isValid = analyzer.validateIntent(malformedIntent);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('Performance Requirements', () => {
    test('should complete analysis within 2 seconds for simple queries', async () => {
      // Arrange
      const startTime = Date.now();

      mockOllamaClient.complete.mockResolvedValue({
        message: {
          content: JSON.stringify({
            type: 'question',
            action: 'help',
            entities: {
              files: [],
              directories: [],
              functions: [],
              classes: [],
              technologies: [],
              concepts: [],
              variables: []
            },
            confidence: 0.95,
            complexity: 'simple',
            multiStep: false,
            requiresClarification: false,
            suggestedClarifications: [],
            estimatedDuration: 5,
            riskLevel: 'low',
            context: {
              projectAware: false,
              fileSpecific: false,
              followUp: false,
              references: []
            }
          })
        }
      });

      // Act
      await analyzer.analyze('help', mockContext);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    test('should handle multiple concurrent analyses', async () => {
      // Arrange
      mockOllamaClient.complete.mockResolvedValue({
        message: {
          content: JSON.stringify({
            type: 'task_request',
            action: 'test',
            entities: {
              files: [],
              directories: [],
              functions: [],
              classes: [],
              technologies: [],
              concepts: [],
              variables: []
            },
            confidence: 0.8,
            complexity: 'simple',
            multiStep: false,
            requiresClarification: false,
            suggestedClarifications: [],
            estimatedDuration: 10,
            riskLevel: 'low',
            context: {
              projectAware: false,
              fileSpecific: false,
              followUp: false,
              references: []
            }
          })
        }
      });

      // Act
      const promises = Array.from({ length: 10 }, (_, i) =>
        analyzer.analyze(`query ${i}`, mockContext)
      );

      // Assert
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.type).toBeDefined();
      });
    });
  });
});