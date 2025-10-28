/**
 * Conversation storage
 */
export class ConversationStorage {
  private storageDir: string;
  private logger: Logger;

  constructor(storageDir: string, logger: Logger) {
    this.storageDir = storageDir;
    this.logger = logger;
  }

  /**
   * Save conversation to disk
   */
  async save(conversation: Conversation): Promise<void> {
    const filePath = this.getConversationPath(conversation.id);

    // Ensure storage directory exists
    await fs.mkdir(this.storageDir, { recursive: true });

    // Write conversation
    await fs.writeFile(
      filePath,
      JSON.stringify(conversation, null, 2),
      'utf-8'
    );

    this.logger.debug(`Saved conversation: ${conversation.id}`);
  }

  /**
   * Load conversation from disk
   */
  async load(conversationId: string): Promise<Conversation | null> {
    const filePath = this.getConversationPath(conversationId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const conversation = JSON.parse(data);

      // Parse dates
      conversation.createdAt = new Date(conversation.createdAt);
      conversation.updatedAt = new Date(conversation.updatedAt);
      conversation.messages.forEach((m: any) => {
        m.timestamp = new Date(m.timestamp);
      });

      this.logger.debug(`Loaded conversation: ${conversationId}`);
      return conversation;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all conversations
   */
  async list(): Promise<ConversationSummary[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const summaries: ConversationSummary[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const conversationId = file.replace('.json', '');
        const conversation = await this.load(conversationId);

        if (conversation) {
          summaries.push({
            id: conversation.id,
            turns: conversation.metadata.turns,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            preview: this.getPreview(conversation)
          });
        }
      }

      // Sort by most recent
      summaries.sort((a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );

      return summaries;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  async delete(conversationId: string): Promise<void> {
    const filePath = this.getConversationPath(conversationId);

    try {
      await fs.unlink(filePath);
      this.logger.debug(`Deleted conversation: ${conversationId}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get conversation file path
   */
  private getConversationPath(conversationId: string): string {
    return path.join(this.storageDir, `${conversationId}.json`);
  }

  /**
   * Get preview of conversation
   */
  private getPreview(conversation: Conversation): string {
    const userMessages = conversation.messages.filter(
      m => m.role === MessageRole.USER
    );

    if (userMessages.length === 0) {
      return 'Empty conversation';
    }

    const firstMessage = userMessages[0].content;
    return firstMessage.length > 100
      ? firstMessage.substring(0, 100) + '...'
      : firstMessage;
  }
}

interface ConversationSummary {
  id: string;
  turns: number;
  createdAt: Date;
  updatedAt: Date;
  preview: string;
}