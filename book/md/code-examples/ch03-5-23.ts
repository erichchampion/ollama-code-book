export abstract class BaseAIProvider extends EventEmitter implements IDisposable {
  protected config: ProviderConfig;
  protected health: ProviderHealth;
  protected metrics: ProviderMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: ProviderConfig) {
    super();
    this.config = config;
    this.health = { status: 'unknown', lastCheck: Date.now() };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageResponseTime: 0
    };

    // Auto health check
    if (config.healthCheckInterval) {
      this.healthCheckInterval = setInterval(async () => {
        await this.performHealthCheck();
      }, config.healthCheckInterval);
    }
  }

  abstract getName(): string;
  abstract initialize(): Promise<void>;
  abstract complete(prompt: string, options?: CompletionOptions): Promise<AICompletionResponse>;

  /**
   * Dispose provider resources
   */
  async dispose(): Promise<void> {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Remove all event listeners
    this.removeAllListeners();

    // Subclasses can override for additional cleanup
  }
}