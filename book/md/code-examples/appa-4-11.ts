class ConversationManager {
  constructor(config?: ConversationConfig);

  // Message management
  addMessage(message: Message): void;
  getMessages(): Message[];
  clearMessages(): void;

  // Context management
  getContext(maxTokens?: number): Message[];
  estimateTokens(messages: Message[]): number;

  // Persistence
  save(conversationId: string): Promise<void>;
  load(conversationId: string): Promise<void>;
  list(): Promise<ConversationInfo[]>;
  delete(conversationId: string): Promise<void>;

  // Search
  search(query: string): Promise<Message[]>;
}

interface ConversationConfig {
  maxTokens?: number;           // Max context window
  strategy?: ContextStrategy;   // Context retention strategy
  persistPath?: string;         // Where to save conversations
  autoSave?: boolean;
}

type ContextStrategy =
  | 'recent'                    // Keep recent messages
  | 'important'                 // Keep important messages
  | 'sliding-summary'           // Summarize old messages
  | 'relevant';                 // Keep relevant to current topic