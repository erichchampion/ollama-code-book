// Using cache with tool execution

const cache = new ResultCache(logger);
const keyGen = new CacheKeyGenerator();

async function executeToolWithCache(
  call: ToolCall,
  tool: Tool
): Promise<ToolResult> {
  // Check if tool is cacheable
  if (!tool.cacheable) {
    return await tool.execute(call.parameters, context);
  }

  // Generate cache key
  const cacheKey = keyGen.generateKey(call);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Using cached result for ${call.toolName}`);
    return cached;
  }

  // Execute tool
  const result = await tool.execute(call.parameters, context);

  // Cache successful results only
  if (result.success) {
    cache.set(cacheKey, result);
  }

  return result;
}