class ToolOrchestrator {
  constructor(config?: OrchestratorConfig);

  // Tool registration
  registerTool(tool: Tool): void;
  unregisterTool(toolName: string): void;
  getTool(toolName: string): Tool | undefined;
  getAvailableTools(): ToolMetadata[];

  // Execution
  executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]>;
  executeToolSequence(sequence: ToolCall[]): Promise<ToolResult[]>;
  executeToolsParallel(toolCalls: ToolCall[]): Promise<ToolResult[]>;

  // Dependency resolution
  resolveDependencies(toolNames: string[]): string[];

  // Approval system
  setApprovalHandler(handler: ApprovalHandler): void;

  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
}

interface OrchestratorConfig {
  maxConcurrency?: number;      // Max parallel tools
  cacheEnabled?: boolean;
  cacheTTL?: number;            // Cache time-to-live in ms
  approvalRequired?: boolean;
  timeout?: number;             // Per-tool timeout
}