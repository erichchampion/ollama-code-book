/**
 * Ollama AI Client
 * 
 * Handles interaction with Ollama API for local model inference,
 * including text completion, chat, and model management features.
 */

import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { withTimeout, withRetry } from '../utils/async.js';
import { ensureOllamaServerRunning } from '../utils/ollama-server.js';
import {
  DEFAULT_OLLAMA_URL,
  AI_COMPLETION_TIMEOUT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_INITIAL_RETRY_DELAY,
  DEFAULT_MAX_RETRY_DELAY,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  USER_AGENT
} from '../constants.js';

// Types for Ollama API requests and responses
export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;  // OpenAI-compatible tool call ID for tool responses
  tool_name?: string;      // Ollama-specific tool name field
}

// Tool calling types
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface OllamaToolCall {
  id: string;  // Required - unique identifier for the tool call
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface OllamaToolResult {
  tool_name: string;  // Ollama uses tool_name
  role: 'tool';
  content: string;
}

export interface OllamaCompletionOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  system?: string;
  context?: number[];
  format?: string;
}

export interface OllamaCompletionRequest {
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
  tools?: OllamaTool[];
}

export interface OllamaCompletionResponse {
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

export interface OllamaStreamEvent {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
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

export interface OllamaModel {
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

export interface OllamaModelListResponse {
  models: OllamaModel[];
}

// Default configuration interface
interface OllamaClientConfig {
  apiBaseUrl: string;
  timeout: number;
  retryOptions: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  defaultModel: string;
  defaultTemperature: number;
  defaultTopP: number;
  defaultTopK: number;
}

// Default Ollama configuration
const DEFAULT_CONFIG: OllamaClientConfig = {
  apiBaseUrl: DEFAULT_OLLAMA_URL,
  timeout: AI_COMPLETION_TIMEOUT,
  retryOptions: {
    maxRetries: DEFAULT_MAX_RETRIES,
    initialDelayMs: DEFAULT_INITIAL_RETRY_DELAY,
    maxDelayMs: DEFAULT_MAX_RETRY_DELAY
  },
  defaultModel: DEFAULT_MODEL,
  defaultTemperature: DEFAULT_TEMPERATURE,
  defaultTopP: DEFAULT_TOP_P,
  defaultTopK: DEFAULT_TOP_K
};

/**
 * Ollama AI client for interacting with local Ollama server
 */
export class OllamaClient {
  private config: OllamaClientConfig;
  private baseUrl: string;

  /**
   * Create a new Ollama client
   */
  constructor(config: Partial<OllamaClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = this.config.apiBaseUrl;
    
    logger.debug('Ollama client created with config', { 
      baseUrl: this.baseUrl,
      defaultModel: this.config.defaultModel
    });
  }
  
  /**
   * Format API request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT
    };
  }
  
  /**
   * Send a completion request to Ollama
   */
  async complete(
    prompt: string | OllamaMessage[],
    options: OllamaCompletionOptions = {}
  ): Promise<OllamaCompletionResponse> {
    logger.debug('Sending completion request', { model: options.model || this.config.defaultModel });
    
    // Format the request
    const messages: OllamaMessage[] = Array.isArray(prompt) 
      ? prompt 
      : [{ role: 'user', content: prompt }];
    
    const request: OllamaCompletionRequest = {
      model: options.model || this.config.defaultModel,
      messages,
      temperature: options.temperature ?? this.config.defaultTemperature,
      top_p: options.topP ?? this.config.defaultTopP,
      top_k: options.topK ?? this.config.defaultTopK,
      stream: false
    };
    
    // Add optional parameters
    if (options.repeatPenalty !== undefined) request.repeat_penalty = options.repeatPenalty;
    if (options.stopSequences) request.stop = options.stopSequences;
    if (options.system) request.system = options.system;
    if (options.context) request.context = options.context;
    if (options.format) request.format = options.format;
    
    // Make the API request with timeout and retry
    try {
      const sendRequestWithPath = async (path: string, requestOptions: RequestInit) => {
        return this.sendRequest(path, requestOptions);
      };
      
      const timeoutFn = withTimeout(sendRequestWithPath, this.config.timeout);
      
      const retryFn = withRetry(timeoutFn, {
        maxRetries: this.config.retryOptions.maxRetries,
        initialDelayMs: this.config.retryOptions.initialDelayMs,
        maxDelayMs: this.config.retryOptions.maxDelayMs
      });
      
      const response = await retryFn('/api/chat', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      });
      
      return response;
    } catch (error) {
      logger.error('Completion request failed', error);
      
      throw createUserError('Failed to get response from Ollama', {
        cause: error,
        category: ErrorCategory.AI_SERVICE,
        resolution: 'Check that Ollama is running and the model is available. Try running "ollama serve" to start the server.'
      });
    }
  }
  
