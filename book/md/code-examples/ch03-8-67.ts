async function bootstrap() {
  // Validate required configuration
  if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_BASE_URL) {
    throw new Error('At least one AI provider must be configured');
  }

  const container = new DIContainer();
  await ServiceRegistry.registerAll(container);

  return container;
}