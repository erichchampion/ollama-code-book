async function bootstrap() {
  const container = new DIContainer();

  try {
    await ServiceRegistry.registerAll(container);
  } catch (error) {
    console.error('Service registration failed:', error);
    await container.dispose(); // Clean up partial initialization
    throw error;
  }

  return container;
}