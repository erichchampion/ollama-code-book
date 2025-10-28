/**
 * Intelligent AI Router
 *
 * Routes AI requests to the optimal provider based on capabilities, cost,
 * performance, and current provider health. Implements fallback chains
 * and circuit breaker patterns for reliability.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { normalizeError } from '../../utils/error-utils.js';
import { THRESHOLD_CONSTANTS } from '../../config/constants.js';
import {
  BaseAIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  AIStreamEvent,
  AIModel,
  AICapability,
  ProviderError,
  ProviderRateLimitError,
  ProviderConnectionError
} from './base-provider.js';

export interface RoutingStrategy {
  name: string;
  priority: number;
  description: string;
}

export const ROUTING_STRATEGIES = {
  PERFORMANCE: { name: 'performance', priority: 1, description: 'Route to fastest provider' },
  COST: { name: 'cost', priority: 2, description: 'Route to most cost-effective provider' },
  QUALITY: { name: 'quality', priority: 3, description: 'Route to highest quality provider' },
  CAPABILITY: { name: 'capability', priority: 4, description: 'Route based on required capabilities' },
  ROUND_ROBIN: { name: 'round_robin', priority: 5, description: 'Distribute load evenly' },
  STICKY: { name: 'sticky', priority: 6, description: 'Prefer same provider for session' }
} as const;

export interface RoutingContext {
  requiredCapabilities: AICapability[];
  preferredResponseTime: number;
  maxCostPerToken: number;
  prioritizeQuality: boolean;
  sessionId?: string;
  userId?: string;
  requestType: 'completion' | 'streaming' | 'analysis' | 'generation';
}

export interface RoutingDecision {
  provider: BaseAIProvider;
  reasoning: string;
  confidence: number;
  fallbackProviders: BaseAIProvider[];
  estimatedCost: number;
  estimatedResponseTime: number;
}

export interface RouterConfig {
  defaultStrategy: string;
  fallbackEnabled: boolean;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
  performanceWindowMs: number;
  costOptimizationEnabled: boolean;
  qualityThreshold: number;
  loadBalancingEnabled: boolean;
}

export interface RouterMetrics {
  totalRequests: number;
  successfulRoutings: number;
  fallbacksUsed: number;
  providerSwitches: number;
  averageDecisionTime: number;
  costSavings: number;
  performanceGains: number;
}

/**
 * Intelligent AI Router
 */
