/**
 * llama.cpp Provider Implementation
 *
 * Implements the BaseAIProvider interface for llama.cpp/llama-server,
 * enabling direct GGUF model inference without requiring Ollama.
 */

import { logger } from '../../utils/logger.js';
import { normalizeError } from '../../utils/error-utils.js';
import { withTimeout, withRetry } from '../../utils/async.js';
import { ensureLlamaCppServerRunning, isLlamaCppServerRunning } from '../../utils/llamacpp-server.js';
import { LlamaCppClient, LlamaCppMessage, LlamaCppStreamEvent } from '../llamacpp-client.js';
import { TIMEOUT_CONSTANTS, RETRY_CONSTANTS } from '../../config/constants.js';
import { DEFAULT_LLAMACPP_URL, DEFAULT_LLAMACPP_CONTEXT_SIZE } from '../../constants.js';
import {
  BaseAIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  AIStreamEvent,
  AIModel,
  AICapability,
  ProviderCapabilities,
  ProviderConfig,
  ProviderError,
  ProviderConnectionError
} from './base-provider.js';

/**
 * Extended configuration for llama.cpp provider
 */
export interface LlamaCppProviderConfig extends ProviderConfig {
  modelPath?: string;
  executablePath?: string;
  gpuLayers?: number;
  contextSize?: number;
  flashAttention?: boolean;
  threads?: number;
  parallel?: number;
  serverArgs?: string[];
}

/**
 * llama.cpp AI Provider
 */
export class LlamaCppProvider extends BaseAIProvider {
  private client: LlamaCppClient;
  private baseUrl: string;
  private providerConfig: LlamaCppProviderConfig;
  private currentModelName: string = 'gguf-model';

  constructor(config: LlamaCppProviderConfig) {
    const defaultConfig: LlamaCppProviderConfig = {
      name: config.name || 'llamacpp',
      baseUrl: DEFAULT_LLAMACPP_URL,
      timeout: TIMEOUT_CONSTANTS.LONG,
      retryOptions: {
        maxRetries: RETRY_CONSTANTS.DEFAULT_MAX_RETRIES,
        initialDelayMs: RETRY_CONSTANTS.BASE_RETRY_DELAY,
        maxDelayMs: RETRY_CONSTANTS.MAX_BACKOFF_DELAY
      },
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 1000,
        tokensPerMinute: 100000
      },
      caching: {
        enabled: true,
        ttlMs: 300000 // 5 minutes
      },
      contextSize: DEFAULT_LLAMACPP_CONTEXT_SIZE
    };

    super({ ...defaultConfig, ...config });