  /**
   * Send a streaming completion request to Ollama
   */
  async completeStream(
    prompt: string | OllamaMessage[],
    options: OllamaCompletionOptions = {},
    onEvent: (event: OllamaStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    logger.debug('Sending streaming completion request', { model: options.model || this.config.defaultModel });
    
    // Format the request
    const messages: OllamaMessage[] = Array.isArray(prompt) 
      ? prompt 
      : [{ role: 'user', content: prompt }];
    
    const request: OllamaCompletionRequest = {
      model: options.model || this.config.defaultModel,
      messages,
      temperature: options.temperature ?? this.config.defaultTemperature,
      top_p: options.topP ?? this.config.defaultTopP,
      top_k: options.topK ?? this.config.defaultTopK,
      stream: true
    };
    
    // Add optional parameters
    if (options.repeatPenalty !== undefined) request.repeat_penalty = options.repeatPenalty;
    if (options.stopSequences) request.stop = options.stopSequences;
    if (options.system) request.system = options.system;
    if (options.context) request.context = options.context;
    if (options.format) request.format = options.format;
    
    // Make the API request
    try {
      await this.sendStreamRequest('/api/chat', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: abortSignal
      }, onEvent, abortSignal);
    } catch (error) {
      logger.error('Streaming completion request failed', error);

      if (error instanceof Error && error.name === 'AbortError') {
        throw createUserError('Streaming request was cancelled', {
          category: ErrorCategory.TIMEOUT,
          resolution: 'Request was aborted by user or system.'
        });
      }

      throw createUserError('Failed to get streaming response from Ollama', {
        cause: error,
        category: ErrorCategory.AI_SERVICE,
        resolution: 'Check that Ollama is running and the model is available. Try running "ollama serve" to start the server.'
      });
    }
  }
  
