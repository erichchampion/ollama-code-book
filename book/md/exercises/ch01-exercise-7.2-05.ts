// simple-assistant.ts
import { Ollama } from 'ollama';

interface AssistantConfig {
  model: string;
  host: string;
}

class SimpleAIAssistant {
  private ollama: Ollama;

  constructor(config: AssistantConfig) {
    // TODO: Initialize Ollama client
  }

  async ask(prompt: string): Promise<void> {
    // TODO: Send prompt and stream response
  }
}

// Main
const assistant = new SimpleAIAssistant({
  model: 'qwen2.5-coder:latest',
  host: 'http://localhost:11434'
});

const prompt = process.argv[2];
if (!prompt) {
  console.error('Usage: node simple-assistant.js "your question"');
  process.exit(1);
}

await assistant.ask(prompt);