/**
 * Configuration Type Definitions
 *
 * Centralized type definitions for all configuration options in the application.
 * This ensures type safety and provides a single source of truth for configuration structure.
 */

export interface CacheConfig {
  /** Time-to-live for cached items in milliseconds */
  ttl: number;
  /** Maximum number of items in cache */
  maxSize: number;
  /** Cleanup interval for expired items in milliseconds */
  cleanupInterval: number;
  /** Enable/disable caching globally */
  enabled: boolean;
}

export interface TimeoutConfig {
  /** AI completion timeout in milliseconds */
  aiCompletion: number;
  /** File operation timeout in milliseconds */
  fileOperation: number;
  /** Server health check timeout in milliseconds */
  serverHealth: number;
  /** Network request timeout in milliseconds */
  networkRequest: number;
  /** Analysis timeout in milliseconds */
  analysis: number;
}

export interface PerformanceConfig {
  /** Memory management settings */
  memory: {
    /** Garbage collection delay in milliseconds */
    gcDelay: number;
    /** Memory warning threshold in MB */
    warningThreshold: number;
    /** Memory limit threshold in MB */
    limitThreshold: number;
  };

  /** Polling settings */
  polling: {
    /** Default polling interval in milliseconds */
    interval: number;
    /** Maximum polling interval in milliseconds */
    maxInterval: number;
    /** Minimum polling interval in milliseconds */
    minInterval: number;
  };

  /** File system settings */
  filesystem: {
    /** Maximum concurrent file operations */
    maxConcurrentOps: number;
    /** File read chunk size in bytes */
    chunkSize: number;
    /** Enable file operation caching */
    enableCaching: boolean;
  };
}

export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Enable console logging */
  enableConsole: boolean;
  /** Enable file logging */
  enableFile: boolean;
  /** Log file path */
  filePath?: string;
  /** Maximum log file size in MB */
  maxFileSize: number;
  /** Number of log files to keep */
  maxFiles: number;
}

export interface SecurityConfig {
  /** Enable input sanitization */
  enableSanitization: boolean;
  /** Maximum input length */
  maxInputLength: number;
  /** Allowed file extensions */
  allowedExtensions: string[];
  /** Blocked file patterns */
  blockedPatterns: string[];
}

export interface IntegrationConfig {
  /** Ollama server settings */
  ollama: {
    /** Server URL */
    url: string;
    /** Connection timeout */
    timeout: number;
    /** Enable health checks */
    enableHealthChecks: boolean;
    /** Health check interval */
    healthCheckInterval: number;
  };

  /** Telemetry settings */
  telemetry: {
    /** Enable telemetry collection */
    enabled: boolean;
    /** Submission interval in milliseconds */
    submissionInterval: number;
    /** Maximum event buffer size */
    maxBufferSize: number;
  };
}

export interface DevelopmentConfig {
  /** Enable debug mode */
  debug: boolean;
  /** Enable verbose logging */
  verbose: boolean;
  /** Enable performance monitoring */
  enableProfiling: boolean;
  /** Mock external services */
  mockServices: boolean;
}

/**
 * Main application configuration interface
 */
export interface AppConfig {
  /** Cache configuration */
  cache: CacheConfig;
  /** Timeout configuration */
  timeouts: TimeoutConfig;
  /** Performance configuration */
  performance: PerformanceConfig;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Security configuration */
  security: SecurityConfig;
  /** Integration configuration */
  integrations: IntegrationConfig;
  /** Development configuration */
  development: DevelopmentConfig;
}

/**
 * Environment types
 */
export type Environment = 'development' | 'test' | 'production';

/**
 * Configuration source types
 */
export interface ConfigSource {
  /** Configuration source name */
  name: string;
  /** Configuration source priority (higher = more important) */
  priority: number;
  /** Load configuration from source */
  load(): Promise<Partial<AppConfig>>;
  /** Check if source is available */
  isAvailable(): boolean;
}