/**
 * Bootstrap the application with DI
 */
export async function bootstrap(): Promise<OllamaCodeApp> {
  // Create container
  const container = new DIContainer();

  // Register all services
  await ServiceRegistry.registerAll(container);

  // Register main app
  container.register('app', OllamaCodeApp, {
    singleton: true,
    dependencies: [
      'router',
      'fusion',
      'conversationManager',
      'toolOrchestrator',
      'streamingOrchestrator',
      'vcsIntelligence',
      'logger'
    ]
  });

  // Resolve and return app
  return await container.resolve<OllamaCodeApp>('app');
}

/**
 * Main entry point
 */
async function main() {
  let app: OllamaCodeApp | null = null;

  try {
    // Bootstrap
    app = await bootstrap();

    // Run
    await app.run(process.argv.slice(2));
  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  } finally {
    // Clean up
    if (app) {
      await app.dispose();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}