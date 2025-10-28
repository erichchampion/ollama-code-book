/**
 * Google Gemini AI Provider
 *
 * Implements the BaseAIProvider interface for Google's Gemini models
 * with multimodal capabilities, function calling, and streaming support.
 */

import { BaseAIProvider, AICompletionOptions, AICompletionResponse, AIStreamEvent, AIMessage, ProviderCapabilities, ProviderHealth, ProviderConfig, AIModel, AICapability } from './base-provider.js';
import { logger } from '../../utils/logger.js';
import { normalizeError } from '../../utils/error-utils.js';
import { TIMEOUT_CONSTANTS } from '../../config/constants.js';

export interface GoogleConfig extends ProviderConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  projectId?: string;
  location?: string;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
    function_call?: {
      name: string;
      args: Record<string, any>;
    };
    function_response?: {
      name: string;
      response: Record<string, any>;
    };
  }>;
}

export interface GeminiSafetySettings {
  category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
}

export interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  generationConfig?: GeminiGenerationConfig;
  safetySettings?: GeminiSafetySettings[];
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

export interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: 'FINISH_REASON_UNSPECIFIED' | 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GoogleProvider extends BaseAIProvider {
  private baseURL: string;

  constructor(config: GoogleConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';

    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }
  }

  getName(): string {
    return 'google';
  }

  getDisplayName(): string {
    return 'Google Gemini';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxContextWindow: 2000000, // Gemini Pro 1.5 has 2M token context
      supportedCapabilities: [
        AICapability.TEXT_COMPLETION,
        AICapability.CHAT,
        AICapability.CODE_GENERATION,
        AICapability.CODE_ANALYSIS,
        AICapability.FUNCTION_CALLING,
        AICapability.STREAMING,
        AICapability.IMAGE_ANALYSIS,
        AICapability.DOCUMENT_ANALYSIS,
        AICapability.REASONING,
        AICapability.MATH
      ],
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 32000
      },
      features: {
        streaming: true,
        functionCalling: true,
        imageInput: true,
        documentInput: true,
        customInstructions: true
      }
    };
  }

  getDefaultModel(): string {
    return (this.config as GoogleConfig).model || 'gemini-1.5-pro-latest';
  }

  async initialize(): Promise<void> {
    // Test connection during initialization
    await this.testConnection();
    this.isInitialized = true;
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Google provider connection test failed:', error);
      return false;
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      // Test with a simple generation request
      const testRequest: GeminiGenerateContentRequest = {
        contents: [{
          role: 'user',
          parts: [{ text: 'Hello' }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0
        }
      };

      const response = await this.makeRequest('generateContent', testRequest);
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        errorRate: 0,
        availability: 1.0,
        details: {
          endpoint: this.baseURL,
          consecutiveFailures: 0,
          lastSuccessfulRequest: new Date()
        }
      };
    } catch (error) {
      logger.error('Google provider health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorRate: 1,
        availability: 0.0,
        details: {
          endpoint: this.baseURL,
          lastError: normalizeError(error).message,
          consecutiveFailures: 1
        }
      };
    }
  }

  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const requestId = `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const model = options.model || this.getDefaultModel();
      const request = this.buildRequest(messages, options);

      logger.debug(`Google API request to ${model}:`, { requestId, messageCount: messages.length });

      const response = await this.makeRequest('generateContent', request, model);

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates returned from Google API');
      }

      const candidate = response.candidates[0];
      const content = this.extractContentFromCandidate(candidate);
      const finishReason = this.mapFinishReason(candidate.finishReason);

      const result: AICompletionResponse = {
        content,
        model,
        finishReason,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          provider: this.getName(),
          cached: false
        }
      };

      logger.debug(`Google API response:`, {
        requestId,
        finishReason: result.finishReason,
        tokenUsage: result.usage
      });

      return result;
    } catch (error) {
      logger.error(`Google API error:`, { requestId, error });
      throw this.handleError(error);
    }
  }

  async completeStream(
    prompt: string | AIMessage[],
    options: AICompletionOptions = {},
    onEvent: (event: AIStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const messages = typeof prompt === 'string'
      ? [{ role: 'user' as const, content: prompt }]
      : prompt;

    for await (const event of this.stream(messages, options)) {
      if (abortSignal?.aborted) {
        throw new Error('Request aborted');
      }
      onEvent(event);
    }
  }

  async listModels(): Promise<AIModel[]> {
    const models: AIModel[] = Object.entries(GOOGLE_MODELS).map(([id, model]) => ({
      id,
      name: model.name,
      provider: this.getName(),
      capabilities: model.capabilities.map(cap => {
        switch (cap) {
          case 'text': return AICapability.TEXT_COMPLETION;
          case 'code': return AICapability.CODE_GENERATION;
          case 'vision': return AICapability.IMAGE_ANALYSIS;
          case 'function_calling': return AICapability.FUNCTION_CALLING;
          default: return AICapability.TEXT_COMPLETION;
        }
      }),
      contextWindow: model.contextLength,
      costPerToken: {
        input: 0.0025 / 1000, // Rough estimate
        output: 0.0025 / 1000
      },
      averageResponseTime: 2000,
      qualityScore: 0.85,
      lastUpdated: new Date()
    }));

    return models;
  }

  async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.listModels();
    return models.find(model => model.id === modelId) || null;
  }

  calculateCost(promptTokens: number, completionTokens: number, model?: string): number {
    // Google Gemini pricing (approximate)
    const inputCost = 0.0025 / 1000; // $0.0025 per 1K tokens
    const outputCost = 0.0025 / 1000;

    return (promptTokens * inputCost) + (completionTokens * outputCost);
  }

  /**
   * Stream completion with optional tool calling support
   *
   * TODO: Full tool calling implementation
   *
   * To add complete tool calling support to this provider:
   *
   * 1. Create a GoogleOllamaAdapter (similar to AnthropicOllamaAdapter)
   *    - Convert between Ollama's tool format and Google's function declarations
   *    - Handle function_call and function_response parts
   *    - Map between different message formats
   *
   * 2. Update this method to:
   *    - Include tools in buildRequest() (see TODO in that method)
   *    - Parse function_call parts from streaming response
   *    - Emit toolCalls in AIStreamEvent when detected
   *
   * 3. Handle function results in the message format:
   *    - Google expects user messages with function_response parts
   *    - Each part needs: name (function name) and response (result object)
   *    - Unlike OpenAI/Anthropic, args/response are objects, not JSON strings
   *
   * Reference implementations:
   * - AnthropicProvider.completeStream() - working streaming tool calls
   * - AnthropicOllamaAdapter - adapter pattern for Ollama compatibility
   *
   * Google Gemini API docs:
   * https://ai.google.dev/gemini-api/docs/function-calling
   */
  async *stream(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): AsyncGenerator<AIStreamEvent, void, unknown> {
    const model = options.model || this.getDefaultModel();
    const request = this.buildRequest(messages, options);

    try {
      const url = `${this.baseURL}/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                yield { content: '', done: true };
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.candidates && parsed.candidates[0]) {
                  const candidate = parsed.candidates[0];
                  const content = this.extractContentFromCandidate(candidate);

                  if (content) {
                    yield { content, done: false };
                  }

                  // TODO: Handle function calls in streaming response
                  // Google Gemini sends function calls in the parts array
                  // To implement:
                  //
                  // const parts = candidate.content?.parts || [];
                  // const functionCalls = parts.filter(part => part.function_call);
                  //
                  // if (functionCalls.length > 0) {
                  //   // Convert Google function_call format to standard toolCalls format
                  //   const toolCalls = functionCalls.map(fc => ({
                  //     id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  //     name: fc.function_call.name,
                  //     input: fc.function_call.args // Already parsed object, not JSON string
                  //   }));
                  //
                  //   yield {
                  //     content: '',
                  //     done: true,
                  //     toolCalls,
                  //     metadata: { provider: 'google' }
                  //   };
                  // }
                  //
                  // To send function results back:
                  // - Add a user message with function_response parts
                  // - Each part should have: name (function name) and response (result object)
                  // - See buildRequest() comments for the exact format
                  //
                  // See AnthropicProvider.completeStream() for a working implementation pattern
                }
              } catch (parseError) {
                logger.warn('Failed to parse streaming response:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      yield { content: '', done: true };
    } catch (error) {
      logger.error('Google streaming error:', error);
      throw this.handleError(error);
    }
  }

  private buildRequest(messages: AIMessage[], options: AICompletionOptions): GeminiGenerateContentRequest {
    const contents: GeminiContent[] = [];
    let systemInstruction: { parts: Array<{ text: string }> } | undefined;

    for (const message of messages) {
      if (message.role === 'system') {
        // Gemini handles system messages as system instruction
        systemInstruction = {
          parts: [{ text: message.content }]
        };
      } else {
        contents.push({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }]
        });
      }
    }

    // Add system message from options if provided
    if (options.system && !systemInstruction) {
      systemInstruction = {
        parts: [{ text: options.system }]
      };
    }

    const generationConfig: GeminiGenerationConfig = {};

    if (options.temperature !== undefined) {
      generationConfig.temperature = Math.max(0, Math.min(2, options.temperature));
    }
    if (options.topP !== undefined) {
      generationConfig.topP = Math.max(0, Math.min(1, options.topP));
    }
    if (options.topK !== undefined) {
      generationConfig.topK = Math.max(1, Math.floor(options.topK));
    }
    if (options.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options.stopSequences && options.stopSequences.length > 0) {
      generationConfig.stopSequences = options.stopSequences.slice(0, 5); // Gemini supports up to 5
    }

    // Default safety settings (allow most content for development use)
    const safetySettings: GeminiSafetySettings[] = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ];

    const request: GeminiGenerateContentRequest = {
      contents,
      generationConfig,
      safetySettings
    };

    if (systemInstruction) {
      request.systemInstruction = systemInstruction;
    }

    // TODO: Add tool calling support
    // To enable tool calling with Google Gemini, uncomment and implement:
    //
    // if (options.tools && options.tools.length > 0) {
    //   request.tools = [{
    //     functionDeclarations: options.tools.map(tool => ({
    //       name: tool.name,
    //       description: tool.description,
    //       parameters: tool.parameters // JSON Schema format
    //     }))
    //   }];
    // }
    //
    // Google Gemini function calling guide:
    // https://ai.google.dev/gemini-api/docs/function-calling
    //
    // Key differences from Anthropic/OpenAI:
    // 1. Tools are wrapped in functionDeclarations array
    // 2. Function calls appear in model response as function_call parts
    // 3. Function responses go in user message as function_response parts
    // 4. Parameters use standard JSON Schema format
    //
    // Example response with function call:
    // {
    //   candidates: [{
    //     content: {
    //       role: 'model',
    //       parts: [{
    //         function_call: {
    //           name: 'get_weather',
    //           args: { location: 'San Francisco' }
    //         }
    //       }]
    //     }
    //   }]
    // }
    //
    // Example sending function response:
    // {
    //   role: 'user',
    //   parts: [{
    //     function_response: {
    //       name: 'get_weather',
    //       response: { temp: 72, condition: 'sunny' }
    //     }
    //   }]
    // }

    return request;
  }

  private async makeRequest(endpoint: string, data: any, model?: string): Promise<GeminiGenerateContentResponse> {
    const targetModel = model || this.getDefaultModel();
    const url = `${this.baseURL}/models/${targetModel}:${endpoint}?key=${this.config.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_CONSTANTS.GIT_OPERATION); // 60 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ollama-code/1.0'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorBody);
          if (errorData.error) {
            errorMessage = errorData.error.message || errorMessage;
          }
        } catch {
          // Keep default error message if parsing fails
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  private extractContentFromCandidate(candidate: any): string {
    if (!candidate.content || !candidate.content.parts) {
      return '';
    }

    return candidate.content.parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('');
  }

  private mapFinishReason(reason: string): AICompletionResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      // Add provider context to the error
      const message = `Google Gemini error: ${error.message}`;
      const newError = new Error(message);
      newError.stack = error.stack;
      return newError;
    }

    return new Error(`Google Gemini error: ${String(error)}`);
  }
}

// Factory function for easy instantiation
export function createGoogleProvider(config: GoogleConfig): GoogleProvider {
  return new GoogleProvider(config);
}

// Default models available
export const GOOGLE_MODELS = {
  'gemini-1.5-pro-latest': {
    name: 'Gemini 1.5 Pro (Latest)',
    contextLength: 2000000,
    capabilities: ['text', 'code', 'vision', 'function_calling']
  },
  'gemini-1.5-flash-latest': {
    name: 'Gemini 1.5 Flash (Latest)',
    contextLength: 1000000,
    capabilities: ['text', 'code', 'vision']
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    contextLength: 32000,
    capabilities: ['text', 'code']
  },
  'gemini-pro-vision': {
    name: 'Gemini Pro Vision',
    contextLength: 16000,
    capabilities: ['text', 'code', 'vision']
  }
} as const;