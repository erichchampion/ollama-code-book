// Automatic tracking on every request
provider.on('metrics_updated', (metrics) => {
  providerManager.trackUsage(
    'openai-main',
    true,  // success
    1250,  // tokens used
    450,   // response time (ms)
    0.025  // cost ($)
  );
});

// Get usage stats
const stats = providerManager.getUsageStats('openai-main');
console.log(`Total cost this month: $${stats.totalCost.toFixed(2)}`);