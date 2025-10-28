// ConversationManager directly creates dependencies
export class ConversationManager {
  private router: IntelligentRouter;

  constructor() {
    // Hard-coded dependency creation
    const providerManager = new ProviderManager(new Logger());
    this.router = new IntelligentRouter(providerManager, new Logger());
  }

  async analyze(prompt: string): Promise<Analysis> {
    return await this.router.route({ prompt, complexity: 'medium' });
  }
}

// Problems:
// - Can't test with mock router
// - Always uses real ProviderManager
// - Creates new Logger instead of sharing