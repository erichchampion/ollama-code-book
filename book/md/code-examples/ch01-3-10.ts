// src/tools/types.ts
export interface ToolMetadata {
  name: string;
  description: string;
  category: 'filesystem' | 'execution' | 'git' | 'search' | 'analysis';
  parameters: ToolParameter[];
  examples: ToolExample[];
}

export abstract class BaseTool {
  abstract metadata: ToolMetadata;
  abstract execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult>;
}