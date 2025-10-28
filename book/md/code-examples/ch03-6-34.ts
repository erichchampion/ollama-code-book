// Before: Circular dependency
class ConversationManager {
  constructor(private toolOrchestrator: ToolOrchestrator) {}
}

class ToolOrchestrator {
  constructor(private conversationManager: ConversationManager) {}
}

// After: Dependency inversion with interface
interface IConversationContext {
  getCurrentConversation(): Conversation;
  addMessage(message: Message): void;
}

class ConversationManager implements IConversationContext {
  constructor(private toolOrchestrator: ToolOrchestrator) {}

  getCurrentConversation(): Conversation {
    return this.currentConversation;
  }

  addMessage(message: Message): void {
    this.currentConversation.messages.push(message);
  }
}

// ToolOrchestrator depends on interface, not concrete class
class ToolOrchestrator {
  constructor(private context: IConversationContext) {}
}

// No circular dependency!