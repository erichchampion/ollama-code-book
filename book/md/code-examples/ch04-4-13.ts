export abstract class ReadOnlyTool implements Tool {
  readonly requiresApproval = false;
  readonly cacheable = true;
  readonly retryable = true;
}