export class BalancedStrategy implements RoutingStrategy {
  // Weights for scoring (total = 1.0)
  private weights = {
    cost: 0.35,
    quality: 0.40,
    performance: 0.25
  };

  private qualityOptimized = new QualityOptimizedStrategy();
  private costOptimized = new CostOptimizedStrategy();
  private performanceOptimized = new PerformanceOptimizedStrategy();

  getName(): string {
    return 'balanced';
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

    // Get decisions from each strategy
    const [qualityDecision, costDecision, performanceDecision] = await Promise.all([
      this.qualityOptimized.selectProvider(context, availableProviders),
      this.costOptimized.selectProvider(context, availableProviders),
      this.performanceOptimized.selectProvider(context, availableProviders)
    ]);

    // Score each provider based on all criteria
    const scores = new Map<string, number>();

    for (const [id, provider] of healthyProviders) {
      const metrics = provider.getMetrics();

      // Normalize scores (0-1)
      const costScore = this.normalizeCost(costDecision.estimatedCost);
      const qualityScore = this.normalizeQuality(provider.getName(), qualityDecision.model);
      const performanceScore = this.normalizePerformance(metrics.averageResponseTime);

      // Weighted sum
      const totalScore =
        (costScore * this.weights.cost) +
        (qualityScore * this.weights.quality) +
        (performanceScore * this.weights.performance);

      scores.set(id, totalScore);
    }

    // Select highest scoring provider
    const selectedId = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    const selectedProvider = availableProviders.get(selectedId)!;

    // Choose model based on complexity
    const model = this.selectModel(selectedProvider.getName(), context.complexity);

    const estimatedPromptTokens = Math.ceil(context.prompt.length / 4);
    const estimatedCompletionTokens = context.complexity === 'complex' ? 2000 : 500;
    const estimatedCost = selectedProvider.calculateCost(
      estimatedPromptTokens,
      estimatedCompletionTokens,
      model
    );

    return {
      providerId: selectedId,
      model,
      reasoning: `Balanced choice (score: ${scores.get(selectedId)!.toFixed(2)})`,
      estimatedCost,
      fallbacks: Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(1, 4)
        .map(([id]) => id),
      confidence: 0.88
    };
  }

  private normalizeCost(cost: number): number {
    // Lower cost = higher score
    // $0.00 = 1.0, $0.10+ = 0.0
    return Math.max(0, 1 - (cost / 0.10));
  }

  private normalizeQuality(provider: string, model: string): number {
    const qualityScores: Record<string, Record<string, number>> = {
      'ollama': { 'qwen2.5-coder:7b': 0.6, 'qwen2.5-coder:14b': 0.7, 'qwen2.5-coder:32b': 0.8 },
      'openai': { 'gpt-3.5-turbo': 0.7, 'gpt-4-turbo': 0.9, 'gpt-4': 1.0 },
      'anthropic': { 'claude-3-haiku-20240307': 0.7, 'claude-3-5-sonnet-20241022': 1.0, 'claude-3-opus-20240229': 0.9 },
      'google': { 'gemini-1.5-flash': 0.6, 'gemini-1.5-pro': 0.8 }
    };

    return qualityScores[provider]?.[model] || 0.5;
  }

  private normalizePerformance(avgResponseTime: number): number {
    // Lower response time = higher score
    // 0ms = 1.0, 5000ms+ = 0.0
    return Math.max(0, 1 - (avgResponseTime / 5000));
  }

  private selectModel(provider: string, complexity: string): string {
    // Balanced model selection
    const models: Record<string, Record<string, string>> = {
      'ollama': { 'simple': 'qwen2.5-coder:7b', 'medium': 'qwen2.5-coder:14b', 'complex': 'qwen2.5-coder:14b' },
      'openai': { 'simple': 'gpt-3.5-turbo', 'medium': 'gpt-4-turbo', 'complex': 'gpt-4-turbo' },
      'anthropic': { 'simple': 'claude-3-haiku-20240307', 'medium': 'claude-3-5-sonnet-20241022', 'complex': 'claude-3-5-sonnet-20241022' },
      'google': { 'simple': 'gemini-1.5-flash', 'medium': 'gemini-1.5-pro', 'complex': 'gemini-1.5-pro' }
    };

    return models[provider]?.[complexity] || '';
  }
}