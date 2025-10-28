// src/ai/providers/base-provider.ts
import { EventEmitter } from 'events';

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  customHeaders?: Record<string, string>;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime: number;
  errorRate: number;
  message?: string;
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  lastRequestTime?: Date;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  model?: string;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  metadata?: Record<string, any>;
}

export type StreamCallback = (event: AIStreamEvent) => void;

export interface AIStreamEvent {
  type: 'content' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Abstract base class for AI providers
 *
 * All providers must extend this class and implement the abstract methods.
 * Provides common functionality like health checks and metrics tracking.
 */
export abstract class BaseAIProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected health: ProviderHealth;
  protected metrics: ProviderMetrics;

  constructor(config: ProviderConfig) {
    super();
    this.config = config;

    // Initialize health status
    this.health = {
      status: 'healthy',
      lastCheck: new Date(),
      consecutiveFailures: 0,
      responseTime: 0,
      errorRate: 0
    };

    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0
    };
  }

  // ============================================================
  // Abstract Methods - Must be implemented by all providers
  // ============================================================

  /**
   * Get the provider's unique name
   */
  abstract getName(): string;

  /**
   * Initialize the provider (setup API clients, validate config, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Complete a prompt (non-streaming)
   */
  abstract complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<AICompletionResponse>;

  /**
   * Complete a prompt with streaming responses
   */
  abstract completeStream(
    prompt: string,
    options: CompletionOptions,
    onEvent: StreamCallback
  ): Promise<void>;

  /**
   * List available models for this provider
   */
  abstract listModels(): Promise<AIModel[]>;

  /**
   * Calculate cost for a request based on token usage
   */
  abstract calculateCost(
    promptTokens: number,
    completionTokens: number,
    model?: string
  ): number;

  /**
   * Test connection to the provider
   */
  abstract testConnection(): Promise<boolean>;

  // ============================================================
  // Shared Functionality - Available to all providers
  // ============================================================

  /**
   * Perform a health check on the provider
   */
  async performHealthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.testConnection();
      const responseTime = Date.now() - startTime;

      this.health = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        consecutiveFailures: isHealthy ? 0 : this.health.consecutiveFailures + 1,
        responseTime,
        errorRate: this.calculateErrorRate()
      };

      // Emit health status change
      this.emit('health_check', this.health);

      return this.health;
    } catch (error) {
      this.health = {
        status: 'unhealthy',
        lastCheck: new Date(),
        consecutiveFailures: this.health.consecutiveFailures + 1,
        responseTime: Date.now() - startTime,
        errorRate: this.calculateErrorRate(),
        message: error instanceof Error ? error.message : 'Unknown error'
      };

      this.emit('health_check_failed', this.health);

      return this.health;
    }
  }

  /**
   * Get current health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Update metrics after a request
   */
  protected updateMetrics(
    success: boolean,
    responseTime: number,
    tokensUsed: number,
    cost: number
  ): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time (running average)
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
      this.metrics.totalRequests;

    this.metrics.totalTokensUsed += tokensUsed;
    this.metrics.totalCost += cost;
    this.metrics.lastRequestTime = new Date();

    // Emit metrics update
    this.emit('metrics_updated', this.metrics);
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.failedRequests / this.metrics.totalRequests;
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0
    };

    this.emit('metrics_reset');
  }

  /**
   * Get provider configuration (without sensitive data)
   */
  getConfig(): Omit<ProviderConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }
}