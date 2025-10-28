// Initialize router
const router = new IntelligentRouter(providerManager, logger);

// Simple cost-optimized request
const costContext: RoutingContext = {
  prompt: 'Generate a commit message for these changes',
  complexity: 'simple',
  priority: 'cost'
};

const decision1 = await router.route(costContext);
// Result: Ollama (free local inference)

// Complex quality-focused request
const qualityContext: RoutingContext = {
  prompt: 'Refactor this legacy codebase to use modern patterns',
  complexity: 'complex',
  priority: 'quality'
};

const decision2 = await router.route(qualityContext);
// Result: Claude 3.5 Sonnet (highest quality)

// Execute with automatic fallback
const result = await router.executeWithFallback(
  qualityContext,
  async (providerId, model) => {
    const provider = providerManager.getProvider(providerId);
    return await provider.complete(qualityContext.prompt, { model });
  }
);