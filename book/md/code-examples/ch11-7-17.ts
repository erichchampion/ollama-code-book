/**
 * AI provider using connection pool
 */
export class PooledAIProvider implements AIProvider {
  private pool: ConnectionPool;
  private baseURL: string;

  constructor(
    options: ProviderOptions,
    pool?: ConnectionPool
  ) {
    this.pool = pool || new ConnectionPool();
    this.baseURL = options.baseURL;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(this.baseURL + '/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      // Use connection pool
      agent: this.pool.getHttpsAgent()
    });

    return response.json();
  }

  // ... other methods
}