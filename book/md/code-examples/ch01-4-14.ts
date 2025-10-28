// ❌ BAD: God object doing everything
class AIAssistant {
  async processRequest(input: string) {
    const parsed = this.parseCommand(input);
    const context = this.analyzeProject();
    const response = this.callAI(parsed, context);
    this.executeTools(response);
    this.updateUI(response);
    this.saveHistory(response);
    // Too many responsibilities!
  }
}

// ✅ GOOD: Separated concerns
class AIOrchestrator {
  constructor(
    private commandParser: CommandParser,
    private projectAnalyzer: ProjectAnalyzer,
    private aiClient: AIClient,
    private toolExecutor: ToolExecutor,
    private terminal: TerminalInterface,
    private conversationManager: ConversationManager
  ) {}

  async processRequest(input: string) {
    const command = await this.commandParser.parse(input);
    const context = await this.projectAnalyzer.analyze();
    const response = await this.aiClient.complete(command, context);
    const results = await this.toolExecutor.execute(response.toolCalls);
    await this.terminal.display(response, results);
    await this.conversationManager.save(command, response);
  }
}