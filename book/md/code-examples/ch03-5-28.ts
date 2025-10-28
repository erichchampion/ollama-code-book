// Good: Reverse order disposal
async function shutdown() {
  await app.dispose();          // Depends on router
  await router.dispose();       // Depends on providerManager
  await providerManager.dispose(); // Depends on logger
  await logger.dispose();       // No dependencies
}