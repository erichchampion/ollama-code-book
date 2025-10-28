/**
 * Configuration Validation System
 *
 * Provides comprehensive validation for all configuration values:
 * - Runtime type checking
 * - Value range validation
 * - Cross-field validation
 * - Migration support for configuration changes
 * - Helpful error messages with suggestions
 */

import { logger } from '../utils/logger.js';

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  description?: string;
}

interface ValidationError {
  field: string;
  value: any;
  error: string;
  suggestion?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface ConfigMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (config: any) => any;
  description: string;
}

export class ConfigValidator {
  private rules = new Map<string, ValidationRule>();
  private migrations: ConfigMigration[] = [];

  constructor() {
    this.registerDefaultRules();
    this.registerMigrations();
  }

  /**
   * Validate entire configuration object
   */
  validateConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate structure
    if (!config || typeof config !== 'object') {
      errors.push({
        field: 'root',
        value: config,
        error: 'Configuration must be an object',
        suggestion: 'Ensure configuration is a valid JSON object'
      });
      return { valid: false, errors, warnings };
    }

    // Validate each field according to rules
    for (const [field, rule] of this.rules.entries()) {
      const value = this.getNestedValue(config, field);
      const result = this.validateField(field, value, rule);

      if (result) {
        if (result.severity === 'error') {
          errors.push(result);
        } else {
          warnings.push(result);
        }
      }
    }

    // Cross-field validation
    const crossValidationErrors = this.performCrossValidation(config);
    errors.push(...crossValidationErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a specific field
   */
  validateField(field: string, value: any, rule: ValidationRule): ValidationError & { severity: 'error' | 'warning' } | null {
    // Check if required field is missing
    if (rule.required && (value === undefined || value === null)) {
      return {
        field,
        value,
        error: `Required field '${field}' is missing`,
        suggestion: `Add '${field}' to your configuration`,
        severity: 'error'
      };
    }

    // Skip validation if field is optional and missing
    if (!rule.required && (value === undefined || value === null)) {
      return null;
    }

    // Type validation
    const typeError = this.validateType(field, value, rule.type);
    if (typeError) return { ...typeError, severity: 'error' };

    // Range validation for numbers
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          field,
          value,
          error: `Value ${value} is below minimum ${rule.min}`,
          suggestion: `Set ${field} to at least ${rule.min}`,
          severity: 'error'
        };
      }

