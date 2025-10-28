/**
 * Ollama Provider Implementation
 *
 * Implements the BaseAIProvider interface for Ollama local models,
 * serving as the reference implementation and maintaining backward compatibility.
 */

import { logger } from '../../utils/logger.js';
import { normalizeError } from '../../utils/error-utils.js';
import { withTimeout, withRetry } from '../../utils/async.js';
import { ensureOllamaServerRunning } from '../../utils/ollama-server.js';
import { TIMEOUT_CONSTANTS, RETRY_CONSTANTS } from '../../config/constants.js';
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

// Ollama-specific types
interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaCompletionRequest {
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  stop?: string[];
  stream?: boolean;
  system?: string;
  context?: number[];
  format?: string;
}

interface OllamaCompletionResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  context?: number[];
}

interface OllamaModelDetails {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Ollama AI Provider
 */
export class OllamaProvider extends BaseAIProvider {
  private baseUrl: string;
  private userAgent: string = 'ollama-code/1.0';

  constructor(config: ProviderConfig) {
    const defaultConfig = {
      name: config.name || 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      // Ollama is local, use medium timeout for faster failure detection
      timeout: TIMEOUT_CONSTANTS.MEDIUM,
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
      }
    };

    super({ ...defaultConfig, ...config });

    this.baseUrl = this.config.baseUrl!;
  }

  getName(): string {
    return 'Ollama';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxContextWindow: 32768, // Depends on model, this is a reasonable default
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
        functionCalling: false, // Not directly supported by Ollama
        imageInput: false, // Depends on model
        documentInput: false,
        customInstructions: true
      }
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Ollama provider');

    try {
      // Test connection and start server if needed
      const connectionSuccess = await this.testConnection();

      if (!connectionSuccess) {
        throw new ProviderConnectionError('ollama', new Error('Failed to connect to Ollama server'));
      }

      this.isInitialized = true;
      this.health.status = 'healthy';

      logger.info('Ollama provider initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Ollama provider:', error);
      this.isInitialized = false;
      this.health.status = 'unhealthy';
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    logger.debug('Testing connection to Ollama server');

    try {
      // Try to list models as a connection test
      await this.listModels();

      logger.debug('Ollama connection test successful');
      return true;
    } catch (error) {
      logger.debug('Ollama connection test failed, attempting to start server', error);

      try {
        // Try to start the server automatically
        await ensureOllamaServerRunning(this.baseUrl);

        // Test connection again after starting server
        await this.listModels();
        logger.info('Ollama server started and connection test successful');
        return true;
      } catch (startupError) {
        logger.error('Failed to start Ollama server or connect', startupError);
        return false;
      }
    }
  }

