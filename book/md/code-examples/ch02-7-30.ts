interface FusionMetrics {
  totalFusions: number;
  averageAgreement: number;
  averageCost: number;
  agreementDistribution: {
    high: number;    // >80% agreement
    medium: number;  // 60-80%
    low: number;     // <60%
  };
}