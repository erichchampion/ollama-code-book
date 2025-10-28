export abstract class AnalysisTool implements Tool {
  readonly requiresApproval = false;
  readonly cacheable = true;
  readonly retryable = true;
  readonly timeoutMs = 30000; // 30 second timeout
}