const TOKEN_LIMITS = {
  // Ollama models
  'codellama:7b': 4096,
  'codellama:13b': 4096,
  'codellama:34b': 8192,
  'llama2:7b': 4096,
  'llama2:13b': 4096,
  'mistral:7b': 8192,

  // OpenAI models
  'gpt-3.5-turbo': 16385,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,

  // Anthropic models
  'claude-3-haiku': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-opus': 200000,

  // Google models
  'gemini-1.0-pro': 32760,
  'gemini-1.5-pro': 1000000,
};