    this.providerConfig = { ...defaultConfig, ...config };
    this.baseUrl = this.config.baseUrl || DEFAULT_LLAMACPP_URL;
    this.client = new LlamaCppClient({
      baseUrl: this.baseUrl,
      timeout: this.config.timeout
    });
  }

  getName(): string {
    return 'llama.cpp';
  }

  getDisplayName(): string {
    return 'llama.cpp (Local)';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxContextWindow: this.providerConfig.contextSize || DEFAULT_LLAMACPP_CONTEXT_SIZE,
      supportedCapabilities: [
        AICapability.TEXT_COMPLETION,
        AICapability.CHAT,
        AICapability.CODE_GENERATION,
        AICapability.CODE_ANALYSIS,
        AICapability.STREAMING,
        AICapability.REASONING
      ],
      rateLimits: {
        requestsPerMinute: 1000, // Local server, high limits
        tokensPerMinute: 100000
      },
      features: {
        streaming: true,
        functionCalling: false,
        imageInput: false, // Depends on model
        documentInput: false,
        customInstructions: true
      }
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing llama.cpp provider');

    try {
      const connectionSuccess = await this.testConnection();

      if (!connectionSuccess) {
        throw new ProviderConnectionError('llamacpp', new Error('Failed to connect to llama-server'));
      }

      // Try to get model info
      try {
        const models = await this.client.listModels();
        if (models.length > 0) {
          this.currentModelName = models[0].id;
        }
      } catch (error) {
        logger.debug('Could not get model info from llama-server', error);
      }

      this.isInitialized = true;
      this.health.status = 'healthy';

      logger.info('llama.cpp provider initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize llama.cpp provider:', error);
      this.isInitialized = false;
      this.health.status = 'unhealthy';
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    logger.debug('Testing connection to llama-server');

    try {
      const isHealthy = await this.client.healthCheck();

      if (isHealthy) {
        logger.debug('llama-server connection test successful');
        return true;
      }

      // Try to start the server if we have config for it
      if (this.providerConfig.modelPath) {
        logger.debug('llama-server not running, attempting to start...');

        try {
          await ensureLlamaCppServerRunning({
            baseUrl: this.baseUrl,
            modelPath: this.providerConfig.modelPath,
            executablePath: this.providerConfig.executablePath,
            gpuLayers: this.providerConfig.gpuLayers,
            contextSize: this.providerConfig.contextSize,
            flashAttention: this.providerConfig.flashAttention,
            threads: this.providerConfig.threads,
            parallel: this.providerConfig.parallel,
            serverArgs: this.providerConfig.serverArgs
          });

          const isNowHealthy = await this.client.healthCheck();
          if (isNowHealthy) {
            logger.info('llama-server started and connection test successful');
            return true;
          }
        } catch (startupError) {
          logger.error('Failed to start llama-server', startupError);
        }
      }

      return false;
    } catch (error) {
      logger.error('llama-server connection test failed', error);
      return false;
    }
  }

  async complete(
    prompt: string | AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const requestId = `llamacpp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Sending completion request to llama-server', {
      model: options.model || this.currentModelName,
      requestId
    });

    try {
      // Format messages
      const messages: LlamaCppMessage[] = Array.isArray(prompt)
        ? prompt.map(msg => ({ role: msg.role, content: msg.content }))
        : [{ role: 'user', content: prompt }];

      // Add system message if provided
      if (options.system) {
        messages.unshift({ role: 'system', content: options.system });
      }

      // Make the API request with timeout and retry
      const sendRequest = async () => {
        return this.client.complete(messages, {
          model: options.model,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.9,
          top_k: options.topK ?? 40,
          max_tokens: options.maxTokens,
          stop: options.stopSequences,
          stream: false
        });
      };

      const timeoutFn = withTimeout(sendRequest, options.timeout || this.config.timeout || 30000);

      const retryFn = withRetry(timeoutFn, {
        maxRetries: this.config.retryOptions?.maxRetries || 3,
        initialDelayMs: this.config.retryOptions?.initialDelayMs || 1000,
        maxDelayMs: this.config.retryOptions?.maxDelayMs || 5000
      });

      const response = await retryFn();

      const processingTime = Date.now() - startTime;

      // Extract response data
      const choice = response.choices[0];
      const usage = response.usage;

      // Update metrics
      this.updateMetrics(true, processingTime, usage.total_tokens, 0); // Local inference is free

      const result: AICompletionResponse = {
        content: choice.message.content,
        model: response.model || this.currentModelName,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        metadata: {
          requestId,
          processingTime,
          provider: 'llamacpp',
          cached: false
        }
      };

      logger.debug('llama.cpp completion request successful', {
        requestId,
        processingTime,
        totalTokens: usage.total_tokens
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);

      logger.error('llama.cpp completion request failed', { requestId, error });

      throw new ProviderError(
        `llama.cpp completion failed: ${normalizeError(error).message}`,
        'llamacpp',
        'COMPLETION_ERROR',
        true
      );
    }
  }

  async completeStream(
    prompt: string | AIMessage[],
    options: AICompletionOptions,
    onEvent: (event: AIStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const requestId = `llamacpp_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Sending streaming completion request to llama-server', {
      model: options.model || this.currentModelName,
      requestId
    });

    try {
      // Format messages
      const messages: LlamaCppMessage[] = Array.isArray(prompt)
        ? prompt.map(msg => ({ role: msg.role, content: msg.content }))
        : [{ role: 'user', content: prompt }];

      // Add system message if provided
      if (options.system) {
        messages.unshift({ role: 'system', content: options.system });
      }

      let accumulatedContent = '';

      await this.client.completeStream(
        messages,
        {
          model: options.model,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.9,
          top_k: options.topK ?? 40,
          max_tokens: options.maxTokens,
          stop: options.stopSequences,
          stream: true
        },
        (llamaEvent: LlamaCppStreamEvent) => {
          const delta = llamaEvent.choices?.[0]?.delta?.content || '';
          accumulatedContent += delta;

          const event: AIStreamEvent = {
            content: accumulatedContent,
            done: !!llamaEvent.choices?.[0]?.finish_reason,
            delta,
            metadata: {
              requestId,
              provider: 'llamacpp'
            }
          };

          onEvent(event);
        },
        abortSignal
      );
    } catch (error) {
      logger.error('llama.cpp streaming completion request failed', { requestId, error });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('llama.cpp streaming request was cancelled', 'llamacpp', 'CANCELLED', false);
      }

      throw new ProviderError(
        `llama.cpp streaming completion failed: ${normalizeError(error).message}`,
        'llamacpp',
        'STREAMING_ERROR',
        true
      );
    }
  }

  async listModels(): Promise<AIModel[]> {
    logger.debug('Listing available llama.cpp models');

    try {
      const models = await this.client.listModels();

      return models.map(model => ({
        id: model.id,
        name: model.id,
        provider: 'llamacpp',
        capabilities: this.getModelCapabilities(),
        contextWindow: this.providerConfig.contextSize || DEFAULT_LLAMACPP_CONTEXT_SIZE,
        costPerToken: {
          input: 0, // Local inference is free
          output: 0
        },
        averageResponseTime: 0,
        qualityScore: 80,
        lastUpdated: new Date(model.created ? model.created * 1000 : Date.now())
      }));
    } catch (error) {
      // If we can't list models, return a placeholder
      logger.debug('Could not list models from llama-server, returning placeholder', error);

      return [{
        id: this.currentModelName,
        name: this.currentModelName,
        provider: 'llamacpp',
        capabilities: this.getModelCapabilities(),
        contextWindow: this.providerConfig.contextSize || DEFAULT_LLAMACPP_CONTEXT_SIZE,
        costPerToken: {
          input: 0,
          output: 0
        },
        averageResponseTime: 0,
        qualityScore: 80,
        lastUpdated: new Date()
      }];
    }
  }

  async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.listModels();
    return models.find(model => model.id === modelId) || null;
  }

  calculateCost(promptTokens: number, completionTokens: number, model?: string): number {
    // llama.cpp / local inference is free
    return 0;
  }

  /**
   * Get model capabilities
   */
  private getModelCapabilities(): AICapability[] {
    return [
      AICapability.TEXT_COMPLETION,
      AICapability.CHAT,
      AICapability.CODE_GENERATION,
      AICapability.CODE_ANALYSIS,
      AICapability.STREAMING,
      AICapability.REASONING
    ];
  }

  /**
   * Map finish reason to standard format
   */
  private mapFinishReason(reason: string): 'stop' | 'length' | 'content_filter' | 'function_call' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return 'stop';
    }
  }
}
