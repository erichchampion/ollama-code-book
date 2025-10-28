/**
 * Represents a user intent that can be routed to a command
 */
export interface Intent {
  /** Unique intent identifier (e.g., "COMMIT", "REVIEW", "ANALYZE") */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** Example phrases that trigger this intent */
  readonly examples: string[];

  /** Required parameters for this intent */
  readonly requiredParams: string[];

  /** Optional parameters */
  readonly optionalParams: string[];

  /** Command class to route to */
  readonly commandClass: string;
}

/**
 * Result of intent classification
 */
export interface IntentMatch {
  /** Matched intent */
  intent: Intent;

  /** Confidence score (0-1) */
  confidence: number;

  /** Extracted parameters from input */
  extractedParams: Record<string, any>;

  /** Missing required parameters */
  missingParams: string[];
}