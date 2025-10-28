/**
 * Security Constants
 *
 * Centralized security-related constants for command filtering
 * and security policy enforcement.
 */

/**
 * Commands that are blocked for security reasons
 */
export const DANGEROUS_COMMANDS = [
  'rm',
  'rmdir',
  'del',
  'format',
  'fdisk',
  'sudo',
  'su',
  'chmod',
  'chown',
  'wget',
  'curl',
  'nc',
  'netcat',
  'eval',
  'exec',
  'sh',
  'bash',
  'cmd',
  'powershell',
  'pwsh'
] as const;

/**
 * Commands that require user approval before execution
 */
export const APPROVAL_REQUIRED_COMMANDS = [
  'git push',
  'npm publish',
  'yarn publish',
  'docker push',
  'kubectl apply',
  'terraform apply'
] as const;

/**
 * File patterns that should never be committed
 */
export const SENSITIVE_FILE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.production',
  'credentials.json',
  'secrets.yaml',
  'private.key',
  '*.pem',
  '*.p12',
  '*.pfx',
  'id_rsa',
  'id_dsa',
  '.aws/credentials',
  '.npmrc',
  '.pypirc'
] as const;

/**
 * Security policy constants
 */
export const SECURITY_CONSTANTS = {
  /** Commands blocked for security reasons */
  DANGEROUS_COMMANDS,

  /** Commands that require approval */
  APPROVAL_REQUIRED_COMMANDS,

  /** Sensitive file patterns to protect */
  SENSITIVE_FILE_PATTERNS,

  /** Maximum path traversal depth allowed */
  MAX_PATH_DEPTH: 10,

  /** Maximum file size for safe operations (100MB) */
  MAX_SAFE_FILE_SIZE: 100 * 1024 * 1024
} as const;

export type DangerousCommand = typeof DANGEROUS_COMMANDS[number];
export type ApprovalRequiredCommand = typeof APPROVAL_REQUIRED_COMMANDS[number];
