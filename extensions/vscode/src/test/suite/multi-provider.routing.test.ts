/**
 * Multi-Provider AI Integration - Provider Routing Tests
 * Tests automatic provider selection, failover, and routing strategies
 *
 * Tests routing for:
 * - Automatic provider selection based on query type
 * - Failover to secondary provider on error
 * - Cost-aware routing (minimize API costs)
 * - Performance-aware routing (minimize latency)
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
	PROVIDER_TEST_TIMEOUTS,
	PROVIDER_CAPABILITIES,
	ROUTING_WEIGHTS,
	ROUTING_TEST_DATA,
} from '../helpers/test-constants';

/**
 * Query types for provider selection
 */
enum QueryType {
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  EXPLANATION = 'explanation',
  REFACTORING = 'refactoring',
  DEBUG = 'debug',
  TRANSLATION = 'translation',
}

/**
 * AI Provider types
 */
enum ProviderType {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
}

/**
 * Provider capability profile
 */
interface ProviderCapability {
  provider: ProviderType;
  queryTypes: QueryType[];
  costPerToken: number; // cents per 1000 tokens
  avgLatencyMs: number;
  maxTokens: number;
  reliability: number; // 0-1
}

/**
 * Routing decision
 */
interface RoutingDecision {
  primaryProvider: ProviderType;
  fallbackProviders: ProviderType[];
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
}

/**
 * Query context
 */
interface QueryContext {
  type: QueryType;
  tokensEstimate: number;
  priority: 'low' | 'medium' | 'high';
  maxCostCents?: number;
  maxLatencyMs?: number;
}

/**
 * Provider Router
 * Routes queries to appropriate AI providers based on various strategies
 */
class ProviderRouter {
  private providers: Map<ProviderType, ProviderCapability> = new Map();
  private providerHealth: Map<ProviderType, boolean> = new Map();

  constructor() {
    // Initialize default provider capabilities from constants
    this.providers.set(ProviderType.OLLAMA, {
      provider: ProviderType.OLLAMA,
      queryTypes: [...PROVIDER_CAPABILITIES.OLLAMA.QUERY_TYPES] as QueryType[],
      costPerToken: PROVIDER_CAPABILITIES.OLLAMA.COST_PER_1K_TOKENS,
      avgLatencyMs: PROVIDER_CAPABILITIES.OLLAMA.AVG_LATENCY_MS,
      maxTokens: PROVIDER_CAPABILITIES.OLLAMA.MAX_TOKENS,
      reliability: PROVIDER_CAPABILITIES.OLLAMA.RELIABILITY,
    });

    this.providers.set(ProviderType.OPENAI, {
      provider: ProviderType.OPENAI,
      queryTypes: [...PROVIDER_CAPABILITIES.OPENAI.QUERY_TYPES] as QueryType[],
      costPerToken: PROVIDER_CAPABILITIES.OPENAI.COST_PER_1K_TOKENS,
      avgLatencyMs: PROVIDER_CAPABILITIES.OPENAI.AVG_LATENCY_MS,
      maxTokens: PROVIDER_CAPABILITIES.OPENAI.MAX_TOKENS,
      reliability: PROVIDER_CAPABILITIES.OPENAI.RELIABILITY,
    });

    this.providers.set(ProviderType.ANTHROPIC, {
      provider: ProviderType.ANTHROPIC,
      queryTypes: [...PROVIDER_CAPABILITIES.ANTHROPIC.QUERY_TYPES] as QueryType[],
      costPerToken: PROVIDER_CAPABILITIES.ANTHROPIC.COST_PER_1K_TOKENS,
      avgLatencyMs: PROVIDER_CAPABILITIES.ANTHROPIC.AVG_LATENCY_MS,
      maxTokens: PROVIDER_CAPABILITIES.ANTHROPIC.MAX_TOKENS,
      reliability: PROVIDER_CAPABILITIES.ANTHROPIC.RELIABILITY,
    });

    this.providers.set(ProviderType.GEMINI, {
      provider: ProviderType.GEMINI,
      queryTypes: [...PROVIDER_CAPABILITIES.GEMINI.QUERY_TYPES] as QueryType[],
      costPerToken: PROVIDER_CAPABILITIES.GEMINI.COST_PER_1K_TOKENS,
      avgLatencyMs: PROVIDER_CAPABILITIES.GEMINI.AVG_LATENCY_MS,
      maxTokens: PROVIDER_CAPABILITIES.GEMINI.MAX_TOKENS,
      reliability: PROVIDER_CAPABILITIES.GEMINI.RELIABILITY,
    });

    // Initialize all providers as healthy
    for (const provider of this.providers.keys()) {
      this.providerHealth.set(provider, true);
    }
  }

