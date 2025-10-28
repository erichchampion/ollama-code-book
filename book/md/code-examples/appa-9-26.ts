class ToolError extends Error {
  constructor(
    message: string,
    public code: ToolErrorCode,
    public toolName: string,
    public recoverable: boolean = false
  );
}

type ToolErrorCode =
  | 'VALIDATION_ERROR'
  | 'EXECUTION_ERROR'
  | 'DEPENDENCY_ERROR'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND';