// Bad: Fusion for simple tasks (expensive, slow)
const commitMsg = await fusion.fuse('Generate commit message', {
  providerIds: ['openai', 'anthropic', 'google']
});
// Costs 3x, takes 3x longer