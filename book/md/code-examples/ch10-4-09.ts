describe('ProviderRouter with failures', () => {
  test('falls back on provider failure', async () => {
    const primary = new FlakeyMockProvider(1.0); // Always fails
    const fallback = new MockAIProvider();

    primary.setDefaultResponse('Response from primary');
    fallback.setDefaultResponse('Response from fallback');

    const router = new ProviderRouter({
      providers: [primary, fallback],
      strategy: RoutingStrategy.FALLBACK
    });

    const response = await router.complete(request);

    expect(response.content).toBe('Response from fallback');
    expect(response.metadata.provider).toBe('mock');
  });
});

describe('RateLimiter', () => {
  test('blocks when quota exceeded', async () => {
    const provider = new QuotaMockProvider(5);
    provider.setDefaultResponse('Response');

    // Make 5 requests (should succeed)
    for (let i = 0; i < 5; i++) {
      await provider.complete(request);
    }

    // 6th request should fail
    await expect(provider.complete(request)).rejects.toThrow('Rate limit exceeded');
  });
});