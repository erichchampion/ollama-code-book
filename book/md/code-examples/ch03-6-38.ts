// Problem: StreamingOrchestrator needs ConversationManager to add messages
// ConversationManager needs StreamingOrchestrator to execute tools

// Solution: Dependency inversion with interface
interface IConversationContext {
  addMessage(role: 'user' | 'assistant' | 'system', content: string): void;
  getMessages(): Message[];
  getCurrentModel(): string;
}

class ConversationManager implements IConversationContext {
  private messages: Message[] = [];

  constructor(
    private router: IntelligentRouter,
    private logger: Logger
  ) {}

  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.messages.push({ role, content, timestamp: Date.now() });
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }
}

class StreamingOrchestrator {
  constructor(
    private context: IConversationContext, // Interface, not concrete class
    private router: IntelligentRouter,
    private logger: Logger
  ) {}

  async stream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    // Use context interface
    this.context.addMessage('user', prompt);

    // Stream response
    const messages = this.context.getMessages();
    // ... streaming logic ...
  }
}

// Register with container
container.register('conversationManager', ConversationManager, {
  singleton: true,
  dependencies: ['router', 'logger']
});

container.register('streamingOrchestrator', StreamingOrchestrator, {
  singleton: true,
  dependencies: ['conversationManager', 'router', 'logger']
  // conversationManager satisfies IConversationContext interface
});