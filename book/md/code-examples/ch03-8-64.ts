interface IConversationContext {
  addMessage(message: Message): void;
  getMessages(): Message[];
}

class ConversationManager implements IConversationContext {
  constructor(private toolOrchestrator: ToolOrchestrator) {}
}

class ToolOrchestrator {
  constructor(private context: IConversationContext) {}
  // Depends on interface, not concrete class
}