// Test is forced to use real dependencies
describe('ConversationManager', () => {
  it('should analyze prompt', async () => {
    // Must create all real dependencies
    const manager = new ConversationManager();

    // Calls real AI providers! Slow, expensive, unreliable
    const result = await manager.analyze('test prompt');

    expect(result).toBeDefined();
  });
});