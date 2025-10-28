// Create container
const container = new DIContainer();

// Register services
container.register('logger', Logger, {
  singleton: true,
  lifecycle: {
    onInit: async (logger) => {
      await logger.initialize();
    },
    onDispose: async (logger) => {
      await logger.flush();
    }
  }
});

container.register('providerManager', ProviderManager, {
  singleton: true,
  dependencies: ['logger']
});

container.register('router', IntelligentRouter, {
  singleton: true,
  dependencies: ['providerManager', 'logger']
});

container.register('app', OllamaCodeApp, {
  singleton: true,
  dependencies: ['router', 'logger']
});

// Resolve (automatically resolves dependencies)
const app = await container.resolve<OllamaCodeApp>('app');

// Use app
await app.run();

// Clean up
await container.dispose();