interface AIProvider {
  readonly name: string;
  readonly supportedModels: string[];

  // Core methods
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncGenerator<string>;

  // Model management
  listModels(): Promise<ModelInfo[]>;
  getModelInfo(modelId: string): Promise<ModelInfo>;

  // Health and metrics
  healthCheck(): Promise<HealthStatus>;
  getUsageStats(): UsageStats;

  // Lifecycle
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}