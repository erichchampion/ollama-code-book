interface ModelSelectionCriteria {
  // Performance
  latency: 'low' | 'medium' | 'high';           // < 2s, 2-5s, > 5s
  quality: 'good' | 'excellent' | 'best';       // Subjective quality

  // Cost
  costPerToken: number;                          // USD per 1M tokens
  budgetCategory: 'free' | 'low' | 'medium' | 'high';

  // Privacy
  deployment: 'local' | 'cloud' | 'hybrid';
  dataResidency: string[];                       // ['US', 'EU', etc.]

  // Technical
  contextWindow: number;                         // Max tokens
  languages: string[];                           // Programming languages
  specialization: string[];                      // Domains
}

// Example: DevOps Assistant
const devopsModelCriteria: ModelSelectionCriteria = {
  latency: 'medium',                // 2-5s acceptable for config generation
  quality: 'excellent',             // Must generate correct configs
  costPerToken: 0.001,              // ~$1 per 1M tokens
  budgetCategory: 'low',            // Keep costs down
  deployment: 'hybrid',             // Local for sensitive, cloud for quality
  dataResidency: ['US', 'EU'],
  contextWindow: 8000,              // Need to fit large configs
  languages: ['yaml', 'hcl', 'json'],
  specialization: ['kubernetes', 'terraform', 'aws']
};