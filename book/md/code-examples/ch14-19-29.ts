// Lazy load AI client only when needed
let aiClientInstance: AIClient | null = null;

function getAIClient(): AIClient {
  if (!aiClientInstance) {
    const config = vscode.workspace.getConfiguration('ollamaCode');
    aiClientInstance = new AIClient({
      apiUrl: config.get('apiUrl') || 'http://localhost:11434',
      model: config.get('model') || 'codellama:7b',
      maxTokens: 2048
    });
  }
  return aiClientInstance;
}