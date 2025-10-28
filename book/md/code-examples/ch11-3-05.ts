/**
 * Cache for tool execution results
 */
export class ToolResultCache {
  private cache: MultiLevelCache;

  constructor(cache: MultiLevelCache) {
    this.cache = cache;
  }

  /**
   * Get cached tool result
   */
  async get(
    toolName: string,
    params: Record<string, any>
  ): Promise<ToolResult | null> {
    const key = this.generateKey(toolName, params);
    return this.cache.get<ToolResult>(key);
  }

  /**
   * Cache tool result
   */
  async set(
    toolName: string,
    params: Record<string, any>,
    result: ToolResult,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(toolName, params);
    await this.cache.set(key, result, { ttl });
  }

  /**
   * Invalidate cache for specific file
   */
  async invalidateFile(filePath: string): Promise<void> {
    // Invalidate all tool results related to this file
    const patterns = [
      `tool:read_file:${filePath}`,
      `tool:search_code:*${filePath}*`,
      `tool:analyze_code:${filePath}`
    ];

    for (const pattern of patterns) {
      await this.cache.invalidate(pattern);
    }
  }

  /**
   * Generate cache key
   */
  private generateKey(
    toolName: string,
    params: Record<string, any>
  ): string {
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const paramsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sortedParams))
      .digest('hex')
      .substring(0, 16);

    return `tool:${toolName}:${paramsHash}`;
  }
}