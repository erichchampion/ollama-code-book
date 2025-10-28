export class ProviderManager implements IDisposable {
  private providers = new Map<string, BaseAIProvider>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private usageStats = new Map<string, ProviderUsageStats>();

  constructor(private logger: Logger) {
    // Start health monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllProviderHealth();
    }, 60000);
  }

  async registerProvider(id: string, provider: BaseAIProvider): Promise<void> {
    this.providers.set(id, provider);
    await provider.initialize();
  }

  private async checkAllProviderHealth(): Promise<void> {
    for (const [id, provider] of this.providers) {
      try {
        await provider.performHealthCheck();
      } catch (error) {
        this.logger.error(`Health check failed for ${id}`, error);
      }
    }
  }

  /**
   * Dispose: stop health checks, dispose all providers, save stats
   */
  async dispose(): Promise<void> {
    this.logger.info('ProviderManager disposing...');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Save usage statistics
    await this.saveUsageStats();

    // Dispose all providers
    for (const [id, provider] of this.providers) {
      try {
        if (isDisposable(provider)) {
          await provider.dispose();
        }
      } catch (error) {
        this.logger.error(`Error disposing provider ${id}`, error);
      }
    }

    this.providers.clear();
    this.usageStats.clear();

    this.logger.info('ProviderManager disposed');
  }

  private async saveUsageStats(): Promise<void> {
    const stats = Object.fromEntries(this.usageStats);
    const statsFile = path.join(os.homedir(), '.ollama-code', 'usage-stats.json');
    await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));
  }
}