export class CostOptimizedStrategy implements RoutingStrategy {
  getName(): string {
    return 'cost-optimized';
  }

  async selectProvider(
    context: RoutingContext,
    availableProviders: Map<string, BaseAIProvider>
  ): Promise<RoutingDecision> {
    const startTime = Date.now();

    // Filter providers by health and capabilities
    const healthyProviders = Array.from(availableProviders.entries())
      .filter(([id, provider]) => {
        const health = provider.getHealth();
        return health.status === 'healthy';
      });

    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    // Estimate tokens for cost calculation
    const estimatedPromptTokens = this.estimateTokens(context.prompt);
    const estimatedCompletionTokens = this.estimateCompletionTokens(context.complexity);

    // Calculate cost for each provider
    const providerCosts = healthyProviders.map(([id, provider]) => {
      const models = this.getModelsForComplexity(provider.getName(), context.complexity);
      const modelCosts = models.map(model => ({
        id,
        model,
        cost: provider.calculateCost(estimatedPromptTokens, estimatedCompletionTokens, model),
        provider
      }));

      // Return cheapest model for this provider
      return modelCosts.sort((a, b) => a.cost - b.cost)[0];
    });

    // Sort by cost (cheapest first)
    providerCosts.sort((a, b) => a.cost - b.cost);

    // Select cheapest option
    const selected = providerCosts[0];

    // Build fallback list
    const fallbacks = providerCosts
      .slice(1, 4)  // Top 3 alternatives
      .map(p => p.id);

    return {
      providerId: selected.id,
      model: selected.model,
      reasoning: `Lowest cost option at $${selected.cost.toFixed(4)} (estimated)`,
      estimatedCost: selected.cost,
      fallbacks,
      confidence: 0.95
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private estimateCompletionTokens(complexity: string): number {
    switch (complexity) {
      case 'simple': return 100;
      case 'medium': return 500;
      case 'complex': return 2000;
      default: return 500;
    }
  }

  private getModelsForComplexity(providerName: string, complexity: string): string[] {
    // Map complexity to appropriate models
    if (providerName === 'ollama') {
      return ['qwen2.5-coder:7b', 'qwen2.5-coder:14b'];
    } else if (providerName === 'openai') {
      switch (complexity) {
        case 'simple': return ['gpt-3.5-turbo'];
        case 'medium': return ['gpt-4-turbo', 'gpt-3.5-turbo'];
        case 'complex': return ['gpt-4', 'gpt-4-turbo'];
      }
    } else if (providerName === 'anthropic') {
      switch (complexity) {
        case 'simple': return ['claude-3-haiku-20240307'];
        case 'medium': return ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
        case 'complex': return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
      }
    } else if (providerName === 'google') {
      switch (complexity) {
        case 'simple': return ['gemini-1.5-flash'];
        case 'medium': return ['gemini-1.5-flash', 'gemini-1.5-pro'];
        case 'complex': return ['gemini-1.5-pro'];
      }
    }

    return [];
  }
}