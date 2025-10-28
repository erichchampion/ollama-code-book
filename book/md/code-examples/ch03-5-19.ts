// Bad: Resources leak
class ProviderManager {
  private healthCheckInterval: NodeJS.Timeout;

  constructor() {
    // Start health monitoring
    this.healthCheckInterval = setInterval(() => {
      this.checkProviderHealth();
    }, 60000);
  }

  // No dispose method - interval keeps running forever!
}

// Application exits but interval still runs
// Memory leak!