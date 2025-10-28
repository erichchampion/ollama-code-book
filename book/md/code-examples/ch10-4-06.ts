/**
 * Mock AI provider for testing
 */
export class MockAIProvider implements AIProvider {
  private responses: Map<string, string> = new Map();
  private callCount = 0;
  private calls: CompletionRequest[] = [];

  /**
   * Set canned response for specific prompt
   */
  setResponse(promptPattern: string | RegExp, response: string): void {
    const key = promptPattern instanceof RegExp
      ? promptPattern.source
      : promptPattern;

    this.responses.set(key, response);
  }

  /**
   * Set default response for all prompts
   */
  setDefaultResponse(response: string): void {
    this.responses.set('*', response);
  }

  /**
   * Complete with mocked response
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.callCount++;
    this.calls.push(request);

    // Get last user message
    const userMessage = request.messages
      .filter(m => m.role === MessageRole.USER)
      .pop();

    if (!userMessage) {
      throw new Error('No user message in request');
    }

    // Find matching response
    const response = this.findResponse(userMessage.content);

    if (!response) {
      throw new Error(`No mocked response for: ${userMessage.content}`);
    }

    return {
      content: response,
      role: MessageRole.ASSISTANT,
      model: 'mock-model',
      usage: {
        inputTokens: this.estimateTokens(request.messages),
        outputTokens: this.estimateTokens([{ role: MessageRole.ASSISTANT, content: response }]),
        totalTokens: 0
      },
      metadata: {
        provider: 'mock',
        latency: 10
      }
    };
  }

  /**
   * Find response matching prompt
   */
  private findResponse(prompt: string): string | null {
    // Try exact match
    if (this.responses.has(prompt)) {
      return this.responses.get(prompt)!;
    }

    // Try regex patterns
    for (const [pattern, response] of this.responses.entries()) {
      if (pattern === '*') continue; // Skip default

      const regex = new RegExp(pattern);
      if (regex.test(prompt)) {
        return response;
      }
    }

    // Use default
    return this.responses.get('*') || null;
  }

  /**
   * Get number of times complete() was called
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Get all completion requests
   */
  getCalls(): CompletionRequest[] {
    return this.calls;
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.responses.clear();
    this.callCount = 0;
    this.calls = [];
  }

  /**
   * Estimate tokens (simple word count)
   */
  private estimateTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      return total + msg.content.split(/\s+/).length;
    }, 0);
  }

  // Implement other AIProvider methods
  async stream(request: CompletionRequest): Promise<AsyncIterableIterator<StreamEvent>> {
    throw new Error('Stream not implemented in mock');
  }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true, latency: 1 };
  }

  getMetrics(): ProviderMetrics {
    return {
      requestCount: this.callCount,
      errorCount: 0,
      totalCost: 0,
      totalTokens: 0
    };
  }
}