// src/ai/ollama-client.ts
export class OllamaClient {
  async complete(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResponse> {
    // Single-turn completion
  }

  async completeStream(
    prompt: string,
    options: CompletionOptions,
    onEvent: StreamCallback
  ): Promise<void> {
    // Streaming completion with real-time tokens
  }

  async completeStreamWithTools(
    conversationHistory: ConversationTurn[],
    tools: Tool[],
    options: CompletionOptions,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    // Multi-turn conversation with tool calling
  }
}