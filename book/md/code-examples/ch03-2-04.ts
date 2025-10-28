// Good: DI container manages everything
async function bootstrap() {
  const container = new DIContainer();

  // Register services
  container.register('logger', Logger, { singleton: true });
  container.register('providerManager', ProviderManager, { singleton: true });
  container.register('router', IntelligentRouter, { singleton: true });
  container.register('fusion', MajorityVotingFusion, { singleton: true });
  container.register('conversationManager', ConversationManager, { singleton: true });
  container.register('toolOrchestrator', ToolOrchestrator, { singleton: true });
  container.register('vcsIntelligence', VCSIntelligence, { singleton: true });
  container.register('terminal', TerminalInterface, { singleton: true });
  container.register('app', OllamaCodeApp, { singleton: true });

  // Container resolves all dependencies automatically
  const app = await container.resolve<OllamaCodeApp>('app');

  return app;
}