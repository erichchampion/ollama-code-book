// Public API - what other modules can import
export { OllamaClient } from './ollama-client';
export { ConversationManager } from './conversation-manager';
export { IntentAnalyzer } from './intent-analyzer';

// Provider exports
export * from './providers';

// Types
export type {
  ConversationTurn,
  UserIntent,
  CompletionOptions
} from './types';