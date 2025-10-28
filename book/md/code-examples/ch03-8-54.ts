// Singleton: shared state across application
container.register('logger', Logger, { singleton: true });
container.register('providerManager', ProviderManager, { singleton: true });
container.register('router', IntelligentRouter, { singleton: true });