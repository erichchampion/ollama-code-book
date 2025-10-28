interface Tool {
  readonly metadata: ToolMetadata;

  // Execution
  execute(params: Record<string, any>): Promise<ToolResult>;

  // Validation
  validateParams(params: Record<string, any>): ValidationResult;

  // Lifecycle
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}