  /**
   * Send a streaming completion request with tool calling support
   */
  async completeStreamWithTools(
    prompt: string | OllamaMessage[],
    tools: OllamaTool[],
    options: OllamaCompletionOptions = {},
    callbacks: {
      onContent?: (chunk: string) => void;
      onToolCall?: (toolCall: OllamaToolCall) => Promise<any>;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
    logger.debug('Sending streaming completion request with tools', {
      model: options.model || this.config.defaultModel,
      toolCount: tools.length
    });

    // Format the request
    const messages: OllamaMessage[] = Array.isArray(prompt)
      ? prompt
      : [{ role: 'user', content: prompt }];

    const request: OllamaCompletionRequest = {
      model: options.model || this.config.defaultModel,
      messages,
      temperature: options.temperature ?? this.config.defaultTemperature,
      top_p: options.topP ?? this.config.defaultTopP,
      top_k: options.topK ?? this.config.defaultTopK,
      stream: true,
      tools: tools.length > 0 ? tools : undefined
    };

    // Add optional parameters
    if (options.repeatPenalty !== undefined) request.repeat_penalty = options.repeatPenalty;
    if (options.stopSequences) request.stop = options.stopSequences;
    if (options.system) request.system = options.system;
    if (options.context) request.context = options.context;
    if (options.format) request.format = options.format;

    // Log request details at debug level only
    logger.debug('Sending request to Ollama', {
      model: request.model,
      messageCount: request.messages.length,
      toolCount: request.tools?.length || 0
    });

    // Track tool calls for this request
    const pendingToolCalls = new Map<string, OllamaToolCall>();

    try {
      await this.sendStreamRequest('/api/chat', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: abortSignal
      }, async (event: OllamaStreamEvent) => {
        try {
          // Handle content streaming
          if (event.message?.content && callbacks.onContent) {
            let content = event.message.content;

            // Filter out chat template tokens if present
            // Some models output these when confused - treat as empty content
            const templateTokenPattern = /<\|[^|]*\|>/g;
            if (templateTokenPattern.test(content)) {
              logger.warn('Model output contains template tokens - filtering them out', {
                original: content,
                done: event.done
              });
              content = content.replace(templateTokenPattern, '').trim();

              // If content is now empty after filtering, skip this chunk
              if (!content) {
                return;
              }
            }

            callbacks.onContent(content);
          }

          // Handle tool calls
          if (event.message?.tool_calls) {
            const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
            const toolNames = event.message.tool_calls.map((tc: any) => tc.function?.name || 'unknown');
            
            logger.debug('Tool calls detected in stream event', {
              toolCallCount: event.message.tool_calls.length,
              toolNames
            });
            
            // CRITICAL DEBUG: In E2E mode, always log when tool calls are detected at API level
            if (e2eMode) {
              // Use console.error to ensure it goes to stderr and is captured by tests
              console.error(`[DEBUG E2E] API level: Tool calls detected: ${toolNames.join(', ')}\n`);
            }
            
            for (const toolCall of event.message.tool_calls) {
              const callId = toolCall.id || `${toolCall.function.name}-${Date.now()}`;

              // Check if this is a new or updated tool call
              if (!pendingToolCalls.has(callId)) {
                pendingToolCalls.set(callId, toolCall);

                // Execute tool call if callback provided
                if (callbacks.onToolCall) {
                  try {
                    const result = await callbacks.onToolCall(toolCall);
                    logger.debug('Tool call executed', {
                      toolName: toolCall.function.name,
                      success: true
                    });
                  } catch (toolError) {
                    logger.error('Tool execution failed', {
                      toolName: toolCall.function.name,
                      error: toolError
                    });
                    if (callbacks.onError) {
                      callbacks.onError(toolError as Error);
                    }
                  }
                }
              }
            }
          }
          
          // DEBUG: Log when stream completes with no tool calls but tools were available
          if (event.done && pendingToolCalls.size === 0 && request.tools && request.tools.length > 0) {
            logger.debug('Stream completed with no tool calls', {
              toolsAvailable: request.tools.length,
              toolNames: request.tools.map((t: any) => t.function?.name || 'unknown').slice(0, 5)
            });
          }

          // Handle completion
          if (event.done && callbacks.onComplete) {
            callbacks.onComplete();
          }
        } catch (eventError) {
          logger.error('Error processing stream event', eventError);
          if (callbacks.onError) {
            callbacks.onError(eventError as Error);
          }
        }
      }, abortSignal);

    } catch (error) {
      logger.error('Streaming completion with tools failed', error);

      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw createUserError('Streaming request was cancelled', {
          category: ErrorCategory.TIMEOUT,
          resolution: 'Request was aborted by user or system.'
        });
      }

      throw createUserError('Failed to get streaming response from Ollama', {
        cause: error,
        category: ErrorCategory.AI_SERVICE,
        resolution: 'Check that Ollama is running and the model is available. Try running "ollama serve" to start the server.'
      });
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    logger.debug('Listing available models');
    
    try {
      const response = await this.sendRequest('/api/tags', {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      return response.models || [];
    } catch (error) {
      logger.error('Failed to list models', error);
      
      throw createUserError('Failed to list available models', {
        cause: error,
        category: ErrorCategory.AI_SERVICE,
        resolution: 'Check that Ollama is running. Try running "ollama serve" to start the server.'
      });
    }
  }
  
  /**
   * Pull/download a model
   */
  async pullModel(modelName: string): Promise<void> {
    logger.debug(`Pulling model: ${modelName}`);
    
    try {
      await this.sendRequest('/api/pull', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name: modelName })
      });
      
      logger.info(`Successfully pulled model: ${modelName}`);
    } catch (error) {
      logger.error(`Failed to pull model: ${modelName}`, error);
      
      throw createUserError(`Failed to pull model: ${modelName}`, {
        cause: error,
        category: ErrorCategory.AI_SERVICE,
        resolution: 'Check your internet connection and that the model name is correct.'
      });
    }
  }
  
