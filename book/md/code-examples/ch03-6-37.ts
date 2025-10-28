// Before: ConversationManager and ToolOrchestrator are too coupled
class ConversationManager {
  constructor(private toolOrchestrator: ToolOrchestrator) {}
}

class ToolOrchestrator {
  constructor(private conversationManager: ConversationManager) {}
}

// After: Extract shared logic into a third service
class MessageBus {
  private handlers = new Map<string, Function[]>();

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, data: any): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}

class ConversationManager {
  constructor(private messageBus: MessageBus) {
    this.messageBus.on('tool_result', (result) => {
      this.handleToolResult(result);
    });
  }

  async handleMessage(message: string): Promise<void> {
    this.messageBus.emit('message', message);
  }
}

class ToolOrchestrator {
  constructor(private messageBus: MessageBus) {
    this.messageBus.on('message', (message) => {
      this.execute(message);
    });
  }

  async execute(message: string): Promise<void> {
    const result = await this.runTools(message);
    this.messageBus.emit('tool_result', result);
  }
}

// Both depend on MessageBus, no circular dependency