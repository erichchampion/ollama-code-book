// Before: Circular dependency
class ConversationManager {
  constructor(private toolOrchestrator: ToolOrchestrator) {}

  async handleMessage(message: string): Promise<void> {
    const result = await this.toolOrchestrator.execute(message);
    // Process result
  }
}

class ToolOrchestrator {
  constructor(private conversationManager: ConversationManager) {}

  async execute(message: string): Promise<void> {
    // Need to update conversation
    await this.conversationManager.addMessage(message);
  }
}

// After: Event-based decoupling
class ConversationManager extends EventEmitter {
  constructor() {
    super();
  }

  async handleMessage(message: string): Promise<void> {
    this.emit('message', message);
  }
}

class ToolOrchestrator {
  constructor(private eventBus: EventEmitter) {
    // Listen to events instead of direct dependency
    this.eventBus.on('message', (message) => {
      this.execute(message);
    });
  }

  async execute(message: string): Promise<void> {
    // Emit event instead of calling conversationManager
    this.eventBus.emit('tool_result', result);
  }
}

// No circular dependency - both depend on EventEmitter