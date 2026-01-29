/**
 * llama.cpp HTTP Client
 *
 * HTTP client for llama-server's OpenAI-compatible API.
 */

import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import {
  DEFAULT_LLAMACPP_URL,
  SERVER_HEALTH_TIMEOUT,
  AI_COMPLETION_TIMEOUT
} from '../constants.js';

/**
 * Message format for llama.cpp chat completions
 */
export interface LlamaCppMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Completion options for llama.cpp
 */
export interface LlamaCppCompletionOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
}

/**
 * Model information from llama-server
 */
export interface LlamaCppModel {
  id: string;
  object: string;
  owned_by: string;
  created?: number;
}

/**
 * Completion response from llama-server
 */
export interface LlamaCppCompletionResponse {
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

/**
 * Stream event from llama-server
 */
export interface LlamaCppStreamEvent {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string | null;
  }>;
}

/**
 * Health status from llama-server
 */
export interface LlamaCppHealthStatus {
  status: 'ok' | 'loading' | 'error';
  model?: string;
  slots_idle?: number;
  slots_processing?: number;
}

/**
 * Client configuration
 */
export interface LlamaCppClientConfig {
  baseUrl?: string;
  timeout?: number;
}

/**
 * HTTP Client for llama-server
 */
export class LlamaCppClient {
  private baseUrl: string;
  private timeout: number;
  private userAgent: string = 'ollama-code/1.0';

  constructor(config: LlamaCppClientConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_LLAMACPP_URL;
    this.timeout = config.timeout || AI_COMPLETION_TIMEOUT;
  }

  /**
   * Perform a health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT)
      });

      return response.ok;
    } catch (error) {
      logger.debug('llama-server health check failed', { error: normalizeError(error).message });
      return false;
    }
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<LlamaCppHealthStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.debug('Failed to get health status', { error: normalizeError(error).message });
      return null;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<LlamaCppModel[]> {
    logger.debug('Listing llama.cpp models');

    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.error('Failed to list llama.cpp models', error);
      throw error;
    }
  }

  /**
   * Complete a chat request
   */
  async complete(
    messages: LlamaCppMessage[],
    options: LlamaCppCompletionOptions = {}
  ): Promise<LlamaCppCompletionResponse> {
    logger.debug('Sending completion request to llama-server', {
      messageCount: messages.length,
      options: { ...options, stream: false }
    });

    try {
      const requestBody = {
        messages,
        ...options,
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(options.max_tokens ? this.timeout * 2 : this.timeout)
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      logger.error('llama-server completion request failed', error);
      throw error;
    }
  }

  /**
   * Stream a chat completion
   */
  async completeStream(
    messages: LlamaCppMessage[],
    options: LlamaCppCompletionOptions,
    onEvent: (event: LlamaCppStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    logger.debug('Sending streaming completion request to llama-server', {
      messageCount: messages.length,
      options: { ...options, stream: true }
    });

    try {
      const requestBody = {
        messages,
        ...options,
        stream: true
      };

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: abortSignal
      });

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

          if (abortSignal?.aborted) {
            throw new Error('Stream aborted');
          }

          buffer += decoder.decode(value, { stream: true });

          // Prevent buffer from growing too large
          if (buffer.length > 1024 * 1024) {
            logger.warn('llama-server stream buffer too large, truncating');
            buffer = buffer.slice(-512 * 1024);
          }

          // Process SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();

            if (!trimmedLine || trimmedLine === 'data: [DONE]') {
              if (trimmedLine === 'data: [DONE]') {
                return;
              }
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const eventData: LlamaCppStreamEvent = JSON.parse(jsonStr);
                onEvent(eventData);

                // Check for completion
                if (eventData.choices?.[0]?.finish_reason) {
                  return;
                }
              } catch (parseError) {
                logger.debug('Failed to parse stream event', { line: trimmedLine, error: parseError });
              }
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (error) {
          logger.debug('Error releasing reader lock', error);
        }
      }

      // Process remaining buffer
      if (buffer.trim() && buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
        try {
          const jsonStr = buffer.trim().slice(6);
          const eventData: LlamaCppStreamEvent = JSON.parse(jsonStr);
          onEvent(eventData);
        } catch (error) {
          logger.debug('Failed to parse final stream event', { buffer, error });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('llama-server streaming request was cancelled');
      }
      logger.error('llama-server streaming request failed', error);
      throw error;
    }
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
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `llama-server request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      errorMessage = `llama-server request failed: ${response.statusText || response.status}`;
    }

    logger.error('llama-server error response', { status: response.status, message: errorMessage });
    throw new Error(errorMessage);
  }
}
