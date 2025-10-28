/**
 * Provider Performance Benchmarking System
 *
 * Comprehensive benchmarking system for comparing AI provider performance,
 * response quality, cost efficiency, and reliability across different scenarios.
 */

import { BaseAIProvider, AIMessage, AICompletionOptions } from './base-provider.js';
import { logger } from '../../utils/logger.js';
import { normalizeError } from '../../utils/error-utils.js';
import { THRESHOLD_CONSTANTS } from '../../config/constants.js';

export interface BenchmarkTestCase {
  id: string;
  name: string;
  description: string;
  category: 'code_generation' | 'code_analysis' | 'debugging' | 'explanation' | 'refactoring' | 'general';
  difficulty: 'simple' | 'medium' | 'complex';
  messages: AIMessage[];
  options?: AICompletionOptions;
  expectedKeywords?: string[];
  maxResponseTime?: number; // milliseconds
  evaluationCriteria: {
    accuracy?: number; // 0-1 score
    relevance?: number; // 0-1 score
    completeness?: number; // 0-1 score
    codeQuality?: number; // 0-1 score (for code generation tasks)
  };
}

export interface BenchmarkResult {
  testCaseId: string;
  providerId: string;
  providerName: string;
  timestamp: Date;

  // Performance metrics
  responseTime: number; // milliseconds
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Response analysis
  response: string;
  finishReason: string;

  // Quality evaluation
  qualityScores: {
    accuracy: number; // 0-1
    relevance: number; // 0-1
    completeness: number; // 0-1
    codeQuality?: number; // 0-1 (if applicable)
    overall: number; // 0-1 (weighted average)
  };

  // Error information
  error?: string;
  success: boolean;

  // Cost estimation (if available)
  estimatedCost?: number; // USD
}

export interface BenchmarkSummary {
  providerId: string;
  providerName: string;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  successRate: number; // 0-1

  // Aggregated performance
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;

  // Quality metrics
  averageQualityScores: {
    accuracy: number;
    relevance: number;
    completeness: number;
    codeQuality: number;
    overall: number;
  };

  // Token usage
  totalTokens: number;
  averageTokensPerRequest: number;

  // Cost analysis
  totalEstimatedCost: number;
  averageCostPerRequest: number;
  costPerToken: number;

  // Category breakdowns
  categoryPerformance: Map<string, {
    tests: number;
    successRate: number;
    averageQuality: number;
    averageResponseTime: number;
  }>;
}

export interface BenchmarkConfig {
  timeoutMs: number;
  retryAttempts: number;
  parallelism: number;
  includeStreaming?: boolean;
  includeCostAnalysis?: boolean;
  customEvaluator?: (testCase: BenchmarkTestCase, response: string) => Promise<BenchmarkResult['qualityScores']>;
}

