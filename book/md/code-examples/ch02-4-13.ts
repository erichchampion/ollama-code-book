// src/ai/providers/anthropic-provider.ts
import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, ProviderConfig, CompletionOptions, AICompletionResponse } from './base-provider';

export interface AnthropicProviderConfig extends ProviderConfig {
  apiKey: string;
  defaultModel?: string;
}

// Pricing as of 2025 (per 1M tokens)
const ANTHROPIC_PRICING = {
  'claude-3-5-sonnet-20241022': { prompt: 3.00, completion: 15.00 },
  'claude-3-opus-20240229': { prompt: 15.00, completion: 75.00 },
  'claude-3-sonnet-20240229': { prompt: 3.00, completion: 15.00 },
  'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 }
};

export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AnthropicProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
      maxRetries: config.retryAttempts || 2
    });
  }

  getName(): string {
    return 'anthropic';
  }

  async initialize(): Promise<void> {
    // Anthropic doesn't have a "list models" endpoint, so we test with a minimal request
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      });
      logger.info('Anthropic provider initialized successfully');
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key');
      }
      throw new Error(`Failed to initialize Anthropic provider: ${error}`);
    }
  }

  async complete(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stopSequences
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      const responseTime = Date.now() - startTime;
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      const cost = this.calculateCost(
        response.usage.input_tokens,
        response.usage.output_tokens,
        model
      );

      this.updateMetrics(true, responseTime, tokensUsed, cost);

      return {
        content: textContent,
        model: response.model,
        tokensUsed: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
          total: tokensUsed
        },
        finishReason: response.stop_reason as any,
        metadata: {
          id: response.id,
          type: response.type
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, 0, 0);

      // Handle Anthropic-specific errors
      if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (error.status === 529) {
        throw new Error('Anthropic service overloaded');
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
      const stream = await this.client.messages.stream({
        model,
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stopSequences
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            onEvent({
              type: 'content',
              content: event.delta.text
            });
          }
        } else if (event.type === 'message_stop') {
          onEvent({
            type: 'done',
            metadata: {
              stopReason: stream.finalMessage?.stop_reason
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
    // Anthropic doesn't provide a models API, return known models
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        capabilities: {
          completion: true,
          streaming: true,
          toolCalling: true,
          vision: true
        }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextWindow: 200000,
        capabilities: {
          completion: true,
          streaming: true,
          toolCalling: true,
          vision: true
        }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        capabilities: {
          completion: true,
          streaming: true,
          toolCalling: true,
          vision: true
        }
      }
    ];
  }

  calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string = this.defaultModel
  ): number {
    const pricing = ANTHROPIC_PRICING[model] || ANTHROPIC_PRICING['claude-3-5-sonnet-20241022'];

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}