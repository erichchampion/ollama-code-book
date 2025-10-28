class OpenAIProvider implements AIProvider {
  constructor(config: OpenAIConfig);

  // Configuration
  configure(config: Partial<OpenAIConfig>): void;

  // Fine-tuning
  createFineTune(params: FineTuneParams): Promise<FineTuneJob>;

  // Embeddings
  createEmbeddings(input: string | string[]): Promise<number[][]>;
}

interface OpenAIConfig {
  apiKey: string;
  model: string;               // e.g., 'gpt-4-turbo'
  organization?: string;
  baseUrl?: string;            // For Azure OpenAI
  timeout?: number;
}