/**
 * Centralized Provider Configuration
 *
 * Centralizes all hardcoded values from the provider system into a single
 * configurable location, following the DRY principle.
 */

import { RETRY_CONSTANTS, TIMEOUT_CONSTANTS } from '../../config/constants.js';

export interface ProviderConfig {
  // Cache Configuration
  cache: {
    defaultTtl: number;
    maxSize: number;
    cleanupInterval: number;
    compressionThreshold: number;
    retentionPeriod: number;
  };

  // Cost Budget Configuration
  budget: {
    defaultLimit: number;
    alertThresholds: {
      warning: number;
      critical: number;
    };
    refreshInterval: number;
    gracePeriod: number;
  };

  // A/B Testing Configuration
  abTesting: {
    defaultConfidenceLevel: number;
    minSampleSize: number;
    maxTestDuration: number; // days
    effectSizeThreshold: number;
    hashNormalizationFactor: number;
  };

  // Performance Monitoring
  performance: {
    metricsRetention: number; // days
    aggregationInterval: number; // seconds
    alertLatencyThreshold: number; // ms
    alertErrorRateThreshold: number; // percentage
  };

  // Security Configuration
  security: {
    encryptionAlgorithm: string;
    keyRotationInterval: number; // days
    sessionTimeout: number; // minutes
    maxRetryAttempts: number;
  };

  // Response Processing
  responseProcessing: {
    maxResponseSize: number; // bytes
    timeoutMs: number;
    retryDelayMs: number;
    maxRetries: number;
  };

  // Provider Limits
  providers: {
    maxConcurrent: number;
    healthCheckInterval: number; // seconds
    failureThreshold: number;
    recoveryTime: number; // seconds
  };
}

// Default configuration values
export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  cache: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 1000,
    cleanupInterval: 60000, // 1 minute
    compressionThreshold: 1024, // 1KB
    retentionPeriod: 86400000, // 24 hours
  },

  budget: {
    defaultLimit: 100.0, // $100
    alertThresholds: {
      warning: 0.8, // 80%
      critical: 0.95, // 95%
    },
    refreshInterval: 3600000, // 1 hour
    gracePeriod: 600000, // 10 minutes
  },

  abTesting: {
    defaultConfidenceLevel: 0.95, // 95%
    minSampleSize: 30,
    maxTestDuration: 30, // 30 days
    effectSizeThreshold: 0.2,
    hashNormalizationFactor: 4294967296, // 2^32
  },

  performance: {
    metricsRetention: 30, // 30 days
    aggregationInterval: 60, // 1 minute
    alertLatencyThreshold: 5000, // 5 seconds
    alertErrorRateThreshold: 5, // 5%
  },

  security: {
    encryptionAlgorithm: 'aes-256-gcm',
    keyRotationInterval: 90, // 90 days
    sessionTimeout: 30, // 30 minutes
    maxRetryAttempts: 3,
  },

  responseProcessing: {
    maxResponseSize: 10485760, // 10MB
    timeoutMs: TIMEOUT_CONSTANTS.MEDIUM,
    retryDelayMs: RETRY_CONSTANTS.BASE_RETRY_DELAY,
    maxRetries: RETRY_CONSTANTS.DEFAULT_MAX_RETRIES,
  },

  providers: {
    maxConcurrent: 10,
    healthCheckInterval: 30, // 30 seconds
    failureThreshold: 5,
    recoveryTime: 300, // 5 minutes
  },
};

/**
 * Configuration Manager
 */
export class ProviderConfigManager {
  private static instance: ProviderConfigManager;
  private config: ProviderConfig;

  private constructor() {
    this.config = { ...DEFAULT_PROVIDER_CONFIG };
  }

  public static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  public getConfig(): ProviderConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<ProviderConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  public getCacheConfig() {
    return this.config.cache;
  }

  public getBudgetConfig() {
    return this.config.budget;
  }

  public getABTestingConfig() {
    return this.config.abTesting;
  }

  public getPerformanceConfig() {
    return this.config.performance;
  }

  public getSecurityConfig() {
    return this.config.security;
  }

  public getResponseProcessingConfig() {
    return this.config.responseProcessing;
  }

  public getProviderConfig() {
    return this.config.providers;
  }

  private mergeConfig(current: ProviderConfig, updates: Partial<ProviderConfig>): ProviderConfig {
    const merged = { ...current };

    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key as keyof ProviderConfig] = {
          ...merged[key as keyof ProviderConfig],
          ...value
        } as any;
      } else {
        (merged as any)[key] = value;
      }
    }

    return merged;
  }
}

// Export singleton instance
export const providerConfig = ProviderConfigManager.getInstance();