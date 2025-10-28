interface UsagePricing {
  freeRequests: number;
  pricePerRequest: number; // After free tier
  pricePerToken: number;   // For cloud models
}

const USAGE_PRICING: UsagePricing = {
  freeRequests: 100,
  pricePerRequest: 0.01,   // $0.01 per request after 100
  pricePerToken: 0.000001  // $0.001 per 1K tokens
};