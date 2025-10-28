describe('Integration: Conversation + Router', () => {
  let container: DIContainer;

  beforeEach(async () => {
    container = new DIContainer();

    // Register real services (but with mocked providers)
    ServiceRegistry.registerCoreServices(container);

    // Mock AI providers to avoid real API calls
    const mockProvider = {
      getName: () => 'mock',
      initialize: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        content: 'Mocked response',
        tokensUsed: { prompt: 10, completion: 20, total: 30 }
      }),
      completeStream: vi.fn(),
      listModels: vi.fn(),
      calculateCost: () => 0,
      testConnection: vi.fn().mockResolvedValue(true),
      performHealthCheck: vi.fn(),
      getHealth: () => ({ status: 'healthy', lastCheck: Date.now() }),
      getMetrics: () => ({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        averageResponseTime: 0
      }),
      dispose: vi.fn()
    };

    const providerManager = await container.resolve<ProviderManager>('providerManager');
    await providerManager.registerProvider('mock', mockProvider as any);

    // Register conversation manager
    container.register('conversationManager', ConversationManager, {
      dependencies: ['router', 'logger']
    });
  });

  afterEach(async () => {
    await container.dispose();
  });

  it('should analyze prompt using router', async () => {
    const manager = await container.resolve<ConversationManager>('conversationManager');

    const result = await manager.analyze('test prompt');

    expect(result).toBeDefined();
    expect(result.decision).toBeDefined();
    expect(result.decision.providerId).toBe('mock');
  });
});