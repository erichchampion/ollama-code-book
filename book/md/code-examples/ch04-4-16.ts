export abstract class ExternalTool implements Tool {
  readonly requiresApproval = true; // Depends on operation
  readonly cacheable = false; // External state changes
  readonly retryable = true; // Can retry failed API calls
}