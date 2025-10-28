import { ProviderManager } from './provider-manager';
import { IntelligentRouter } from './intelligent-router';
import { MajorityVotingFusion } from './response-fusion';
import { OllamaProvider } from './providers/ollama';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { Logger } from './logger';

/**
 * Multi-Provider AI Service
 * Production-ready integration of all components
 */
export class MultiProviderAIService {
  private providerManager: ProviderManager;
  private router: IntelligentRouter;
  private fusion: MajorityVotingFusion;
  private logger: Logger;

  constructor(config: MultiProviderConfig) {
    this.logger = new Logger('MultiProviderAI');
    this.providerManager = new ProviderManager(this.logger);
    this.router = new IntelligentRouter(this.providerManager, this.logger);
    this.fusion = new MajorityVotingFusion(this.router, this.logger);

    this.initialize(config);
  }

  /**
   * Initialize all providers and budgets
   */
  private async initialize(config: MultiProviderConfig): Promise<void> {
    try {
      // Initialize Ollama (local)
      const ollama = new OllamaProvider({
        baseUrl: config.ollama.baseUrl || 'http://localhost:11434',
        defaultModel: config.ollama.defaultModel || 'qwen2.5-coder:7b'
      });
      await ollama.initialize();
      await this.providerManager.registerProvider('ollama-local', ollama);

      // Initialize OpenAI
      if (config.openai?.apiKey) {
        const openai = new OpenAIProvider({
          apiKey: config.openai.apiKey,
          organization: config.openai.organization,
          defaultModel: config.openai.defaultModel || 'gpt-4-turbo'
        });
        await openai.initialize();
        await this.providerManager.registerProvider('openai-main', openai);

        // Set budget
        this.providerManager.setBudget({
          providerId: 'openai-main',
          dailyLimit: config.budgets['openai-main'].daily,
          monthlyLimit: config.budgets['openai-main'].monthly,
          alertThresholds: [0.50, 0.75, 0.90]
        });

        // Store encrypted credentials
        await this.providerManager.storeCredentials('openai-main', {
          apiKey: config.openai.apiKey,
          organization: config.openai.organization
        });
      }

      // Initialize Anthropic
      if (config.anthropic?.apiKey) {
        const anthropic = new AnthropicProvider({
          apiKey: config.anthropic.apiKey,
          defaultModel: config.anthropic.defaultModel || 'claude-3-5-sonnet-20241022'
        });
        await anthropic.initialize();
        await this.providerManager.registerProvider('anthropic-main', anthropic);

        this.providerManager.setBudget({
          providerId: 'anthropic-main',
          dailyLimit: config.budgets['anthropic-main'].daily,
          monthlyLimit: config.budgets['anthropic-main'].monthly,
          alertThresholds: [0.50, 0.75, 0.90]
        });

        await this.providerManager.storeCredentials('anthropic-main', {
          apiKey: config.anthropic.apiKey
        });
      }

      // Initialize Google
      if (config.google?.apiKey) {
        const google = new GoogleProvider({
          apiKey: config.google.apiKey,
          defaultModel: config.google.defaultModel || 'gemini-1.5-pro'
        });
        await google.initialize();
        await this.providerManager.registerProvider('google-main', google);

        this.providerManager.setBudget({
          providerId: 'google-main',
          dailyLimit: config.budgets['google-main']?.daily || 10,
          monthlyLimit: config.budgets['google-main']?.monthly || 200,
          alertThresholds: [0.50, 0.75, 0.90]
        });

        await this.providerManager.storeCredentials('google-main', {
          apiKey: config.google.apiKey
        });
      }

      // Set up event listeners
      this.setupEventListeners();

      // Start health monitoring
      this.startHealthMonitoring();

      this.logger.info('Multi-provider AI service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize multi-provider service', error);
      throw error;
    }
  }

