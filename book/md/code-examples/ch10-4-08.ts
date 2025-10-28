/**
 * Mock provider with simulated latency
 */
export class RealisticMockProvider extends MockAIProvider {
  constructor(private latencyMs: number = 100) {
    super();
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, this.latencyMs));

    return super.complete(request);
  }
}

/**
 * Mock provider with failure simulation
 */
export class FlakeyMockProvider extends MockAIProvider {
  constructor(private failureRate: number = 0.1) {
    super();
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Randomly fail
    if (Math.random() < this.failureRate) {
      throw new Error('Simulated API failure');
    }

    return super.complete(request);
  }
}

/**
 * Mock provider with quota simulation
 */
export class QuotaMockProvider extends MockAIProvider {
  private requestsRemaining: number;

  constructor(private quota: number) {
    super();
    this.requestsRemaining = quota;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (this.requestsRemaining <= 0) {
      throw new Error('Rate limit exceeded');
    }

    this.requestsRemaining--;

    return super.complete(request);
  }

  resetQuota(): void {
    this.requestsRemaining = this.quota;
  }
}