  async complete(
    prompt: string | AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const requestId = `ollama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Sending completion request to Ollama', {
      model: options.model || 'default',
      requestId
    });

    try {
      // Format the request
      const messages: OllamaMessage[] = Array.isArray(prompt)
        ? prompt.map(msg => ({ role: msg.role, content: msg.content }))
        : [{ role: 'user', content: prompt }];

      const request: OllamaCompletionRequest = {
        model: options.model || 'llama3.2:latest',
        messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        top_k: options.topK ?? 40,
        stream: false
      };

      // Add optional parameters
      if (options.maxTokens) {
        // Ollama doesn't have direct maxTokens, but we can use stop sequences
        // or handle truncation in post-processing
      }
      if (options.stopSequences) request.stop = options.stopSequences;
      if (options.system) request.system = options.system;
      if (options.context) request.context = options.context;
      if (options.format) request.format = options.format;

      // Make the API request with timeout and retry
      const sendRequest = async () => {
        return this.sendRequest('/api/chat', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(request)
        });
      };

      const timeoutFn = withTimeout(sendRequest, options.timeout || this.config.timeout || 30000);

      const retryFn = withRetry(timeoutFn, {
        maxRetries: this.config.retryOptions?.maxRetries || 3,
        initialDelayMs: this.config.retryOptions?.initialDelayMs || 1000,
        maxDelayMs: this.config.retryOptions?.maxDelayMs || 5000
      });

      const response: OllamaCompletionResponse = await retryFn();

      const processingTime = Date.now() - startTime;

      // Calculate token usage (Ollama provides token counts)
      const promptTokens = response.prompt_eval_count || 0;
      const completionTokens = response.eval_count || 0;
      const totalTokens = promptTokens + completionTokens;

      // Update metrics
      this.updateMetrics(true, processingTime, totalTokens, 0); // Ollama is free

      const result: AICompletionResponse = {
        content: response.message.content,
        model: response.model,
        finishReason: response.done ? 'stop' : 'length',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        metadata: {
          requestId,
          processingTime,
          provider: 'ollama',
          cached: false // Ollama doesn't provide cache info
        }
      };

      logger.debug('Ollama completion request successful', {
        requestId,
        processingTime,
        totalTokens
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);

      logger.error('Ollama completion request failed', { requestId, error });

      throw new ProviderError(
        `Ollama completion failed: ${normalizeError(error).message}`,
        'ollama',
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
    const requestId = `ollama_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Sending streaming completion request to Ollama', {
      model: options.model || 'default',
      requestId
    });

    try {
      // Format the request
      const messages: OllamaMessage[] = Array.isArray(prompt)
        ? prompt.map(msg => ({ role: msg.role, content: msg.content }))
        : [{ role: 'user', content: prompt }];

      const request: OllamaCompletionRequest = {
        model: options.model || 'llama3.2:latest',
        messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        top_k: options.topK ?? 40,
        stream: true
      };

      // Add optional parameters
      if (options.stopSequences) request.stop = options.stopSequences;
      if (options.system) request.system = options.system;
      if (options.context) request.context = options.context;
      if (options.format) request.format = options.format;

      // Make the streaming API request
      await this.sendStreamRequest('/api/chat', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: abortSignal
      }, (ollamaEvent: any) => {
        // Convert Ollama event to standard AIStreamEvent
        const event: AIStreamEvent = {
          content: ollamaEvent.message?.content || '',
          done: ollamaEvent.done || false,
          delta: ollamaEvent.message?.content || '',
          usage: ollamaEvent.done ? {
            promptTokens: ollamaEvent.prompt_eval_count || 0,
            completionTokens: ollamaEvent.eval_count || 0,
            totalTokens: (ollamaEvent.prompt_eval_count || 0) + (ollamaEvent.eval_count || 0)
          } : undefined,
          metadata: {
            requestId,
            provider: 'ollama'
          }
        };

        onEvent(event);
      }, abortSignal);

    } catch (error) {
      logger.error('Ollama streaming completion request failed', { requestId, error });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('Ollama streaming request was cancelled', 'ollama', 'CANCELLED', false);
      }

      throw new ProviderError(
        `Ollama streaming completion failed: ${normalizeError(error).message}`,
        'ollama',
        'STREAMING_ERROR',
        true
      );
    }
  }

  async listModels(): Promise<AIModel[]> {
    logger.debug('Listing available Ollama models');

    try {
      const response = await this.sendRequest('/api/tags', {
        method: 'GET',
        headers: this.getHeaders()
      });

      const models: AIModel[] = (response.models || []).map((model: OllamaModelDetails) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama',
        capabilities: this.getModelCapabilities(model.name),
        contextWindow: this.getModelContextWindow(model.name),
        costPerToken: {
          input: 0, // Ollama is free
          output: 0
        },
        averageResponseTime: 0, // Would need to track this over time
        qualityScore: this.getModelQualityScore(model.name),
        lastUpdated: new Date(model.modified_at)
      }));

      return models;
    } catch (error) {
      logger.error('Failed to list Ollama models', error);

      throw new ProviderError(
        `Failed to list Ollama models: ${normalizeError(error).message}`,
        'ollama',
        'LIST_MODELS_ERROR',
        true
      );
    }
  }

  async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.listModels();
    return models.find(model => model.id === modelId) || null;
  }

  calculateCost(promptTokens: number, completionTokens: number, model?: string): number {
    // Ollama is free
    return 0;
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent
    };
  }

  /**
   * Send a request to the Ollama API
   */
  private async sendRequest(path: string, options: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    logger.debug(`Sending request to Ollama: ${url}`);

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('Request timed out', 'ollama', 'TIMEOUT', true);
      }

      throw error;
    }
  }

  /**
   * Send a streaming request to the Ollama API
   */
  private async sendStreamRequest(
    path: string,
    options: RequestInit,
    onEvent: (event: any) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;

    logger.debug(`Sending streaming request to Ollama: ${url}`);

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Check for abort signal
          if (abortSignal?.aborted) {
            throw new Error('Stream aborted');
          }

          // Decode and process chunks
          buffer += decoder.decode(value, { stream: true });

          // Prevent buffer from growing too large
          if (buffer.length > 1024 * 1024) { // 1MB limit
            logger.warn('Ollama stream buffer too large, truncating');
            buffer = buffer.slice(-512 * 1024); // Keep last 512KB
          }

          // Process complete events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            try {
              const eventData = JSON.parse(trimmedLine);
              onEvent(eventData);

              if (eventData.done) return;
            } catch (error) {
              logger.error('Failed to parse Ollama stream event', { line: trimmedLine, error });
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (error) {
          logger.debug('Error releasing Ollama reader lock', error);
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const eventData = JSON.parse(buffer.trim());
          onEvent(eventData);
        } catch (error) {
          logger.error('Failed to parse final Ollama stream event', { buffer, error });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('Ollama streaming request timed out', 'ollama', 'TIMEOUT', true);
      }

      throw error;
    }
  }

  /**
   * Handle error responses from the Ollama API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    let errorMessage = `Ollama API request failed with status ${response.status}`;

    try {
      errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      errorMessage = `Ollama API request failed: ${response.statusText || response.status}`;
    }

    logger.error('Ollama API error response', { status: response.status, errorData });

    // Handle specific error codes
    switch (response.status) {
      case 404:
        throw new ProviderConnectionError('ollama', new Error('Ollama server not found'));
      case 500:
        throw new ProviderError('Ollama server encountered an error', 'ollama', 'SERVER_ERROR', true);
      default:
        throw new ProviderError(errorMessage, 'ollama', 'API_ERROR', true);
    }
  }

  /**
   * Get capabilities for a specific model
   */
  private getModelCapabilities(modelName: string): AICapability[] {
    const baseCapabilities = [
      AICapability.TEXT_COMPLETION,
      AICapability.CHAT,
      AICapability.STREAMING
    ];

    // Add model-specific capabilities based on model name patterns
    if (modelName.includes('code') || modelName.includes('coder')) {
      baseCapabilities.push(AICapability.CODE_GENERATION, AICapability.CODE_ANALYSIS);
    }

    if (modelName.includes('llama') || modelName.includes('qwen') || modelName.includes('gemma')) {
      baseCapabilities.push(AICapability.REASONING, AICapability.MATH);
    }

    return baseCapabilities;
  }

  /**
   * Get context window size for a specific model
   */
  private getModelContextWindow(modelName: string): number {
    // These are approximate values based on known model architectures
    if (modelName.includes('llama3.2')) return 32768;
    if (modelName.includes('llama3.1')) return 131072;
    if (modelName.includes('qwen2.5')) return 32768;
    if (modelName.includes('codellama')) return 16384;
    if (modelName.includes('gemma')) return 8192;

    return 8192; // Default fallback
  }

  /**
   * Get quality score for a specific model (subjective, based on benchmarks)
   */
  private getModelQualityScore(modelName: string): number {
    // Simplified scoring system (0-100)
    if (modelName.includes('llama3.1') || modelName.includes('qwen2.5-coder')) return 90;
    if (modelName.includes('llama3.2') || modelName.includes('qwen2.5')) return 85;
    if (modelName.includes('codellama:13b') || modelName.includes('codellama:34b')) return 80;
    if (modelName.includes('gemma:7b')) return 75;
    if (modelName.includes('codellama:7b')) return 70;

    return 65; // Default score
  }
}