interface ToolMetadata {
  name: string;
  description: string;
  category?: ToolCategory;

  // Parameter schema (JSON Schema)
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required?: string[];
  };

  // Dependencies
  dependencies?: string[];      // Other tool names

  // Execution hints
  async?: boolean;              // Can run asynchronously
  cacheable?: boolean;          // Results can be cached
  dangerous?: boolean;          // Requires approval

  // Examples
  examples?: ToolExample[];
}

type ToolCategory =
  | 'filesystem'
  | 'git'
  | 'code-analysis'
  | 'network'
  | 'database'
  | 'custom';

interface ToolExample {
  description: string;
  params: Record<string, any>;
  expectedResult?: any;
}