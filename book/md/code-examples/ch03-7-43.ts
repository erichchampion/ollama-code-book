/**
 * Create a test container with mocked services
 */
export function createTestContainer(): DIContainer {
  const container = new DIContainer();

  // Mock logger
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    dispose: vi.fn()
  };
  container.registerInstance('logger', mockLogger);

  // Mock provider manager
  const mockProviderManager = {
    registerProvider: vi.fn(),
    getProvider: vi.fn(),
    getAllProviders: vi.fn().mockReturnValue(new Map()),
    setBudget: vi.fn(),
    trackUsage: vi.fn(),
    dispose: vi.fn()
  };
  container.registerInstance('providerManager', mockProviderManager);

  // Mock router
  const mockRouter = {
    route: vi.fn().mockResolvedValue({
      providerId: 'test',
      model: 'test-model',
      reasoning: 'test',
      estimatedCost: 0,
      fallbacks: [],
      confidence: 1.0
    }),
    executeWithFallback: vi.fn(),
    dispose: vi.fn()
  };
  container.registerInstance('router', mockRouter);

  return container;
}

// Use in tests
describe('ConversationManager', () => {
  let container: DIContainer;
  let manager: ConversationManager;

  beforeEach(async () => {
    container = createTestContainer();

    // Register the service under test
    container.register('conversationManager', ConversationManager, {
      dependencies: ['router', 'logger']
    });

    manager = await container.resolve('conversationManager');
  });

  afterEach(async () => {
    await container.dispose();
  });

  it('should analyze prompt', async () => {
    const result = await manager.analyze('test prompt');

    expect(result).toBeDefined();
    expect(result.confidence).toBe(0.9);
  });
});