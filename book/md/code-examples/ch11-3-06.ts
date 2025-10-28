/**
 * AI service with intelligent caching
 */
export class CachedAIService {
  private provider: AIProvider;
  private aiCache: AIResponseCache;
  private toolCache: ToolResultCache;
  private logger: Logger;

  constructor(
    provider: AIProvider,
    cache: MultiLevelCache,
    logger: Logger
  ) {
    this.provider = provider;
    this.aiCache = new AIResponseCache(cache, logger);
    this.toolCache = new ToolResultCache(cache);
    this.logger = logger;
  }

  /**
   * Complete with caching
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Check cache first
    const cached = await this.aiCache.get(request);

    if (cached) {
      return cached;
    }

    // Cache miss - call provider
    const startTime = performance.now();

    const response = await this.provider.complete(request);

    const duration = performance.now() - startTime;

    // Cache response (TTL based on temperature)
    const ttl = this.calculateTTL(request.temperature || 0.7);
    await this.aiCache.set(request, response, ttl);

    this.logger.info('AI completion', {
      cached: false,
      duration,
      tokens: response.usage?.totalTokens
    });

    return response;
  }

  /**
   * Execute tool with caching
   */
  async executeTool(
    tool: Tool,
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    // Skip cache for non-cacheable tools
    if (!tool.cacheable) {
      return tool.execute(params, context);
    }

    // Check cache
    const cached = await this.toolCache.get(tool.name, params);

    if (cached) {
      this.logger.debug('Tool cache hit', { tool: tool.name });
      return cached;
    }

    // Cache miss - execute tool
    const result = await tool.execute(params, context);

    // Cache result (TTL based on tool type)
    const ttl = this.getToolCacheTTL(tool.name);
    await this.toolCache.set(tool.name, params, result, ttl);

    return result;
  }

  /**
   * Calculate cache TTL based on temperature
   * Higher temperature = shorter TTL (more variation)
   */
  private calculateTTL(temperature: number): number {
    const baseTTL = 1000 * 60 * 60; // 1 hour

    if (temperature < 0.3) {
      return baseTTL * 24; // 24 hours (very deterministic)
    } else if (temperature < 0.7) {
      return baseTTL * 4; // 4 hours
    } else {
      return baseTTL; // 1 hour (more random)
    }
  }

  /**
   * Get cache TTL for tool
   */
  private getToolCacheTTL(toolName: string): number {
    const ttls: Record<string, number> = {
      read_file: 1000 * 60 * 5,      // 5 minutes (files change)
      search_code: 1000 * 60 * 10,   // 10 minutes
      git_status: 1000 * 60 * 1,     // 1 minute (changes frequently)
      analyze_code: 1000 * 60 * 30   // 30 minutes (expensive)
    };

    return ttls[toolName] || 1000 * 60 * 5; // Default 5 minutes
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    hitRate: number;
    size: number;
    memoryUsage: number;
  }> {
    const hitRate = await this.aiCache.getHitRate();
    // Would implement full stats tracking

    return {
      hitRate,
      size: 0,
      memoryUsage: 0
    };
  }
}