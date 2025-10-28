// Primary provider fails, automatic fallback
const fallbackChain = [
  { provider: 'anthropic-claude-3.5', priority: 1 },
  { provider: 'openai-gpt-4', priority: 2 },
  { provider: 'ollama-qwen2.5-coder', priority: 3 }
];

async function reliableComplete(prompt: string): Promise<string> {
  for (const { provider } of fallbackChain) {
    try {
      const result = await providers.get(provider).complete(prompt);
      logger.info(`Success with ${provider}`);
      return result.content;
    } catch (error) {
      logger.warn(`${provider} failed, trying next...`);
      // Automatic fallback to next provider
    }
  }

  throw new Error('All providers failed');
}