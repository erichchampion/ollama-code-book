function createTestContainer(): DIContainer {
  const container = new DIContainer();
  // Register mocks
  container.registerInstance('logger', mockLogger);
  container.registerInstance('router', mockRouter);
  return container;
}