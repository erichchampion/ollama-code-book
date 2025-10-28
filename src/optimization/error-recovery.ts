/**
 * Enhanced Error Handling and Recovery System
 *
 * Provides graceful degradation and intelligent error recovery:
 * - Automatic retry mechanisms with exponential backoff
 * - Fallback strategies for different error types
 * - User-friendly error messages with suggestions
 * - Context-aware error handling
 */

import { logger } from '../utils/logger.js';
import { UserError, ErrorCategory } from '../errors/types.js';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface FallbackStrategy {
  errorType: string;
  fallback: () => Promise<any>;
  description: string;
}

interface ErrorContext {
  command: string;
  args: any[];
  timestamp: number;
  attempt: number;
  userAgent?: string;
  sessionId?: string;
}

export class ErrorRecoveryManager {
  private fallbackStrategies = new Map<string, FallbackStrategy>();
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  constructor() {
    this.registerDefaultFallbacks();
  }

  /**
   * Execute operation with automatic retry and recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customRetryConfig };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        context.attempt = attempt;

        logger.debug(`Attempt ${attempt} failed:`, error);

        // Try recovery strategies
        const recovered = await this.attemptRecovery(error as Error, context);
        if (recovered) {
          return recovered;
        }

        // If not last attempt, wait before retry
        if (attempt < config.maxAttempts) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
            config.maxDelay
          );

          logger.debug(`Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxAttempts})`);
          await this.delay(delay);
        }
      }
    }

    // All attempts failed, try final fallback
    const fallbackResult = await this.tryFinalFallback(lastError!, context);
    if (fallbackResult) {
      return fallbackResult;
    }

    // Convert to user-friendly error
    throw this.createUserFriendlyError(lastError!, context);
  }

  /**
   * Register a fallback strategy for specific error types
   */
  registerFallback(errorType: string, fallback: () => Promise<any>, description: string): void {
    this.fallbackStrategies.set(errorType, {
      errorType,
      fallback,
      description
    });

    logger.debug(`Registered fallback for ${errorType}: ${description}`);
  }

  /**
   * Handle AI-specific errors with intelligent fallbacks
   */
  async handleAIError(error: Error, context: ErrorContext): Promise<any> {
    const errorMessage = error.message.toLowerCase();

    // Connection errors
    if (errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
      return this.handleConnectionError(error, context);
    }

    // Model not found errors
    if (errorMessage.includes('model') && errorMessage.includes('not found')) {
      return this.handleModelError(error, context);
    }

    // Context window errors
    if (errorMessage.includes('context') || errorMessage.includes('token limit')) {
      return this.handleContextError(error, context);
    }

    // Timeout errors
    if (errorMessage.includes('timeout')) {
      return this.handleTimeoutError(error, context);
    }

    return null;
  }

  /**
   * Create user-friendly error messages
   */
  createUserFriendlyError(error: Error, context: ErrorContext): UserError {
    const errorMessage = error.message.toLowerCase();

    // AI connection errors
    if (errorMessage.includes('econnrefused') || errorMessage.includes('ollama')) {
      return new UserError(
        'Cannot connect to Ollama AI service',
        {
          category: ErrorCategory.CONNECTION,
          resolution: [
            'Make sure Ollama is running: ollama serve',
            'Check if Ollama is installed: ollama --version',
            'Verify Ollama is accessible: curl http://localhost:11434/api/tags'
          ].join('\n'),
          context: { command: context.command }
        }
      );
    }

    // File system errors
    if (errorMessage.includes('enoent') || errorMessage.includes('no such file')) {
      return new UserError(
        'File or directory not found',
        {
          category: ErrorCategory.VALIDATION,
          resolution: [
            'Check the file path is correct',
            'Ensure you have read permissions',
            'Try using an absolute path'
          ].join('\n'),
          context: { command: context.command }
        }
      );
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('eacces')) {
      return new UserError(
        'Permission denied',
        {
          category: ErrorCategory.SYSTEM,
          resolution: [
            'Check file permissions',
            'Try running with appropriate permissions',
            'Ensure you own the file/directory'
          ].join('\n'),
          context: { command: context.command }
        }
      );
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return new UserError(
        'Network or timeout error',
        {
          category: ErrorCategory.CONNECTION,
          resolution: [
            'Check your internet connection',
            'Try again in a moment',
            'Consider using a different model'
          ].join('\n'),
          context: { command: context.command }
        }
      );
    }

    // Default fallback
    return new UserError(
      'An unexpected error occurred',
      {
        category: ErrorCategory.SYSTEM,
        resolution: [
          'Try running the command again',
          'Check the command syntax',
          'Report this issue if it persists'
        ].join('\n'),
        context: { command: context.command, originalError: error.message }
      }
    );
  }

