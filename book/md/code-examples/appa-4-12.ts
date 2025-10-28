interface Message {
  role: MessageRole;
  content: string;

  // Optional fields
  name?: string;               // Function/tool name for tool messages
  toolCalls?: ToolCall[];      // For assistant messages with tool calls
  toolCallId?: string;         // For tool response messages

  // Metadata
  timestamp?: number;
  tokens?: number;
  importance?: number;         // 0-1, for importance-based retention
  metadata?: Record<string, any>;
}

type MessageRole =
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool';