// The Router needs the ProviderManager
const router = new IntelligentRouter(providerManager, logger);

// But the ProviderManager needs the Router for some operations
const providerManager = new ProviderManager(router, logger);

// Circular dependency! 🔄