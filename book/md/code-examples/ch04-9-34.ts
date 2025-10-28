// Example: Impact of caching on repeated calls

const call = {
  id: 'call_1',
  toolName: 'search_code',
  parameters: { pattern: 'TODO', path: 'src/' }
};

// First call: Cache miss, actual execution (500ms)
const result1 = await executeToolWithCache(call, searchTool);
console.log(`Duration: ${result1.metadata.durationMs}ms, Cached: ${result1.metadata.cached}`);
// Duration: 500ms, Cached: false

// Second call: Cache hit, instant (0ms)
const result2 = await executeToolWithCache(call, searchTool);
console.log(`Duration: ${result2.metadata.durationMs}ms, Cached: ${result2.metadata.cached}`);
// Duration: 0ms, Cached: true

// Performance improvement: 500ms → 0ms (100% faster)