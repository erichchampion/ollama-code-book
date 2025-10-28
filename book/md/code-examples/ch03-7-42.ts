// Easy to test - receives dependencies
export class ConversationManager {
  constructor(
    private router: IntelligentRouter,
    private logger: Logger
  ) {}

  async analyze(prompt: string): Promise<Analysis> {
    this.logger.info(`Analyzing: ${prompt}`);
    const decision = await this.router.route({
      prompt,
      complexity: 'medium',
      priority: 'balanced'
    });

    return { decision, confidence: 0.9 };
  }
}

// Test injects mocks
describe('ConversationManager', () => {
  it('should analyze prompt', async () => {
    // Create mocks
    const mockRouter = {
      route: vi.fn().mockResolvedValue({
        providerId: 'test',
        model: 'test-model',
        reasoning: 'test',
        estimatedCost: 0,
        fallbacks: [],
        confidence: 1.0
      })
    };

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    };

    // Inject mocks
    const manager = new ConversationManager(
      mockRouter as any,
      mockLogger as any
    );

    // Test
    const result = await manager.analyze('test prompt');

    // Verify
    expect(mockLogger.info).toHaveBeenCalledWith('Analyzing: test prompt');
    expect(mockRouter.route).toHaveBeenCalledWith({
      prompt: 'test prompt',
      complexity: 'medium',
      priority: 'balanced'
    });
    expect(result.confidence).toBe(0.9);
  });
});