  /**
   * Set provider health status
   */
  setProviderHealth(provider: ProviderType, isHealthy: boolean): void {
    this.providerHealth.set(provider, isHealthy);
  }

  /**
   * Get capable and healthy providers for a query type
   * Helper method to eliminate duplication across routing methods
   */
  private getCapableProviders(
    context: QueryContext,
    excludeProviders: ProviderType[] = []
  ): ProviderCapability[] {
    const capable = Array.from(this.providers.values()).filter(
      p => p.queryTypes.includes(context.type) &&
           this.providerHealth.get(p.provider) &&
           !excludeProviders.includes(p.provider)
    );

    if (capable.length === 0) {
      const reason = excludeProviders.length > 0
        ? `No available providers after failover attempts: ${excludeProviders.join(', ')}`
        : `No providers available for query type: ${context.type}`;
      throw new Error(reason);
    }

    return capable;
  }

  /**
   * Calculate cost for a provider given token count
   * FIX BUG: Properly calculate cost per 1000 tokens
   */
  private calculateCost(provider: ProviderCapability, tokens: number): number {
    // costPerToken is in cents per 1000 tokens, so we calculate:
    // cost = (cents per 1k tokens) * (tokens / 1000)
    return provider.costPerToken * (tokens / 1000);
  }

  /**
   * Build routing decision from selected provider
   * Helper method to eliminate duplication across routing methods
   */
  private buildRoutingDecision(
    primary: ProviderCapability,
    fallbacks: ProviderCapability[],
    context: QueryContext,
    reason: string
  ): RoutingDecision {
    return {
      primaryProvider: primary.provider,
      fallbackProviders: fallbacks.map(p => p.provider),
      reason,
      estimatedCost: this.calculateCost(primary, context.tokensEstimate),
      estimatedLatency: primary.avgLatencyMs,
    };
  }

  /**
   * Route query based on type with automatic provider selection
   */
  routeByQueryType(context: QueryContext): RoutingDecision {
    const capableProviders = this.getCapableProviders(context);

    // Sort by reliability (descending)
    capableProviders.sort((a, b) => b.reliability - a.reliability);

    return this.buildRoutingDecision(
      capableProviders[0],
      capableProviders.slice(1),
      context,
      `Selected based on query type ${context.type} and reliability ${capableProviders[0].reliability}`
    );
  }

  /**
   * Route with failover strategy
   */
  routeWithFailover(context: QueryContext, failedProviders: ProviderType[] = []): RoutingDecision {
    const availableProviders = this.getCapableProviders(context, failedProviders);

    // Sort by reliability (descending)
    availableProviders.sort((a, b) => b.reliability - a.reliability);

    return this.buildRoutingDecision(
      availableProviders[0],
      availableProviders.slice(1),
      context,
      `Failover routing after failures: ${failedProviders.join(', ')}`
    );
  }

