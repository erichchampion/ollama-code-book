interface PricingTier {
  name: string;
  price: number; // USD/month
  features: {
    requestsPerMonth: number;
    models: string[];
    plugins: string[];
    support: 'community' | 'email' | 'priority';
    advancedFeatures: boolean;
  };
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    features: {
      requestsPerMonth: 100,
      models: ['codellama:7b'],
      plugins: ['kubernetes-basic'],
      support: 'community',
      advancedFeatures: false
    }
  },
  {
    name: 'Pro',
    price: 29,
    features: {
      requestsPerMonth: 1000,
      models: ['codellama:34b', 'gpt-4-turbo'],
      plugins: ['kubernetes', 'terraform', 'aws'],
      support: 'email',
      advancedFeatures: true
    }
  },
  {
    name: 'Enterprise',
    price: 199,
    features: {
      requestsPerMonth: Infinity,
      models: ['all'],
      plugins: ['all'],
      support: 'priority',
      advancedFeatures: true
    }
  }
];