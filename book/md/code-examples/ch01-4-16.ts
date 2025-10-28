// Define strict types for configuration
export interface AppConfig {
  ai: {
    defaultProvider: 'ollama' | 'openai' | 'anthropic' | 'google';
    timeout: number;
    maxTokens: number;
  };
  tools: {
    enableApproval: boolean;
    categories: ToolCategory[];
  };
  conversation: {
    maxHistory: number;
    persistPath: string;
  };
}

// Type-safe service resolution
export interface ServiceRegistry {
  aiClient: AIClient;
  terminal: TerminalInterface;
  projectContext: ProjectContext;
  conversationManager: ConversationManager;
}

// Compile-time errors for typos
const terminal = await container.resolve('terminal'); // ✓ OK
const termnal = await container.resolve('termnal');   // ✗ Error: typo