interface Tool {
  // Unique identifier
  name: string;

  // Human-readable description for AI
  description: string;

  // JSON Schema for parameters
  parameters: ToolParameters;

  // Tools this tool depends on
  dependencies?: string[];

  // Whether this tool requires user approval
  requiresApproval?: boolean;

  // Whether results should be cached
  cacheable?: boolean;

  // Execute the tool
  execute(params: any): Promise<ToolResult>;
}