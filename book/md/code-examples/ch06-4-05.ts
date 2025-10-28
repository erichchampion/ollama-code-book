/**
 * Token counter for messages
 */
export class TokenCounter {
  /**
   * Count tokens in text
   * Simplified estimation - in production, use proper tokenizer
   */
  count(text: string): number {
    // Rough estimation: ~4 characters per token
    // This varies by model - use actual tokenizer in production
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in messages
   */
  countMessages(messages: Message[]): number {
    return messages.reduce((total, message) => {
      return total + (message.metadata?.tokens || this.count(message.content));
    }, 0);
  }

  /**
   * Estimate tokens for tool call
   */
  countToolCall(toolCall: ToolCall): number {
    const paramsStr = JSON.stringify(toolCall.parameters);
    return this.count(toolCall.toolName + paramsStr) + 10; // +10 for overhead
  }

  /**
   * Estimate tokens for tool result
   */
  countToolResult(result: ToolResult): number {
    const dataStr = JSON.stringify(result.data || {});
    return this.count(dataStr) + 20; // +20 for overhead
  }
}