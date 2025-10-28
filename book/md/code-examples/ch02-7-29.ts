const fusion = new MajorityVotingFusion(router, logger);

// Critical refactoring decision
const prompt = `
Analyze this legacy authentication code and recommend the best approach:
1. Refactor in place with minimal changes
2. Complete rewrite using modern OAuth2 patterns
3. Migrate to third-party auth service (Auth0, Clerk)

Consider: security, maintainability, migration risk, cost
`;

const result = await fusion.fuse(prompt, {
  providerIds: ['openai-main', 'anthropic-main', 'google-main'],
  minAgreement: 0.70,  // Need 70% agreement
  complexity: 'complex'
});

console.log(`Consensus: ${result.result}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`Total cost: $${result.totalCost.toFixed(4)}`);
console.log(`Individual responses:`);
result.individualResponses.forEach(r => {
  console.log(`  - ${r.providerId}: ${r.response.substring(0, 100)}...`);
});