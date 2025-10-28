class AnthropicProvider implements AIProvider {
  constructor(config: AnthropicConfig);

  // Configuration
  configure(config: Partial<AnthropicConfig>): void;
}

interface AnthropicConfig {
  apiKey: string;
  model: string;               // e.g., 'claude-3-opus-20240229'
  maxTokens?: number;
  timeout?: number;
}