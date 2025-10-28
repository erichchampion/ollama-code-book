/**
 * Provider Manager
 *
 * Manages AI provider configuration, credentials, lifecycle, usage tracking,
 * and performance monitoring across all provider implementations.
 */

import { EventEmitter } from 'events';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';
import { BaseAIProvider, ProviderConfig } from './base-provider.js';
import { createProvider, validateProviderConfig } from './index.js';
import { logger } from '../../utils/logger.js';
import { providerConfig } from './provider-config.js';
import { getErrorMessage } from '../../utils/error-utils.js';

export interface ProviderCredentials {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  organizationId?: string;
  region?: string;
  endpoint?: string;
  encryptedData?: string;
  createdAt: Date;
  lastUpdated: Date;
  expiresAt?: Date;
}

export interface ProviderUsageStats {
  providerId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number; // in USD
  averageResponseTime: number;
  lastUsed: Date;
  dailyUsage: Map<string, number>; // date -> request count
  monthlyUsage: Map<string, number>; // YYYY-MM -> request count
}

export interface ProviderPerformanceMetrics {
  providerId: string;
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  successRate: number;
  errorRate: number;
  throughput: number; // requests per second
  availability: number; // uptime percentage
  lastHealthCheck: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

export interface ProviderBudget {
  providerId: string;
  dailyLimit: number; // USD
  monthlyLimit: number; // USD
  requestLimit: number; // per day
  tokenLimit: number; // per day
  alertThresholds: {
    cost: number; // percentage of budget
    requests: number; // percentage of limit
    tokens: number; // percentage of limit
  };
}

export interface ProviderManagerConfig {
  credentialsPath?: string;
  encryptionEnabled?: boolean;
  usageTrackingEnabled?: boolean;
  performanceMonitoringEnabled?: boolean;
  healthCheckInterval?: number; // milliseconds
  budgetEnforcementEnabled?: boolean;
  defaultProvider?: string;
  fallbackChain?: string[];
}

export class ProviderManager extends EventEmitter {
  private providers = new Map<string, BaseAIProvider>();
  private configurations = new Map<string, ProviderConfig>();
  private credentials = new Map<string, ProviderCredentials>();
  private usageStats = new Map<string, ProviderUsageStats>();
  private performanceMetrics = new Map<string, ProviderPerformanceMetrics>();
  private budgets = new Map<string, ProviderBudget>();
  private config: ProviderManagerConfig;
  private credentialsPath: string;
  private encryptionKey?: Buffer;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private saveLock = { config: false, credentials: false };

