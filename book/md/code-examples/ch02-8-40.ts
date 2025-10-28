// Good: Regular health monitoring
setInterval(async () => {
  const providers = providerManager.getAllProviders();

  for (const [id, provider] of providers) {
    const health = await provider.performHealthCheck();

    if (health.status === 'unhealthy') {
      logger.error(`Provider ${id} unhealthy: ${health.lastError}`);
      // Alert team, switch to fallback
    }
  }
}, 60000); // Check every minute

// Listen for health events
provider.on('health_changed', ({ status, provider }) => {
  if (status === 'unhealthy') {
    // Trigger alerts, update monitoring dashboard
  }
});