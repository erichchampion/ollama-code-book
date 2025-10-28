interface CompletionRequest {
  // Messages
  messages: Message[];

  // Model configuration
  model?: string;
  temperature?: number;        // 0.0 - 2.0, default: 0.7
  maxTokens?: number;          // Max output tokens
  topP?: number;               // Nucleus sampling, 0.0 - 1.0
  topK?: number;               // Top-K sampling

  // Stop sequences
  stopSequences?: string[];

  // Tools
  tools?: Tool[];
  toolChoice?: 'auto' | 'required' | 'none';

  // Streaming
  stream?: boolean;
}