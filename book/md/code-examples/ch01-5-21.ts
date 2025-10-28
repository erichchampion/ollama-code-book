// Simple, local-first AI
import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });
const response = await ollama.chat({
  model: 'qwen2.5-coder:latest',
  messages: [{ role: 'user', content: 'Explain async/await' }]
});