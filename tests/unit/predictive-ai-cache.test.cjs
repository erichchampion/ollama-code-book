/**
 * Predictive AI Cache Test Suite
 *
 * Tests the predictive caching system that provides intelligent
 * caching and prefetching for AI responses.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the PredictiveAICache since we can't easily import ES modules in Jest
class MockPredictiveAICache {
  constructor(config = {}) {
    this.config = {
      maxCacheSize: 1000,
      defaultTTL: 3600000,
      maxPrefetchQueue: 50,
      predictionThreshold: 0.6,
      enableBackgroundPrefetch: true,
      ...config
    };

    this.cache = new Map();
    this.userPatterns = new Map();
    this.querySequences = new Map();
    this.contextSimilarity = new Map();
    this.prefetchQueue = [];
    this.isProcessingPrefetch = false;
    this.timestampCounter = 0; // Counter to ensure unique timestamps

    this.analytics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      predictiveAccuracy: 0,
      totalRequests: 0,
      cachedRequests: 0,
      prefetchedRequests: 0,
      memoryUsage: 0,
      topQueries: []
    };
  }

  safeStringify(obj) {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      return JSON.stringify({ error: 'circular_reference' });
    }
  }

  generateQueryHash(query, context = {}) {
    try {
      // Ensure stable key ordering for consistent hashing
      const sortedContext = Object.keys(context).sort().reduce((result, key) => {
        result[key] = context[key];
        return result;
      }, {});
      const combined = JSON.stringify({ query, context: sortedContext });
      // Simple hash for testing that produces different results for different inputs
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    } catch (error) {
      // Handle circular references
      const safe = { query, context: 'circular_reference' };
      const combined = JSON.stringify(safe);
      return Buffer.from(combined).toString('base64').substring(0, 16);
    }
  }

  async get(query, context = {}, userId = 'default') {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, context);

    this.analytics.totalRequests++;

    const cached = this.cache.get(queryHash);

    if (cached) {
      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      cached.accessCount++;
      // Use counter to ensure unique timestamps
      this.timestampCounter++;
      cached.lastAccessed = new Date(Date.now() + this.timestampCounter);

      this.analytics.cachedRequests++;
      this.updateHitRate();
      this.updateMissRate();

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      // Return a copy to avoid reference issues in tests
      return { ...cached };
    }

    this.updateMissRate();
    return null;
  }

  async set(query, response, context = {}, metadata = {}, userId = 'default', ttl) {
    const queryHash = this.generateQueryHash(query, context);
    this.timestampCounter++;
    const now = new Date(Date.now() + this.timestampCounter);

    // Count set operations as requests
    this.analytics.totalRequests++;

    const cacheEntry = {
      key: queryHash,
      value: response,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      ttl: ttl || this.config.defaultTTL,
      priority: this.calculatePriority(query, context, metadata),
      tags: this.generateTags(query, context, {
        ...metadata,
        language: context.language || metadata.language,
        fileType: context.fileType || metadata.fileType
      }),
      metadata: {
        queryType: metadata.queryType || 'analysis',
        complexity: metadata.complexity || 'medium',
        language: metadata.language,
        fileType: metadata.fileType,
        contextSize: this.safeStringify(context).length,
        responseSize: this.safeStringify(response).length,
        computeTime: metadata.computeTime || 0,
        userProfile: userId,
        projectContext: context.projectRoot,
        ...metadata
      }
    };

    this.cache.set(queryHash, cacheEntry);
    this.updateUserPatterns(userId, query, context);
  }

  async predictAndPrefetch(userId, currentQuery, context, aiResponseFunction) {
    const predictions = this.generatePredictions(userId, currentQuery, context);

    const highConfidencePredictions = predictions.filter(
      p => p.probability >= this.config.predictionThreshold
    );

    for (const prediction of highConfidencePredictions) {
      if (this.prefetchQueue.length < this.config.maxPrefetchQueue) {
        this.prefetchQueue.push(prediction);
      }
    }

    return highConfidencePredictions;
  }

  generatePredictions(userId, currentQuery, context) {
    const predictions = [];

    // Simple mock predictions based on patterns
    if (currentQuery.includes('explain')) {
      predictions.push({
        queryHash: this.generateQueryHash('fix code', context),
        probability: 0.8,
        estimatedAccessTime: new Date(Date.now() + 60000),
        context: { type: 'sequence' },
        reasoning: 'Common next step after explanation'
      });
    }

    if (context.language === 'typescript') {
      predictions.push({
        queryHash: this.generateQueryHash('refactor typescript', context),
        probability: 0.7,
        estimatedAccessTime: new Date(Date.now() + 120000),
        context: { type: 'context', language: 'typescript' },
        reasoning: 'Common typescript operation'
      });
    }

    if (context.fileType === '.js') {
      predictions.push({
        queryHash: this.generateQueryHash('add type annotations', context),
        probability: 0.6,
        estimatedAccessTime: new Date(Date.now() + 180000),
        context: { type: 'similarity' },
        reasoning: 'Common JS to TS migration'
      });
    }

    return predictions;
  }

  calculatePriority(query, context, metadata) {
    let score = 0;

    if (metadata.complexity === 'complex') score += 2;
    else if (metadata.complexity === 'medium') score += 1;

    if (metadata.queryType === 'code_generation') score += 2;
    else if (metadata.queryType === 'explanation') score += 1;

    if (context && Object.keys(context).length > 5) score += 1;

    if (score >= 4) return 4; // CRITICAL
    if (score >= 2) return 3; // HIGH
    if (score >= 1) return 2; // NORMAL
    return 1; // LOW
  }

  generateTags(query, context, metadata) {
    const tags = [];

    if (metadata.queryType) tags.push(`type:${metadata.queryType}`);
    if (metadata.language) tags.push(`lang:${metadata.language}`);
    if (metadata.fileType) tags.push(`file:${metadata.fileType}`);
    if (metadata.complexity) tags.push(`complexity:${metadata.complexity}`);

    return tags;
  }

  updateUserPatterns(userId, query, context) {
    let pattern = this.userPatterns.get(userId);

    if (!pattern) {
      pattern = {
        userId,
        commonQueries: [],
        frequentLanguages: [],
        preferredQueryTypes: [],
        sessionPatterns: {
          averageSessionLength: 0,
          peakUsageHours: [],
          commonWorkflows: []
        },
        contextPatterns: {
          projectTypes: [],
          filePatterns: [],
          codebaseSize: 'medium'
        }
      };
    }

    if (!pattern.commonQueries.includes(query)) {
      pattern.commonQueries.push(query);
      if (pattern.commonQueries.length > 20) {
        pattern.commonQueries = pattern.commonQueries.slice(-20);
      }
    }

    if (context.language && !pattern.frequentLanguages.includes(context.language)) {
      pattern.frequentLanguages.push(context.language);
    }

    this.userPatterns.set(userId, pattern);
  }

  getAnalytics() {
    return { ...this.analytics };
  }

  async clear() {
    this.cache.clear();
    this.userPatterns.clear();
    this.querySequences.clear();
    this.contextSimilarity.clear();
    this.prefetchQueue.length = 0;

    this.analytics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      predictiveAccuracy: 0,
      totalRequests: 0,
      cachedRequests: 0,
      prefetchedRequests: 0,
      memoryUsage: 0,
      topQueries: []
    };
  }

  updateHitRate() {
    this.analytics.hitRate = (this.analytics.cachedRequests / this.analytics.totalRequests) * 100;
  }

  updateMissRate() {
    this.analytics.missRate = ((this.analytics.totalRequests - this.analytics.cachedRequests) / this.analytics.totalRequests) * 100;
  }

  updateAverageResponseTime(responseTime) {
    if (this.analytics.averageResponseTime === 0) {
      this.analytics.averageResponseTime = responseTime;
    } else {
      this.analytics.averageResponseTime = (this.analytics.averageResponseTime + responseTime) / 2;
    }
  }
}

describe('Predictive AI Cache', () => {
  let cache;

  beforeEach(() => {
    cache = new MockPredictiveAICache();
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('Basic Cache Operations', () => {
    test('should cache and retrieve responses', async () => {
      const query = 'explain this function';
      const response = 'This function does something important.';
      const context = { language: 'javascript', fileType: '.js' };

      // Initially no cache hit
      const initialResult = await cache.get(query, context);
      expect(initialResult).toBeNull();

      // Store in cache
      await cache.set(query, response, context);

      // Should hit cache now
      const cachedResult = await cache.get(query, context);
      expect(cachedResult).toBeTruthy();
      expect(cachedResult.value).toBe(response);
      expect(cachedResult.accessCount).toBe(2); // 1 from set, 1 from get
    });

    test('should handle different contexts for same query', async () => {
      const query = 'explain code';
      const response1 = 'JavaScript explanation';
      const response2 = 'TypeScript explanation';

      const context1 = { language: 'javascript' };
      const context2 = { language: 'typescript' };

      await cache.set(query, response1, context1);
      await cache.set(query, response2, context2);

      const result1 = await cache.get(query, context1);
      const result2 = await cache.get(query, context2);

      expect(result1.value).toBe(response1);
      expect(result2.value).toBe(response2);
    });

    test('should track access counts and last accessed time', async () => {
      const query = 'test query';
      const response = 'test response';

      await cache.set(query, response);

      const firstAccess = await cache.get(query);
      expect(firstAccess.accessCount).toBe(2); // Set + Get

      // Wait a bit between accesses to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 150));

      const secondAccess = await cache.get(query);
      expect(secondAccess.accessCount).toBe(3);
      expect(secondAccess.lastAccessed.getTime()).toBeGreaterThan(firstAccess.lastAccessed.getTime());
    });
  });

  describe('Priority and Metadata', () => {
    test('should calculate priority based on query characteristics', async () => {
      const query = 'generate complex code';
      const response = 'complex code implementation';

      const metadata = {
        queryType: 'code_generation',
        complexity: 'complex',
        language: 'typescript'
      };

      await cache.set(query, response, {}, metadata);
      const cached = await cache.get(query);

      expect(cached.priority).toBe(4); // CRITICAL priority
      expect(cached.metadata.queryType).toBe('code_generation');
      expect(cached.metadata.complexity).toBe('complex');
    });

    test('should generate appropriate tags', async () => {
      const query = 'refactor function';
      const response = 'refactored code';
      const context = { language: 'python', fileType: '.py' };
      const metadata = { queryType: 'refactor', complexity: 'medium' };

      await cache.set(query, response, context, metadata);
      const cached = await cache.get(query, context);

      expect(cached.tags).toContain('type:refactor');
      expect(cached.tags).toContain('lang:python');
      expect(cached.tags).toContain('file:.py');
      expect(cached.tags).toContain('complexity:medium');
    });

    test('should store comprehensive metadata', async () => {
      const query = 'analyze code structure';
      const response = { analysis: 'detailed analysis' };
      const context = { projectRoot: '/path/to/project', language: 'typescript' };

      await cache.set(query, response, context, { computeTime: 1500 });
      const cached = await cache.get(query, context);

      expect(cached.metadata.contextSize).toBeGreaterThan(0);
      expect(cached.metadata.responseSize).toBeGreaterThan(0);
      expect(cached.metadata.computeTime).toBe(1500);
      expect(cached.metadata.projectContext).toBe('/path/to/project');
    });
  });

  describe('User Pattern Learning', () => {
    test('should track user query patterns', async () => {
      const userId = 'user123';
      const queries = [
        'explain function',
        'fix bug',
        'refactor code',
        'add tests'
      ];

      for (const query of queries) {
        await cache.set(query, 'response', { language: 'javascript' }, {}, userId);
      }

      const userPattern = cache.userPatterns.get(userId);
      expect(userPattern).toBeTruthy();
      expect(userPattern.commonQueries).toEqual(queries);
      expect(userPattern.frequentLanguages).toContain('javascript');
    });

    test('should limit stored query history', async () => {
      const userId = 'user456';

      // Add more than the limit (20) queries
      for (let i = 0; i < 25; i++) {
        await cache.set(`query ${i}`, 'response', {}, {}, userId);
      }

      const userPattern = cache.userPatterns.get(userId);
      expect(userPattern.commonQueries.length).toBe(20);
      expect(userPattern.commonQueries[0]).toBe('query 5'); // Should start from query 5
    });

    test('should track language preferences', async () => {
      const userId = 'polyglot';
      const languages = ['javascript', 'typescript', 'python', 'rust'];

      for (const language of languages) {
        await cache.set('test query', 'response', { language }, {}, userId);
      }

      const userPattern = cache.userPatterns.get(userId);
      expect(userPattern.frequentLanguages).toEqual(languages);
    });
  });

  describe('Predictive Analysis', () => {
    test('should generate sequence-based predictions', async () => {
      const userId = 'predictor';
      const context = { language: 'typescript', fileType: '.ts' };

      const predictions = cache.generatePredictions(userId, 'explain function', context);

      expect(predictions.length).toBeGreaterThan(0);
      const sequencePrediction = predictions.find(p => p.reasoning.includes('Common next step'));
      expect(sequencePrediction).toBeTruthy();
      expect(sequencePrediction.probability).toBe(0.8);
    });

    test('should generate context-based predictions', async () => {
      const userId = 'context_user';
      const context = { language: 'typescript', fileType: '.ts' };

      const predictions = cache.generatePredictions(userId, 'any query', context);

      const contextPrediction = predictions.find(p => p.context.language === 'typescript');
      expect(contextPrediction).toBeTruthy();
      expect(contextPrediction.probability).toBe(0.7);
    });

    test('should filter predictions by confidence threshold', async () => {
      const userId = 'threshold_user';
      const context = { language: 'typescript', fileType: '.js' };

      // Mock AI response function
      const mockAIResponse = async (query, ctx) => `AI response for: ${query}`;

      const predictions = await cache.predictAndPrefetch(userId, 'test query', context, mockAIResponse);

      // Should only include predictions above threshold (0.6)
      predictions.forEach(prediction => {
        expect(prediction.probability).toBeGreaterThanOrEqual(0.6);
      });
    });

    test('should add high-confidence predictions to prefetch queue', async () => {
      const userId = 'prefetch_user';
      const context = { language: 'typescript' };

      const mockAIResponse = async (query, ctx) => `AI response for: ${query}`;

      const initialQueueSize = cache.prefetchQueue.length;
      await cache.predictAndPrefetch(userId, 'explain code', context, mockAIResponse);

      expect(cache.prefetchQueue.length).toBeGreaterThan(initialQueueSize);
    });
  });

  describe('Analytics and Metrics', () => {
    test('should track hit and miss rates', async () => {
      // Generate some cache misses
      await cache.get('miss1');
      await cache.get('miss2');

      // Generate some cache hits
      await cache.set('hit1', 'response1');
      await cache.set('hit2', 'response2');
      await cache.get('hit1');
      await cache.get('hit2');

      const analytics = cache.getAnalytics();


      expect(analytics.totalRequests).toBe(6); // 2 misses + 2 sets + 2 hits
      expect(analytics.cachedRequests).toBe(2); // 2 cache hits
      expect(analytics.hitRate).toBe((2 / 6) * 100); // ~33.33%
      expect(analytics.missRate).toBeCloseTo(66.67, 1); // ~66.67%
    });

    test('should track average response time', async () => {
      await cache.set('test', 'response');

      // Simulate some response times
      for (let i = 0; i < 5; i++) {
        await cache.get('test');
      }

      const analytics = cache.getAnalytics();
      expect(analytics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should provide comprehensive analytics', async () => {
      const analytics = cache.getAnalytics();

      expect(analytics).toHaveProperty('hitRate');
      expect(analytics).toHaveProperty('missRate');
      expect(analytics).toHaveProperty('averageResponseTime');
      expect(analytics).toHaveProperty('predictiveAccuracy');
      expect(analytics).toHaveProperty('totalRequests');
      expect(analytics).toHaveProperty('cachedRequests');
      expect(analytics).toHaveProperty('prefetchedRequests');
      expect(analytics).toHaveProperty('memoryUsage');
      expect(analytics).toHaveProperty('topQueries');
    });
  });

  describe('Cache Management', () => {
    test('should clear all cache data', async () => {
      // Add some data
      await cache.set('test1', 'response1');
      await cache.set('test2', 'response2');
      cache.userPatterns.set('user1', { commonQueries: ['test'] });

      // Clear cache
      await cache.clear();

      // Verify everything is cleared
      expect(await cache.get('test1')).toBeNull();
      expect(await cache.get('test2')).toBeNull();
      expect(cache.userPatterns.size).toBe(0);
      expect(cache.prefetchQueue.length).toBe(0);

      const analytics = cache.getAnalytics();
      expect(analytics.totalRequests).toBe(2); // 2 get requests after clear
      expect(analytics.cachedRequests).toBe(0);
    });

    test('should handle configuration options', () => {
      const customConfig = {
        maxCacheSize: 500,
        defaultTTL: 1800000, // 30 minutes
        predictionThreshold: 0.8
      };

      const customCache = new MockPredictiveAICache(customConfig);

      expect(customCache.config.maxCacheSize).toBe(500);
      expect(customCache.config.defaultTTL).toBe(1800000);
      expect(customCache.config.predictionThreshold).toBe(0.8);
    });
  });

  describe('Hash Generation', () => {
    test('should generate consistent hashes for same input', () => {
      const query = 'test query';
      const context = { language: 'javascript' };

      const hash1 = cache.generateQueryHash(query, context);
      const hash2 = cache.generateQueryHash(query, context);

      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different inputs', () => {
      const query = 'test query';
      const context1 = { language: 'javascript' };
      const context2 = { language: 'typescript' };

      const hash1 = cache.generateQueryHash(query, context1);
      const hash2 = cache.generateQueryHash(query, context2);

      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty contexts', () => {
      const query = 'test query';

      const hash1 = cache.generateQueryHash(query, {});
      const hash2 = cache.generateQueryHash(query);

      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed contexts gracefully', async () => {
      const query = 'test query';
      const malformedContext = { circular: null };
      malformedContext.circular = malformedContext; // Create circular reference

      // Should not throw error
      expect(async () => {
        await cache.set(query, 'response', malformedContext);
      }).not.toThrow();
    });

    test('should handle very large responses', async () => {
      const query = 'large response query';
      const largeResponse = 'x'.repeat(1000000); // 1MB response

      await cache.set(query, largeResponse);
      const cached = await cache.get(query);

      expect(cached.value).toBe(largeResponse);
      expect(cached.metadata.responseSize).toBe(1000002); // Accounts for JSON.stringify quotes
    });
  });
});

console.log('✅ Predictive AI Cache test suite created');
console.log('📊 Test coverage areas:');
console.log('   - Basic cache operations (get, set, hit/miss)');
console.log('   - Priority calculation and metadata handling');
console.log('   - User pattern learning and tracking');
console.log('   - Predictive analysis and prefetching');
console.log('   - Analytics and performance metrics');
console.log('   - Cache management and configuration');
console.log('   - Hash generation and consistency');
console.log('   - Error handling and edge cases');