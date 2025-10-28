interface CompletionResponse {
  // Response content
  content: string;
  role: MessageRole;

  // Model info
  model: string;

  // Token usage
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  // Tool calls (if applicable)
  toolCalls?: ToolCall[];

  // Metadata
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  metadata?: Record<string, any>;
}