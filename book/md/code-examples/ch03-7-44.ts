describe('ServiceRegistry', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(async () => {
    await container.dispose();
  });

  it('should register core services', () => {
    ServiceRegistry.registerCoreServices(container);

    expect(container.has('logger')).toBe(true);
    expect(container.has('providerManager')).toBe(true);
    expect(container.has('router')).toBe(true);
    expect(container.has('fusion')).toBe(true);
  });

  it('should resolve logger', async () => {
    ServiceRegistry.registerCoreServices(container);

    const logger = await container.resolve<Logger>('logger');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should resolve router with dependencies', async () => {
    ServiceRegistry.registerCoreServices(container);

    const router = await container.resolve<IntelligentRouter>('router');

    expect(router).toBeDefined();
    // Router should have providerManager and logger injected
  });

  it('should create singletons', async () => {
    ServiceRegistry.registerCoreServices(container);

    const logger1 = await container.resolve<Logger>('logger');
    const logger2 = await container.resolve<Logger>('logger');

    // Same instance
    expect(logger1).toBe(logger2);
  });
});