interface TechnologyStack {
  // Runtime
  runtime: 'Node.js' | 'Python' | 'Go' | 'Rust';
  version: string;

  // AI
  aiProviders: AIProvider[];
  models: {
    primary: string;
    fallback: string[];
  };

  // Core framework
  baseFramework: 'ollama-code' | 'langchain' | 'custom';

  // Plugins
  plugins: Plugin[];

  // Storage
  database?: 'sqlite' | 'postgres' | 'mongodb';
  cache?: 'redis' | 'memcached' | 'in-memory';

  // Deployment
  deployment: {
    method: 'cli' | 'vscode-extension' | 'web-app' | 'api';
    platforms: ('local' | 'docker' | 'kubernetes' | 'cloud')[];
  };

  // Testing
  testing: {
    framework: 'vitest' | 'jest' | 'pytest';
    coverage: number;                    // Target coverage %
  };

  // Monitoring
  monitoring?: {
    logs: 'winston' | 'pino' | 'bunyan';
    metrics: 'prometheus' | 'datadog';
    tracing: 'opentelemetry' | 'jaeger';
  };
}

// Example: DevOps Assistant stack
const devopsStack: TechnologyStack = {
  runtime: 'Node.js',
  version: '18.0.0',

  aiProviders: [
    new OllamaProvider(),          // Local: codellama:34b
    new OpenAIProvider()           // Cloud: gpt-4-turbo (fallback)
  ],

  models: {
    primary: 'codellama:34b',
    fallback: ['gpt-4-turbo', 'claude-3-sonnet']
  },

  baseFramework: 'ollama-code',

  plugins: devopsPlugins,

  database: 'sqlite',              // Simple, embedded
  cache: 'in-memory',              // LRU cache

  deployment: {
    method: 'cli',
    platforms: ['local', 'docker']
  },

  testing: {
    framework: 'vitest',
    coverage: 80
  },

  monitoring: {
    logs: 'winston',
    metrics: 'prometheus',
    tracing: 'opentelemetry'
  }
};