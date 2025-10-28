import { OllamaProvider, OpenAIProvider } from 'ollama-code';

// Ollama provider
const ollama = new OllamaProvider({
  baseUrl: 'http://localhost:11434',
  model: 'codellama:7b'
});

// OpenAI provider
const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo'
});

// Use provider
const response = await ollama.complete({
  messages: [
    { role: 'user', content: 'Explain async/await in JavaScript' }
  ],
  temperature: 0.3
});

console.log(response.content);