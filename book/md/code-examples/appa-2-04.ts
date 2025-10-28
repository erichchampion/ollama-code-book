class OllamaProvider implements AIProvider {
  constructor(config: OllamaConfig);

  // Configuration
  configure(config: Partial<OllamaConfig>): void;

  // Model pulling
  pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void>;

  // Additional methods
  generateEmbeddings(text: string): Promise<number[]>;
}

interface OllamaConfig {
  baseUrl: string;             // Default: 'http://localhost:11434'
  model: string;               // e.g., 'codellama:7b'
  timeout?: number;            // Request timeout in ms
  keepAlive?: string;          // Keep model loaded, e.g., '5m'
}