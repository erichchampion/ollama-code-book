// src/ai/providers/google-provider.ts
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseAIProvider, ProviderConfig, CompletionOptions, AICompletionResponse } from './base-provider';

export interface GoogleProviderConfig extends ProviderConfig {
  apiKey: string;
  defaultModel?: string;
}

// Pricing as of 2025 (per 1M tokens)
const GOOGLE_PRICING = {
  'gemini-pro': { prompt: 0.50, completion: 1.50 },
  'gemini-pro-vision': { prompt: 0.50, completion: 1.50 },
  'gemini-ultra': { prompt: 2.00, completion: 6.00 }
};

export class GoogleProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(config: GoogleProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }

    this.defaultModel = config.defaultModel || 'gemini-pro';
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  getName(): string {
    return 'google';
  }

  async initialize(): Promise<void> {
    try {
      const model = this.client.getGenerativeModel({ model: this.defaultModel });
      await model.generateContent('test');
      logger.info('Google provider initialized successfully');
    } catch (error) {
      if (error.message?.includes('API key')) {
        throw new Error('Invalid Google API key');
      }
      throw new Error(`Failed to initialize Google provider: ${error}`);
    }
  }

  async complete(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const modelName = options.model || this.defaultModel;

    try {
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          stopSequences: options.stopSequences
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;

      // Google doesn't always provide token counts
      const promptTokens = response.usageMetadata?.promptTokenCount || 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const tokensUsed = promptTokens + completionTokens;

      const cost = this.calculateCost(promptTokens, completionTokens, modelName);

      this.updateMetrics(true, responseTime, tokensUsed, cost);

      return {
        content: text,
        model: modelName,
        tokensUsed: {
          prompt: promptTokens,
          completion: completionTokens,
          total: tokensUsed
        },
        finishReason: 'stop',
        metadata: {
          safetyRatings: response.candidates?.[0]?.safetyRatings
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
    const modelName = options.model || this.defaultModel;

    try {
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          stopSequences: options.stopSequences
        }
      });

      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          onEvent({
            type: 'content',
            content: text
          });
        }
      }

      onEvent({ type: 'done' });
    } catch (error) {
      onEvent({
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'google',
        contextWindow: 32768,
        capabilities: {
          completion: true,
          streaming: true,
          toolCalling: true,
          vision: false
        }
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        provider: 'google',
        contextWindow: 16384,
        capabilities: {
          completion: true,
          streaming: true,
          toolCalling: false,
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
    const pricing = GOOGLE_PRICING[model] || GOOGLE_PRICING['gemini-pro'];

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

  async testConnection(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: this.defaultModel });
      await model.generateContent('test');
      return true;
    } catch (error) {
      return false;
    }
  }
}