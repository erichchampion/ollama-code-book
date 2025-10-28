// Bad: No health checks
const provider = providerManager.getProvider('openai-main');
await provider.complete(prompt); // Might fail