describe('Performance Tests', () => {
  test('ConversationManager.getMessagesForAI completes within 50ms', async () => {
    const manager = new ConversationManager(mockAI, {
      maxTokens: 10000,
      strategy: ContextWindowStrategy.RECENT
    });

    // Add 100 messages
    for (let i = 0; i < 100; i++) {
      manager.addMessage({
        role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        content: `Message ${i}`,
        tokens: 10
      });
    }

    const { duration } = await PerformanceTest.measure(
      'getMessagesForAI',
      async () => manager.getMessagesForAI()
    );

    PerformanceTest.assertPerformance(duration, 50, 'getMessagesForAI');
  });

  test('DependencyGraph.topologicalSort scales linearly', async () => {
    const sizes = [10, 100, 1000];
    const results: BenchmarkResult[] = [];

    for (const size of sizes) {
      const graph = new DependencyGraph();

      // Create chain: 0 -> 1 -> 2 -> ... -> size
      for (let i = 0; i < size; i++) {
        graph.addNode(`node_${i}`);
        if (i > 0) {
          graph.addEdge(`node_${i}`, `node_${i - 1}`);
        }
      }

      const result = await PerformanceTest.benchmark(
        `topologicalSort (n=${size})`,
        async () => { graph.topologicalSort(); },
        100
      );

      results.push(result);
    }

    // Verify linear scaling (mean should scale linearly with size)
    const ratio1 = results[1].mean / results[0].mean;
    const ratio2 = results[2].mean / results[1].mean;

    // Ratios should be approximately equal for linear scaling
    expect(Math.abs(ratio1 - ratio2)).toBeLessThan(5);
  });

  test('Cache hit vs miss performance', async () => {
    const cache = new ResultCache({ maxSize: 1000, ttl: 60000 });

    const value = { data: 'test'.repeat(100) };

    // Benchmark cache miss
    const miss = await PerformanceTest.benchmark(
      'cache miss',
      async () => {
        cache.get('nonexistent');
      },
      10000
    );

    // Benchmark cache hit
    cache.set('key', value);

    const hit = await PerformanceTest.benchmark(
      'cache hit',
      async () => {
        cache.get('key');
      },
      10000
    );

    // Cache hit should be faster
    expect(hit.mean).toBeLessThan(miss.mean);

    // Both should be very fast (<1ms)
    expect(hit.mean).toBeLessThan(1);
    expect(miss.mean).toBeLessThan(1);
  });
});