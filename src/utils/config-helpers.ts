/**
 * Configuration Helpers
 *
 * Utility functions for creating default/minimal configurations
 */

import type { AppConfig } from '../types/app-interfaces.js';

/**
 * Get a minimal default configuration
 * Useful for initialization when full config loading is not needed or might fail
 */
export function getMinimalConfig(): AppConfig {
  return {
    api: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      version: 'v1',
      timeout: 30000
    },
    ai: {
      model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:latest',
      temperature: 0.7,
      maxTokens: 4096,
      maxHistoryLength: 20
    },
    terminal: {
      theme: 'system',
      useColors: true,
      showProgressIndicators: true,
      codeHighlighting: true
    },
    telemetry: {
      enabled: true,
      submissionInterval: 1800000, // 30 minutes
      maxQueueSize: 100,
      autoSubmit: true
    },
    fileOps: {
      maxReadSizeBytes: 10485760 // 10MB
    },
    execution: {
      shell: process.env.SHELL || 'bash'
    },
    logger: {
      level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
      timestamps: true,
      colors: true
    },
    version: '0.2.29'
  };
}

/**
 * Merge a partial config with defaults
 */
export function mergeWithDefaults(partial: Partial<AppConfig>): AppConfig {
  const defaults = getMinimalConfig();
  return {
    ...defaults,
    ...partial,
    api: { ...defaults.api, ...(partial.api || {}) },
    ai: { ...defaults.ai, ...(partial.ai || {}) },
    terminal: { ...defaults.terminal, ...(partial.terminal || {}) },
    telemetry: { ...defaults.telemetry, ...(partial.telemetry || {}) },
    fileOps: { ...defaults.fileOps, ...(partial.fileOps || {}) },
    execution: { ...defaults.execution, ...(partial.execution || {}) },
    logger: { ...defaults.logger, ...(partial.logger || {}) }
  };
}

/**
 * Security: A09:2021 - Security Logging and Monitoring Failures
 * A07:2021 - Identification and Authentication Failures
 *
 * Check if a configuration key contains sensitive information
 */
export function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  const sensitivePatterns = [
    'password',
    'secret',
    'token',
    'key',
    'apikey',
    'api_key',
    'auth',
    'credential',
    'private',
    'salt',
    'hash'
  ];

  return sensitivePatterns.some(pattern => lowerKey.includes(pattern));
}

/**
 * Security: A09:2021 - Security Logging and Monitoring Failures
 *
 * Redact sensitive value for display
 */
export function redactSensitiveValue(value: any): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  const strValue = String(value);

  // Show first 4 characters for context, redact the rest
  if (strValue.length <= 4) {
    return '[REDACTED]';
  }

  return `${strValue.substring(0, 4)}...[REDACTED]`;
}

/**
 * Security: A09:2021 - Security Logging and Monitoring Failures
 * A07:2021 - Identification and Authentication Failures
 *
 * Sanitize configuration value for safe display
 * Redacts sensitive values like passwords, tokens, secrets, etc.
 */
export function sanitizeConfigValue(key: string, value: any): string {
  if (isSensitiveKey(key)) {
    return redactSensitiveValue(value);
  }

  return JSON.stringify(value);
}

/**
 * Security: A05:2021 - Security Misconfiguration
 *
 * Check if we should show debug information based on environment
 */
export function shouldShowDebugInfo(): boolean {
  return process.env.NODE_ENV !== 'production';
}
