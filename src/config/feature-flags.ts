/**
 * Feature Flags System for Gradual Rollout
 *
 * Provides a centralized system for managing feature flags to enable/disable
 * performance optimizations and new features for gradual rollout.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  category: 'performance' | 'experimental' | 'beta' | 'stable';
  rolloutPercentage?: number; // For gradual rollout (0-100)
  enabledForUsers?: string[]; // Specific users who have access
  metadata?: Record<string, any>;
}

export interface FeatureFlagsConfig {
  flags: Map<string, FeatureFlag>;
  globalOverride?: boolean; // Force enable/disable all flags
  userOverrides?: Map<string, Map<string, boolean>>; // User-specific overrides
}

/**
 * Feature Flags Manager
 */
export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager;
  private config: FeatureFlagsConfig;
  private configPath: string;
  private userId?: string;

  private constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadConfiguration();
    this.initializeDefaultFlags();
  }

  static getInstance(): FeatureFlagsManager {
    if (!FeatureFlagsManager.instance) {
      FeatureFlagsManager.instance = new FeatureFlagsManager();
    }
    return FeatureFlagsManager.instance;
  }

  private getConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.ollama-code', 'feature-flags.json');
  }

  private loadConfiguration(): FeatureFlagsConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(data);
        return {
          flags: new Map(Object.entries(parsed.flags || {})),
          globalOverride: parsed.globalOverride,
          userOverrides: parsed.userOverrides ? new Map(Object.entries(parsed.userOverrides)) : undefined
        };
      }
    } catch (error) {
      console.warn('Failed to load feature flags configuration:', error);
    }

    return {
      flags: new Map(),
      globalOverride: undefined,
      userOverrides: new Map()
    };
  }

  private saveConfiguration(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        flags: Object.fromEntries(this.config.flags),
        globalOverride: this.config.globalOverride,
        userOverrides: this.config.userOverrides ? Object.fromEntries(this.config.userOverrides) : undefined
      };

      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save feature flags configuration:', error);
    }
  }

  private initializeDefaultFlags(): void {
    // Performance optimization flags
    this.registerFlag({
      name: 'incremental-indexing',
      description: 'Enable incremental knowledge graph indexing',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    this.registerFlag({
      name: 'predictive-caching',
      description: 'Enable predictive AI response caching',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    this.registerFlag({
      name: 'streaming-responses',
      description: 'Enable streaming response system',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    this.registerFlag({
      name: 'lazy-module-loading',
      description: 'Enable lazy loading of non-critical modules',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    this.registerFlag({
      name: 'background-service',
      description: 'Enable background daemon service',
      enabled: false,
      category: 'experimental',
      rolloutPercentage: 0
    });

    this.registerFlag({
      name: 'distributed-processing',
      description: 'Enable distributed processing for large codebases',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    this.registerFlag({
      name: 'memory-optimization',
      description: 'Enable advanced memory optimization strategies',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    this.registerFlag({
      name: 'graph-partitioning',
      description: 'Enable graph partitioning for large codebases',
      enabled: true,
      category: 'performance',
      rolloutPercentage: 100
    });

    // Experimental features
    this.registerFlag({
      name: 'ai-code-generation-v2',
      description: 'Enable experimental AI code generation improvements',
      enabled: false,
      category: 'experimental',
      rolloutPercentage: 0
    });

    this.registerFlag({
      name: 'real-time-collaboration',
      description: 'Enable real-time collaboration features',
      enabled: false,
      category: 'experimental',
      rolloutPercentage: 0
    });
  }

  /**
   * Register a new feature flag
   */
  registerFlag(flag: FeatureFlag): void {
    if (!this.config.flags.has(flag.name)) {
      this.config.flags.set(flag.name, flag);
      this.saveConfiguration();
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName: string): boolean {
    // Check global override
    if (this.config.globalOverride !== undefined) {
      return this.config.globalOverride;
    }

    // Check user-specific override
    if (this.userId && this.config.userOverrides?.has(this.userId)) {
      const userOverrides = this.config.userOverrides.get(this.userId);
      if (userOverrides?.has(flagName)) {
        return userOverrides.get(flagName)!;
      }
    }

    const flag = this.config.flags.get(flagName);
    if (!flag) {
      return false;
    }

    // Check if user is in enabled users list
    if (flag.enabledForUsers && this.userId) {
      if (flag.enabledForUsers.includes(this.userId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(this.userId || 'anonymous');
      const percentage = (hash % 100) + 1;
      return percentage <= flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  /**
   * Enable a feature flag
   */
  enableFlag(flagName: string, rolloutPercentage?: number): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.enabled = true;
      if (rolloutPercentage !== undefined) {
        flag.rolloutPercentage = rolloutPercentage;
      }
      this.saveConfiguration();
    }
  }

  /**
   * Disable a feature flag
   */
  disableFlag(flagName: string): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.enabled = false;
      this.saveConfiguration();
    }
  }

  /**
   * Set user ID for user-specific feature flags
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.config.flags.values());
  }

  /**
   * Get enabled feature flags
   */
  getEnabledFlags(): string[] {
    return Array.from(this.config.flags.keys()).filter(name => this.isEnabled(name));
  }

  /**
   * Set rollout percentage for gradual rollout
   */
  setRolloutPercentage(flagName: string, percentage: number): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      this.saveConfiguration();
    }
  }

  /**
   * Enable flag for specific users
   */
  enableForUsers(flagName: string, userIds: string[]): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.enabledForUsers = userIds;
      this.saveConfiguration();
    }
  }

  /**
   * Set user-specific override
   */
  setUserOverride(userId: string, flagName: string, enabled: boolean): void {
    if (!this.config.userOverrides) {
      this.config.userOverrides = new Map();
    }

    if (!this.config.userOverrides.has(userId)) {
      this.config.userOverrides.set(userId, new Map());
    }

    this.config.userOverrides.get(userId)!.set(flagName, enabled);
    this.saveConfiguration();
  }

  /**
   * Get feature flag status report
   */
  getStatusReport(): string {
    const lines: string[] = ['Feature Flags Status Report', '=' .repeat(50)];

    const categories = ['stable', 'performance', 'beta', 'experimental'] as const;

    for (const category of categories) {
      const flags = Array.from(this.config.flags.values()).filter(f => f.category === category);
      if (flags.length > 0) {
        lines.push('', `${category.toUpperCase()} Features:`);
        for (const flag of flags) {
          const status = this.isEnabled(flag.name) ? '✅' : '❌';
          const rollout = flag.rolloutPercentage !== undefined ? ` (${flag.rolloutPercentage}%)` : '';
          lines.push(`  ${status} ${flag.name}${rollout}: ${flag.description}`);
        }
      }
    }

    lines.push('', 'Summary:');
    lines.push(`  Total flags: ${this.config.flags.size}`);
    lines.push(`  Enabled: ${this.getEnabledFlags().length}`);
    lines.push(`  User ID: ${this.userId || 'anonymous'}`);

    return lines.join('\n');
  }

  /**
   * Reset all flags to defaults
   */
  resetToDefaults(): void {
    this.config.flags.clear();
    this.config.userOverrides?.clear();
    this.config.globalOverride = undefined;
    this.initializeDefaultFlags();
    this.saveConfiguration();
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagsManager.getInstance();

// Helper function for checking feature flags in code
export function isFeatureEnabled(flagName: string): boolean {
  return featureFlags.isEnabled(flagName);
}

// Helper decorator for feature-flagged methods
export function FeatureFlagged(flagName: string, fallback?: Function) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
      if (isFeatureEnabled(flagName)) {
        return originalMethod.apply(this, args);
      } else if (fallback) {
        return fallback.apply(this, args);
      } else {
        console.debug(`Feature '${flagName}' is disabled, skipping ${propertyName}`);
        return null;
      }
    };

    return descriptor;
  };
}