interface ToolCall {
  // Unique ID for this specific tool call
  id: string;

  // Tool to execute
  toolName: string;

  // Parameters to pass
  parameters: any;

  // Optional: Depends on results from other tool calls
  dependsOn?: string[];
}