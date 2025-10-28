export class IntelligentRouter extends EventEmitter {
  private strategies: Map<string, RoutingStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultStrategy: string = 'balanced';

  constructor(
    private providerManager: ProviderManager,
    private logger: Logger
  ) {
    super();

    // Register built-in strategies
    this.registerStrategy(new CostOptimizedStrategy());
    this.registerStrategy(new QualityOptimizedStrategy());
    this.registerStrategy(new PerformanceOptimizedStrategy());
    this.registerStrategy(new BalancedStrategy());

    // Initialize circuit breakers for each provider
    this.initializeCircuitBreakers();
  }

  /**
   * Register a routing strategy
   */
  registerStrategy(strategy: RoutingStrategy): void {
    this.strategies.set(strategy.getName(), strategy);
    this.logger.debug(`Registered routing strategy: ${strategy.getName()}`);
  }

  /**
   * Route a request to the best provider
   */
  async route(context: RoutingContext): Promise<RoutingDecision> {
    const strategyName = this.getStrategyForContext(context);
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(`Unknown routing strategy: ${strategyName}`);
    }

    // Get available providers (excluding those with open circuit breakers)
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.size === 0) {
      throw new Error('No available providers (all circuit breakers open)');
    }

    try {
      const decision = await strategy.selectProvider(context, availableProviders);

      this.logger.info(`Routing decision: ${decision.providerId} (${decision.model})`, {
        strategy: strategyName,
        reasoning: decision.reasoning,
        estimatedCost: decision.estimatedCost
      });

      this.emit('routing_decision', { context, decision, strategy: strategyName });

      return decision;
    } catch (error) {
      this.logger.error('Routing failed', error);
      throw error;
    }
  }

  /**
   * Execute a request with automatic fallback
   */
  async executeWithFallback(
    context: RoutingContext,
    executeFn: (providerId: string, model: string) => Promise<any>
  ): Promise<any> {
    const decision = await this.route(context);
    const attemptOrder = [decision.providerId, ...decision.fallbacks];

    for (const providerId of attemptOrder) {
      const circuitBreaker = this.circuitBreakers.get(providerId);

      if (circuitBreaker && !circuitBreaker.canAttempt()) {
        this.logger.warn(`Circuit breaker open for ${providerId}, skipping`);
        continue;
      }

      try {
        this.logger.debug(`Attempting request with ${providerId}`);
        const result = await executeFn(providerId, decision.model);

        // Success - record it
        circuitBreaker?.recordSuccess();

        this.emit('request_success', { providerId, context });

        return result;
      } catch (error) {
        this.logger.warn(`Request failed with ${providerId}`, error);

        // Record failure
        circuitBreaker?.recordFailure();

        this.emit('request_failure', { providerId, context, error });

        // Continue to next fallback
        continue;
      }
    }

    // All providers failed
    throw new Error('All providers failed (including fallbacks)');
  }

  /**
   * Get strategy name for context
   */
  private getStrategyForContext(context: RoutingContext): string {
    // Use context priority if specified
    if (context.priority) {
      switch (context.priority) {
        case 'cost': return 'cost-optimized';
        case 'quality': return 'quality-optimized';
        case 'performance': return 'performance-optimized';
        case 'balanced': return 'balanced';
      }
    }

    // Use default strategy
    return this.defaultStrategy;
  }

  /**
   * Get available providers (healthy + circuit breaker closed)
   */
  private getAvailableProviders(): Map<string, BaseAIProvider> {
    const allProviders = this.providerManager.getAllProviders();
    const available = new Map<string, BaseAIProvider>();

    for (const [id, provider] of allProviders) {
      const health = provider.getHealth();
      const circuitBreaker = this.circuitBreakers.get(id);

      if (health.status === 'healthy' && (!circuitBreaker || circuitBreaker.canAttempt())) {
        available.set(id, provider);
      }
    }

    return available;
  }

  /**
   * Initialize circuit breakers for all providers
   */
  private initializeCircuitBreakers(): void {
    const providers = this.providerManager.getAllProviders();

    for (const [id] of providers) {
      this.circuitBreakers.set(id, new CircuitBreaker({
        failureThreshold: 5,     // Open after 5 failures
        resetTimeout: 60000,     // Try again after 60s
        halfOpenRequests: 1      // Test with 1 request
      }));
    }
  }
}