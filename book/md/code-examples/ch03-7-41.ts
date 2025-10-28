// Hard to test - creates real dependencies
export class ConversationManager {
  private router: IntelligentRouter;
  private logger: Logger;

  constructor() {
    // Hard-coded dependencies
    const providerManager = new ProviderManager();
    this.router = new IntelligentRouter(providerManager);
    this.logger = new Logger({ file: 'app.log' });
  }

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

// Test is forced to use real router and logger
describe('ConversationManager', () => {
  it('should analyze prompt', async () => {
    const manager = new ConversationManager();

    // This calls real AI providers! 💸
    // Slow, expensive, unreliable
    const result = await manager.analyze('test prompt');

    expect(result).toBeDefined();
  });
});