      if (rule.max !== undefined && value > rule.max) {
        return {
          field,
          value,
          error: `Value ${value} exceeds maximum ${rule.max}`,
          suggestion: `Set ${field} to at most ${rule.max}`,
          severity: 'error'
        };
      }
    }

    // Pattern validation for strings
    if (rule.type === 'string' && typeof value === 'string' && rule.pattern) {
      if (!rule.pattern.test(value)) {
        return {
          field,
          value,
          error: `Value '${value}' does not match required pattern`,
          suggestion: `Ensure ${field} follows the correct format`,
          severity: 'error'
        };
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return {
        field,
        value,
        error: `Value '${value}' is not valid`,
        suggestion: `Use one of: ${rule.enum.join(', ')}`,
        severity: 'error'
      };
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        return {
          field,
          value,
          error: typeof result === 'string' ? result : 'Custom validation failed',
          suggestion: rule.description || 'Check field documentation',
          severity: 'error'
        };
      }
    }

    return null;
  }

  /**
   * Migrate configuration to current version
   */
  migrateConfig(config: any): { config: any; migrated: boolean; changes: string[] } {
    const currentVersion = config.version || '1.0.0';
    let migratedConfig = { ...config };
    const changes: string[] = [];
    let migrated = false;

    // Apply migrations in order
    for (const migration of this.migrations) {
      if (this.shouldApplyMigration(currentVersion, migration)) {
        logger.info(`Applying migration: ${migration.description}`);
        migratedConfig = migration.migrate(migratedConfig);
        changes.push(migration.description);
        migrated = true;
      }
    }

    // Update version if migrated
    if (migrated) {
      migratedConfig.version = this.getLatestVersion();
    }

    return { config: migratedConfig, migrated, changes };
  }

  /**
   * Register validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.field, rule);
    logger.debug(`Registered validation rule for: ${rule.field}`);
  }

  /**
   * Register configuration migration
   */
  registerMigration(migration: ConfigMigration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion.localeCompare(b.fromVersion));
    logger.debug(`Registered migration: ${migration.description}`);
  }

  /**
   * Get validation suggestions for invalid configuration
   */
  getSuggestions(config: any): string[] {
    const result = this.validateConfig(config);
    const suggestions: string[] = [];

    for (const error of result.errors) {
      if (error.suggestion) {
        suggestions.push(`• ${error.suggestion}`);
      }
    }

    for (const warning of result.warnings) {
      if (warning.suggestion) {
        suggestions.push(`• ${warning.suggestion} (warning)`);
      }
    }

    return suggestions;
  }

  /**
   * Validate type
   */
  private validateType(field: string, value: any, expectedType: string): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      return {
        field,
        value,
        error: `Expected ${expectedType}, got ${actualType}`,
        suggestion: `Ensure ${field} is a ${expectedType}`
      };
    }

    return null;
  }

  /**
   * Perform cross-field validation
   */
  private performCrossValidation(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // AI configuration validation
    if (config.ai) {
      // Validate model compatibility
      if (config.ai.defaultModel && config.ai.contextWindowSize) {
        const modelLimits = this.getModelLimits(config.ai.defaultModel);
        if (modelLimits && config.ai.contextWindowSize > modelLimits.maxContext) {
          errors.push({
            field: 'ai.contextWindowSize',
            value: config.ai.contextWindowSize,
            error: `Context window ${config.ai.contextWindowSize} exceeds model limit ${modelLimits.maxContext}`,
            suggestion: `Reduce context window or use a different model`
          });
        }
      }

      // Validate timeout vs retries
      if (config.ai.timeout && config.ai.retryAttempts) {
        const totalTime = config.ai.timeout * config.ai.retryAttempts;
        if (totalTime > 300000) { // 5 minutes
          errors.push({
            field: 'ai.retryAttempts',
            value: config.ai.retryAttempts,
            error: 'Total retry time exceeds 5 minutes',
            suggestion: 'Reduce retry attempts or timeout duration'
          });
        }
      }
    }

    // Performance configuration validation
    if (config.performance) {
      // Validate cache size vs available memory
      if (config.performance.maxCacheSize && config.performance.maxMemoryUsage) {
        // This is a simplified check - in reality, you'd check system memory
        if (config.performance.maxCacheSize > 1024 * 1024 * 1024) { // 1GB
          errors.push({
            field: 'performance.maxCacheSize',
            value: config.performance.maxCacheSize,
            error: 'Cache size is very large',
            suggestion: 'Consider reducing cache size to avoid memory issues'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get model limits for validation
   */
  private getModelLimits(model: string): { maxContext: number } | null {
    const modelLimits: Record<string, { maxContext: number }> = {
      'llama3.2': { maxContext: 128000 },
      'codellama': { maxContext: 16384 },
      'mistral': { maxContext: 32768 },
      'qwen2.5-coder': { maxContext: 32768 }
    };

    return modelLimits[model] || null;
  }

  /**
   * Check if migration should be applied
   */
  private shouldApplyMigration(currentVersion: string, migration: ConfigMigration): boolean {
    return this.compareVersions(currentVersion, migration.fromVersion) >= 0 &&
           this.compareVersions(currentVersion, migration.toVersion) < 0;
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  /**
   * Get latest configuration version
   */
  private getLatestVersion(): string {
    return '2.0.0'; // Update this when adding new migrations
  }

  /**
   * Register default validation rules
   */
  private registerDefaultRules(): void {
    // AI configuration rules
    this.registerRule({
      field: 'ai.defaultModel',
      type: 'string',
      required: true,
      description: 'Default AI model to use'
    });

    this.registerRule({
      field: 'ai.timeout',
      type: 'number',
      required: false,
      min: 1000,
      max: 300000,
      description: 'AI request timeout in milliseconds'
    });

    this.registerRule({
      field: 'ai.retryAttempts',
      type: 'number',
      required: false,
      min: 0,
      max: 10,
      description: 'Number of retry attempts for failed AI requests'
    });

    this.registerRule({
      field: 'ai.contextWindowSize',
      type: 'number',
      required: false,
      min: 1024,
      max: 200000,
      description: 'Maximum context window size for AI requests'
    });

    // UI configuration rules
    this.registerRule({
      field: 'ui.theme',
      type: 'string',
      required: false,
      enum: ['light', 'dark', 'auto'],
      description: 'UI theme preference'
    });

    this.registerRule({
      field: 'ui.colorOutput',
      type: 'boolean',
      required: false,
      description: 'Enable colored output'
    });

    // Performance configuration rules
    this.registerRule({
      field: 'performance.maxCacheSize',
      type: 'number',
      required: false,
      min: 1024 * 1024, // 1MB
      max: 2 * 1024 * 1024 * 1024, // 2GB
      description: 'Maximum cache size in bytes'
    });

    this.registerRule({
      field: 'performance.maxMemoryUsage',
      type: 'number',
      required: false,
      min: 0.1,
      max: 1.0,
      description: 'Maximum memory usage as fraction (0.1-1.0)'
    });

    // Git configuration rules
    this.registerRule({
      field: 'git.commitFormat',
      type: 'string',
      required: false,
      enum: ['conventional', 'standard', 'custom'],
      description: 'Git commit message format'
    });

    // Analytics configuration rules
    this.registerRule({
      field: 'analytics.enabled',
      type: 'boolean',
      required: false,
      description: 'Enable usage analytics collection'
    });
  }

  /**
   * Register configuration migrations
   */
  private registerMigrations(): void {
    this.registerMigration({
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      description: 'Add performance configuration section',
      migrate: (config) => ({
        ...config,
        performance: {
          maxCacheSize: 100 * 1024 * 1024, // 100MB
          maxMemoryUsage: 0.8,
          ...config.performance
        }
      })
    });

    this.registerMigration({
      fromVersion: '1.1.0',
      toVersion: '2.0.0',
      description: 'Restructure AI configuration and add new fields',
      migrate: (config) => {
        const newConfig = { ...config };

        // Migrate old AI settings
        if (config.model) {
          newConfig.ai = {
            defaultModel: config.model,
            ...config.ai
          };
          delete newConfig.model;
        }

        // Add new analytics section
        if (!newConfig.analytics) {
          newConfig.analytics = {
            enabled: true,
            retentionDays: 30
          };
        }

        return newConfig;
      }
    });
  }

  /**
   * Dispose of the config validator and clean up resources
   */
  async dispose(): Promise<void> {
    this.rules.clear();
    this.migrations.splice(0);
    logger.debug('Config validator disposed');
  }
}

// Global config validator instance
// Legacy export - use dependency injection instead
// export const configValidator = ConfigValidator.getInstance();