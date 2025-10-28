const DEFAULTS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  TOP_P: 1.0,
  TOP_K: 40,

  CACHE_TTL: 5 * 60 * 1000,     // 5 minutes
  REQUEST_TIMEOUT: 30 * 1000,    // 30 seconds
  MAX_CONCURRENCY: 5,

  LOG_LEVEL: 'info' as LogLevel,

  CONVERSATION_MAX_TOKENS: 8000,
  CONVERSATION_STRATEGY: 'recent' as ContextStrategy,
};