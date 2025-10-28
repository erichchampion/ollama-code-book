export abstract class BaseAIProvider extends EventEmitter {
  // ...
}

// Providers can emit events for monitoring
provider.on('health_check', (health) => {
  console.log(`Provider health: ${health.status}`);
});

provider.on('metrics_updated', (metrics) => {
  console.log(`Total requests: ${metrics.totalRequests}`);
});