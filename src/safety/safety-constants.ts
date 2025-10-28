/**
 * Safety System Constants
 *
 * Centralized configuration values for the safety system to eliminate hardcoded values
 * and provide consistent behavior across all safety components.
 */

// Timeout Configuration (in milliseconds)
export const SAFETY_TIMEOUTS = {
  RISK_ASSESSMENT: 30000,     // 30 seconds
  CHANGE_PREVIEW: 50000,      // 50 seconds
  BACKUP_OPERATION: 300000,   // 5 minutes
  ROLLBACK_OPERATION: 60000,  // 1 minute
  OPERATION_TIMEOUT: 1000,    // 1 second for quick operations
  COMPONENT_LOADING: 20000,   // 20 seconds for component initialization
} as const;

// Preview Configuration
export const PREVIEW_LIMITS = {
  MAX_PREVIEW_LINES: 50,
  MAX_DIFF_LINES: 20,
  CONTEXT_LINES: 3,
  MAX_FILE_SIZE_MB: 10,
} as const;

// File Size Thresholds (in bytes)
export const FILE_SIZE_THRESHOLDS = {
  SMALL_FILE: 1024 * 1024,      // 1 MB
  MEDIUM_FILE: 10 * 1024 * 1024, // 10 MB
  LARGE_FILE: 100 * 1024 * 1024, // 100 MB
  HUGE_FILE: 1024 * 1024 * 1024, // 1 GB
} as const;

// Risk Assessment Configuration
export const RISK_CONFIG = {
  FACTOR_WEIGHTS: {
    SYSTEM_FILE: 0.9,
    DELETION: 0.8,
    LARGE_FILE: 0.6,
    CONFIG_FILE: 0.7,
    SECURITY_FILE: 0.9,
    DATABASE_SCHEMA: 0.8,
    BULK_OPERATION: 0.5,
    CROSS_MODULE: 0.4,
    EXTERNAL_DEPENDENCY: 0.6,
  },
  SAFETY_THRESHOLDS: {
    LOW: 0.3,
    MEDIUM: 0.6,
    HIGH: 0.8,
    CRITICAL: 0.9,
  },
  MAX_OPERATIONS_COUNT: 50,
  BULK_OPERATION_THRESHOLD: 10,
} as const;

// Backup System Configuration
export const BACKUP_CONFIG = {
  MAX_BACKUPS: 10,
  RETENTION_DAYS: 7,
  BACKUP_DIR_NAME: '.ollama-code-backups',
  COMPRESSION_ENABLED: true,
  CHECKSUM_ALGORITHM: 'sha256',
} as const;

// Security Patterns
export const SECURITY_PATTERNS = {
  SYSTEM_FILES: [
    /^\/etc\//,
    /^\/bin\//,
    /^\/usr\//,
    /^\/sys\//,
    /^\/proc\//,
    /^\/dev\//,
    /^\/var\/lib\//,
    /^\/boot\//,
    /^C:\\Windows\\/i,
    /^C:\\Program Files/i,
    /^C:\\System32/i,
  ],
  CONFIG_FILES: [
    /\.env$/,
    /\.config$/,
    /\.conf$/,
    /\.ini$/,
    /\.cfg$/,
    /config\.(js|ts|json|yaml|yml)$/,
    /\.envrc$/,
    /\.env\..+$/,
  ],
  SECURITY_FILES: [
    /\.key$/,
    /\.pem$/,
    /\.crt$/,
    /\.p12$/,
    /\.pfx$/,
    /private.*key/i,
    /\.ssh\//,
    /\.gpg$/,
    /keystore/i,
    /password/i,
    /secret/i,
    /token/i,
  ],
} as const;

// Operation Status Messages
export const STATUS_MESSAGES = {
  OPERATION_APPROVED: '✅ Operation approved',
  OPERATION_REJECTED: '❌ Operation rejected',
  APPROVAL_REQUIRED: '⏳ Operation requires approval',
  PREVIEW_READY: '📋 Preview ready',
  BACKUP_CREATED: '💾 Backup created',
  ROLLBACK_COMPLETED: '⮎ Rollback completed',
  RISK_ASSESSED: '🔍 Risk assessment completed',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  COMPONENT_LOAD_TIMEOUT: 'Component loading timeout',
  OPERATION_TIMEOUT: 'Operation timeout',
  BACKUP_FAILED: 'Backup operation failed',
  ROLLBACK_FAILED: 'Rollback operation failed',
  RISK_ASSESSMENT_FAILED: 'Risk assessment failed',
  APPROVAL_DENIED: 'Operation approval denied',
  INVALID_OPERATION: 'Invalid operation type',
  FILE_NOT_FOUND: 'File not found',
  PERMISSION_DENIED: 'Permission denied',
} as const;

// Common File Extensions by Category
export const FILE_CATEGORIES = {
  SOURCE_CODE: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php'],
  CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config'],
  DOCS: ['.md', '.txt', '.rst', '.adoc'],
  ASSETS: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.css', '.scss', '.less'],
  DATA: ['.sql', '.db', '.sqlite', '.csv', '.xml', '.parquet'],
} as const;

// Progress Tracking
export const PROGRESS_CONFIG = {
  UPDATE_INTERVAL_MS: 1000,
  MAX_PROGRESS_ENTRIES: 100,
  CLEANUP_INTERVAL_MS: 60000, // 1 minute
} as const;