  /**
   * Test the connection to the Ollama server
   */
  async testConnection(): Promise<boolean> {
    logger.debug('Testing connection to Ollama server');
    
    try {
      // Try to list models as a connection test
      await this.listModels();
      
      logger.debug('Connection test successful');
      return true;
    } catch (error) {
      logger.debug('Connection test failed, attempting to start Ollama server', error);
      
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
  
  /**
   * Send a request to the Ollama API
   */
  private async sendRequest(path: string, options: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    
    logger.debug(`Sending request to ${url}`);
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw createUserError('Request timed out', {
          category: ErrorCategory.TIMEOUT,
          resolution: 'Try again or increase the timeout setting.'
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Send a streaming request to the Ollama API
   *
   * CRITICAL: Ensures reader lock is ALWAYS released, even on abort or error.
   * Resource leaks can occur if the reader lock is not properly released.
   */
  private async sendStreamRequest(
    path: string,
    options: RequestInit,
    onEvent: (event: OllamaStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;

    logger.debug(`Sending streaming request to ${url}`);

    // Track reader to ensure it's always released
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
      if (e2eMode) {
        console.error(`[DEBUG E2E] About to fetch: ${url}\n`);
      }
      
      const response = await fetch(url, options);

      if (e2eMode) {
        console.error(`[DEBUG E2E] Fetch completed - Status: ${response.status}, OK: ${response.ok}\n`);
      }

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      if (e2eMode) {
        console.error(`[DEBUG E2E] Response body exists, getting reader...\n`);
      }

      // Get reader - if this fails, it will be caught by outer try-catch
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      try {
        while (true) {
          // Check for abort signal BEFORE reading to avoid unnecessary I/O
          if (abortSignal?.aborted) {
            // Cancel the reader before releasing
            try {
              await reader.cancel('Stream aborted by user');
            } catch (cancelError) {
              logger.debug('Error canceling reader:', cancelError);
            }
            throw new Error('Stream aborted');
          }

          const { done, value } = await reader.read();
          
          if (e2eMode) {
            chunkCount++;
            console.error(`[DEBUG E2E] Read chunk #${chunkCount} - done: ${done}, value length: ${value?.length || 0}\n`);
          }

          if (done) {
            if (e2eMode) {
              console.error(`[DEBUG E2E] Stream done after ${chunkCount} chunks\n`);
            }
            break;
          }

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Prevent buffer from growing too large (memory leak protection)
          if (buffer.length > 1024 * 1024) { // 1MB limit
            logger.warn('Stream buffer too large, truncating at JSON boundaries');

            // Truncate at newline boundaries (JSON object boundaries) instead of arbitrary position
            const lines = buffer.split('\n');

            // Keep last 50% of lines to ensure we don't cut JSON objects
            const midPoint = Math.floor(lines.length / 2);
            buffer = lines.slice(midPoint).join('\n');

            logger.debug('Buffer truncated', {
              originalSize: buffer.length + lines.slice(0, midPoint).join('\n').length,
              newSize: buffer.length,
              linesRemoved: midPoint
            });
          }

          // Process any complete events in the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              continue;
            }

            try {
              const eventData = JSON.parse(trimmedLine);

              // DEBUG: Log streaming events to see what Ollama is responding with
              logger.debug('===== OLLAMA STREAM EVENT =====', {
                hasMessage: !!eventData.message,
                messageRole: eventData.message?.role,
                messageContent: eventData.message?.content ? `${eventData.message.content.substring(0, 50)}...` : '',
                hasToolCalls: !!eventData.message?.tool_calls,
                toolCallCount: eventData.message?.tool_calls?.length || 0,
                done: eventData.done,
                fullEvent: eventData
              });

              onEvent(eventData);

              // Break early if stream indicates completion
              if (eventData.done) {
                return;
              }
            } catch (error) {
              logger.error('Failed to parse stream event', { line: trimmedLine, error });
            }
          }
        }
      } finally {
        // Ensure reader is always released in inner try block
        if (reader) {
          try {
            reader.releaseLock();
          } catch (error) {
            logger.debug('Error releasing reader lock (may already be released)', error);
          }
        }
      }

      // Process any remaining data
      if (buffer.trim()) {
        try {
          const eventData = JSON.parse(buffer.trim());
          onEvent(eventData);
        } catch (error) {
          logger.error('Failed to parse final stream event', { buffer, error });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw createUserError('Streaming request timed out', {
          category: ErrorCategory.TIMEOUT,
          resolution: 'Try again or increase the timeout setting.'
        });
      }

      throw error;
    } finally {
      // CRITICAL: Outer finally block ensures reader is released even if
      // errors occur in the outer try block (e.g., response.body is null)
      if (reader) {
        try {
          reader.releaseLock();
        } catch (error) {
          // Ignore errors - reader may already be released
          logger.debug('Final attempt to release reader lock', error);
        }
      }
    }
  }
  
  /**
   * Handle error responses from the API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    let errorMessage = `API request failed with status ${response.status}`;
    
    try {
      // Try to parse the error response
      errorData = await response.json();
      
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If we can't parse the response, use the status text
      errorMessage = `API request failed: ${response.statusText || response.status}`;
    }
    
    logger.error('API error response', { status: response.status, errorData });
    
    // Handle specific error codes
    switch (response.status) {
      case 404:
        throw createUserError('Ollama server not found. Make sure Ollama is running.', {
          category: ErrorCategory.CONNECTION,
          resolution: 'Run "ollama serve" to start the Ollama server.'
        });
        
      case 500:
        throw createUserError('Ollama server encountered an error.', {
          category: ErrorCategory.SERVER,
          resolution: 'Check the Ollama server logs and try again.'
        });
        
      default:
        throw createUserError(errorMessage, {
          category: ErrorCategory.API,
          resolution: 'Check that Ollama is running and try again.'
        });
    }
  }
}