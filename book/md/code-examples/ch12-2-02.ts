/**
 * What we want to know about our AI system
 */
export interface ObservabilityGoals {
  // Performance
  howFast: {
    firstTokenLatency: number;    // Time to first token
    totalLatency: number;         // Total request time
    cacheHitRate: number;         // Cache effectiveness
  };

  // Reliability
  howReliable: {
    errorRate: number;            // % of requests failing
    availability: number;         // % uptime
    successRate: number;          // % of successful requests
  };

  // Cost
  howExpensive: {
    costPerRequest: number;       // Average cost
    totalCost: number;            // Total spend
    tokenUsage: number;           // Tokens consumed
  };

  // Quality
  howGood: {
    qualityScore: number;         // Output quality (0-100)
    userSatisfaction: number;     // User feedback
    regressionRate: number;       // % quality regressions
  };

  // Usage
  whoAndWhat: {
    activeUsers: number;          // Users in time period
    requestsPerUser: number;      // Usage per user
    topOperations: string[];      // Most common operations
  };
}