/**
 * Manages conversation state and history
 */
export class ConversationManager {
  private conversation: Conversation;
  private logger: Logger;
  private tokenCounter: TokenCounter;
  private maxContextTokens: number;

  constructor(
    conversationId: string,
    logger: Logger,
    options: ConversationOptions = {}
  ) {
    this.logger = logger;
    this.tokenCounter = new TokenCounter();
    this.maxContextTokens = options.maxContextTokens || 100000;

    this.conversation = {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        totalTokens: 0,
        totalCost: 0,
        turns: 0,
        context: {
          workingDirectory: process.cwd(),
          recentFiles: [],
          activeTools: [],
          preferences: options.preferences || {}
        }
      }
    };

    // Add system message if provided
    if (options.systemPrompt) {
      this.addSystemMessage(options.systemPrompt);
    }
  }

  /**
   * Add system message
   */
  addSystemMessage(content: string): SystemMessage {
    const message: SystemMessage = {
      id: this.generateMessageId(),
      role: MessageRole.SYSTEM,
      content,
      timestamp: new Date(),
      metadata: {
        tokens: this.tokenCounter.count(content)
      }
    };

    this.conversation.messages.push(message);
    this.updateMetadata(message);

    this.logger.debug(`Added system message (${message.metadata!.tokens} tokens)`);

    return message;
  }

  /**
   * Add user message
   */
  addUserMessage(content: string, metadata?: Partial<MessageMetadata>): UserMessage {
    const message: UserMessage = {
      id: this.generateMessageId(),
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
      metadata: {
        tokens: this.tokenCounter.count(content),
        ...metadata
      }
    };

    this.conversation.messages.push(message);
    this.updateMetadata(message);
    this.conversation.metadata.turns++;

    this.logger.info(`User: ${this.truncate(content, 100)}`);

    return message;
  }

  /**
   * Add assistant message
   */
  addAssistantMessage(
    content: string,
    metadata?: Partial<MessageMetadata>
  ): AssistantMessage {
    const message: AssistantMessage = {
      id: this.generateMessageId(),
      role: MessageRole.ASSISTANT,
      content,
      timestamp: new Date(),
      metadata: {
        tokens: this.tokenCounter.count(content),
        ...metadata
      } as any
    };

    this.conversation.messages.push(message);
    this.updateMetadata(message);

    this.logger.info(`Assistant: ${this.truncate(content, 100)}`);

    return message;
  }

  /**
   * Add tool message
   */
  addToolMessage(
    toolCallId: string,
    content: string,
    toolResults: ToolResult[]
  ): ToolMessage {
    const message: ToolMessage = {
      id: this.generateMessageId(),
      role: MessageRole.TOOL,
      toolCallId,
      content,
      timestamp: new Date(),
      metadata: {
        tokens: this.tokenCounter.count(content),
        toolResults
      }
    };

    this.conversation.messages.push(message);
    this.updateMetadata(message);

    this.logger.debug(`Tool result: ${toolResults.length} results`);

    return message;
  }

  /**
   * Get conversation messages
   */
  getMessages(): Message[] {
    return [...this.conversation.messages];
  }

  /**
   * Get messages for AI (with context window management)
   */
  getMessagesForAI(maxTokens?: number): Message[] {
    const limit = maxTokens || this.maxContextTokens;

    // Always include system messages
    const systemMessages = this.conversation.messages.filter(
      m => m.role === MessageRole.SYSTEM
    );

    // Get recent messages that fit in context window
    const otherMessages = this.conversation.messages.filter(
      m => m.role !== MessageRole.SYSTEM
    );

    let totalTokens = systemMessages.reduce(
      (sum, m) => sum + (m.metadata?.tokens || 0),
      0
    );

    const selectedMessages: Message[] = [...systemMessages];

    // Add messages from most recent, working backwards
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = message.metadata?.tokens || 0;

      if (totalTokens + messageTokens > limit) {
        this.logger.warn(
          `Context window limit reached: ${totalTokens}/${limit} tokens`
        );
        break;
      }

      selectedMessages.push(message);
      totalTokens += messageTokens;
    }

    // Reverse to get chronological order (except system messages)
    const chronological = [
      ...systemMessages,
      ...selectedMessages.filter(m => m.role !== MessageRole.SYSTEM).reverse()
    ];

    this.logger.debug(
      `Context: ${chronological.length} messages, ${totalTokens} tokens`
    );

    return chronological;
  }

  /**
   * Get conversation metadata
   */
  getMetadata(): ConversationMetadata {
    return { ...this.conversation.metadata };
  }

  /**
   * Get conversation context
   */
  getContext(): ConversationContext {
    return { ...this.conversation.metadata.context! };
  }

  /**
   * Update conversation context
   */
  updateContext(updates: Partial<ConversationContext>): void {
    Object.assign(this.conversation.metadata.context!, updates);
    this.conversation.updatedAt = new Date();
  }

  /**
   * Clear conversation history (keep system messages)
   */
  clear(keepSystemMessages: boolean = true): void {
    if (keepSystemMessages) {
      this.conversation.messages = this.conversation.messages.filter(
        m => m.role === MessageRole.SYSTEM
      );
    } else {
      this.conversation.messages = [];
    }

    this.conversation.metadata.totalTokens = this.conversation.messages.reduce(
      (sum, m) => sum + (m.metadata?.tokens || 0),
      0
    );
    this.conversation.metadata.turns = 0;
    this.conversation.updatedAt = new Date();

    this.logger.info('Conversation cleared');
  }

  /**
   * Export conversation
   */
  export(): Conversation {
    return JSON.parse(JSON.stringify(this.conversation));
  }

  /**
   * Update metadata after adding message
   */
  private updateMetadata(message: Message): void {
    const tokens = message.metadata?.tokens || 0;
    this.conversation.metadata.totalTokens += tokens;

    if (message.metadata?.cost) {
      this.conversation.metadata.totalCost += message.metadata.cost;
    }

    this.conversation.updatedAt = new Date();
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Truncate string for logging
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
}

interface ConversationOptions {
  systemPrompt?: string;
  maxContextTokens?: number;
  preferences?: Record<string, any>;
}