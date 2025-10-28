// Bad: Silent failure
async function bootstrap() {
  const container = new DIContainer();

  try {
    await ServiceRegistry.registerAll(container);
  } catch (error) {
    // Error ignored!
  }

  return container; // Partially initialized
}