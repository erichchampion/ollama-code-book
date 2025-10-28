/**
 * Conversation manager with memory limits
 */
export class MemoryAwareConversationManager extends ConversationManager {
  private maxMemoryBytes: number;

  constructor(
    aiProvider: AIProvider,
    options: ConversationOptions & { maxMemoryMB?: number }
  ) {
    super(aiProvider, options);
    this.maxMemoryBytes = (options.maxMemoryMB || 100) * 1024 * 1024;
  }

  /**
   * Add message with memory check
   */
  override addMessage(message: Message): void {
    super.addMessage(message);

    // Check memory usage
    const currentMemory = this.estimateMemoryUsage();

    if (currentMemory > this.maxMemoryBytes) {
      this.trimMessages();
    }
  }

  /**
   * Estimate memory usage of conversation
   */
  private estimateMemoryUsage(): number {
    let bytes = 0;

    for (const message of this.messages) {
      // Rough estimate: 2 bytes per character (UTF-16)
      bytes += message.content.length * 2;

      // Add overhead for object structure
      bytes += 100;
    }

    return bytes;
  }

  /**
   * Trim old messages to reduce memory
   */
  private trimMessages(): void {
    const systemMessages = this.messages.filter(
      m => m.role === MessageRole.SYSTEM
    );

    const nonSystemMessages = this.messages.filter(
      m => m.role !== MessageRole.SYSTEM
    );

    // Keep system messages + recent 50% of conversation
    const keepCount = Math.floor(nonSystemMessages.length / 2);
    const keptMessages = nonSystemMessages.slice(-keepCount);

    this.messages = [...systemMessages, ...keptMessages];

    this.logger.info('Trimmed conversation for memory', {
      removed: nonSystemMessages.length - keptMessages.length,
      remaining: this.messages.length
    });
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    messages: number;
    bytes: number;
    megabytes: number;
  } {
    const bytes = this.estimateMemoryUsage();

    return {
      messages: this.messages.length,
      bytes,
      megabytes: bytes / 1024 / 1024
    };
  }
}