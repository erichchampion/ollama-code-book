export class OllamaCodeApp implements IDisposable {
  constructor(
    private router: IntelligentRouter,
    private fusion: MajorityVotingFusion,
    private conversationManager: ConversationManager,
    private toolOrchestrator: ToolOrchestrator,
    private vcsIntelligence: VCSIntelligence,
    private terminal: TerminalInterface,
    private logger: Logger
  ) {}

  async run(args: string[]): Promise<void> {
    // Application logic
  }

  /**
   * Dispose all components in reverse order of dependency
   */
  async dispose(): Promise<void> {
    this.logger.info('Application shutting down...');

    const components = [
      { name: 'VCS Intelligence', obj: this.vcsIntelligence },
      { name: 'Tool Orchestrator', obj: this.toolOrchestrator },
      { name: 'Conversation Manager', obj: this.conversationManager },
      { name: 'Response Fusion', obj: this.fusion },
      { name: 'Router', obj: this.router },
      { name: 'Terminal', obj: this.terminal },
      { name: 'Logger', obj: this.logger }
    ];

    for (const { name, obj } of components) {
      try {
        if (isDisposable(obj)) {
          this.logger.info(`Disposing ${name}...`);
          await obj.dispose();
        }
      } catch (error) {
        this.logger.error(`Error disposing ${name}`, error);
      }
    }

    this.logger.info('Application shut down complete');
  }
}