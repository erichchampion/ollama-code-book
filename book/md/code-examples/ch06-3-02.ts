/**
 * Message role in conversation
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

/**
 * Base message interface
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  // Token count for this message
  tokens?: number;

  // Model used to generate (for assistant messages)
  model?: string;

  // Cost of generation
  cost?: number;

  // Tool calls made (for assistant messages)
  toolCalls?: ToolCall[];

  // Tool results (for tool messages)
  toolResults?: ToolResult[];

  // Intent detected (for user messages)
  intent?: Intent;

  // Additional metadata
  [key: string]: any;
}

/**
 * System message - sets behavior/context
 */
export interface SystemMessage extends Message {
  role: MessageRole.SYSTEM;
}

/**
 * User message - from human
 */
export interface UserMessage extends Message {
  role: MessageRole.USER;
}

/**
 * Assistant message - from AI
 */
export interface AssistantMessage extends Message {
  role: MessageRole.ASSISTANT;
  metadata?: MessageMetadata & {
    model: string;
    toolCalls?: ToolCall[];
  };
}

/**
 * Tool message - tool execution results
 */
export interface ToolMessage extends Message {
  role: MessageRole.TOOL;
  toolCallId: string;
  metadata?: MessageMetadata & {
    toolResults: ToolResult[];
  };
}