// src/client.ts
import axios, { AxiosInstance } from 'axios';

export interface AIClientConfig {
  apiUrl: string;
  model: string;
  maxTokens: number;
  timeout?: number;
}

export interface CompletionRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface CompletionResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class AIClient {
  private config: AIClientConfig;
  private httpClient: AxiosInstance;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: AIClientConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  updateConfig(config: Partial<AIClientConfig>): void {
    this.config = { ...this.config, ...config };
    this.httpClient.defaults.baseURL = this.config.apiUrl;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const requestId = this.generateRequestId();
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    try {
      const response = await this.httpClient.post(
        '/api/generate',
        {
          model: this.config.model,
          prompt: this.buildPrompt(request),
          options: {
            num_predict: request.maxTokens || this.config.maxTokens,
            temperature: request.temperature || 0.7,
            stop: request.stopSequences
          },
          stream: false
        },
        {
          signal: abortController.signal
        }
      );

      return {
        content: response.data.response,
        usage: {
          inputTokens: response.data.prompt_eval_count || 0,
          outputTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) +
                      (response.data.eval_count || 0)
        }
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new Error('Request was cancelled');
      }
      throw new Error(`AI completion failed: ${error.message}`);
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  async *streamComplete(
    request: CompletionRequest
  ): AsyncGenerator<string, void, unknown> {
    const requestId = this.generateRequestId();
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    try {
      const response = await this.httpClient.post(
        '/api/generate',
        {
          model: this.config.model,
          prompt: this.buildPrompt(request),
          options: {
            num_predict: request.maxTokens || this.config.maxTokens,
            temperature: request.temperature || 0.7
          },
          stream: true
        },
        {
          signal: abortController.signal,
          responseType: 'stream'
        }
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
              if (data.done) {
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  cancel(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  cancelAll(): void {
    for (const [id, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  dispose(): void {
    this.cancelAll();
  }

  private buildPrompt(request: CompletionRequest): string {
    let prompt = '';

    if (request.context) {
      prompt += `Context:\n${request.context}\n\n`;
    }

    prompt += request.prompt;

    return prompt;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}