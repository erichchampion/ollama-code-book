interface ToolResult {
  // ID of the tool call
  callId: string;

  // Success or failure
  success: boolean;

  // Result data (if successful)
  data?: any;

  // Error information (if failed)
  error?: {
    message: string;
    code?: string;
    recoverable: boolean;
  };

  // Execution metadata
  metadata: {
    durationMs: number;
    cached: boolean;
    retriesAttempted?: number;
  };
}