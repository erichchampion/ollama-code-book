export abstract class MutationTool implements Tool {
  readonly requiresApproval = true;
  readonly cacheable = false;
  readonly retryable = false; // Don't retry writes
}