interface ToolResult {
  success: boolean;
  data?: any;
  error?: ToolError;
  metadata?: {
    executionTime?: number;
    cached?: boolean;
    fromCache?: boolean;
  };
}

interface ToolError {
  code: string;
  message: string;
  details?: any;
  recoverable?: boolean;
}