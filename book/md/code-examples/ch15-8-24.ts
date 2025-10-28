interface GrowthMetrics {
  acquisition: {
    signups: number;
    activationRate: number; // % who complete first task
    conversionRate: number; // % who become paying
  };

  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    requestsPerUser: number;
  };

  retention: {
    day1: number;   // % who return day 1
    day7: number;   // % who return day 7
    day30: number;  // % who return day 30
  };

  revenue: {
    mrr: number;    // Monthly recurring revenue
    arpu: number;   // Average revenue per user
    ltv: number;    // Lifetime value
    cac: number;    // Customer acquisition cost
  };
}

// Example tracking
async function trackMetrics(): Promise<GrowthMetrics> {
  return {
    acquisition: {
      signups: 1250,
      activationRate: 0.65,  // 65% complete first task
      conversionRate: 0.08   // 8% become paying
    },
    engagement: {
      dailyActiveUsers: 320,
      weeklyActiveUsers: 890,
      monthlyActiveUsers: 1100,
      requestsPerUser: 45
    },
    retention: {
      day1: 0.45,   // 45% return day 1
      day7: 0.32,   // 32% return day 7
      day30: 0.18   // 18% return day 30
    },
    revenue: {
      mrr: 8500,    // $8,500/month
      arpu: 8.5,    // $8.50 per user
      ltv: 510,     // $510 lifetime value
      cac: 45       // $45 acquisition cost
    }
  };
}