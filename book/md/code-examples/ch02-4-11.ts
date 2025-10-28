// src/ai/providers/ollama-provider.ts
import { Ollama } from 'ollama';
import { BaseAIProvider, ProviderConfig, CompletionOptions, AICompletionResponse } from './base-provider';

export interface OllamaProviderConfig extends ProviderConfig {
  host: string;  // e.g., 'http://localhost:11434'
  defaultModel?: string;
}

export class OllamaProvider extends BaseAIProvider {
  private client: Ollama;
  private defaultModel: string;

  constructor(config: OllamaProviderConfig) {
    super(config);
    this.defaultModel = config.defaultModel || 'qwen2.5-coder:latest';
    this.client = new Ollama({ host: config.host });
  }

  getName(): string {
    return 'ollama';
  }

  async initialize(): Promise<void> {
    // Verify Ollama is running and accessible
    try {
      await this.client.list();
      logger.info('Ollama provider initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Ollama provider: ${error}`);
    }
  }

  async complete(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    try {
      const response = await this.client.chat({
        model,
        messages: [{ role: 'user', content: prompt }],
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          top_p: options.topP,
          stop: options.stopSequences
        }
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = response.eval_count || 0;
      const cost = this.calculateCost(0, tokensUsed, model);  // Ollama is free

      this.updateMetrics(true, responseTime, tokensUsed, cost);

      return {
        content: response.message.content,
        model: response.model,
        tokensUsed: {
          prompt: response.prompt_eval_count || 0,
          completion: response.eval_count || 0,
          total: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        },
        finishReason: 'stop',
        metadata: {
          totalDuration: response.total_duration,
          loadDuration: response.load_duration
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, 0, 0);
      throw error;
    }
  }

  async completeStream(
    prompt: string,
    options: CompletionOptions,
    onEvent: StreamCallback
  ): Promise<void> {
    const model = options.model || this.defaultModel;

    try {
      const stream = await this.client.chat({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          top_p: options.topP,
          stop: options.stopSequences
        }
      });

      for await (const chunk of stream) {
        if (chunk.message.content) {
          onEvent({
            type: 'content',
            content: chunk.message.content
          });
        }

        if (chunk.done) {
          onEvent({
            type: 'done',
            metadata: {
              totalDuration: chunk.total_duration,
              evalCount: chunk.eval_count
            }
          });
        }
      }
    } catch (error) {
      onEvent({
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  async listModels(): Promise<AIModel[]> {
    const response = await this.client.list();

    return response.models.map(model => ({
      id: model.name,
      name: model.name,
      provider: 'ollama',
      contextWindow: 8192,  // Default, varies by model
      capabilities: {
        completion: true,
        streaming: true,
        toolCalling: true,
        vision: model.name.includes('vision')
      }
    }));
  }

  calculateCost(
    promptTokens: number,
    completionTokens: number,
    model?: string
  ): number {
    // Ollama is free!
    return 0;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}