  /**
   * Route with cost-aware strategy (minimize cost)
   */
  routeCostAware(context: QueryContext): RoutingDecision {
    const capableProviders = this.getCapableProviders(context);

    // Sort by cost (ascending)
    capableProviders.sort((a, b) => a.costPerToken - b.costPerToken);

    const primary = capableProviders[0];
    const estimatedCost = this.calculateCost(primary, context.tokensEstimate);

    // Check cost constraint
    if (context.maxCostCents !== undefined && estimatedCost > context.maxCostCents) {
      throw new Error(`No providers available within cost constraint: ${context.maxCostCents} cents`);
    }

    return this.buildRoutingDecision(
      primary,
      capableProviders.slice(1),
      context,
      `Cost-optimized selection: ${primary.costPerToken} cents/1k tokens`
    );
  }

  /**
   * Route with performance-aware strategy (minimize latency)
   */
  routePerformanceAware(context: QueryContext): RoutingDecision {
    const capableProviders = this.getCapableProviders(context);

    // Sort by latency (ascending)
    capableProviders.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);

    const primary = capableProviders[0];

    // Check latency constraint
    if (context.maxLatencyMs !== undefined && primary.avgLatencyMs > context.maxLatencyMs) {
      throw new Error(`No providers available within latency constraint: ${context.maxLatencyMs}ms`);
    }

    return this.buildRoutingDecision(
      primary,
      capableProviders.slice(1),
      context,
      `Performance-optimized selection: ${primary.avgLatencyMs}ms average latency`
    );
  }

  /**
   * Route with balanced strategy (cost/performance tradeoff)
   */
  routeBalanced(context: QueryContext): RoutingDecision {
    const capableProviders = this.getCapableProviders(context);

    // Calculate normalized scores (0-1) for cost and performance
    const costs = capableProviders.map(p => p.costPerToken);
    const latencies = capableProviders.map(p => p.avgLatencyMs);

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    // Score providers based on normalized cost and latency (lower is better)
    const scoredProviders = capableProviders.map(p => {
      const costScore = maxCost === minCost ? 0 : (p.costPerToken - minCost) / (maxCost - minCost);
      const latencyScore = maxLatency === minLatency ? 0 : (p.avgLatencyMs - minLatency) / (maxLatency - minLatency);
      const reliabilityScore = 1 - p.reliability; // Invert so lower is better

      // Weighted score using constants
      const score =
        costScore * ROUTING_WEIGHTS.BALANCED.COST +
        latencyScore * ROUTING_WEIGHTS.BALANCED.LATENCY +
        reliabilityScore * ROUTING_WEIGHTS.BALANCED.RELIABILITY;

      return { provider: p, score };
    });

    // Sort by score (ascending - lower is better)
    scoredProviders.sort((a, b) => a.score - b.score);

    const primary = scoredProviders[0].provider;
    const fallbacks = scoredProviders.slice(1).map(sp => sp.provider);

    return this.buildRoutingDecision(
      primary,
      fallbacks,
      context,
      `Balanced routing (cost/performance/reliability)`
    );
  }
}