export class ProviderBenchmarker {
  private providers: Map<string, BaseAIProvider> = new Map();
  private testCases: BenchmarkTestCase[] = [];
  private results: BenchmarkResult[] = [];
  private config: BenchmarkConfig;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      timeoutMs: 30000,
      retryAttempts: 1,
      parallelism: 3,
      includeStreaming: false,
      includeCostAnalysis: true,
      ...config
    };
  }

  /**
   * Register a provider for benchmarking
   */
  registerProvider(id: string, provider: BaseAIProvider): void {
    this.providers.set(id, provider);
    logger.info(`Registered provider for benchmarking: ${id} (${provider.getDisplayName()})`);
  }

  /**
   * Add a test case to the benchmark suite
   */
  addTestCase(testCase: BenchmarkTestCase): void {
    this.testCases.push(testCase);
    logger.debug(`Added test case: ${testCase.id} (${testCase.category})`);
  }

  /**
   * Load standard test cases for common scenarios
   */
  loadStandardTestCases(): void {
    const standardTests: BenchmarkTestCase[] = [
      // Code Generation Tests
      {
        id: 'code_gen_simple',
        name: 'Simple Function Generation',
        description: 'Generate a simple function to calculate factorial',
        category: 'code_generation',
        difficulty: 'simple',
        messages: [
          { role: 'user', content: 'Write a JavaScript function to calculate factorial of a number' }
        ],
        expectedKeywords: ['function', 'factorial', 'return'],
        maxResponseTime: 5000,
        evaluationCriteria: {
          accuracy: THRESHOLD_CONSTANTS.BENCHMARKING.ACCURACY.HIGH,
          relevance: THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.VERY_HIGH,
          completeness: THRESHOLD_CONSTANTS.BENCHMARKING.COMPLETENESS.LOW,
          codeQuality: THRESHOLD_CONSTANTS.BENCHMARKING.CODE_QUALITY.HIGH
        }
      },

      // Code Analysis Tests
      {
        id: 'code_analysis_bugs',
        name: 'Bug Detection',
        description: 'Analyze code for potential bugs and issues',
        category: 'code_analysis',
        difficulty: 'medium',
        messages: [
          {
            role: 'user',
            content: `Analyze this code for bugs:

function divide(a, b) {
    return a / b;
}

const result = divide(10, 0);
console.log(result);`
          }
        ],
        expectedKeywords: ['division by zero', 'infinity', 'validation', 'error'],
        maxResponseTime: 8000,
        evaluationCriteria: {
          accuracy: THRESHOLD_CONSTANTS.BENCHMARKING.ACCURACY.MEDIUM,
          relevance: THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.HIGH,
          completeness: THRESHOLD_CONSTANTS.BENCHMARKING.COMPLETENESS.LOW
        }
      },

      // Debugging Tests
      {
        id: 'debugging_complex',
        name: 'Complex Debugging',
        description: 'Debug a complex async function with multiple issues',
        category: 'debugging',
        difficulty: 'complex',
        messages: [
          {
            role: 'user',
            content: `Debug this async function that's not working properly:

async function processUsers(userIds) {
    const users = [];
    for (let i = 0; i < userIds.length; i++) {
        const user = await fetchUser(userIds[i]);
        if (user.isActive) {
            users.push(user);
        }
    }
    return users;
}

The function is slow and sometimes throws errors.`
          }
        ],
        expectedKeywords: ['parallel', 'Promise.all', 'error handling', 'try-catch'],
        maxResponseTime: 15000,
        evaluationCriteria: {
          accuracy: THRESHOLD_CONSTANTS.BENCHMARKING.ACCURACY.LOW,
          relevance: THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.HIGH,
          completeness: THRESHOLD_CONSTANTS.BENCHMARKING.COMPLETENESS.MEDIUM,
          codeQuality: THRESHOLD_CONSTANTS.BENCHMARKING.CODE_QUALITY.MEDIUM
        }
      },

      // Explanation Tests
      {
        id: 'explanation_algorithm',
        name: 'Algorithm Explanation',
        description: 'Explain a complex algorithm implementation',
        category: 'explanation',
        difficulty: 'medium',
        messages: [
          {
            role: 'user',
            content: `Explain how this quicksort implementation works:

function quicksort(arr, low = 0, high = arr.length - 1) {
    if (low < high) {
        const pi = partition(arr, low, high);
        quicksort(arr, low, pi - 1);
        quicksort(arr, pi + 1, high);
    }
    return arr;
}

function partition(arr, low, high) {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
}`
          }
        ],
        expectedKeywords: ['divide and conquer', 'pivot', 'partition', 'recursive', 'sorting'],
        maxResponseTime: 10000,
        evaluationCriteria: {
          accuracy: THRESHOLD_CONSTANTS.BENCHMARKING.ACCURACY.HIGH,
          relevance: THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.VERY_HIGH,
          completeness: THRESHOLD_CONSTANTS.BENCHMARKING.COMPLETENESS.HIGH
        }
      },

      // General Coding Question
      {
        id: 'general_best_practices',
        name: 'Best Practices Question',
        description: 'Answer a general question about coding best practices',
        category: 'general',
        difficulty: 'simple',
        messages: [
          { role: 'user', content: 'What are the key principles of clean code?' }
        ],
        expectedKeywords: ['readable', 'maintainable', 'DRY', 'SOLID', 'naming'],
        maxResponseTime: 5000,
        evaluationCriteria: {
          accuracy: THRESHOLD_CONSTANTS.BENCHMARKING.ACCURACY.MEDIUM,
          relevance: THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.HIGH,
          completeness: THRESHOLD_CONSTANTS.BENCHMARKING.COMPLETENESS.LOW
        }
      }
    ];

    standardTests.forEach(testCase => this.addTestCase(testCase));
    logger.info(`Loaded ${standardTests.length} standard test cases`);
  }

  /**
   * Run benchmark against all registered providers
   */
  async runBenchmark(): Promise<Map<string, BenchmarkSummary>> {
    if (this.providers.size === 0) {
      throw new Error('No providers registered for benchmarking');
    }

    if (this.testCases.length === 0) {
      throw new Error('No test cases available for benchmarking');
    }

    logger.info(`Starting benchmark with ${this.providers.size} providers and ${this.testCases.length} test cases`);

    this.results = [];
    const summaries = new Map<string, BenchmarkSummary>();

    for (const [providerId, provider] of this.providers) {
      try {
        logger.info(`Benchmarking provider: ${providerId}`);
        const providerResults = await this.runProviderBenchmark(providerId, provider);
        const summary = this.createSummary(providerId, provider.getDisplayName(), providerResults);
        summaries.set(providerId, summary);

        logger.info(`Completed benchmark for ${providerId}: ${summary.successfulTests}/${summary.totalTests} tests passed`);
      } catch (error) {
        logger.error(`Benchmark failed for provider ${providerId}:`, error);
      }
    }

    return summaries;
  }

  /**
   * Run benchmark for a specific provider
   */
  private async runProviderBenchmark(providerId: string, provider: BaseAIProvider): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Run tests in parallel with controlled concurrency
    const chunks = this.chunkArray(this.testCases, this.config.parallelism);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(testCase =>
        this.runSingleTest(providerId, provider, testCase)
      );

      const chunkResults = await Promise.allSettled(chunkPromises);

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          this.results.push(result.value);
        }
      }
    }

    return results;
  }

  /**
   * Run a single test case against a provider
   */
  private async runSingleTest(
    providerId: string,
    provider: BaseAIProvider,
    testCase: BenchmarkTestCase
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      logger.debug(`Running test ${testCase.id} on ${providerId}`);

      const response = await Promise.race([
        provider.complete(testCase.messages, testCase.options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs)
        )
      ]) as any;

      const responseTime = Date.now() - startTime;
      const qualityScores = await this.evaluateResponse(testCase, response.content);

      const result: BenchmarkResult = {
        testCaseId: testCase.id,
        providerId,
        providerName: provider.getDisplayName(),
        timestamp: new Date(),
        responseTime,
        tokenUsage: response.usage,
        response: response.content,
        finishReason: response.finishReason,
        qualityScores,
        success: true,
        estimatedCost: this.estimateCost(providerId, response.usage)
      };

      logger.debug(`Test ${testCase.id} completed for ${providerId}: ${responseTime}ms`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      const result: BenchmarkResult = {
        testCaseId: testCase.id,
        providerId,
        providerName: provider.getDisplayName(),
        timestamp: new Date(),
        responseTime,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        response: '',
        finishReason: 'error',
        qualityScores: { accuracy: 0, relevance: 0, completeness: 0, overall: 0 },
        success: false,
        error: normalizeError(error).message
      };

      logger.warn(`Test ${testCase.id} failed for ${providerId}: ${result.error}`);
      return result;
    }
  }

  /**
   * Evaluate response quality
   */
  private async evaluateResponse(
    testCase: BenchmarkTestCase,
    response: string
  ): Promise<BenchmarkResult['qualityScores']> {
    if (this.config.customEvaluator) {
      return await this.config.customEvaluator(testCase, response);
    }

    // Default heuristic evaluation
    const scores = {
      accuracy: 0,
      relevance: 0,
      completeness: 0,
      codeQuality: 0,
      overall: 0
    };

    // Check for expected keywords
    if (testCase.expectedKeywords) {
      const foundKeywords = testCase.expectedKeywords.filter(keyword =>
        response.toLowerCase().includes(keyword.toLowerCase())
      );
      scores.accuracy = foundKeywords.length / testCase.expectedKeywords.length;
    } else {
      scores.accuracy = THRESHOLD_CONSTANTS.BENCHMARKING.ACCURACY.DEFAULT;
    }

    // Basic relevance heuristics
    scores.relevance = response.length > 50
      ? THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.MEDIUM
      : THRESHOLD_CONSTANTS.BENCHMARKING.RELEVANCE.LOW;

    // Completeness based on response length and structure
    scores.completeness = Math.min(response.length / 200, 1) * THRESHOLD_CONSTANTS.BENCHMARKING.COMPLETENESS.LOW;

    // Code quality for code generation tasks
    if (testCase.category === 'code_generation') {
      const hasFunction = /function|=>|def\s/.test(response);
      const hasReturn = /return/.test(response);
      const hasProperStructure = /\{[\s\S]*\}/.test(response);

      scores.codeQuality = (
        (hasFunction ? 0.4 : 0) +
        (hasReturn ? 0.3 : 0) +
        (hasProperStructure ? 0.3 : 0)
      );
    }

    // Calculate overall score
    const weights = testCase.category === 'code_generation'
      ? { accuracy: 0.3, relevance: 0.2, completeness: 0.2, codeQuality: 0.3 }
      : { accuracy: 0.4, relevance: 0.3, completeness: 0.3, codeQuality: 0 };

    scores.overall = (
      scores.accuracy * weights.accuracy +
      scores.relevance * weights.relevance +
      scores.completeness * weights.completeness +
      scores.codeQuality * weights.codeQuality
    );

    return scores;
  }

  /**
   * Estimate cost based on token usage
   */
  private estimateCost(providerId: string, usage: { totalTokens: number }): number {
    // Rough cost estimates per 1000 tokens (as of 2024)
    const costPer1000Tokens: Record<string, number> = {
      'openai': 0.03,     // GPT-4 pricing
      'anthropic': 0.015, // Claude pricing
      'google': 0.0025,   // Gemini Pro pricing
      'ollama': 0         // Local models
    };

    const rate = costPer1000Tokens[providerId] || 0;
    return (usage.totalTokens / 1000) * rate;
  }

  /**
   * Create summary statistics for a provider
   */
  private createSummary(
    providerId: string,
    providerName: string,
    results: BenchmarkResult[]
  ): BenchmarkSummary {
    const successfulResults = results.filter(r => r.success);
    const categoryPerformance = new Map();

    // Calculate category-specific metrics
    for (const testCase of this.testCases) {
      const categoryResults = results.filter(r => r.testCaseId === testCase.id);
      const successfulCategoryResults = categoryResults.filter(r => r.success);

      if (categoryResults.length > 0) {
        categoryPerformance.set(testCase.category, {
          tests: categoryResults.length,
          successRate: successfulCategoryResults.length / categoryResults.length,
          averageQuality: successfulCategoryResults.length > 0
            ? successfulCategoryResults.reduce((sum, r) => sum + r.qualityScores.overall, 0) / successfulCategoryResults.length
            : 0,
          averageResponseTime: successfulCategoryResults.length > 0
            ? successfulCategoryResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulCategoryResults.length
            : 0
        });
      }
    }

    // Calculate response time percentiles
    const responseTimes = successfulResults.map(r => r.responseTime).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);

    return {
      providerId,
      providerName,
      totalTests: results.length,
      successfulTests: successfulResults.length,
      failedTests: results.length - successfulResults.length,
      successRate: results.length > 0 ? successfulResults.length / results.length : 0,

      averageResponseTime: successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
        : 0,
      medianResponseTime: responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length / 2)]
        : 0,
      p95ResponseTime: responseTimes.length > 0 ? responseTimes[p95Index] : 0,

      averageQualityScores: {
        accuracy: successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.qualityScores.accuracy, 0) / successfulResults.length
          : 0,
        relevance: successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.qualityScores.relevance, 0) / successfulResults.length
          : 0,
        completeness: successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.qualityScores.completeness, 0) / successfulResults.length
          : 0,
        codeQuality: successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + (r.qualityScores.codeQuality || 0), 0) / successfulResults.length
          : 0,
        overall: successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.qualityScores.overall, 0) / successfulResults.length
          : 0
      },

      totalTokens: results.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0),
      averageTokensPerRequest: results.length > 0
        ? results.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0) / results.length
        : 0,

      totalEstimatedCost: results.reduce((sum, r) => sum + (r.estimatedCost || 0), 0),
      averageCostPerRequest: results.length > 0
        ? results.reduce((sum, r) => sum + (r.estimatedCost || 0), 0) / results.length
        : 0,
      costPerToken: 0, // Will be calculated after

      categoryPerformance
    };
  }

  /**
   * Generate detailed benchmark report
   */
  generateReport(summaries: Map<string, BenchmarkSummary>): string {
    const lines = [
      '# AI Provider Benchmark Report',
      `Generated: ${new Date().toISOString()}`,
      `Total Providers: ${summaries.size}`,
      `Total Test Cases: ${this.testCases.length}`,
      '',
      '## Provider Comparison',
      ''
    ];

    // Create comparison table
    lines.push('| Provider | Success Rate | Avg Response Time | Avg Quality | Total Cost |');
    lines.push('|----------|--------------|-------------------|-------------|------------|');

    for (const [providerId, summary] of summaries) {
      lines.push(
        `| ${summary.providerName} | ${(summary.successRate * 100).toFixed(1)}% | ` +
        `${summary.averageResponseTime.toFixed(0)}ms | ` +
        `${(summary.averageQualityScores.overall * 100).toFixed(1)}% | ` +
        `$${summary.totalEstimatedCost.toFixed(4)} |`
      );
    }

    lines.push('', '## Detailed Results', '');

    // Detailed breakdown for each provider
    for (const [providerId, summary] of summaries) {
      lines.push(`### ${summary.providerName} (${providerId})`);
      lines.push('');
      lines.push(`- **Success Rate**: ${(summary.successRate * 100).toFixed(1)}% (${summary.successfulTests}/${summary.totalTests})`);
      lines.push(`- **Average Response Time**: ${summary.averageResponseTime.toFixed(0)}ms`);
      lines.push(`- **95th Percentile Response Time**: ${summary.p95ResponseTime.toFixed(0)}ms`);
      lines.push(`- **Average Quality Score**: ${(summary.averageQualityScores.overall * 100).toFixed(1)}%`);
      lines.push(`- **Total Tokens Used**: ${summary.totalTokens.toLocaleString()}`);
      lines.push(`- **Estimated Total Cost**: $${summary.totalEstimatedCost.toFixed(4)}`);
      lines.push('');

      // Category performance
      lines.push('**Category Performance:**');
      for (const [category, performance] of summary.categoryPerformance) {
        lines.push(`- ${category}: ${(performance.successRate * 100).toFixed(1)}% success, ` +
                   `${(performance.averageQuality * 100).toFixed(1)}% quality, ` +
                   `${performance.averageResponseTime.toFixed(0)}ms avg time`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get detailed results for analysis
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}