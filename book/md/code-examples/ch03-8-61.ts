async function main() {
  const container = new DIContainer();
  let app;

  try {
    app = await bootstrap();
    await app.run();
  } finally {
    await container.dispose(); // Clean up all singletons
  }
}