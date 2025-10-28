/**
 * Common performance bottlenecks in AI systems
 */
export enum PerformanceBottleneck {
  /** LLM API calls (1-5 seconds each) */
  API_LATENCY = 'api_latency',

  /** Large prompts and responses */
  LARGE_PAYLOADS = 'large_payloads',

  /** Sequential tool execution */
  SEQUENTIAL_EXECUTION = 'sequential_execution',

  /** Repeated identical operations */
  NO_CACHING = 'no_caching',

  /** Memory leaks from large conversations */
  MEMORY_LEAKS = 'memory_leaks',

  /** Blocking I/O operations */
  BLOCKING_IO = 'blocking_io',

  /** Cold start for lazy-loaded modules */
  COLD_START = 'cold_start'
}

/**
 * Performance targets for production
 */
export const PERFORMANCE_TARGETS = {
  // Response time targets
  firstTokenLatency: 500,      // ms - Time to first token
  simpleQuery: 2000,           // ms - Total time for simple queries
  complexQuery: 5000,          // ms - Total time for complex queries

  // Throughput targets
  requestsPerSecond: 10,       // Concurrent requests handled

  // Resource targets
  memoryUsage: 512 * 1024 * 1024, // 512 MB max
  cpuUsage: 80,                // % max

  // Cache targets
  cacheHitRate: 70,            // % - Cache effectiveness

  // Cost targets
  costPerQuery: 0.01           // $ - Average cost per query
};