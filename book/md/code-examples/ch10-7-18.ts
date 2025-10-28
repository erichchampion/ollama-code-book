describe('Load Tests', () => {
  test('handles concurrent requests', async () => {
    const mockAI = new MockAIProvider();
    mockAI.setDefaultResponse('Response');

    const manager = new ConversationManager(mockAI);

    // Send 100 concurrent requests
    const promises = Array.from({ length: 100 }, (_, i) =>
      manager.sendMessage(`Message ${i}`)
    );

    const start = performance.now();
    await Promise.all(promises);
    const duration = performance.now() - start;

    console.log(`100 concurrent requests: ${duration.toFixed(2)}ms`);

    // Should handle all requests
    expect(mockAI.getCallCount()).toBe(100);

    // Should complete reasonably fast
    PerformanceTest.assertPerformance(duration, 5000, '100 concurrent requests');
  });

  test('memory usage remains stable under load', async () => {
    const manager = new ConversationManager(mockAI);

    const initialMemory = process.memoryUsage().heapUsed;

    // Add 10,000 messages
    for (let i = 0; i < 10000; i++) {
      manager.addMessage({
        role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        content: `Message ${i}`,
        tokens: 10
      });
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;

    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

    // Memory increase should be reasonable
    expect(memoryIncreaseMB).toBeLessThan(100);
  });
});