/**
 * Base AI Provider Interface
 *
 * Defines the unified interface for all AI providers (Ollama, OpenAI, Anthropic, Google)
 * with standardized capabilities, error handling, and performance monitoring.
 */

import { EventEmitter } from 'events';
import { normalizeError } from '../../utils/error-utils.js';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stopSequences?: string[];
  stream?: boolean;
  system?: string;
  context?: any;
  format?: string;
  timeout?: number;
  tools?: any[]; // Tool definitions (provider-specific format)
  toolChoice?: any; // Tool choice strategy (provider-specific format)
}

export interface AICompletionResponse {
  content: string;
  toolCalls?: Array<{ id: string; name: string; input: any }>;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    requestId: string;
    processingTime: number;
    provider: string;
    cached?: boolean;
    retryCount?: number;
  };
}

export interface AIStreamEvent {
  content: string;
  done: boolean;
  delta?: string;
  toolCalls?: Array<{ id: string; name: string; input: any }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: AICapability[];
  contextWindow: number;
  costPerToken: {
    input: number;
    output: number;
  };
  averageResponseTime: number;
  qualityScore: number;
  lastUpdated: Date;
}

export enum AICapability {
  TEXT_COMPLETION = 'text_completion',
  CHAT = 'chat',
  CODE_GENERATION = 'code_generation',
  CODE_ANALYSIS = 'code_analysis',
  FUNCTION_CALLING = 'function_calling',
  STREAMING = 'streaming',
  EMBEDDINGS = 'embeddings',
  IMAGE_ANALYSIS = 'image_analysis',
  DOCUMENT_ANALYSIS = 'document_analysis',
  REASONING = 'reasoning',
  MATH = 'math',
  TRANSLATION = 'translation'
}

export interface ProviderCapabilities {
  maxContextWindow: number;
  supportedCapabilities: AICapability[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  features: {
    streaming: boolean;
    functionCalling: boolean;
    imageInput: boolean;
    documentInput: boolean;
    customInstructions: boolean;
  };
}

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryOptions?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  caching?: {
    enabled: boolean;
    ttlMs: number;
  };
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  availability: number;
  details: {
    endpoint: string;
    lastError?: string;
    consecutiveFailures: number;
    lastSuccessfulRequest?: Date;
  };
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  cacheHitRate: number;
  lastRequestTime?: Date;
  uptime: number;
}

/**
 * Abstract base class for all AI providers
 */
export abstract class BaseAIProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected health: ProviderHealth;
  protected metrics: ProviderMetrics;
  protected isInitialized: boolean = false;

  constructor(config: ProviderConfig) {
    super();
    this.config = config;
    this.health = this.initializeHealth();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Get provider name
   */
  abstract getName(): string;

  /**
   * Get provider display name
   */
  getDisplayName(): string {
    return this.getName();
  }

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Initialize the provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Test connection to the provider
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Complete text/chat request
   */
  abstract complete(
    prompt: string | AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse>;

  /**
   * Stream completion request
   */
  abstract completeStream(
    prompt: string | AIMessage[],
    options: AICompletionOptions,
    onEvent: (event: AIStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void>;

  /**
   * List available models
   */
  abstract listModels(): Promise<AIModel[]>;

  /**
   * Get specific model information
   */
  abstract getModel(modelId: string): Promise<AIModel | null>;

  /**
   * Calculate cost for a request
   */
  abstract calculateCost(promptTokens: number, completionTokens: number, model?: string): number;

  /**
   * Get provider health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if provider supports a capability
   */
  supportsCapability(capability: AICapability): boolean {
    return this.getCapabilities().supportedCapabilities.includes(capability);
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Cleanup provider resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.isInitialized = false;
  }

  /**
   * Check if provider is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.health.status !== 'unhealthy';
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.testConnection();
      const responseTime = Date.now() - startTime;

      this.health.status = isHealthy ? 'healthy' : 'unhealthy';
      this.health.lastCheck = new Date();
      this.health.responseTime = responseTime;
      this.health.details.consecutiveFailures = isHealthy ? 0 : this.health.details.consecutiveFailures + 1;

      if (isHealthy) {
        this.health.details.lastSuccessfulRequest = new Date();
      }

      this.emit('healthUpdated', this.health);
    } catch (error) {
      this.health.status = 'unhealthy';
      this.health.lastCheck = new Date();
      this.health.details.lastError = normalizeError(error).message;
      this.health.details.consecutiveFailures += 1;

      this.emit('healthUpdated', this.health);
      this.emit('error', error);
    }
  }

  /**
   * Update metrics after a request
   */
  protected updateMetrics(success: boolean, responseTime: number, tokensUsed: number = 0, cost: number = 0): void {
    this.metrics.totalRequests += 1;

    if (success) {
      this.metrics.successfulRequests += 1;
    } else {
      this.metrics.failedRequests += 1;
    }

    // Update average response time using exponential moving average
    if (this.metrics.totalRequests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      const alpha = 0.1; // Smoothing factor
      this.metrics.averageResponseTime = alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
    }

    this.metrics.totalTokensUsed += tokensUsed;
    this.metrics.totalCost += cost;
    this.metrics.lastRequestTime = new Date();

    // Calculate error rate
    this.metrics.uptime = this.metrics.totalRequests > 0
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
      : 0;

    this.emit('metricsUpdated', this.metrics);
  }

  /**
   * Initialize health status
   */
  private initializeHealth(): ProviderHealth {
    return {
      status: 'unhealthy',
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      availability: 0,
      details: {
        endpoint: this.config.baseUrl || 'unknown',
        consecutiveFailures: 0
      }
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ProviderMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      cacheHitRate: 0,
      uptime: 0
    };
  }
}

/**
 * Provider error types
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for provider ${provider}`, provider, 'RATE_LIMIT', true);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderConnectionError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super(`Connection failed for provider ${provider}: ${cause?.message || 'Unknown error'}`, provider, 'CONNECTION_ERROR', true);
    this.name = 'ProviderConnectionError';
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(provider: string) {
    super(`Authentication failed for provider ${provider}`, provider, 'AUTH_ERROR', false);
    this.name = 'ProviderAuthenticationError';
  }
}