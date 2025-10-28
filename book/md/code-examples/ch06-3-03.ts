/**
 * Conversation state
 */
export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata: ConversationMetadata;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  // Total tokens used
  totalTokens: number;

  // Total cost
  totalCost: number;

  // Number of turns (user messages)
  turns: number;

  // Current context (for resuming)
  context?: ConversationContext;

  // Tags for organization
  tags?: string[];

  // Custom metadata
  [key: string]: any;
}

/**
 * Conversation context - working memory
 */
export interface ConversationContext {
  // Current working directory
  workingDirectory: string;

  // Recently accessed files
  recentFiles: string[];

  // Active tools
  activeTools: string[];

  // User preferences
  preferences: Record<string, any>;

  // Current task/goal
  currentTask?: string;
}