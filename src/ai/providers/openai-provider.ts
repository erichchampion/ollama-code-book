/**
 * OpenAI Provider Implementation
 *
 * Implements the BaseAIProvider interface for OpenAI's GPT models,
 * providing high-quality text generation, code completion, and reasoning capabilities.
 */

import { logger } from '../../utils/logger.js';
import { withTimeout, withRetry } from '../../utils/async.js';
import { normalizeError } from '../../utils/error-utils.js';
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
  ProviderRateLimitError,
  ProviderAuthenticationError,
  ProviderConnectionError
} from './base-provider.js';

// OpenAI-specific types
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string; // Tool name for tool role messages
}

/**
 * OpenAI Tool/Function Calling Types
 *
 * OpenAI supports function calling through the tools parameter.
 * See: https://platform.openai.com/docs/guides/function-calling
 */
interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  // Tool calling parameters
  tools?: OpenAITool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider extends BaseAIProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    const defaultConfig = {
      name: config.name || 'openai',
      baseUrl: 'https://api.openai.com/v1',
      // OpenAI supports complex reasoning, use extended timeout
      timeout: TIMEOUT_CONSTANTS.LONG,
      retryOptions: {
        maxRetries: RETRY_CONSTANTS.DEFAULT_MAX_RETRIES,
        initialDelayMs: RETRY_CONSTANTS.BASE_RETRY_DELAY,
        maxDelayMs: RETRY_CONSTANTS.MAX_BACKOFF_DELAY
      },
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 500,
        tokensPerMinute: 150000
      },
      caching: {
        enabled: true,
        ttlMs: 600000 // 10 minutes
      }
    };

    super({ ...defaultConfig, ...config });

    this.baseUrl = this.config.baseUrl!;
    this.apiKey = this.config.apiKey || process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      throw new ProviderError('OpenAI API key is required', 'openai', 'MISSING_API_KEY');
    }
  }

  getName(): string {
    return 'OpenAI';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxContextWindow: 128000, // GPT-4 Turbo
      supportedCapabilities: [
        AICapability.TEXT_COMPLETION,
        AICapability.CHAT,
        AICapability.CODE_GENERATION,
        AICapability.CODE_ANALYSIS,
        AICapability.FUNCTION_CALLING,
        AICapability.STREAMING,
        AICapability.REASONING,
        AICapability.MATH,
        AICapability.TRANSLATION,
        AICapability.IMAGE_ANALYSIS // For GPT-4V
      ],
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000
      },
      features: {
        streaming: true,
        functionCalling: true,
        imageInput: true, // GPT-4V
        documentInput: false,
        customInstructions: true
      }
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing OpenAI provider');

    try {
      // Test connection by listing models
      const connectionSuccess = await this.testConnection();

      if (!connectionSuccess) {
        throw new ProviderConnectionError('openai', new Error('Failed to connect to OpenAI API'));
      }

      this.isInitialized = true;
      this.health.status = 'healthy';

      logger.info('OpenAI provider initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize OpenAI provider:', error);
      this.isInitialized = false;
      this.health.status = 'unhealthy';
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    logger.debug('Testing connection to OpenAI API');

    try {
      // Try to list models as a connection test
      await this.listModels();

      logger.debug('OpenAI connection test successful');
      return true;
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  async complete(
    prompt: string | AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const requestId = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Sending completion request to OpenAI', {
      model: options.model || 'gpt-4-turbo-preview',
      requestId
    });

    try {
      // Format the request
      const messages: OpenAIMessage[] = Array.isArray(prompt)
        ? prompt.map(msg => ({ role: msg.role, content: msg.content }))
        : [{ role: 'user', content: prompt }];

      const request: OpenAICompletionRequest = {
        model: options.model || 'gpt-4-turbo-preview',
        messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1.0,
        stream: false
      };

      // Add optional parameters
      if (options.maxTokens) request.max_tokens = options.maxTokens;
      if (options.stopSequences) request.stop = options.stopSequences;

      // Add system message if provided
      if (options.system) {
        request.messages.unshift({ role: 'system', content: options.system });
      }

      // Make the API request with timeout and retry
      const sendRequest = async () => {
        return this.sendRequest('/chat/completions', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(request)
        });
      };

      const timeoutFn = withTimeout(sendRequest, options.timeout || this.config.timeout || 60000);

      const retryFn = withRetry(timeoutFn, {
        maxRetries: this.config.retryOptions?.maxRetries || 3,
        initialDelayMs: this.config.retryOptions?.initialDelayMs || 1000,
        maxDelayMs: this.config.retryOptions?.maxDelayMs || 8000
      });

      const response: OpenAICompletionResponse = await retryFn();

      const processingTime = Date.now() - startTime;

      // Calculate token usage and cost
      const promptTokens = response.usage.prompt_tokens;
      const completionTokens = response.usage.completion_tokens;
      const totalTokens = response.usage.total_tokens;
      const cost = this.calculateCost(promptTokens, completionTokens, request.model);

      // Update metrics
      this.updateMetrics(true, processingTime, totalTokens, cost);

      const result: AICompletionResponse = {
        content: response.choices[0].message.content,
        model: response.model,
        finishReason: this.mapFinishReason(response.choices[0].finish_reason),
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        metadata: {
          requestId,
          processingTime,
          provider: 'openai',
          cached: false
        }
      };

      logger.debug('OpenAI completion request successful', {
        requestId,
        processingTime,
        totalTokens,
        cost
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);

      logger.error('OpenAI completion request failed', { requestId, error });

      throw new ProviderError(
        `OpenAI completion failed: ${normalizeError(error).message}`,
        'openai',
        'COMPLETION_ERROR',
        true
      );
    }
  }

  /**
   * Stream completion with optional tool calling support
   *
   * TODO: Full tool calling implementation
   *
   * To add complete tool calling support to this provider:
   *
   * 1. Create an OpenAIOllamaAdapter (similar to AnthropicOllamaAdapter)
   *    - Convert between Ollama's tool format and OpenAI's function format
   *    - Handle tool call ID mapping
   *    - Accumulate streaming tool call chunks
   *
   * 2. Update this method to:
   *    - Accept tools in the request (see TODO below)
   *    - Parse tool_calls from streaming delta
   *    - Emit toolCalls in AIStreamEvent when complete
   *
   * 3. Handle tool results in the message format:
   *    - OpenAI expects role: 'tool' messages with tool_call_id
   *    - Each tool result needs: role, tool_call_id, name, content
   *
   * Reference implementations:
   * - AnthropicProvider.completeStream() - working streaming tool calls
   * - AnthropicOllamaAdapter - adapter pattern for Ollama compatibility
   *
   * OpenAI API docs:
   * https://platform.openai.com/docs/guides/function-calling
   */
  async completeStream(
    prompt: string | AIMessage[],
    options: AICompletionOptions,
    onEvent: (event: AIStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const requestId = `openai_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Sending streaming completion request to OpenAI', {
      model: options.model || 'gpt-4-turbo-preview',
      requestId
    });

    try {
      // Format the request
      const messages: OpenAIMessage[] = Array.isArray(prompt)
        ? prompt.map(msg => ({ role: msg.role, content: msg.content }))
        : [{ role: 'user', content: prompt }];

      const request: OpenAICompletionRequest = {
        model: options.model || 'gpt-4-turbo-preview',
        messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1.0,
        stream: true
      };

      // Add optional parameters
      if (options.maxTokens) request.max_tokens = options.maxTokens;
      if (options.stopSequences) request.stop = options.stopSequences;

      // Add system message if provided
      if (options.system) {
        request.messages.unshift({ role: 'system', content: options.system });
      }

      // TODO: Add tool calling support
      // To enable tool calling, uncomment and implement the following:
      //
      // if (options.tools && options.tools.length > 0) {
      //   request.tools = options.tools.map(tool => ({
      //     type: 'function' as const,
      //     function: {
      //       name: tool.name,
      //       description: tool.description,
      //       parameters: tool.parameters
      //     }
      //   }));
      //   request.tool_choice = 'auto'; // or 'required' to force tool use
      // }

      // Make the streaming API request
      await this.sendStreamRequest('/chat/completions', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: abortSignal
      }, (openaiEvent: any) => {
        // Parse OpenAI Server-Sent Events format
        if (openaiEvent.startsWith('data: ')) {
          const data = openaiEvent.slice(6);

          if (data.trim() === '[DONE]') {
            onEvent({
              content: '',
              done: true,
              delta: '',
              metadata: { requestId, provider: 'openai' }
            });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            // Handle text content
            if (delta?.content) {
              onEvent({
                content: delta.content,
                done: false,
                delta: delta.content,
                metadata: { requestId, provider: 'openai' }
              });
            }

            // TODO: Handle tool calls in streaming response
            // OpenAI streams tool calls in chunks with delta.tool_calls
            // To implement:
            //
            // if (delta?.tool_calls) {
            //   // OpenAI sends tool calls as an array in delta.tool_calls
            //   // Each tool call has: index, id, type, function: { name, arguments }
            //   // Arguments are streamed incrementally, so you need to accumulate them
            //   //
            //   // Example implementation:
            //   // const toolCalls = delta.tool_calls.map(tc => ({
            //   //   id: tc.id || `call_${Date.now()}`,
            //   //   name: tc.function?.name,
            //   //   arguments: tc.function?.arguments // Partial JSON string
            //   // }));
            //   //
            //   // You'll need to:
            //   // 1. Accumulate partial tool_calls across chunks (by index)
            //   // 2. Parse complete JSON arguments when finish_reason is 'tool_calls'
            //   // 3. Emit toolCalls in the event when complete
            //   // 4. Handle tool result messages in the conversation
            //   //
            //   // See AnthropicProvider for a working implementation pattern
            // }
            //
            // if (choice?.finish_reason === 'tool_calls') {
            //   // Tool calls are complete, emit them
            //   // onEvent({
            //   //   content: '',
            //   //   done: true,
            //   //   delta: '',
            //   //   toolCalls: accumulatedToolCalls, // Your accumulated tool calls
            //   //   metadata: { requestId, provider: 'openai' }
            //   // });
            // }

          } catch (error) {
            logger.error('Failed to parse OpenAI stream event', { data, error });
          }
        }
      }, abortSignal);

    } catch (error) {
      logger.error('OpenAI streaming completion request failed', { requestId, error });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('OpenAI streaming request was cancelled', 'openai', 'CANCELLED', false);
      }

      throw new ProviderError(
        `OpenAI streaming completion failed: ${normalizeError(error).message}`,
        'openai',
        'STREAMING_ERROR',
        true
      );
    }
  }

  async listModels(): Promise<AIModel[]> {
    logger.debug('Listing available OpenAI models');

    try {
      const response = await this.sendRequest('/models', {
        method: 'GET',
        headers: this.getHeaders()
      });

      const models: AIModel[] = (response.data || [])
        .filter((model: OpenAIModel) => model.id.includes('gpt')) // Filter to GPT models only
        .map((model: OpenAIModel) => ({
          id: model.id,
          name: model.id,
          provider: 'openai',
          capabilities: this.getModelCapabilities(model.id),
          contextWindow: this.getModelContextWindow(model.id),
          costPerToken: this.getModelCostPerToken(model.id),
          averageResponseTime: 0, // Would need to track this over time
          qualityScore: this.getModelQualityScore(model.id),
          lastUpdated: new Date(model.created * 1000)
        }));

      return models;
    } catch (error) {
      logger.error('Failed to list OpenAI models', error);

      throw new ProviderError(
        `Failed to list OpenAI models: ${normalizeError(error).message}`,
        'openai',
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
    const pricing = this.getModelCostPerToken(model || 'gpt-4-turbo-preview');
    return (promptTokens * pricing.input) + (completionTokens * pricing.output);
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'ollama-code/1.0'
    };
  }

  /**
   * Send a request to the OpenAI API
   */
  private async sendRequest(path: string, options: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    logger.debug(`Sending request to OpenAI: ${url}`);

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('Request timed out', 'openai', 'TIMEOUT', true);
      }

      throw error;
    }
  }

  /**
   * Send a streaming request to the OpenAI API
   */
  private async sendStreamRequest(
    path: string,
    options: RequestInit,
    onEvent: (event: string) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;

    logger.debug(`Sending streaming request to OpenAI: ${url}`);

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

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Check for abort signal
          if (abortSignal?.aborted) {
            throw new Error('Stream aborted');
          }

          // Decode and process chunks
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              onEvent(line);
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (error) {
          logger.debug('Error releasing OpenAI reader lock', error);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('OpenAI streaming request timed out', 'openai', 'TIMEOUT', true);
      }

      throw error;
    }
  }

  /**
   * Handle error responses from the OpenAI API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    let errorMessage = `OpenAI API request failed with status ${response.status}`;

    try {
      errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      errorMessage = `OpenAI API request failed: ${response.statusText || response.status}`;
    }

    logger.error('OpenAI API error response', { status: response.status, errorData });

    // Handle specific error codes
    switch (response.status) {
      case 401:
        throw new ProviderAuthenticationError('openai');
      case 429:
        throw new ProviderRateLimitError('openai');
      case 500:
      case 502:
      case 503:
        throw new ProviderError('OpenAI server encountered an error', 'openai', 'SERVER_ERROR', true);
      default:
        throw new ProviderError(errorMessage, 'openai', 'API_ERROR', true);
    }
  }

  /**
   * Map OpenAI finish reason to standard format
   */
  private mapFinishReason(finishReason: string): 'stop' | 'length' | 'content_filter' | 'function_call' | 'error' {
    switch (finishReason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'content_filter': return 'content_filter';
      case 'function_call': return 'function_call';
      default: return 'error';
    }
  }

  /**
   * Get capabilities for a specific model
   */
  private getModelCapabilities(modelId: string): AICapability[] {
    const baseCapabilities = [
      AICapability.TEXT_COMPLETION,
      AICapability.CHAT,
      AICapability.STREAMING,
      AICapability.REASONING,
      AICapability.TRANSLATION
    ];

    // Add model-specific capabilities
    if (modelId.includes('gpt-4')) {
      baseCapabilities.push(
        AICapability.CODE_GENERATION,
        AICapability.CODE_ANALYSIS,
        AICapability.FUNCTION_CALLING,
        AICapability.MATH
      );
    }

    if (modelId.includes('vision') || modelId.includes('gpt-4-turbo')) {
      baseCapabilities.push(AICapability.IMAGE_ANALYSIS);
    }

    return baseCapabilities;
  }

  /**
   * Get context window size for a specific model
   */
  private getModelContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo')) return 16385;

    return 4096; // Default fallback
  }

  /**
   * Get cost per token for a specific model
   */
  private getModelCostPerToken(modelId: string): { input: number; output: number } {
    // Prices in USD per 1K tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-32k': { input: 0.06, output: 0.12 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 }
    };

    // Find the best match
    for (const [model, price] of Object.entries(pricing)) {
      if (modelId.includes(model)) {
        return { input: price.input / 1000, output: price.output / 1000 }; // Convert to per-token
      }
    }

    // Default fallback (GPT-4 pricing)
    return { input: 0.00003, output: 0.00006 };
  }

  /**
   * Get quality score for a specific model (subjective, based on benchmarks)
   */
  private getModelQualityScore(modelId: string): number {
    // Simplified scoring system (0-100)
    if (modelId.includes('gpt-4-turbo')) return 95;
    if (modelId.includes('gpt-4')) return 90;
    if (modelId.includes('gpt-3.5-turbo')) return 80;

    return 75; // Default score
  }
}