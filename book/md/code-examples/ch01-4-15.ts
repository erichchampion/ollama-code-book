// Base provider abstraction
export abstract class BaseAIProvider {
  abstract complete(prompt: string): Promise<Response>;
  abstract completeStream(prompt: string, callback: StreamCallback): Promise<void>;
}

// Easy to add new providers
export class OllamaProvider extends BaseAIProvider {
  async complete(prompt: string): Promise<Response> {
    // Ollama-specific implementation
  }
}

export class OpenAIProvider extends BaseAIProvider {
  async complete(prompt: string): Promise<Response> {
    // OpenAI-specific implementation
  }
}

// New provider: just extend the base
export class CustomProvider extends BaseAIProvider {
  async complete(prompt: string): Promise<Response> {
    // Custom implementation
  }
}