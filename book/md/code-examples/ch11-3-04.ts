/**
 * Cache for AI responses with semantic key generation
 */
export class AIResponseCache {
  private cache: MultiLevelCache;
  private logger: Logger;

  constructor(cache: MultiLevelCache, logger: Logger) {
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Get cached AI response
   */
  async get(request: CompletionRequest): Promise<CompletionResponse | null> {
    const key = this.generateCacheKey(request);

    const cached = await this.cache.get<CachedResponse>(key);

    if (cached) {
      this.logger.debug('AI cache hit', { key });

      return {
        ...cached.response,
        metadata: {
          ...cached.response.metadata,
          fromCache: true,
          cacheAge: Date.now() - cached.timestamp
        }
      };
    }

    this.logger.debug('AI cache miss', { key });
    return null;
  }

  /**
   * Cache AI response
   */
  async set(
    request: CompletionRequest,
    response: CompletionResponse,
    ttl?: number
  ): Promise<void> {
    const key = this.generateCacheKey(request);

    await this.cache.set(key, {
      request,
      response,
      timestamp: Date.now()
    }, { ttl });

    this.logger.debug('AI response cached', { key });
  }

  /**
   * Generate cache key from request
   * Uses semantic hashing to match similar requests
   */
  private generateCacheKey(request: CompletionRequest): string {
    // Normalize request for consistent caching
    const normalized = {
      model: request.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: this.normalizeContent(m.content)
      })),
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens
    };

    // Hash normalized request
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');

    return `ai:${hash}`;
  }

  /**
   * Normalize content to improve cache hit rate
   */
  private normalizeContent(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase();
  }

  /**
   * Get cache hit rate
   */
  async getHitRate(): Promise<number> {
    // Implement hit rate tracking
    // This would require tracking hits and misses
    return 0.75; // Placeholder
  }
}

interface CachedResponse {
  request: CompletionRequest;
  response: CompletionResponse;
  timestamp: number;
}