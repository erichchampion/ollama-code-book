// Initialize service
const service = new MultiProviderAIService({
  ollama: {
    baseUrl: 'http://localhost:11434',
    defaultModel: 'qwen2.5-coder:7b'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    defaultModel: 'gpt-4-turbo'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    defaultModel: 'claude-3-5-sonnet-20241022'
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY!,
    defaultModel: 'gemini-1.5-pro'
  },
  budgets: {
    'openai-main': { daily: 10, monthly: 200 },
    'anthropic-main': { daily: 15, monthly: 300 },
    'google-main': { daily: 8, monthly: 150 }
  },
  defaultStrategy: 'balanced'
});

// Simple request (cost-optimized)
const commitMsg = await service.complete(
  'Generate commit message for user authentication refactor',
  { complexity: 'simple', priority: 'cost' }
);
// Likely uses Ollama (free)

// Complex request (quality-optimized)
const refactorPlan = await service.complete(
  'Analyze this legacy auth system and propose refactoring strategy',
  { complexity: 'complex', priority: 'quality' }
);
// Likely uses Claude 3.5 Sonnet

// Critical request (fusion for accuracy)
const securityAnalysis = await service.complete(
  'Identify security vulnerabilities in this authentication code',
  {
    complexity: 'complex',
    requireFusion: true,
    minFusionAgreement: 0.75
  }
);
// Uses 3 providers, requires 75% agreement

// Streaming request
await service.completeStream(
  'Explain this codebase architecture',
  (chunk) => process.stdout.write(chunk),
  { complexity: 'medium', priority: 'performance' }
);

// Get statistics
const stats = service.getUsageStats();
console.log('Monthly costs:');
for (const [id, stat] of Object.entries(stats)) {
  console.log(`  ${id}: $${stat.totalCost.toFixed(2)}`);
}

// Get health status
const health = service.getHealthStatus();
console.log('Provider health:');
for (const [id, h] of Object.entries(health)) {
  console.log(`  ${id}: ${h.status}`);
}