// Mediator coordinates between components without creating cycles
class ApplicationMediator {
  constructor(
    private logger: Logger
  ) {}

  async handleUserMessage(message: string): Promise<void> {
    // Coordinate between services
    const conversation = await this.conversationManager.analyze(message);
    const tools = await this.toolOrchestrator.findTools(conversation.intent);
    const result = await this.router.execute(conversation, tools);

    return result;
  }

  setConversationManager(manager: ConversationManager): void {
    this.conversationManager = manager;
  }

  setToolOrchestrator(orchestrator: ToolOrchestrator): void {
    this.toolOrchestrator = orchestrator;
  }

  setRouter(router: IntelligentRouter): void {
    this.router = router;
  }
}

// Services depend on mediator, not each other
class ConversationManager {
  constructor(private mediator: ApplicationMediator) {}
}

class ToolOrchestrator {
  constructor(private mediator: ApplicationMediator) {}
}