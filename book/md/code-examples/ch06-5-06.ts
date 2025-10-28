/**
 * Strategy for managing context window
 */
export enum ContextWindowStrategy {
  // Keep most recent messages
  RECENT = 'recent',

  // Keep based on importance score
  IMPORTANT = 'important',

  // Sliding window with summarization
  SLIDING_SUMMARY = 'sliding_summary',

  // Keep based on relevance to current query
  RELEVANT = 'relevant'
}

/**
 * Context window manager
 */
export class ContextWindowManager {
  private strategy: ContextWindowStrategy;
  private maxTokens: number;
  private tokenCounter: TokenCounter;
  private logger: Logger;

  constructor(
    strategy: ContextWindowStrategy = ContextWindowStrategy.RECENT,
    maxTokens: number = 100000,
    logger: Logger
  ) {
    this.strategy = strategy;
    this.maxTokens = maxTokens;
    this.tokenCounter = new TokenCounter();
    this.logger = logger;
  }

  /**
   * Select messages that fit in context window
   */
  selectMessages(
    messages: Message[],
    query?: string
  ): Message[] {
    switch (this.strategy) {
      case ContextWindowStrategy.RECENT:
        return this.selectRecent(messages);

      case ContextWindowStrategy.IMPORTANT:
        return this.selectImportant(messages);

      case ContextWindowStrategy.SLIDING_SUMMARY:
        return this.selectWithSummary(messages);

      case ContextWindowStrategy.RELEVANT:
        return this.selectRelevant(messages, query);

      default:
        return this.selectRecent(messages);
    }
  }

  /**
   * Keep most recent messages
   */
  private selectRecent(messages: Message[]): Message[] {
    // Always keep system messages
    const systemMessages = messages.filter(m => m.role === MessageRole.SYSTEM);
    const otherMessages = messages.filter(m => m.role !== MessageRole.SYSTEM);

    let totalTokens = this.tokenCounter.countMessages(systemMessages);
    const selected: Message[] = [];

    // Add from most recent
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = message.metadata?.tokens ||
        this.tokenCounter.count(message.content);

      if (totalTokens + messageTokens > this.maxTokens) {
        break;
      }

      selected.unshift(message);
      totalTokens += messageTokens;
    }

    const result = [...systemMessages, ...selected];
    this.logger.debug(
      `Selected ${result.length}/${messages.length} messages ` +
      `(${totalTokens} tokens)`
    );

    return result;
  }

  /**
   * Keep important messages based on score
   */
  private selectImportant(messages: Message[]): Message[] {
    // Score messages by importance
    const scored = messages.map(message => ({
      message,
      score: this.calculateImportance(message)
    }));

    // Sort by importance (descending)
    scored.sort((a, b) => b.score - a.score);

    // Select messages that fit
    let totalTokens = 0;
    const selected: Message[] = [];

    for (const { message, score } of scored) {
      const messageTokens = message.metadata?.tokens ||
        this.tokenCounter.count(message.content);

      if (totalTokens + messageTokens > this.maxTokens) {
        break;
      }

      selected.push(message);
      totalTokens += messageTokens;
    }

    // Sort chronologically
    selected.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    this.logger.debug(
      `Selected ${selected.length} important messages (${totalTokens} tokens)`
    );

    return selected;
  }

  /**
   * Calculate message importance
   */
  private calculateImportance(message: Message): number {
    let score = 0;

    // System messages are always important
    if (message.role === MessageRole.SYSTEM) {
      return 1000;
    }

    // Recent messages are more important
    const ageMs = Date.now() - message.timestamp.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += Math.max(0, 100 - ageDays * 10);

    // Messages with tool calls are important
    if (message.metadata?.toolCalls && message.metadata.toolCalls.length > 0) {
      score += 50;
    }

    // Longer messages might be more important
    const length = message.content.length;
    score += Math.min(length / 100, 50);

    return score;
  }

  /**
   * Select with summarization of old messages
   */
  private selectWithSummary(messages: Message[]): Message[] {
    // For now, just use recent strategy
    // In production, summarize old messages and prepend summary
    return this.selectRecent(messages);
  }

  /**
   * Select relevant to current query
   */
  private selectRelevant(messages: Message[], query?: string): Message[] {
    if (!query) {
      return this.selectRecent(messages);
    }

    // Score messages by relevance to query
    const scored = messages.map(message => ({
      message,
      score: this.calculateRelevance(message, query)
    }));

    // Sort by relevance
    scored.sort((a, b) => b.score - a.score);

    // Select messages that fit
    let totalTokens = 0;
    const selected: Message[] = [];

    for (const { message } of scored) {
      const messageTokens = message.metadata?.tokens ||
        this.tokenCounter.count(message.content);

      if (totalTokens + messageTokens > this.maxTokens) {
        break;
      }

      selected.push(message);
      totalTokens += messageTokens;
    }

    // Sort chronologically
    selected.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return selected;
  }

  /**
   * Calculate relevance to query
   */
  private calculateRelevance(message: Message, query: string): number {
    // Simple keyword matching
    const queryWords = query.toLowerCase().split(/\s+/);
    const messageWords = message.content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const word of queryWords) {
      if (messageWords.includes(word)) {
        matches++;
      }
    }

    // System messages always relevant
    if (message.role === MessageRole.SYSTEM) {
      return 1000;
    }

    return matches * 10;
  }
}