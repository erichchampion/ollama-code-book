// Good: Environment-aware configuration
interface MultiProviderConfig {
  defaultStrategy: 'cost' | 'quality' | 'performance' | 'balanced';
  budgets: Record<string, { daily: number; monthly: number }>;
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
  };
  fusion: {
    minAgreement: number;
    maxProviders: number;
  };
}

const config: MultiProviderConfig = {
  defaultStrategy: process.env.ROUTING_STRATEGY as any || 'balanced',
  budgets: {
    'openai-main': {
      daily: parseFloat(process.env.OPENAI_DAILY_LIMIT || '10'),
      monthly: parseFloat(process.env.OPENAI_MONTHLY_LIMIT || '200')
    },
    'anthropic-main': {
      daily: parseFloat(process.env.ANTHROPIC_DAILY_LIMIT || '15'),
      monthly: parseFloat(process.env.ANTHROPIC_MONTHLY_LIMIT || '300')
    }
  },
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000')
  },
  fusion: {
    minAgreement: parseFloat(process.env.FUSION_MIN_AGREEMENT || '0.66'),
    maxProviders: parseInt(process.env.FUSION_MAX_PROVIDERS || '3')
  }
};