suite('Multi-Provider AI Integration - Provider Routing Tests', () => {
  let testWorkspacePath: string;
  let router: ProviderRouter;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('provider-routing-tests');
    router = new ProviderRouter();
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Automatic Provider Selection', () => {
    test('Should select provider based on code generation query type', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.MEDIUM,
        priority: 'medium',
      };

      const decision = router.routeByQueryType(context);

      assert.ok(decision.primaryProvider, 'Should select a primary provider');
      assert.ok(decision.fallbackProviders.length > 0, 'Should have fallback providers');
      assert.ok(decision.reason.includes('query type'), 'Reason should mention query type');
      assert.ok([ProviderType.OPENAI, ProviderType.ANTHROPIC].includes(decision.primaryProvider), 'Should select high-reliability provider');

      console.log(`✓ Selected ${decision.primaryProvider} for code generation`);
    });

    test('Should select provider based on translation query type', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.TRANSLATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.SMALL,
        priority: 'low',
      };

      const decision = router.routeByQueryType(context);

      assert.ok(decision.primaryProvider, 'Should select a primary provider');
      assert.ok([ProviderType.OPENAI, ProviderType.GEMINI].includes(decision.primaryProvider), 'Should select provider supporting translation');

      console.log(`✓ Selected ${decision.primaryProvider} for translation`);
    });

    test('Should throw error for unsupported query type when all providers down', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Mark all providers as unhealthy
      router.setProviderHealth(ProviderType.OLLAMA, false);
      router.setProviderHealth(ProviderType.OPENAI, false);
      router.setProviderHealth(ProviderType.ANTHROPIC, false);
      router.setProviderHealth(ProviderType.GEMINI, false);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.MEDIUM,
        priority: 'high',
      };

      assert.throws(
        () => router.routeByQueryType(context),
        /No providers available/,
        'Should throw error when no providers available'
      );

      console.log(`✓ Correctly threw error when all providers unavailable`);
    });
  });

  suite('Failover Routing', () => {
    test('Should failover to secondary provider when primary fails', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_REVIEW,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.LARGE,
        priority: 'high',
      };

      // First attempt - get primary
      const firstDecision = router.routeByQueryType(context);
      const failedProvider = firstDecision.primaryProvider;

      // Simulate primary failure - route with failover
      const failoverDecision = router.routeWithFailover(context, [failedProvider]);

      assert.notStrictEqual(failoverDecision.primaryProvider, failedProvider, 'Should select different provider');
      assert.ok(failoverDecision.reason.includes('Failover'), 'Reason should mention failover');
      assert.ok(failoverDecision.reason.includes(failedProvider), 'Reason should mention failed provider');

      console.log(`✓ Failed over from ${failedProvider} to ${failoverDecision.primaryProvider}`);
    });

    test('Should handle multiple failover attempts', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.EXPLANATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.MEDIUM + 500,
        priority: 'medium',
      };

      // Simulate two providers failing
      const failedProviders = [ProviderType.OPENAI, ProviderType.ANTHROPIC];
      const decision = router.routeWithFailover(context, failedProviders);

      assert.ok(!failedProviders.includes(decision.primaryProvider), 'Should not select failed providers');
      assert.ok(decision.reason.includes(ProviderType.OPENAI), 'Should mention first failure');
      assert.ok(decision.reason.includes(ProviderType.ANTHROPIC), 'Should mention second failure');

      console.log(`✓ Successfully failed over after ${failedProviders.length} attempts to ${decision.primaryProvider}`);
    });

    test('Should throw error when all providers exhausted', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: 1000,
        priority: 'high',
      };

      // Simulate all providers failing
      const allProviders = [ProviderType.OLLAMA, ProviderType.OPENAI, ProviderType.ANTHROPIC, ProviderType.GEMINI];

      assert.throws(
        () => router.routeWithFailover(context, allProviders),
        /No available providers after failover/,
        'Should throw error when all providers fail'
      );

      console.log(`✓ Correctly threw error after all providers exhausted`);
    });
  });

  suite('Cost-Aware Routing', () => {
    test('Should select lowest cost provider', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.XXLARGE,
        priority: 'low',
      };

      const decision = router.routeCostAware(context);

      // Ollama is free (0 cost per token)
      assert.strictEqual(decision.primaryProvider, ProviderType.OLLAMA, 'Should select Ollama (free)');
      assert.strictEqual(decision.estimatedCost, 0, 'Cost should be zero for Ollama');
      assert.ok(decision.reason.includes('Cost-optimized'), 'Reason should mention cost optimization');

      console.log(`✓ Selected ${decision.primaryProvider} with cost ${decision.estimatedCost} cents`);
    });

    test('Should respect cost constraints', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Mark Ollama as unavailable to test paid providers
      router.setProviderHealth(ProviderType.OLLAMA, false);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.XXXLARGE,
        priority: 'medium',
        maxCostCents: ROUTING_TEST_DATA.COST_CONSTRAINTS.LOW, // 1.5 cents max (should select Gemini at 0.001/1k = 0.01 cents)
      };

      const decision = router.routeCostAware(context);

      assert.ok(decision.estimatedCost <= context.maxCostCents!, 'Should respect cost constraint');
      assert.strictEqual(decision.primaryProvider, ProviderType.GEMINI, 'Should select Gemini (cheapest paid option)');

      console.log(`✓ Selected ${decision.primaryProvider} within budget: ${decision.estimatedCost} cents (max: ${context.maxCostCents} cents)`);
    });

    test('Should throw error when cost constraint cannot be met', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Mark Ollama as unavailable
      router.setProviderHealth(ProviderType.OLLAMA, false);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.XXXLARGE,
        priority: 'high',
        maxCostCents: ROUTING_TEST_DATA.COST_CONSTRAINTS.VERY_LOW, // 0.5 cents - impossible with paid providers
      };

      assert.throws(
        () => router.routeCostAware(context),
        /No providers available within cost constraint/,
        'Should throw error when cost constraint cannot be met'
      );

      console.log(`✓ Correctly threw error for impossible cost constraint`);
    });
  });

  suite('Performance-Aware Routing', () => {
    test('Should select fastest provider', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_REVIEW,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.LARGE,
        priority: 'high',
      };

      const decision = router.routePerformanceAware(context);

      // Anthropic has lowest latency
      assert.strictEqual(decision.primaryProvider, ProviderType.ANTHROPIC, 'Should select Anthropic (fastest)');
      assert.strictEqual(decision.estimatedLatency, PROVIDER_CAPABILITIES.ANTHROPIC.AVG_LATENCY_MS, 'Should have Anthropic latency');
      assert.ok(decision.reason.includes('Performance-optimized'), 'Reason should mention performance');

      console.log(`✓ Selected ${decision.primaryProvider} with latency ${decision.estimatedLatency}ms`);
    });

    test('Should respect latency constraints', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.MEDIUM,
        priority: 'high',
        maxLatencyMs: ROUTING_TEST_DATA.LATENCY_CONSTRAINTS.LOW, // Should exclude Ollama (2000ms) and Gemini (1000ms)
      };

      const decision = router.routePerformanceAware(context);

      assert.ok(decision.estimatedLatency <= context.maxLatencyMs!, 'Should respect latency constraint');
      assert.ok([ProviderType.ANTHROPIC, ProviderType.OPENAI].includes(decision.primaryProvider), 'Should select fast provider');

      console.log(`✓ Selected ${decision.primaryProvider} within latency: ${decision.estimatedLatency}ms (max: ${context.maxLatencyMs}ms)`);
    });

    test('Should throw error when latency constraint cannot be met', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.MEDIUM,
        priority: 'high',
        maxLatencyMs: ROUTING_TEST_DATA.LATENCY_CONSTRAINTS.VERY_LOW, // Impossible - fastest is Anthropic at 600ms
      };

      assert.throws(
        () => router.routePerformanceAware(context),
        /No providers available within latency constraint/,
        'Should throw error when latency constraint cannot be met'
      );

      console.log(`✓ Correctly threw error for impossible latency constraint`);
    });
  });

  suite('Balanced Routing', () => {
    test('Should balance cost and performance', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const context: QueryContext = {
        type: QueryType.CODE_GENERATION,
        tokensEstimate: ROUTING_TEST_DATA.TOKEN_ESTIMATES.XLARGE,
        priority: 'medium',
      };

      const decision = router.routeBalanced(context);

      assert.ok(decision.primaryProvider, 'Should select a provider');
      assert.ok(decision.reason.includes('Balanced'), 'Reason should mention balanced routing');

      // Balanced routing should consider cost, latency, and reliability
      // It should not necessarily pick the cheapest or fastest, but a good compromise
      console.log(`✓ Selected ${decision.primaryProvider} for balanced routing (cost: ${decision.estimatedCost} cents, latency: ${decision.estimatedLatency}ms)`);
    });
  });
});