  /**
   * Complete a prompt using intelligent routing
   */
  async complete(
    prompt: string,
    options: {
      complexity?: 'simple' | 'medium' | 'complex';
      priority?: 'cost' | 'quality' | 'performance' | 'balanced';
      maxCost?: number;
      requireFusion?: boolean;
      minFusionAgreement?: number;
    } = {}
  ): Promise<AICompletionResponse> {
    const {
      complexity = 'medium',
      priority = 'balanced',
      maxCost,
      requireFusion = false,
      minFusionAgreement = 0.66
    } = options;

    // Use fusion for critical requests
    if (requireFusion) {
      const fusionResult = await this.fusion.fuse(prompt, {
        complexity,
        minAgreement: minFusionAgreement
      });

      this.logger.info('Fusion completed', {
        confidence: fusionResult.confidence,
        cost: fusionResult.totalCost,
        providers: fusionResult.individualResponses.length
      });

      return {
        content: fusionResult.result,
        metadata: {
          fusion: true,
          confidence: fusionResult.confidence,
          cost: fusionResult.totalCost
        }
      } as any;
    }

    // Normal routing
    const context: RoutingContext = {
      prompt,
      complexity,
      priority,
      maxCost
    };

    const result = await this.router.executeWithFallback(
      context,
      async (providerId, model) => {
        const provider = this.providerManager.getProvider(providerId);
        return await provider.complete(prompt, { model });
      }
    );

    return result;
  }

  /**
   * Stream a completion
   */
  async completeStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: {
      complexity?: 'simple' | 'medium' | 'complex';
      priority?: 'cost' | 'quality' | 'performance' | 'balanced';
    } = {}
  ): Promise<void> {
    const { complexity = 'medium', priority = 'balanced' } = options;

    const context: RoutingContext = {
      prompt,
      complexity,
      priority
    };

    const decision = await this.router.route(context);
    const provider = this.providerManager.getProvider(decision.providerId);

    await provider.completeStream(
      prompt,
      { model: decision.model },
      (event) => {
        if (event.type === 'content') {
          onChunk(event.content);
        }
      }
    );
  }

  /**
   * Get usage statistics across all providers
   */
  getUsageStats(): Record<string, ProviderUsageStats> {
    const stats: Record<string, ProviderUsageStats> = {};
    const providers = this.providerManager.getAllProviders();

    for (const [id] of providers) {
      stats[id] = this.providerManager.getUsageStats(id);
    }

    return stats;
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus(): Record<string, ProviderHealth> {
    const health: Record<string, ProviderHealth> = {};
    const providers = this.providerManager.getAllProviders();

    for (const [id, provider] of providers) {
      health[id] = provider.getHealth();
    }

    return health;
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    // Budget warnings
    this.providerManager.on('budget_warning', ({ id, type, percentage }) => {
      this.logger.warn(`Budget warning: ${id} at ${(percentage * 100).toFixed(1)}% of ${type} limit`);
    });

    // Budget exceeded
    this.providerManager.on('budget_exceeded', ({ id, type, current, limit }) => {
      this.logger.error(`Budget exceeded: ${id} spent $${current.toFixed(2)} of $${limit} ${type} limit`);
    });

    // Health changes
    const providers = this.providerManager.getAllProviders();
    for (const [id, provider] of providers) {
      provider.on('health_changed', ({ status, lastError }) => {
        if (status === 'unhealthy') {
          this.logger.error(`Provider ${id} unhealthy: ${lastError}`);
        } else {
          this.logger.info(`Provider ${id} recovered`);
        }
      });
    }

    // Routing decisions
    this.router.on('routing_decision', ({ decision, strategy }) => {
      this.logger.debug(`Routing: ${decision.providerId} (${decision.model}) via ${strategy}`);
    });

    // Request failures
    this.router.on('request_failure', ({ providerId, error }) => {
      this.logger.warn(`Request failed with ${providerId}:`, error);
    });
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      const providers = this.providerManager.getAllProviders();

      for (const [id, provider] of providers) {
        try {
          await provider.performHealthCheck();
        } catch (error) {
          this.logger.error(`Health check failed for ${id}`, error);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Shutting down multi-provider AI service');
    // Clean up resources, close connections, etc.
  }
}