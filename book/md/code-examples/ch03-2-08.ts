// Test injects mock dependencies
describe('ConversationManager', () => {
  it('should analyze prompt', async () => {
    // Create mock router
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

    const mockLogger = { info: vi.fn(), error: vi.fn() };

    // Inject mocks
    const manager = new ConversationManager(mockRouter as any, mockLogger as any);

    const result = await manager.analyze('test prompt');

    expect(mockRouter.route).toHaveBeenCalledWith({
      prompt: 'test prompt',
      complexity: 'medium'
    });
    expect(result).toBeDefined();
  });
});