  constructor(config: ProviderManagerConfig = {}) {
    super();
    this.config = {
      credentialsPath: join(homedir(), '.ollama-code', 'providers'),
      encryptionEnabled: true,
      usageTrackingEnabled: true,
      performanceMonitoringEnabled: true,
      healthCheckInterval: 300000, // 5 minutes
      budgetEnforcementEnabled: true,
      ...config
    };

    this.credentialsPath = this.config.credentialsPath!;

    // Initialize encryption if enabled
    if (this.config.encryptionEnabled) {
      this.initializeEncryption();
    }

    // Start health monitoring if enabled
    if (this.config.performanceMonitoringEnabled) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Initialize encryption system
   */
  private initializeEncryption(): void {
    try {
      // Generate or load encryption key
      const keyPath = join(dirname(this.credentialsPath), '.provider-key');
      this.loadOrCreateEncryptionKey(keyPath);
    } catch (error) {
      logger.error('Failed to initialize encryption:', error);
      this.config.encryptionEnabled = false;
    }
  }

  /**
   * Load or create encryption key
   */
  private async loadOrCreateEncryptionKey(keyPath: string): Promise<void> {
    try {
      await access(keyPath);
      const keyData = await readFile(keyPath);
      this.encryptionKey = keyData;
    } catch {
      // Create new encryption key
      this.encryptionKey = randomBytes(32);
      await mkdir(dirname(keyPath), { recursive: true });
      await writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
      logger.info('Created new encryption key for provider credentials');
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM for authenticated encryption
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;

    try {
      const crypto = require('crypto');
      const config = providerConfig.getSecurityConfig();

      // Validate algorithm
      const validAlgorithms = ['aes-256-gcm', 'aes-192-gcm', 'aes-128-gcm'];
      if (!validAlgorithms.includes(config.encryptionAlgorithm)) {
        throw new Error(`Invalid encryption algorithm: ${config.encryptionAlgorithm}`);
      }

      const iv = randomBytes(12); // 12 bytes for GCM

      // Use createCipheriv (correct API) instead of createCipherGCM (doesn't exist)
      const cipher = crypto.createCipheriv(config.encryptionAlgorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt sensitive data using AES-256-GCM with authentication verification
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) return encryptedData;

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      logger.warn('Invalid encrypted data format, returning as-is');
      return encryptedData;
    }

    try {
      const crypto = require('crypto');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const config = providerConfig.getSecurityConfig();

      // Validate algorithm
      const validAlgorithms = ['aes-256-gcm', 'aes-192-gcm', 'aes-128-gcm'];
      if (!validAlgorithms.includes(config.encryptionAlgorithm)) {
        throw new Error(`Invalid encryption algorithm: ${config.encryptionAlgorithm}`);
      }

      // Use createDecipheriv (correct API) instead of createDecipherGCM (doesn't exist)
      const decipher = crypto.createDecipheriv(config.encryptionAlgorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data:', error);
      throw new Error('Decryption failed - data may be corrupted');
    }
  }

  /**
   * Register a new provider
   */
  async registerProvider(
    id: string,
    type: string,
    config: ProviderConfig,
    credentials?: ProviderCredentials
  ): Promise<void> {
    try {
      // Validate configuration
      if (!validateProviderConfig(type, config)) {
        throw new Error(`Invalid configuration for provider type: ${type}`);
      }

      // Store credentials if provided
      if (credentials) {
        await this.storeCredentials(id, credentials);
      }

      // Create provider instance
      const provider = createProvider(type, config);

      // Store configuration and provider
      this.configurations.set(id, config);
      this.providers.set(id, provider);

      // Initialize usage stats
      this.usageStats.set(id, {
        providerId: id,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        averageResponseTime: 0,
        lastUsed: new Date(),
        dailyUsage: new Map(),
        monthlyUsage: new Map()
      });

      // Initialize performance metrics
      this.performanceMetrics.set(id, {
        providerId: id,
        responseTime: { min: 0, max: 0, avg: 0, p95: 0, p99: 0 },
        successRate: 1.0,
        errorRate: 0.0,
        throughput: 0,
        availability: 1.0,
        lastHealthCheck: new Date(),
        healthStatus: 'unknown'
      });

      await this.saveConfiguration();
      this.emit('provider_registered', { id, type, config });
      logger.info(`Registered provider: ${id} (${type})`);

    } catch (error) {
      logger.error(`Failed to register provider ${id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a provider
   */
  async unregisterProvider(id: string): Promise<void> {
    try {
      const provider = this.providers.get(id);
      if (!provider) {
        throw new Error(`Provider not found: ${id}`);
      }

      // Cleanup provider resources
      if (typeof (provider as any).dispose === 'function') {
        await (provider as any).dispose();
      }

      // Remove from all maps
      this.providers.delete(id);
      this.configurations.delete(id);
      this.credentials.delete(id);
      this.usageStats.delete(id);
      this.performanceMetrics.delete(id);
      this.budgets.delete(id);

      await this.saveConfiguration();
      this.emit('provider_unregistered', { id });
      logger.info(`Unregistered provider: ${id}`);

    } catch (error) {
      logger.error(`Failed to unregister provider ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get provider instance
   */
  getProvider(id: string): BaseAIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered provider IDs
   */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(id: string): ProviderConfig | undefined {
    return this.configurations.get(id);
  }

  /**
   * Store credentials securely
   */
  async storeCredentials(id: string, credentials: ProviderCredentials): Promise<void> {
    try {
      const credentialsWithTimestamp = {
        ...credentials,
        createdAt: credentials.createdAt || new Date(),
        lastUpdated: new Date()
      };

      // Encrypt sensitive fields if encryption is enabled
      if (this.config.encryptionEnabled) {
        const sensitiveFields = ['apiKey', 'apiSecret'];
        const sensitiveData: Record<string, string> = {};

        // Collect sensitive field values first
        for (const field of sensitiveFields) {
          const value = credentialsWithTimestamp[field as keyof ProviderCredentials];
          if (value && typeof value === 'string') {
            sensitiveData[field] = value;
          }
        }

        // If we have sensitive data, encrypt it
        if (Object.keys(sensitiveData).length > 0) {
          // Merge with existing encrypted data if any
          const existingEncrypted = credentialsWithTimestamp.encryptedData
            ? JSON.parse(this.decrypt(credentialsWithTimestamp.encryptedData))
            : {};

          credentialsWithTimestamp.encryptedData = this.encrypt(JSON.stringify({
            ...existingEncrypted,
            ...sensitiveData
          }));

          // Remove sensitive fields from the main object after encryption
          for (const field of sensitiveFields) {
            if (field in credentialsWithTimestamp) {
              delete credentialsWithTimestamp[field as keyof ProviderCredentials];
            }
          }
        }
      }

      this.credentials.set(id, credentialsWithTimestamp);
      await this.saveCredentials();

      this.emit('credentials_stored', { id });
      logger.info(`Stored credentials for provider: ${id}`);

    } catch (error) {
      logger.error(`Failed to store credentials for provider ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get credentials for provider
   */
  getCredentials(id: string): ProviderCredentials | undefined {
    const credentials = this.credentials.get(id);
    if (!credentials) return undefined;

    // Decrypt sensitive data if needed
    if (credentials.encryptedData && this.config.encryptionEnabled) {
      try {
        const decryptedData = JSON.parse(this.decrypt(credentials.encryptedData));
        return { ...credentials, ...decryptedData };
      } catch (error) {
        logger.error(`Failed to decrypt credentials for provider ${id}:`, error);
        return credentials;
      }
    }

    return credentials;
  }

  /**
   * Track usage for a provider
   */
  trackUsage(
    id: string,
    success: boolean,
    tokensUsed: number,
    responseTime: number,
    cost?: number
  ): void {
    if (!this.config.usageTrackingEnabled) return;

    const stats = this.usageStats.get(id);
    if (!stats) return;

    // Update basic stats
    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    stats.totalTokensUsed += tokensUsed;
    stats.totalCost += cost || 0;
    stats.lastUsed = new Date();

    // Update average response time
    const totalResponseTime = stats.averageResponseTime * (stats.totalRequests - 1) + responseTime;
    stats.averageResponseTime = totalResponseTime / stats.totalRequests;

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyCount = stats.dailyUsage.get(today) || 0;
    stats.dailyUsage.set(today, dailyCount + 1);

    // Update monthly usage
    const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyCount = stats.monthlyUsage.get(thisMonth) || 0;
    stats.monthlyUsage.set(thisMonth, monthlyCount + 1);

    this.emit('usage_tracked', { id, success, tokensUsed, responseTime, cost });

    // Check budget limits
    if (this.config.budgetEnforcementEnabled) {
      this.checkBudgetLimits(id);
    }
  }

  /**
   * Get usage statistics for a provider
   */
  getUsageStats(id: string): ProviderUsageStats | undefined {
    return this.usageStats.get(id);
  }

  /**
   * Set budget for a provider
   */
  setBudget(id: string, budget: Omit<ProviderBudget, 'providerId'>): void {
    this.budgets.set(id, { providerId: id, ...budget });
    this.emit('budget_set', { id, budget });
    logger.info(`Set budget for provider ${id}: $${budget.dailyLimit}/day, $${budget.monthlyLimit}/month`);
  }

  /**
   * Check budget limits
   */
  private checkBudgetLimits(id: string): void {
    const budget = this.budgets.get(id);
    const stats = this.usageStats.get(id);

    if (!budget || !stats) return;

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);

    const dailyUsage = stats.dailyUsage.get(today) || 0;
    const monthlyUsage = stats.monthlyUsage.get(thisMonth) || 0;

    // Check daily limits
    if (dailyUsage >= budget.requestLimit) {
      this.emit('budget_limit_reached', { id, type: 'daily_requests', limit: budget.requestLimit, usage: dailyUsage });
    }

    // Check cost thresholds
    const dailyCostPercentage = (stats.totalCost / budget.dailyLimit) * 100;
    if (dailyCostPercentage >= budget.alertThresholds.cost) {
      this.emit('budget_threshold_reached', {
        id,
        type: 'daily_cost',
        threshold: budget.alertThresholds.cost,
        percentage: dailyCostPercentage
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Clear any existing interval to prevent memory leaks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    logger.debug('Health monitoring started');
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    for (const [id, provider] of this.providers) {
      try {
        const startTime = Date.now();

        // Perform basic health check (simple completion request)
        await provider.complete([{ role: 'user', content: 'ping' }], {
          maxTokens: 1,
          temperature: 0
        });

        const responseTime = Date.now() - startTime;

        // Update performance metrics
        const metrics = this.performanceMetrics.get(id);
        if (metrics) {
          metrics.lastHealthCheck = new Date();
          metrics.healthStatus = responseTime < 5000 ? 'healthy' : 'degraded';

          // Update response time stats
          if (metrics.responseTime.min === 0 || responseTime < metrics.responseTime.min) {
            metrics.responseTime.min = responseTime;
          }
          if (responseTime > metrics.responseTime.max) {
            metrics.responseTime.max = responseTime;
          }

          // Simple moving average for now - could be more sophisticated
          metrics.responseTime.avg = (metrics.responseTime.avg + responseTime) / 2;
        }

        this.emit('health_check_completed', { id, status: 'healthy', responseTime });

      } catch (error) {
        const metrics = this.performanceMetrics.get(id);
        if (metrics) {
          metrics.lastHealthCheck = new Date();
          metrics.healthStatus = 'unhealthy';
        }

        this.emit('health_check_failed', { id, error: getErrorMessage(error) });
        logger.warn(`Health check failed for provider ${id}:`, error);
      }
    }
  }

  /**
   * Get performance metrics for a provider
   */
  getPerformanceMetrics(id: string): ProviderPerformanceMetrics | undefined {
    return this.performanceMetrics.get(id);
  }

  /**
   * Save configuration to disk with file locking to prevent concurrent writes
   */
  private async saveConfiguration(): Promise<void> {
    // Wait if another save is in progress
    while (this.saveLock.config) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.saveLock.config = true;
    try {
      await mkdir(dirname(this.credentialsPath), { recursive: true });

      const config = {
        providers: Array.from(this.configurations.entries()).map(([id, config]) => ({
          id,
          ...config
        })),
        usageStats: Array.from(this.usageStats.entries()).map(([id, stats]) => ({
          id,
          ...stats,
          dailyUsage: Object.fromEntries(stats.dailyUsage),
          monthlyUsage: Object.fromEntries(stats.monthlyUsage)
        })),
        budgets: Array.from(this.budgets.entries()).map(([id, budget]) => ({ id, ...budget }))
      };

      const configPath = join(this.credentialsPath, 'config.json');
      await writeFile(configPath, JSON.stringify(config, null, 2));

      logger.debug('Provider configuration saved successfully');

    } catch (error) {
      logger.error('Failed to save provider configuration:', error);
    } finally {
      this.saveLock.config = false;
    }
  }

  /**
   * Save credentials to disk with file locking to prevent concurrent writes
   */
  private async saveCredentials(): Promise<void> {
    // Wait if another save is in progress
    while (this.saveLock.credentials) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.saveLock.credentials = true;
    try {
      await mkdir(this.credentialsPath, { recursive: true });

      const credentialsData = Object.fromEntries(this.credentials);
      const credentialsPath = join(this.credentialsPath, 'credentials.json');
      await writeFile(credentialsPath, JSON.stringify(credentialsData, null, 2), { mode: 0o600 });

      logger.debug('Provider credentials saved successfully');

    } catch (error) {
      logger.error('Failed to save provider credentials:', error);
    } finally {
      this.saveLock.credentials = false;
    }
  }

  /**
   * Load configuration from disk
   */
  async loadConfiguration(): Promise<void> {
    try {
      const configPath = join(this.credentialsPath, 'config.json');
      const configData = await readFile(configPath, 'utf8');
      const config = JSON.parse(configData);

      // Load provider configurations
      for (const providerConfig of config.providers || []) {
        const { id, ...config } = providerConfig;
        this.configurations.set(id, config);

        try {
          const provider = createProvider(config.type, config);
          this.providers.set(id, provider);
        } catch (error) {
          logger.warn(`Failed to create provider ${id}:`, error);
        }
      }

      // Load usage stats
      for (const stats of config.usageStats || []) {
        const { id, ...statsData } = stats;
        this.usageStats.set(id, {
          ...statsData,
          dailyUsage: new Map(Object.entries(statsData.dailyUsage || {})),
          monthlyUsage: new Map(Object.entries(statsData.monthlyUsage || {}))
        });
      }

      // Load budgets
      for (const budget of config.budgets || []) {
        const { id, ...budgetData } = budget;
        this.budgets.set(id, { providerId: id, ...budgetData });
      }

    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error('Failed to load provider configuration:', error);
      }
    }
  }

  /**
   * Load credentials from disk
   */
  async loadCredentials(): Promise<void> {
    try {
      const credentialsPath = join(this.credentialsPath, 'credentials.json');
      const credentialsData = await readFile(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);

      for (const [id, creds] of Object.entries(credentials)) {
        this.credentials.set(id, creds as ProviderCredentials);
      }

    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error('Failed to load provider credentials:', error);
      }
    }
  }

  /**
   * Initialize the provider manager
   */
  async initialize(): Promise<void> {
    await this.loadConfiguration();
    await this.loadCredentials();

    logger.info(`Provider Manager initialized with ${this.providers.size} providers`);
    this.emit('initialized');
  }

  /**
   * Dispose of the provider manager
   */
  async dispose(): Promise<void> {
    // Stop health monitoring - clear interval to prevent memory leaks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.debug('Health monitoring stopped');
    }

    // Dispose of all providers
    for (const [id, provider] of this.providers) {
      try {
        if (typeof (provider as any).dispose === 'function') {
          await (provider as any).dispose();
        }
      } catch (error) {
        logger.error(`Failed to dispose provider ${id}:`, error);
      }
    }

    // Save final state
    await this.saveConfiguration();
    await this.saveCredentials();

    // Clear all maps
    this.providers.clear();
    this.configurations.clear();
    this.credentials.clear();
    this.usageStats.clear();
    this.performanceMetrics.clear();
    this.budgets.clear();

    this.removeAllListeners();
    logger.info('Provider Manager disposed');
  }
}