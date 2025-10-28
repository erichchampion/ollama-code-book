// Bad: Manual dependency management nightmare
async function bootstrap() {
  // Create logger first
  const logger = new Logger({ level: 'info' });

  // Create provider manager
  const providerManager = new ProviderManager(logger);

  // Register providers
  const ollama = new OllamaProvider({ baseUrl: 'http://localhost:11434' });
  await ollama.initialize();
  await providerManager.registerProvider('ollama-local', ollama);

  const openai = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
  await openai.initialize();
  await providerManager.registerProvider('openai-main', openai);

  // Create router
  const router = new IntelligentRouter(providerManager, logger);

  // Create fusion
  const fusion = new MajorityVotingFusion(router, logger);

  // Create conversation manager
  const conversationManager = new ConversationManager(router, logger);

  // Create tool orchestrator (needs router AND conversation manager)
  const toolOrchestrator = new ToolOrchestrator(router, conversationManager, logger);

  // Create VCS intelligence (needs multiple dependencies)
  const vcsIntelligence = new VCSIntelligence(
    router,
    conversationManager,
    toolOrchestrator,
    logger
  );

  // Create terminal interface
  const terminal = new TerminalInterface(logger);

  // Create main app (needs EVERYTHING)
  const app = new OllamaCodeApp(
    router,
    fusion,
    conversationManager,
    toolOrchestrator,
    vcsIntelligence,
    terminal,
    logger
  );

  return app;
}