  /**
   * Attempt to recover from specific error
   */
  private async attemptRecovery(error: Error, context: ErrorContext): Promise<any> {
    const errorType = this.categorizeError(error);
    const strategy = this.fallbackStrategies.get(errorType);

    if (strategy) {
      try {
        logger.info(`Attempting recovery using: ${strategy.description}`);
        return await strategy.fallback();
      } catch (fallbackError) {
        logger.debug(`Fallback strategy failed:`, fallbackError);
      }
    }

    // Try AI-specific recovery
    if (context.command.includes('ask') || context.command.includes('explain')) {
      return await this.handleAIError(error, context);
    }

    return null;
  }

  /**
   * Try final fallback when all retries fail
   */
  private async tryFinalFallback(error: Error, context: ErrorContext): Promise<any> {
    // For AI commands, try simple mode as final fallback
    if (this.isAICommand(context.command)) {
      try {
        logger.info('Trying simple mode as final fallback');
        const { OllamaClient } = await import('../ai/ollama-client.js');
        const client = new OllamaClient();

        if (context.args.length > 0) {
          const question = context.args.join(' ');
          let response = '';

          await client.completeStream(question, {}, (event) => {
            if (event.message?.content) {
              response += event.message.content;
            }
          });

          return response;
        }
      } catch (fallbackError) {
        logger.debug('Final fallback failed:', fallbackError);
      }
    }

    return null;
  }

  /**
   * Handle connection errors
   */
  private async handleConnectionError(error: Error, context: ErrorContext): Promise<any> {
    // Try to start Ollama if it's not running
    try {
      logger.info('Attempting to ensure Ollama service is available');
      const { ensureOllamaServerRunning } = await import('../utils/ollama-server.js');
      await ensureOllamaServerRunning();

      // Small delay to allow service to start
      await this.delay(2000);

      return null; // Let retry mechanism handle it
    } catch {
      return null;
    }
  }

  /**
   * Handle model not found errors
   */
  private async handleModelError(error: Error, context: ErrorContext): Promise<any> {
    logger.info('Model not found, suggesting alternatives');

    // Could suggest pulling the model or using a different one
    const suggestion = `
Model not found. Try:
1. Pull the model: ollama pull llama3.2
2. List available models: ollama list
3. Use a different model with --model flag
`;

    throw new UserError(suggestion, {
      category: ErrorCategory.VALIDATION,
      resolution: 'Install the required model or use an available one'
    });
  }

  /**
   * Handle context window errors
   */
  private async handleContextError(error: Error, context: ErrorContext): Promise<any> {
    logger.info('Context window exceeded, trying with reduced context');

    // This would need integration with the actual AI system
    // For now, just provide helpful error
    throw new UserError(
      'Input too large for AI model context window',
      {
        category: ErrorCategory.VALIDATION,
        resolution: [
          'Try with a shorter input',
          'Break down your request into smaller parts',
          'Use a model with larger context window'
        ].join('\n')
      }
    );
  }

  /**
   * Handle timeout errors
   */
  private async handleTimeoutError(error: Error, context: ErrorContext): Promise<any> {
    logger.info('Request timed out, suggesting alternatives');

    throw new UserError(
      'Request timed out',
      {
        category: ErrorCategory.CONNECTION,
        resolution: [
          'Try a simpler query',
          'Check your internet connection',
          'Use a faster model if available'
        ].join('\n')
      }
    );
  }

  /**
   * Categorize error for fallback selection
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('connection')) return 'connection';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('permission')) return 'permission';
    if (message.includes('not found')) return 'not_found';
    if (message.includes('model')) return 'model';
    if (message.includes('context')) return 'context';

    return 'unknown';
  }

  /**
   * Check if command is AI-related
   */
  private isAICommand(command: string): boolean {
    const aiCommands = ['ask', 'explain', 'generate', 'fix', 'refactor'];
    return aiCommands.some(cmd => command.includes(cmd));
  }

  /**
   * Register default fallback strategies
   */
  private registerDefaultFallbacks(): void {
    this.registerFallback('connection', async () => {
      // Try to ping Ollama service
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Ollama service not responsive');
      }
      return null;
    }, 'Check Ollama service health');

    this.registerFallback('permission', async () => {
      // Could check alternative paths or suggest solutions
      return null;
    }, 'Handle permission errors');
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Dispose of the error recovery manager and clean up resources
   */
  async dispose(): Promise<void> {
    this.fallbackStrategies.clear();
    logger.debug('Error recovery manager disposed');
  }
}

// Legacy export - use dependency injection instead
// export const errorRecoveryManager = ErrorRecoveryManager.getInstance();