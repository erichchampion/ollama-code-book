// Good: Automatic usage tracking
provider.on('metrics_updated', (metrics) => {
  providerManager.trackUsage(
    'openai-main',
    true,
    metrics.tokensUsed,
    metrics.responseTime,
    metrics.cost
  );
});

// Analyze usage patterns
const stats = providerManager.getUsageStats('openai-main');
logger.info(`Monthly cost: $${stats.totalCost.toFixed(2)}`);
logger.info(`Avg response time: ${stats.averageResponseTime.toFixed(0)}ms`);
logger.info(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);