export class IntelligentAIRouter extends EventEmitter {
  private providers: Map<string, BaseAIProvider> = new Map();
  private config: RouterConfig;
  private metrics: RouterMetrics;
  private lastUsedProvider: Map<string, string> = new Map(); // sessionId -> providerId
  private roundRobinIndex: number = 0;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private performanceHistory: Map<string, PerformanceData[]> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: Partial<RouterConfig> = {}) {
    super();

    this.config = {
      defaultStrategy: 'capability',
      fallbackEnabled: true,
      circuitBreakerThreshold: 5,
      healthCheckInterval: 30000, // 30 seconds
      performanceWindowMs: 300000, // 5 minutes
      costOptimizationEnabled: true,
      qualityThreshold: 70,
      loadBalancingEnabled: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.startHealthChecking();
  }

  /**
   * Register a provider with the router
   */
  async registerProvider(provider: BaseAIProvider): Promise<void> {
    const providerName = provider.getName().toLowerCase();

    logger.info(`Registering AI provider: ${providerName}`);

    // Initialize provider if not already done
    if (!provider.isReady()) {
      await provider.initialize();
    }

    this.providers.set(providerName, provider);
    this.circuitBreakers.set(providerName, new CircuitBreakerState());
    this.performanceHistory.set(providerName, []);

    // Set up provider event listeners
    provider.on('healthUpdated', (health) => {
      this.updateCircuitBreaker(providerName, health.status === 'healthy');
    });

    provider.on('metricsUpdated', (metrics) => {
      this.updatePerformanceHistory(providerName, metrics);
    });

    this.emit('providerRegistered', { provider: providerName, capabilities: provider.getCapabilities() });

    logger.info(`AI provider registered successfully: ${providerName}`);
  }

  /**
   * Unregister a provider
   */
  async unregisterProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) return;

    logger.info(`Unregistering AI provider: ${providerName}`);

    await provider.cleanup();
    this.providers.delete(providerName.toLowerCase());
    this.circuitBreakers.delete(providerName.toLowerCase());
    this.performanceHistory.delete(providerName.toLowerCase());

    this.emit('providerUnregistered', { provider: providerName });

    logger.info(`AI provider unregistered: ${providerName}`);
  }

  /**
   * Route a completion request to the optimal provider
   */
  async route(
    prompt: string | AIMessage[],
    options: AICompletionOptions = {},
    context: Partial<RoutingContext> = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();

    try {
      // Make routing decision
      const decision = await this.makeRoutingDecision(context, options);

      logger.debug('Routing decision made', {
        provider: decision.provider.getName(),
        reasoning: decision.reasoning,
        confidence: decision.confidence
      });

      // Attempt request with primary provider
      try {
        const response = await decision.provider.complete(prompt, options);

        // Update metrics
        this.updateSuccessMetrics(startTime, decision.provider.getName());

        return response;
      } catch (error) {
        // Handle provider-specific errors and attempt fallback
        if (this.config.fallbackEnabled && decision.fallbackProviders.length > 0) {
          logger.warn(`Primary provider failed, attempting fallback`, {
            primary: decision.provider.getName(),
            error: normalizeError(error).message
          });

          return await this.attemptFallback(decision.fallbackProviders, prompt, options, startTime);
        }

        throw error;
      }
    } catch (error) {
      this.updateFailureMetrics(startTime);
      logger.error('AI routing failed:', error);
      throw error;
    }
  }

  /**
   * Route a streaming completion request
   */
  async routeStream(
    prompt: string | AIMessage[],
    options: AICompletionOptions,
    onEvent: (event: AIStreamEvent) => void,
    context: Partial<RoutingContext> = {},
    abortSignal?: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Make routing decision (prefer streaming-capable providers)
      const streamingContext = {
        ...context,
        requiredCapabilities: [...(context.requiredCapabilities || []), AICapability.STREAMING],
        requestType: 'streaming' as const
      };

      const decision = await this.makeRoutingDecision(streamingContext, options);

      logger.debug('Streaming routing decision made', {
        provider: decision.provider.getName(),
        reasoning: decision.reasoning
      });

      // Attempt streaming request
      try {
        await decision.provider.completeStream(prompt, options, onEvent, abortSignal);

        this.updateSuccessMetrics(startTime, decision.provider.getName());
      } catch (error) {
        // For streaming, fallback is more complex, so we'll just fail for now
        // In a production system, you might implement stream resumption
        this.updateFailureMetrics(startTime);
        throw error;
      }
    } catch (error) {
      logger.error('AI streaming routing failed:', error);
      throw error;
    }
  }

  /**
   * Get the best provider for specific capabilities
   */
  async getBestProvider(context: Partial<RoutingContext> = {}): Promise<BaseAIProvider | null> {
    try {
      const decision = await this.makeRoutingDecision(context);
      return decision.provider;
    } catch {
      return null;
    }
  }

  /**
   * List all available models across all providers
   */
  async getAllModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = [];

    for (const [providerName, provider] of this.providers) {
      try {
        const models = await provider.listModels();
        allModels.push(...models);
      } catch (error) {
        logger.warn(`Failed to get models from provider ${providerName}:`, error);
      }
    }

    return allModels;
  }

  /**
   * Get router metrics
   */
  getMetrics(): RouterMetrics {
    return { ...this.metrics };
  }

  /**
   * Get provider status summary
   */
  getProviderStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      const health = provider.getHealth();
      const metrics = provider.getMetrics();
      const circuitBreaker = this.circuitBreakers.get(name);

      status[name] = {
        health: health.status,
        isReady: provider.isReady(),
        circuitBreaker: circuitBreaker?.state || 'unknown',
        responseTime: health.responseTime,
        successRate: metrics.totalRequests > 0
          ? (metrics.successfulRequests / metrics.totalRequests) * 100
          : 0,
        totalRequests: metrics.totalRequests,
        capabilities: provider.getCapabilities().supportedCapabilities
      };
    }

    return status;
  }

  /**
   * Cleanup router resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up AI router');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cleanup all providers
    for (const provider of this.providers.values()) {
      await provider.cleanup();
    }

    this.providers.clear();
    this.circuitBreakers.clear();
    this.performanceHistory.clear();

    this.removeAllListeners();

    logger.info('AI router cleanup completed');
  }

  /**
   * Make routing decision based on context and strategy
   */
  private async makeRoutingDecision(
    context: Partial<RoutingContext> = {},
    options: AICompletionOptions = {}
  ): Promise<RoutingDecision> {
    const startTime = Date.now();

    // Get available providers (healthy and not circuit-broken)
    const availableProviders = this.getAvailableProviders(context.requiredCapabilities || []);

    if (availableProviders.length === 0) {
      throw new ProviderError('No available providers found', 'router', 'NO_PROVIDERS');
    }

    // Apply routing strategy
    const strategy = this.config.defaultStrategy;
    let selectedProvider: BaseAIProvider;
    let reasoning: string;
    let confidence: number;

    switch (strategy) {
      case 'performance':
        ({ provider: selectedProvider, reasoning, confidence } = this.selectByPerformance(availableProviders));
        break;
      case 'cost':
        ({ provider: selectedProvider, reasoning, confidence } = this.selectByCost(availableProviders, options));
        break;
      case 'quality':
        ({ provider: selectedProvider, reasoning, confidence } = this.selectByQuality(availableProviders));
        break;
      case 'round_robin':
        ({ provider: selectedProvider, reasoning, confidence } = this.selectRoundRobin(availableProviders));
        break;
      case 'sticky':
        ({ provider: selectedProvider, reasoning, confidence } = this.selectSticky(availableProviders, context.sessionId));
        break;
      default: // capability
        ({ provider: selectedProvider, reasoning, confidence } = this.selectByCapability(availableProviders, context));
    }

    // Prepare fallback providers
    const fallbackProviders = availableProviders.filter(p => p !== selectedProvider);

    // Estimate cost and response time
    const estimatedCost = selectedProvider.calculateCost(1000, 500, options.model); // Rough estimate
    const estimatedResponseTime = selectedProvider.getHealth().responseTime || 0;

    const decisionTime = Date.now() - startTime;
    this.updateDecisionMetrics(decisionTime);

    return {
      provider: selectedProvider,
      reasoning,
      confidence,
      fallbackProviders,
      estimatedCost,
      estimatedResponseTime
    };
  }

  /**
   * Get providers that are available and support required capabilities
   */
  private getAvailableProviders(requiredCapabilities: AICapability[]): BaseAIProvider[] {
    const available: BaseAIProvider[] = [];

    for (const [name, provider] of this.providers) {
      // Check if provider is healthy and ready
      if (!provider.isReady()) continue;

      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(name);
      if (circuitBreaker?.state === 'open') continue;

      // Check capabilities
      const capabilities = provider.getCapabilities();
      const hasRequiredCapabilities = requiredCapabilities.every(cap =>
        capabilities.supportedCapabilities.includes(cap)
      );

      if (hasRequiredCapabilities) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Select provider by performance (fastest response time)
   */
  private selectByPerformance(providers: BaseAIProvider[]): { provider: BaseAIProvider; reasoning: string; confidence: number } {
    let bestProvider = providers[0];
    let bestResponseTime = bestProvider.getHealth().responseTime;

    for (const provider of providers.slice(1)) {
      const responseTime = provider.getHealth().responseTime;
      if (responseTime < bestResponseTime) {
        bestProvider = provider;
        bestResponseTime = responseTime;
      }
    }

    return {
      provider: bestProvider,
      reasoning: `Selected ${bestProvider.getName()} for best performance (${bestResponseTime}ms response time)`,
      confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.HIGH_CONFIDENCE
    };
  }

  /**
   * Select provider by cost (lowest cost per token)
   */
  private selectByCost(providers: BaseAIProvider[], options: AICompletionOptions): { provider: BaseAIProvider; reasoning: string; confidence: number } {
    let bestProvider = providers[0];
    let bestCost = bestProvider.calculateCost(1000, 500, options.model);

    for (const provider of providers.slice(1)) {
      const cost = provider.calculateCost(1000, 500, options.model);
      if (cost < bestCost) {
        bestProvider = provider;
        bestCost = cost;
      }
    }

    return {
      provider: bestProvider,
      reasoning: `Selected ${bestProvider.getName()} for lowest cost ($${bestCost.toFixed(4)} per 1500 tokens)`,
      confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.VERY_HIGH_CONFIDENCE
    };
  }

  /**
   * Select provider by quality (highest quality score)
   */
  private selectByQuality(providers: BaseAIProvider[]): { provider: BaseAIProvider; reasoning: string; confidence: number } {
    // For now, use a simple heuristic based on provider name
    // In production, this would use actual quality metrics
    const qualityScores = new Map([
      ['ollama', 85],
      ['openai', 95],
      ['anthropic', 92],
      ['google', 88]
    ]);

    let bestProvider = providers[0];
    let bestScore = qualityScores.get(bestProvider.getName().toLowerCase()) || 70;

    for (const provider of providers.slice(1)) {
      const score = qualityScores.get(provider.getName().toLowerCase()) || 70;
      if (score > bestScore) {
        bestProvider = provider;
        bestScore = score;
      }
    }

    return {
      provider: bestProvider,
      reasoning: `Selected ${bestProvider.getName()} for highest quality (score: ${bestScore}/100)`,
      confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.MEDIUM_CONFIDENCE
    };
  }

  /**
   * Select provider using round-robin distribution
   */
  private selectRoundRobin(providers: BaseAIProvider[]): { provider: BaseAIProvider; reasoning: string; confidence: number } {
    const selectedProvider = providers[this.roundRobinIndex % providers.length];
    this.roundRobinIndex++;

    return {
      provider: selectedProvider,
      reasoning: `Selected ${selectedProvider.getName()} using round-robin load balancing`,
      confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.LOW_CONFIDENCE
    };
  }

  /**
   * Select provider with session stickiness
   */
  private selectSticky(providers: BaseAIProvider[], sessionId?: string): { provider: BaseAIProvider; reasoning: string; confidence: number } {
    if (sessionId) {
      const lastUsed = this.lastUsedProvider.get(sessionId);
      const stickyProvider = providers.find(p => p.getName().toLowerCase() === lastUsed);

      if (stickyProvider) {
        return {
          provider: stickyProvider,
          reasoning: `Selected ${stickyProvider.getName()} for session stickiness`,
          confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.VERY_HIGH_CONFIDENCE
        };
      }
    }

    // Fallback to first available provider
    const selectedProvider = providers[0];
    if (sessionId) {
      this.lastUsedProvider.set(sessionId, selectedProvider.getName().toLowerCase());
    }

    return {
      provider: selectedProvider,
      reasoning: `Selected ${selectedProvider.getName()} as session default`,
      confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.MEDIUM_CONFIDENCE
    };
  }

  /**
   * Select provider by capability matching
   */
  private selectByCapability(providers: BaseAIProvider[], context: Partial<RoutingContext>): { provider: BaseAIProvider; reasoning: string; confidence: number } {
    // For now, just return the first provider that matches capabilities
    // In production, this would do more sophisticated capability scoring
    const selectedProvider = providers[0];

    return {
      provider: selectedProvider,
      reasoning: `Selected ${selectedProvider.getName()} based on capability matching`,
      confidence: THRESHOLD_CONSTANTS.PROVIDER_ROUTING.HIGH_CONFIDENCE
    };
  }

  /**
   * Attempt fallback to alternative providers
   */
  private async attemptFallback(
    fallbackProviders: BaseAIProvider[],
    prompt: string | AIMessage[],
    options: AICompletionOptions,
    startTime: number
  ): Promise<AICompletionResponse> {
    for (const fallbackProvider of fallbackProviders) {
      try {
        logger.info(`Attempting fallback to ${fallbackProvider.getName()}`);

        const response = await fallbackProvider.complete(prompt, options);

        this.updateFallbackMetrics(startTime, fallbackProvider.getName());

        return response;
      } catch (error) {
        logger.warn(`Fallback provider ${fallbackProvider.getName()} also failed:`, error);
        continue;
      }
    }

    throw new ProviderError('All providers failed, no more fallbacks available', 'router', 'ALL_PROVIDERS_FAILED');
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(providerName: string, success: boolean): void {
    const circuitBreaker = this.circuitBreakers.get(providerName);
    if (!circuitBreaker) return;

    if (success) {
      circuitBreaker.successCount++;
      if (circuitBreaker.state === 'half_open' && circuitBreaker.successCount >= 3) {
        circuitBreaker.state = 'closed';
        circuitBreaker.failureCount = 0;
        logger.info(`Circuit breaker closed for provider ${providerName}`);
      }
    } else {
      circuitBreaker.failureCount++;
      if (circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
        circuitBreaker.state = 'open';
        circuitBreaker.openedAt = Date.now();
        logger.warn(`Circuit breaker opened for provider ${providerName}`);
      }
    }
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(providerName: string, metrics: any): void {
    const history = this.performanceHistory.get(providerName);
    if (!history) return;

    const dataPoint: PerformanceData = {
      timestamp: Date.now(),
      responseTime: metrics.averageResponseTime,
      successRate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 0,
      requestCount: metrics.totalRequests
    };

    history.push(dataPoint);

    // Keep only recent data points (within performance window)
    const cutoffTime = Date.now() - this.config.performanceWindowMs;
    const filteredHistory = history.filter(point => point.timestamp > cutoffTime);
    this.performanceHistory.set(providerName, filteredHistory);
  }

  /**
   * Start health checking for circuit breakers
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      for (const [name, circuitBreaker] of this.circuitBreakers) {
        if (circuitBreaker.state === 'open') {
          // Try to move to half-open after timeout
          if (Date.now() - circuitBreaker.openedAt > 60000) { // 1 minute timeout
            circuitBreaker.state = 'half_open';
            circuitBreaker.successCount = 0;
            logger.info(`Circuit breaker moved to half-open for provider ${name}`);
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Update metrics for successful requests
   */
  private updateSuccessMetrics(startTime: number, providerName: string): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRoutings++;

    const decisionTime = Date.now() - startTime;
    this.updateAverageDecisionTime(decisionTime);
  }

  /**
   * Update metrics for failed requests
   */
  private updateFailureMetrics(startTime: number): void {
    this.metrics.totalRequests++;
    const decisionTime = Date.now() - startTime;
    this.updateAverageDecisionTime(decisionTime);
  }

  /**
   * Update metrics for fallback usage
   */
  private updateFallbackMetrics(startTime: number, providerName: string): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRoutings++;
    this.metrics.fallbacksUsed++;

    const decisionTime = Date.now() - startTime;
    this.updateAverageDecisionTime(decisionTime);
  }

  /**
   * Update decision time metrics
   */
  private updateDecisionMetrics(decisionTime: number): void {
    this.updateAverageDecisionTime(decisionTime);
  }

  /**
   * Update average decision time using exponential moving average
   */
  private updateAverageDecisionTime(decisionTime: number): void {
    if (this.metrics.totalRequests === 1) {
      this.metrics.averageDecisionTime = decisionTime;
    } else {
      const alpha = THRESHOLD_CONSTANTS.PROVIDER_ROUTING.EMA_SMOOTHING_FACTOR;
      this.metrics.averageDecisionTime = alpha * decisionTime + (1 - alpha) * this.metrics.averageDecisionTime;
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): RouterMetrics {
    return {
      totalRequests: 0,
      successfulRoutings: 0,
      fallbacksUsed: 0,
      providerSwitches: 0,
      averageDecisionTime: 0,
      costSavings: 0,
      performanceGains: 0
    };
  }
}

/**
 * Circuit breaker state for providers
 */
class CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open' = 'closed';
  failureCount: number = 0;
  successCount: number = 0;
  openedAt: number = 0;
}

/**
 * Performance data point
 */
interface PerformanceData {
  timestamp: number;
  responseTime: number;
  successRate: number;
  requestCount: number;
}