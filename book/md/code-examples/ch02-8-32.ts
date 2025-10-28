// Good: Let the router decide
const decision = await router.route({
  prompt,
  complexity: analyzeComplexity(prompt),
  priority: 'balanced'
});

const provider = providerManager.getProvider(decision.providerId);
const response = await provider.complete(prompt, { model: decision.model });