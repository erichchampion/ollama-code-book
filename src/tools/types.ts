/**
 * Tool System Types
 *
 * Defines the interfaces and types for the tool system that enables
 * sophisticated multi-tool orchestration for coding tasks.
 */

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  validation?: (value: any) => boolean;
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  version: string;
  parameters: ToolParameter[];
  examples: ToolExample[];
  dependencies?: string[];
  /** Whether to display tool output (stdout/stderr) to user */
  displayOutput?: boolean;
}

export interface ToolExample {
  description: string;
  parameters: Record<string, any>;
  expectedOutput?: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    resourcesUsed?: Record<string, any>;
    warnings?: string[];
  };
}

export interface ToolExecutionContext {
  projectRoot: string;
  workingDirectory: string;
  environment: Record<string, string>;
  timeout: number;
  abortSignal?: AbortSignal;
}

export abstract class BaseTool {
  abstract metadata: ToolMetadata;

  abstract execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult>;

  validateParameters(parameters: Record<string, any>): boolean {
    for (const param of this.metadata.parameters) {
      if (param.required && !(param.name in parameters)) {
        return false;
      }

      if (param.name in parameters && param.validation) {
        if (!param.validation(parameters[param.name])) {
          return false;
        }
      }
    }
    return true;
  }

  getParameterDefaults(): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const param of this.metadata.parameters) {
      if (param.default !== undefined) {
        defaults[param.name] = param.default;
      }
    }
    return defaults;
  }
}

export interface ToolRegistry {
  register(tool: BaseTool): void;
  unregister(name: string): void;
  get(name: string): BaseTool | undefined;
  list(): ToolMetadata[];
  getByCategory(category: string): BaseTool[];
  search(query: string): BaseTool[];
}

export interface ToolOrchestratorConfig {
  maxConcurrentTools: number;
  defaultTimeout: number;
  enableCaching: boolean;
  cacheTTL: number;
}

export interface ToolExecution {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ToolResult;
  startTime: Date;
  endTime?: Date;
  dependencies: string[];
}

export interface OrchestrationPlan {
  executions: ToolExecution[];
  dependencies: Map<string, string[]>;
  estimatedDuration: number;
}