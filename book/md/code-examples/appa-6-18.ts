interface Configuration {
  // AI Provider settings
  providers: {
    ollama?: OllamaConfig;
    openai?: OpenAIConfig;
    anthropic?: AnthropicConfig;
    google?: GoogleConfig;
  };

  // Default provider
  defaultProvider: string;

  // Tool settings
  tools: {
    maxConcurrency?: number;
    timeout?: number;
    approvalRequired?: boolean;
  };

  // Conversation settings
  conversation: {
    maxTokens?: number;
    strategy?: ContextStrategy;
    autoSave?: boolean;
  };

  // Plugin settings
  plugins: {
    enabled: string[];
    config: Record<string, any>;
  };

  // Security settings
  security: {
    sandboxEnabled?: boolean;
    allowedCommands?: string[];
    allowedPaths?: string[];
    maxFileSize?: number;
  };

  // Logging settings
  logging: {
    level?: LogLevel;
    format?: 'json' | 'text';
    destination?: 'console' | 'file';
    filePath?: string;
  };

  // Performance settings
  performance: {
    cacheEnabled?: boolean;
    cacheTTL?: number;
    maxCacheSize?: number;
  };
}

type LogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error';