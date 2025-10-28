async function bootstrap() {
  const container = new DIContainer();

  // Register all services before resolving
  await ServiceRegistry.registerAll(container);

  // Now resolve
  const app = await container.resolve<OllamaCodeApp>('app');

  return app;
}