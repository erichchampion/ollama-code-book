// src/ai/providers/openai-provider.ts
import OpenAI from 'openai';
import { BaseAIProvider, ProviderConfig, CompletionOptions, AICompletionResponse } from './base-provider';

export interface OpenAIProviderConfig extends ProviderConfig {
  apiKey: string;
  organization?: string;
  defaultModel?: string;
}

// Pricing as of 2025 (per 1M tokens)
const PRICING = {
  'gpt-4': { prompt: 30.00, completion: 60.00 },
  'gpt-4-turbo': { prompt: 10.00, completion: 30.00 },
  'gpt-3.5-turbo': { prompt: 0.50, completion: 1.50 }
};

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.defaultModel = config.defaultModel || 'gpt-4-turbo';
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      timeout: config.timeout || 60000,
      maxRetries: config.retryAttempts || 2
    });
  }

  getName(): string {
    return 'openai';
  }

  async initialize(): Promise<void> {
    // Verify API key by listing models
    try {
      await this.client.models.list();
      logger.info('OpenAI provider initialized successfully');
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      }
      throw new Error(`Failed to initialize OpenAI provider: ${error}`);
    }
  }

  async complete(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stopSequences
      });

      const choice = response.choices[0];
      const usage = response.usage!;

      const responseTime = Date.now() - startTime;
      const tokensUsed = usage.total_tokens;
      const cost = this.calculateCost(
        usage.prompt_tokens,
        usage.completion_tokens,
        model
      );

      this.updateMetrics(true, responseTime, tokensUsed, cost);

      return {
        content: choice.message.content || '',
        model: response.model,
        tokensUsed: {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens
        },
        finishReason: choice.finish_reason as any,
        metadata: {
          id: response.id,
          created: response.created,
          systemFingerprint: response.system_fingerprint
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, 0, 0);

      // Handle specific OpenAI errors
      if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error');
      }

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
      const stream = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stopSequences,
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          onEvent({
            type: 'content',
            content: delta.content
          });
        }

        if (chunk.choices[0]?.finish_reason) {
          onEvent({
            type: 'done',
            metadata: {
              finishReason: chunk.choices[0].finish_reason
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
    const response = await this.client.models.list();

    return response.data
      .filter(model => model.id.startsWith('gpt'))
      .map(model => ({
        id: model.id,
        name: model.id,
        provider: 'openai',
        contextWindow: this.getContextWindow(model.id),
        capabilities: {
          completion: true,
          streaming: true,
          toolCalling: true,
          vision: model.id.includes('vision')
        }
      }));
  }

  calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string = this.defaultModel
  ): number {
    const pricing = PRICING[model] || PRICING['gpt-4-turbo'];

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  private getContextWindow(model: string): number {
    if (model.includes('gpt-4-turbo')) return 128000;
    if (model.includes('gpt-4')) return 8192;
    if (model.includes('gpt-3.5-turbo')) return 16385;
    return 4096;
  }
}