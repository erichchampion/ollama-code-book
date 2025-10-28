// Good: Automatic fallback to healthy providers
const result = await router.executeWithFallback(
  context,
  async (providerId, model) => {
    const provider = providerManager.getProvider(providerId);
    return await provider.complete(context.prompt, { model });
  }
);
// Tries primary provider, falls back to alternatives
// Circuit breaker prevents cascading failures