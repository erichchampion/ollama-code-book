// ConversationManager receives dependencies
export class ConversationManager {
  constructor(
    private router: IntelligentRouter,
    private logger: Logger
  ) {}

  async analyze(prompt: string): Promise<Analysis> {
    return await this.router.route({ prompt, complexity: 'medium' });
  }
}

// Benefits:
// - Easy to test with mock router
// - Container decides which implementations to use
// - Shared logger instance across all services