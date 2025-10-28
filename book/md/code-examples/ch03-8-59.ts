// Bad: Uses real AI providers in tests
describe('ConversationManager', () => {
  it('should analyze', async () => {
    const container = new DIContainer();
    await ServiceRegistry.registerAll(container); // Real providers!

    const manager = await container.resolve('conversationManager');
    await manager.analyze('test'); // Calls real APIs! 💸
  });
});