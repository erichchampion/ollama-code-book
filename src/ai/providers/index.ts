/**
 * AI Providers Module
 *
 * Exports all AI provider implementations and the intelligent router
 * for multi-provider AI integration with intelligent routing capabilities.
 */

// Base provider interface and types
export * from './base-provider.js';

// Provider implementations
export { OllamaProvider } from './ollama-provider.js';
export { OpenAIProvider } from './openai-provider.js';
export { AnthropicProvider } from './anthropic-provider.js';
export { GoogleProvider } from './google-provider.js';

// Advanced features
export { LocalFineTuningManager, CustomLocalProvider } from './local-fine-tuning.js';
export { ModelDeploymentManager } from './model-deployment-manager.js';
export { ResponseFusionEngine } from './response-fusion.js';

// Intelligent router
export { IntelligentAIRouter } from './intelligent-router.js';
export type {
  RoutingStrategy,
  RoutingContext,
  RoutingDecision,
  RouterConfig,
  RouterMetrics
} from './intelligent-router.js';

// Provider factory function
import { BaseAIProvider, ProviderConfig } from './base-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { GoogleProvider, GoogleConfig } from './google-provider.js';
import { CustomLocalProvider } from './local-fine-tuning.js';

/**
 * Factory function to create providers based on configuration
 */
export function createProvider(type: string, config: ProviderConfig): BaseAIProvider {
  switch (type.toLowerCase()) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'google':
      if (!config.apiKey) {
        throw new Error('Google provider requires apiKey');
      }
      return new GoogleProvider({
        ...config,
        apiKey: config.apiKey
      } as GoogleConfig);
    case 'custom-local':
      return new CustomLocalProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Get list of available provider types
 */
export function getAvailableProviderTypes(): string[] {
  return ['ollama', 'openai', 'anthropic', 'google', 'custom-local'];
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(type: string, config: ProviderConfig): boolean {
  // Basic validation - in production this would be more comprehensive
  if (!config.name) return false;

  switch (type.toLowerCase()) {
    case 'ollama':
      // Ollama requires baseUrl
      return !!config.baseUrl;
    case 'openai':
      // OpenAI requires API key
      return !!(config.apiKey || process.env.OPENAI_API_KEY);
    case 'anthropic':
      // Anthropic requires API key
      return !!(config.apiKey || process.env.ANTHROPIC_API_KEY);
    case 'google':
      // Google requires API key
      return !!(config.apiKey || process.env.GOOGLE_API_KEY);
    case 'custom-local':
      // Custom local provider is always valid
      return true;
    default:
      return false;
  }
}