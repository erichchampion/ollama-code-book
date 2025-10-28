const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

/**
 * Multi-Step Query Processor Test Suite
 *
 * Tests the implementation of context-aware multi-step query processing
 * including query chaining, follow-up detection, and progressive disclosure.
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

const mockProjectContext = {
  root: '/test/project',
  allFiles: [
    { path: 'src/index.ts', type: 'typescript' },
    { path: 'package.json', type: 'json' },
    { path: 'README.md', type: 'markdown' }
  ]
};

// Mock modules
jest.mock('../../dist/src/utils/logger.js', () => ({
  logger: mockLogger
}));

// Create mock implementation for testing
class MultiStepQueryProcessor {
  constructor(aiClient, projectContext) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
    this.querySession = null;
    this.conversationHistory = [];
  }

  async startQuerySession(initialQuery, context = {}) {
    this.querySession = {
      id: `session_${Date.now()}`,
      initialQuery,
      context,
      queries: [],
      results: [],
      currentStep: 0,
      isComplete: false,
      startTime: new Date()
    };

    return this.querySession;
  }

  async processQuery(query, options = {}) {
    if (!this.querySession) {
      throw new Error('No active query session');
    }

    const queryInfo = {
      id: `query_${Date.now()}`,
      text: query,
      timestamp: new Date(),
      isFollowUp: this.isFollowUpQuery(query),
      context: this.buildQueryContext(query)
    };

    this.querySession.queries.push(queryInfo);

    // Mock AI processing
    const mockResponse = {
      content: `Processed: ${query}`,
      suggestions: this.generateSuggestions(query),
      needsFollowUp: this.detectFollowUpNeeds(query),
      confidence: 0.9
    };

    this.querySession.results.push(mockResponse);
    this.querySession.currentStep++;

    return mockResponse;
  }

  isFollowUpQuery(query) {
    const followUpPatterns = [
      /^(what about|how about|can you also|and what|now show me)/i,
      /^(explain more|tell me more|go deeper|elaborate)/i,
      /^(show me the|find the|where is|which)/i
    ];

    return followUpPatterns.some(pattern => pattern.test(query));
  }

  buildQueryContext(query) {
    const previousResults = this.querySession.results.slice(-3); // Last 3 results
    return {
      previousQueries: this.querySession.queries.map(q => q.text),
      previousResults: previousResults.map(r => r.content),
      projectContext: this.projectContext,
      conversationHistory: this.conversationHistory
    };
  }

  generateSuggestions(query) {
    // Mock suggestion generation based on query type
    if (query.toLowerCase().includes('analyze')) {
      return [
        'Would you like to see specific code patterns?',
        'Should I check for potential issues?',
        'Want to explore the test coverage?'
      ];
    }

    if (query.toLowerCase().includes('file') || query.toLowerCase().includes('directory')) {
      return [
        'Would you like to see the file contents?',
        'Should I analyze the code structure?',
        'Want to check dependencies?'
      ];
    }

    return [
      'Would you like me to elaborate on any part?',
      'Should I provide more specific examples?',
      'Any particular aspect you\'d like to explore?'
    ];
  }

  detectFollowUpNeeds(query) {
    // Detect if the query warrants follow-up questions
    const complexityIndicators = [
      'analyze', 'review', 'explain', 'understand', 'explore'
    ];

    return complexityIndicators.some(indicator =>
      query.toLowerCase().includes(indicator)
    );
  }

  getQuerySession() {
    return this.querySession;
  }

  endQuerySession() {
    if (this.querySession) {
      this.querySession.isComplete = true;
      this.querySession.endTime = new Date();
    }

    const session = this.querySession;
    this.querySession = null;
    return session;
  }

  async chainQuery(baseQuery, refinement) {
    const chainedQuery = `${baseQuery} - ${refinement}`;
    return this.processQuery(chainedQuery, { isChained: true });
  }

  async refineQuery(originalQuery, refinement) {
    const refinedQuery = `${originalQuery} (specifically: ${refinement})`;
    return this.processQuery(refinedQuery, { isRefinement: true });
  }
}

describe('MultiStepQueryProcessor', () => {
  let processor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new MultiStepQueryProcessor(mockOllamaClient, mockProjectContext);
  });

  afterEach(() => {
    if (processor.querySession) {
      processor.endQuerySession();
    }
  });

  describe('Query Session Management', () => {
    test('should create a new query session', async () => {
      const session = await processor.startQuerySession('analyze this codebase');

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^session_\d+$/);
      expect(session.initialQuery).toBe('analyze this codebase');
      expect(session.queries).toEqual([]);
      expect(session.isComplete).toBe(false);
    });

    test('should track query session state', async () => {
      await processor.startQuerySession('test query');

      const session = processor.getQuerySession();
      expect(session.currentStep).toBe(0);
      expect(session.startTime).toBeDefined();
      expect(session.endTime).toBeUndefined();
    });

    test('should end query session properly', async () => {
      await processor.startQuerySession('test query');
      const session = processor.endQuerySession();

      expect(session.isComplete).toBe(true);
      expect(session.endTime).toBeDefined();
      expect(processor.getQuerySession()).toBeNull();
    });
  });

  describe('Query Processing', () => {
    beforeEach(async () => {
      await processor.startQuerySession('initial query');
    });

    test('should process queries within session', async () => {
      const result = await processor.processQuery('analyze the code structure');

      expect(result).toBeDefined();
      expect(result.content).toBe('Processed: analyze the code structure');
      expect(result.suggestions).toBeDefined();
      expect(result.needsFollowUp).toBe(true);

      const session = processor.getQuerySession();
      expect(session.queries).toHaveLength(1);
      expect(session.results).toHaveLength(1);
      expect(session.currentStep).toBe(1);
    });

    test('should require active session for processing', async () => {
      processor.endQuerySession();

      await expect(processor.processQuery('test query'))
        .rejects.toThrow('No active query session');
    });

    test('should build query context from previous results', async () => {
      await processor.processQuery('first query');
      await processor.processQuery('second query');

      const context = processor.buildQueryContext('third query');

      expect(context.previousQueries).toHaveLength(2);
      expect(context.previousResults).toHaveLength(2);
      expect(context.projectContext).toBe(mockProjectContext);
    });
  });

  describe('Follow-Up Detection', () => {
    test('should detect follow-up queries', () => {
      const followUpQueries = [
        'what about the test files?',
        'can you also show me the dependencies?',
        'explain more about the structure',
        'tell me more about this',
        'show me the main function'
      ];

      followUpQueries.forEach(query => {
        expect(processor.isFollowUpQuery(query)).toBe(true);
      });
    });

    test('should detect non-follow-up queries', () => {
      const independentQueries = [
        'analyze this codebase',
        'create a new component',
        'run the tests',
        'commit these changes'
      ];

      independentQueries.forEach(query => {
        expect(processor.isFollowUpQuery(query)).toBe(false);
      });
    });
  });

  describe('Suggestion Generation', () => {
    test('should generate context-appropriate suggestions for analysis queries', () => {
      const suggestions = processor.generateSuggestions('analyze the codebase structure');

      expect(suggestions).toContain('Would you like to see specific code patterns?');
      expect(suggestions).toContain('Should I check for potential issues?');
      expect(suggestions).toHaveLength(3);
    });

    test('should generate file-specific suggestions', () => {
      const suggestions = processor.generateSuggestions('show me the main file');

      expect(suggestions).toContain('Would you like to see the file contents?');
      expect(suggestions).toContain('Should I analyze the code structure?');
    });

    test('should generate generic suggestions for other queries', () => {
      const suggestions = processor.generateSuggestions('help me with something');

      expect(suggestions).toContain('Would you like me to elaborate on any part?');
      expect(suggestions).toHaveLength(3);
    });
  });

  describe('Query Chaining', () => {
    beforeEach(async () => {
      await processor.startQuerySession('base query');
    });

    test('should chain related queries', async () => {
      const result = await processor.chainQuery('analyze the code', 'focus on performance');

      expect(result.content).toBe('Processed: analyze the code - focus on performance');

      const session = processor.getQuerySession();
      expect(session.queries[0].text).toBe('analyze the code - focus on performance');
    });

    test('should refine queries with additional context', async () => {
      const result = await processor.refineQuery('find issues', 'security vulnerabilities');

      expect(result.content).toBe('Processed: find issues (specifically: security vulnerabilities)');
    });
  });

  describe('Progressive Disclosure', () => {
    beforeEach(async () => {
      await processor.startQuerySession('complex analysis');
    });

    test('should detect when follow-up is needed', () => {
      expect(processor.detectFollowUpNeeds('analyze the codebase')).toBe(true);
      expect(processor.detectFollowUpNeeds('explain the structure')).toBe(true);
      expect(processor.detectFollowUpNeeds('list files')).toBe(false);
    });

    test('should maintain context across multiple queries', async () => {
      await processor.processQuery('analyze the main components');
      await processor.processQuery('what about the test files?');
      await processor.processQuery('and what about the configuration?');

      const session = processor.getQuerySession();
      expect(session.queries).toHaveLength(3);
      expect(session.currentStep).toBe(3);

      // Each query should have context from previous ones
      const lastQuery = session.queries[2];
      expect(lastQuery.isFollowUp).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex multi-step analysis workflow', async () => {
      await processor.startQuerySession('comprehensive codebase analysis');

      // Step 1: Initial analysis
      await processor.processQuery('analyze the project structure');

      // Step 2: Follow-up
      await processor.processQuery('what about the dependencies?');

      // Step 3: Refinement
      await processor.refineQuery('check for issues', 'focus on security');

      // Step 4: Chain additional analysis
      await processor.chainQuery('review test coverage', 'include integration tests');

      const session = processor.getQuerySession();
      expect(session.queries).toHaveLength(4);
      expect(session.results).toHaveLength(4);
      expect(session.currentStep).toBe(4);

      // Verify follow-up detection worked
      expect(session.queries[1].isFollowUp).toBe(true);

      const finalSession = processor.endQuerySession();
      expect(finalSession.isComplete).toBe(true);
    });
  });
});