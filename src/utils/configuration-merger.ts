/**
 * Configuration Merging Utility
 *
 * Provides centralized configuration merging functionality with validation
 * to eliminate duplicate config handling logic across providers.
 */

export interface ConfigValidationRule<T> {
  validate: (config: T) => boolean;
  message: string;
}

export interface MergeOptions {
  deepMerge?: boolean;
  allowUndefined?: boolean;
  validateAfterMerge?: boolean;
}

export class ConfigurationMerger {
  /**
   * Merge partial configuration with defaults
   */
  static mergeWithDefaults<T>(
    partialConfig: Partial<T>,
    defaults: T,
    options: MergeOptions = {}
  ): T {
    const { deepMerge = false, allowUndefined = false } = options;

    if (deepMerge) {
      return this.deepMerge(defaults, partialConfig, allowUndefined);
    }

    const filtered = allowUndefined
      ? partialConfig
      : this.filterUndefined(partialConfig);

    return { ...defaults, ...filtered };
  }

  /**
   * Merge configuration with validation
   */
  static mergeWithValidation<T>(
    partialConfig: Partial<T>,
    defaults: T,
    validationRules: ConfigValidationRule<T>[] = [],
    options: MergeOptions = {}
  ): T {
    const merged = this.mergeWithDefaults(partialConfig, defaults, options);

    if (options.validateAfterMerge !== false) {
      this.validateConfig(merged, validationRules);
    }

    return merged;
  }

  /**
   * Deep merge two objects
   */
  static deepMerge<T>(target: T, source: Partial<T>, allowUndefined = false): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];

        if (!allowUndefined && sourceValue === undefined) {
          continue;
        }

        if (this.isObject(sourceValue) && this.isObject(result[key])) {
          (result as any)[key] = this.deepMerge((result as any)[key], sourceValue, allowUndefined);
        } else {
          (result as any)[key] = sourceValue;
        }
      }
    }

    return result;
  }

  /**
   * Validate configuration against rules
   */
  static validateConfig<T>(
    config: T,
    validationRules: ConfigValidationRule<T>[]
  ): void {
    const errors: string[] = [];

    for (const rule of validationRules) {
      if (!rule.validate(config)) {
        errors.push(rule.message);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Filter out undefined values from partial config
   */
  static filterUndefined<T>(obj: Partial<T>): Partial<T> {
    const filtered: Partial<T> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        filtered[key] = obj[key];
      }
    }

    return filtered;
  }

  /**
   * Create environment-specific configuration overrides
   */
  static createEnvironmentOverrides<T>(
    baseConfig: T,
    environmentOverrides: Record<string, Partial<T>>,
    environment: string = process.env.NODE_ENV || 'development'
  ): T {
    const envOverrides = environmentOverrides[environment] || {};
    return this.mergeWithDefaults(envOverrides, baseConfig, { deepMerge: true });
  }

  /**
   * Merge multiple configuration sources in order of priority
   */
  static mergeMultiple<T>(
    defaultConfig: T,
    ...configs: Array<Partial<T> | undefined>
  ): T {
    return configs.reduce<T>((acc, config) => {
      if (config) {
        return this.mergeWithDefaults(config, acc, { deepMerge: true });
      }
      return acc;
    }, defaultConfig);
  }

  /**
   * Extract subset of configuration based on keys
   */
  static extractSubset<T extends object, K extends keyof T>(
    config: T,
    keys: K[]
  ): Pick<T, K> {
    const subset = {} as Pick<T, K>;

    for (const key of keys) {
      if (key in config) {
        subset[key] = config[key];
      }
    }

    return subset;
  }

  /**
   * Helper to check if value is a plain object
   */
  private static isObject(value: any): value is object {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(value instanceof RegExp)
    );
  }
}

/**
 * Common validation rules for AI provider configurations
 */
export class CommonValidationRules {
  static positiveNumber<T>(
    getter: (config: T) => number,
    fieldName: string
  ): ConfigValidationRule<T> {
    return {
      validate: (config) => {
        const value = getter(config);
        return typeof value === 'number' && value > 0;
      },
      message: `${fieldName} must be a positive number`
    };
  }

  static requiredString<T>(
    getter: (config: T) => string,
    fieldName: string
  ): ConfigValidationRule<T> {
    return {
      validate: (config) => {
        const value = getter(config);
        return typeof value === 'string' && value.trim().length > 0;
      },
      message: `${fieldName} is required and must be a non-empty string`
    };
  }

  static portRange<T>(
    getter: (config: T) => number,
    fieldName: string
  ): ConfigValidationRule<T> {
    return {
      validate: (config) => {
        const value = getter(config);
        return typeof value === 'number' && value >= 1024 && value <= 65535;
      },
      message: `${fieldName} must be a valid port number (1024-65535)`
    };
  }

  static percentageRange<T>(
    getter: (config: T) => number,
    fieldName: string
  ): ConfigValidationRule<T> {
    return {
      validate: (config) => {
        const value = getter(config);
        return typeof value === 'number' && value >= 0 && value <= 1;
      },
      message: `${fieldName} must be a percentage value between 0 and 1`
    };
  }
}