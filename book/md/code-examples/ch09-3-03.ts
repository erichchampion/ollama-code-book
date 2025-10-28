/**
 * Sandbox configuration for execution environment
 */
export interface SandboxConfig {
  /** Allowed file paths (glob patterns) */
  allowedPaths?: string[];

  /** Blocked file paths (glob patterns) - takes precedence */
  blockedPaths?: string[];

  /** Allowed commands to execute */
  allowedCommands?: string[];

  /** Maximum execution time per operation (ms) */
  maxExecutionTime?: number;

  /** Maximum memory usage (bytes) */
  maxMemory?: number;

  /** Maximum disk space usage (bytes) */
  maxDiskUsage?: number;

  /** Network access allowed */
  allowNetwork?: boolean;

  /** Environment variables to expose */
  allowedEnvVars?: string[];

  /** Working directory restriction */
  workingDirectory?: string;

  /** Read-only mode (no writes allowed) */
  readOnly?: boolean;
}

/**
 * Default secure sandbox configuration
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  allowedPaths: [
    'src/**/*',
    'test/**/*',
    'lib/**/*',
    'docs/**/*',
    'package.json',
    'tsconfig.json',
    'README.md'
  ],
  blockedPaths: [
    '.env',
    '.env.*',
    '**/.env',
    '**/*.key',
    '**/*.pem',
    '**/*.p12',
    '**/id_rsa',
    '**/id_dsa',
    '**/*_key',
    '**/credentials.*',
    '**/secrets.*',
    '.git/config',
    '.ssh/**/*',
    '/etc/**/*',
    '/var/**/*',
    '/usr/**/*',
    '/home/*/.ssh/**/*',
    'node_modules/**/*'
  ],
  allowedCommands: [
    'git status',
    'git diff',
    'git log',
    'npm test',
    'npm run test',
    'yarn test',
    'ls',
    'cat',
    'grep'
  ],
  maxExecutionTime: 30000, // 30 seconds
  maxMemory: 512 * 1024 * 1024, // 512 MB
  maxDiskUsage: 100 * 1024 * 1024, // 100 MB
  allowNetwork: false,
  allowedEnvVars: ['NODE_ENV', 'PATH'],
  readOnly: false
};