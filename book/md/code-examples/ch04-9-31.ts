/**
 * Generate a cache key for a tool call
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key from tool call
   */
  static generateKey(call: ToolCall): string {
    // Key format: toolName:hash(parameters)
    const paramHash = this.hashParameters(call.parameters);
    return `${call.toolName}:${paramHash}`;
  }

  /**
   * Hash parameters for cache key
   */
  private static hashParameters(params: any): string {
    // Stable JSON serialization (sorted keys)
    const normalized = this.normalizeObject(params);
    const json = JSON.stringify(normalized);

    // Simple hash (in production, use a proper hash function like SHA-256)
    return this.simpleHash(json);
  }

  /**
   * Normalize object for stable hashing
   * Sorts keys recursively
   */
  private static normalizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeObject(item));
    }

    if (typeof obj === 'object') {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.normalizeObject(obj[key]);
      }
      return sorted;
    }

    return obj;
  }

  /**
   * Simple hash function (for demonstration)
   * In production, use crypto.createHash('sha256')
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}