/**
 * Service registry for centralized configuration
 */
export class ServiceRegistry {
  /**
   * Register all core services
   */
  static registerCoreServices(container: DIContainer): void {
    // Logger - foundational service
    container.register('logger', Logger, {
      singleton: true,
      factory: () => new Logger({
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'pretty'
      }),
      lifecycle: {
        onInit: async (logger) => {
          logger.info('Logger initialized');
        },
        onDispose: async (logger) => {
          logger.info('Logger disposing');
          await logger.flush();
        }
      }
    });

    // Provider Manager
    container.register('providerManager', ProviderManager, {
      singleton: true,
      dependencies: ['logger']
    });

    // Intelligent Router
    container.register('router', IntelligentRouter, {
      singleton: true,
      dependencies: ['providerManager', 'logger']
    });

    // Response Fusion
    container.register('fusion', MajorityVotingFusion, {
      singleton: true,
      dependencies: ['router', 'logger']
    });
  }

  /**
   * Register AI providers
   */
  static async registerProviders(container: DIContainer): Promise<void> {
    const providerManager = await container.resolve<ProviderManager>('providerManager');
    const logger = await container.resolve<Logger>('logger');

    // Ollama (local)
    if (process.env.OLLAMA_BASE_URL || true) {
      const ollama = new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'
      });

      await ollama.initialize();
      await providerManager.registerProvider('ollama-local', ollama);
      logger.info('Registered Ollama provider');
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG,
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4-turbo'
      });

      await openai.initialize();
      await providerManager.registerProvider('openai-main', openai);

      // Set budget
      providerManager.setBudget({
        providerId: 'openai-main',
        dailyLimit: parseFloat(process.env.OPENAI_DAILY_LIMIT || '10'),
        monthlyLimit: parseFloat(process.env.OPENAI_MONTHLY_LIMIT || '200'),
        alertThresholds: [0.5, 0.75, 0.9]
      });

      logger.info('Registered OpenAI provider');
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
      });

      await anthropic.initialize();
      await providerManager.registerProvider('anthropic-main', anthropic);

      providerManager.setBudget({
        providerId: 'anthropic-main',
        dailyLimit: parseFloat(process.env.ANTHROPIC_DAILY_LIMIT || '15'),
        monthlyLimit: parseFloat(process.env.ANTHROPIC_MONTHLY_LIMIT || '300'),
        alertThresholds: [0.5, 0.75, 0.9]
      });

      logger.info('Registered Anthropic provider');
    }

    // Google
    if (process.env.GOOGLE_API_KEY) {
      const google = new GoogleProvider({
        apiKey: process.env.GOOGLE_API_KEY,
        defaultModel: process.env.GOOGLE_MODEL || 'gemini-1.5-pro'
      });

      await google.initialize();
      await providerManager.registerProvider('google-main', google);

      providerManager.setBudget({
        providerId: 'google-main',
        dailyLimit: parseFloat(process.env.GOOGLE_DAILY_LIMIT || '10'),
        monthlyLimit: parseFloat(process.env.GOOGLE_MONTHLY_LIMIT || '200'),
        alertThresholds: [0.5, 0.75, 0.9]
      });

      logger.info('Registered Google provider');
    }
  }

  /**
   * Register conversation services
   */
  static registerConversationServices(container: DIContainer): void {
    container.register('conversationManager', ConversationManager, {
      singleton: true,
      dependencies: ['router', 'logger']
    });

    container.register('intentAnalyzer', IntentAnalyzer, {
      singleton: true,
      dependencies: ['router', 'logger']
    });

    container.register('contextEnricher', ContextEnricher, {
      singleton: true,
      dependencies: ['logger']
    });
  }

  /**
   * Register tool services
   */
  static registerToolServices(container: DIContainer): void {
    // Tool registry
    container.register('toolRegistry', ToolRegistry, {
      singleton: true,
      dependencies: ['logger']
    });

    // Tool orchestrator
    container.register('toolOrchestrator', ToolOrchestrator, {
      singleton: true,
      dependencies: ['toolRegistry', 'router', 'logger']
    });

    // Streaming orchestrator
    container.register('streamingOrchestrator', StreamingToolOrchestrator, {
      singleton: true,
      dependencies: ['toolOrchestrator', 'router', 'logger']
    });
  }

  /**
   * Register VCS services
   */
  static registerVCSServices(container: DIContainer): void {
    container.register('vcsIntelligence', VCSIntelligence, {
      singleton: true,
      dependencies: ['router', 'toolOrchestrator', 'logger']
    });

    container.register('commitMessageGenerator', CommitMessageGenerator, {
      singleton: true,
      dependencies: ['router', 'logger']
    });
  }

  /**
   * Register all services
   */
  static async registerAll(container: DIContainer): Promise<void> {
    // Core services
    this.registerCoreServices(container);

    // Conversation services
    this.registerConversationServices(container);

    // Tool services
    this.registerToolServices(container);

    // VCS services
    this.registerVCSServices(container);

    // Register providers (async)
    await this.registerProviders(container);
  }
}