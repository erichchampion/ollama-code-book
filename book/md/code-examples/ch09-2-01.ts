/**
 * Security threats for AI coding assistants
 */
export enum ThreatCategory {
  /** Unauthorized access to files, credentials, or systems */
  UNAUTHORIZED_ACCESS = 'unauthorized_access',

  /** Execution of destructive operations */
  DESTRUCTIVE_OPERATIONS = 'destructive_operations',

  /** Data leakage to AI providers or logs */
  DATA_LEAKAGE = 'data_leakage',

  /** Resource exhaustion (API calls, disk, memory) */
  RESOURCE_EXHAUSTION = 'resource_exhaustion',

  /** Injection attacks through prompts or parameters */
  INJECTION_ATTACKS = 'injection_attacks',

  /** Privilege escalation */
  PRIVILEGE_ESCALATION = 'privilege_escalation'
}

export interface Threat {
  category: ThreatCategory;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string[];
  examples: string[];
}