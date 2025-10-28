// Use the best model for each specific task
const taskProviderMap = {
  'code_generation': {
    provider: 'anthropic-claude-3.5',
    reason: 'Excellent at generating clean, idiomatic code'
  },
  'code_review': {
    provider: 'openai-gpt-4',
    reason: 'Strong analytical capabilities'
  },
  'documentation': {
    provider: 'google-gemini-pro',
    reason: 'Good at clear, concise writing'
  },
  'quick_questions': {
    provider: 'ollama-qwen2.5-coder',
    reason: 'Fast, local, free for simple queries'
  }
};

async function taskSpecificComplete(
  task: string,
  prompt: string
): Promise<string> {
  const config = taskProviderMap[task];
  const provider = providers.get(config.provider);

  logger.info(`Using ${config.provider}: ${config.reason}`);

  const response = await provider.complete(prompt);
  return response.content;
}