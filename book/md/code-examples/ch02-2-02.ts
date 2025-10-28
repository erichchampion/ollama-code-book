// ✅ Provider abstraction with intelligent routing
export async function generateCode(prompt: string): Promise<string> {
  // Intelligent router selects best provider
  const provider = await router.selectProvider({
    task: 'code_generation',
    constraints: {
      maxCost: 0.01,        // Budget constraint
      maxLatency: 5000,     // Performance constraint
      minQuality: 0.8       // Quality threshold
    }
  });

  const response = await provider.complete(prompt);
  return response.content;
}