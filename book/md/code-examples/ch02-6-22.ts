export class PerformanceOptimizedStrategy implements RoutingStrategy {
  getName(): string {
    return 'performance-optimized';
  }

  async selectProvider(
    context: RoutingContext,
    availableProviders: Map<string, BaseAIProvider>
  ): Promise<RoutingDecision> {
    const healthyProviders = Array.from(availableProviders.entries())
      .filter(([id, provider]) => provider.getHealth().status === 'healthy');

    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    // Sort by average response time (fastest first)
    const providersBySpeed = healthyProviders
      .map(([id, provider]) => {
        const metrics = provider.getMetrics();
        return {
          id,
          provider,
          avgResponseTime: metrics.averageResponseTime,
          // Prefer local providers (lower latency)
          isLocal: provider.getName() === 'ollama'
        };
      })
      .sort((a, b) => {
        // Prioritize local providers
        if (a.isLocal && !b.isLocal) return -1;
        if (!a.isLocal && b.isLocal) return 1;

        // Then sort by response time
        return a.avgResponseTime - b.avgResponseTime;
      });

    const selected = providersBySpeed[0];

    // Select fastest model for complexity
    const model = this.getFastestModel(selected.provider.getName(), context.complexity);

    const estimatedPromptTokens = Math.ceil(context.prompt.length / 4);
    const estimatedCompletionTokens = context.complexity === 'complex' ? 2000 : 500;
    const estimatedCost = selected.provider.calculateCost(
      estimatedPromptTokens,
      estimatedCompletionTokens,
      model
    );

    return {
      providerId: selected.id,
      model,
      reasoning: `Fastest provider (avg: ${selected.avgResponseTime.toFixed(0)}ms, local: ${selected.isLocal})`,
      estimatedCost,
      fallbacks: providersBySpeed.slice(1, 4).map(p => p.id),
      confidence: 0.85
    };
  }

  private getFastestModel(providerName: string, complexity: string): string {
    // Smaller models = faster inference
    if (providerName === 'ollama') {
      return 'qwen2.5-coder:7b';  // Smallest model
    } else if (providerName === 'openai') {
      return 'gpt-3.5-turbo';  // Fastest OpenAI model
    } else if (providerName === 'anthropic') {
      return 'claude-3-haiku-20240307';  // Fastest Claude model
    } else if (providerName === 'google') {
      return 'gemini-1.5-flash';  // Flash = fast
    }

    return '';
  }
}