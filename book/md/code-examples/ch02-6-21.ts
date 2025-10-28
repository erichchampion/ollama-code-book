export class QualityOptimizedStrategy implements RoutingStrategy {
  // Quality rankings (higher = better)
  private qualityScores: Record<string, Record<string, number>> = {
    'ollama': {
      'qwen2.5-coder:7b': 6,
      'qwen2.5-coder:14b': 7,
      'qwen2.5-coder:32b': 8
    },
    'openai': {
      'gpt-3.5-turbo': 7,
      'gpt-4-turbo': 9,
      'gpt-4': 10
    },
    'anthropic': {
      'claude-3-haiku-20240307': 7,
      'claude-3-5-sonnet-20241022': 10,
      'claude-3-opus-20240229': 9
    },
    'google': {
      'gemini-1.5-flash': 6,
      'gemini-1.5-pro': 8
    }
  };

  getName(): string {
    return 'quality-optimized';
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

    // Find highest quality model for each provider
    const providerOptions = healthyProviders.map(([id, provider]) => {
      const providerName = provider.getName();
      const scores = this.qualityScores[providerName] || {};

      // Get all models and their quality scores
      const modelScores = Object.entries(scores)
        .filter(([model]) => {
          // Filter by complexity if needed
          if (context.complexity === 'simple') {
            return true;  // All models acceptable
          } else if (context.complexity === 'medium') {
            return scores[model] >= 7;
          } else {  // complex
            return scores[model] >= 8;
          }
        })
        .map(([model, score]) => ({ id, model, score, provider }));

      // Return highest quality model
      modelScores.sort((a, b) => b.score - a.score);
      return modelScores[0];
    }).filter(Boolean);

    // Sort by quality (highest first)
    providerOptions.sort((a, b) => b.score - a.score);

    const selected = providerOptions[0];

    // Estimate cost for selected option
    const estimatedPromptTokens = Math.ceil(context.prompt.length / 4);
    const estimatedCompletionTokens = context.complexity === 'complex' ? 2000 : 500;
    const estimatedCost = selected.provider.calculateCost(
      estimatedPromptTokens,
      estimatedCompletionTokens,
      selected.model
    );

    return {
      providerId: selected.id,
      model: selected.model,
      reasoning: `Highest quality model (score: ${selected.score}/10)`,
      estimatedCost,
      fallbacks: providerOptions.slice(1, 4).map(p => p.id),
      confidence: 0.90
    };
  }
}