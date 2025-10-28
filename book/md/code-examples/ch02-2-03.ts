// Different tasks have different quality requirements
const scenarios = [
  {
    task: 'Generate commit message',
    requirements: { quality: 0.6, maxCost: 0.001 },
    optimalProvider: 'ollama-qwen2.5-coder'  // Local, free
  },
  {
    task: 'Refactor complex algorithm',
    requirements: { quality: 0.9, maxCost: 0.05 },
    optimalProvider: 'anthropic-claude-3.5'  // Best quality
  },
  {
    task: 'Explain simple code',
    requirements: { quality: 0.7, maxCost: 0.005 },
    optimalProvider: 'openai-gpt-3.5-turbo'  // Good balance
  }
];

// Router automatically selects based on requirements
for (const scenario of scenarios) {
  const provider = await router.selectProvider(scenario.requirements);
  console.log(`${scenario.task} → ${provider.getName()}`);
}