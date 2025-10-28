/**
 * Mock factory utilities
 */
export class MockFactory {
  /**
   * Create mock logger
   */
  static createLogger(): Logger {
    return {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      flush: vi.fn(),
      dispose: vi.fn()
    } as any;
  }

  /**
   * Create mock router
   */
  static createRouter(overrides: Partial<IntelligentRouter> = {}): IntelligentRouter {
    return {
      route: vi.fn().mockResolvedValue({
        providerId: 'test',
        model: 'test-model',
        reasoning: 'test',
        estimatedCost: 0,
        fallbacks: [],
        confidence: 1.0
      }),
      executeWithFallback: vi.fn(),
      registerStrategy: vi.fn(),
      dispose: vi.fn(),
      ...overrides
    } as any;
  }

  /**
   * Create mock provider
   */
  static createProvider(
    name: string = 'test',
    overrides: Partial<BaseAIProvider> = {}
  ): BaseAIProvider {
    return {
      getName: () => name,
      initialize: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        content: 'Test response',
        tokensUsed: { prompt: 10, completion: 20, total: 30 }
      }),
      completeStream: vi.fn(),
      listModels: vi.fn().mockResolvedValue([
        { id: 'test-model', name: 'Test Model', contextWindow: 4096 }
      ]),
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
      dispose: vi.fn(),
      ...overrides
    } as any;
  }

  /**
   * Create mock provider manager
   */
  static createProviderManager(): ProviderManager {
    const providers = new Map<string, BaseAIProvider>();

    return {
      registerProvider: vi.fn((id, provider) => {
        providers.set(id, provider);
      }),
      getProvider: vi.fn((id) => providers.get(id)),
      getAllProviders: vi.fn(() => providers),
      removeProvider: vi.fn((id) => providers.delete(id)),
      setBudget: vi.fn(),
      getBudget: vi.fn(),
      trackUsage: vi.fn(),
      getUsageStats: vi.fn(() => ({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        averageResponseTime: 0,
        dailyUsage: new Map(),
        monthlyUsage: new Map()
      })),
      dispose: vi.fn()
    } as any;
  }
}

// Usage in tests
describe('ConversationManager', () => {
  it('should use mocked router', async () => {
    const router = MockFactory.createRouter();
    const logger = MockFactory.createLogger();

    const manager = new ConversationManager(router, logger);

    await manager.analyze('test');

    expect(router.route).toHaveBeenCalled();
  });
});