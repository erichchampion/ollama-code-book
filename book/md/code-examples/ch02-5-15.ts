// src/ai/providers/provider-manager.ts
import { EventEmitter } from 'events';
import { BaseAIProvider } from './base-provider';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface ProviderCredentials {
  apiKey?: string;
  apiSecret?: string;
  organization?: string;
  customHeaders?: Record<string, string>;
}

export interface ProviderUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageResponseTime: number;
  dailyUsage: Map<string, number>;
  monthlyUsage: Map<string, number>;
  lastUsed?: Date;
}

export interface ProviderBudget {
  providerId: string;
  dailyLimit: number;
  monthlyLimit: number;
  alertThresholds: {
    percentage: number;
    cost: number;
  }[];
}

export class ProviderManager extends EventEmitter {
  private providers = new Map<string, BaseAIProvider>();
  private configurations = new Map<string, ProviderConfig>();
  private credentials = new Map<string, ProviderCredentials>();
  private usageStats = new Map<string, ProviderUsageStats>();
  private budgets = new Map<string, ProviderBudget>();

  private credentialsPath: string;
  private encryptionKey: Buffer;

  constructor(credentialsPath: string, encryptionPassword: string) {
    super();
    this.credentialsPath = credentialsPath;

    // Derive encryption key from password
    this.encryptionKey = scryptSync(encryptionPassword, 'salt', 32);
  }

  /**
   * Register a provider with the manager
   */
  async registerProvider(
    id: string,
    provider: BaseAIProvider,
    config: ProviderConfig
  ): Promise<void> {
    // Initialize provider
    await provider.initialize();

    // Store provider and config
    this.providers.set(id, provider);
    this.configurations.set(id, config);

    // Initialize usage stats
    this.usageStats.set(id, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageResponseTime: 0,
      dailyUsage: new Map(),
      monthlyUsage: new Map()
    });

    // Listen to provider metrics
    provider.on('metrics_updated', (metrics) => {
      this.updateUsageStats(id, metrics);
    });

    logger.info(`Provider registered: ${id} (${provider.getName()})`);
    this.emit('provider_registered', { id, name: provider.getName() });
  }

  /**
   * Unregister a provider
   */
  async unregisterProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }

    this.providers.delete(id);
    this.configurations.delete(id);
    this.credentials.delete(id);
    this.usageStats.delete(id);
    this.budgets.delete(id);

    logger.info(`Provider unregistered: ${id}`);
    this.emit('provider_unregistered', { id });
  }

  /**
   * Store credentials securely (encrypted)
   */
  async storeCredentials(
    id: string,
    credentials: ProviderCredentials
  ): Promise<void> {
    // Encrypt credentials
    const encrypted = this.encryptCredentials(credentials);

    // Store in memory
    this.credentials.set(id, credentials);

    // Persist to disk (encrypted)
    await this.persistCredentials(id, encrypted);

    this.emit('credentials_stored', { id });
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): BaseAIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * List all registered providers
   */
  listProviders(): Array<{ id: string; name: string; health: ProviderHealth }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.getName(),
      health: provider.getHealth()
    }));
  }

  /**
   * Get usage statistics for a provider
   */
  getUsageStats(id: string): ProviderUsageStats | undefined {
    return this.usageStats.get(id);
  }

  /**
   * Set budget limits for a provider
   */
  setBudget(budget: ProviderBudget): void {
    this.budgets.set(budget.providerId, budget);
    this.emit('budget_set', budget);
  }

  /**
   * Check if a request would exceed budget
   */
  checkBudget(id: string, estimatedCost: number): boolean {
    const budget = this.budgets.get(id);
    const stats = this.usageStats.get(id);

    if (!budget || !stats) return true; // No budget set, allow

    const today = new Date().toISOString().split('T')[0];
    const dailyCost = stats.dailyUsage.get(today) || 0;

    // Check daily limit
    if (dailyCost + estimatedCost > budget.dailyLimit) {
      this.emit('budget_exceeded', {
        id,
        type: 'daily',
        current: dailyCost,
        limit: budget.dailyLimit
      });
      return false;
    }

    // Check monthly limit
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyCost = stats.monthlyUsage.get(month) || 0;

    if (monthlyCost + estimatedCost > budget.monthlyLimit) {
      this.emit('budget_exceeded', {
        id,
        type: 'monthly',
        current: monthlyCost,
        limit: budget.monthlyLimit
      });
      return false;
    }

    // Check alert thresholds
    for (const threshold of budget.alertThresholds) {
      if (dailyCost >= budget.dailyLimit * (threshold.percentage / 100)) {
        this.emit('budget_alert', {
          id,
          type: 'daily',
          percentage: threshold.percentage,
          current: dailyCost,
          limit: budget.dailyLimit
        });
      }
    }

    return true;
  }

  /**
   * Track usage for a provider
   */
  trackUsage(
    id: string,
    success: boolean,
    tokensUsed: number,
    responseTime: number,
    cost: number
  ): void {
    const stats = this.usageStats.get(id);
    if (!stats) return;

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    stats.totalTokensUsed += tokensUsed;
    stats.totalCost += cost;
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) /
      stats.totalRequests;

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyCost = stats.dailyUsage.get(today) || 0;
    stats.dailyUsage.set(today, dailyCost + cost);

    // Update monthly usage
    const month = new Date().toISOString().substring(0, 7);
    const monthlyCost = stats.monthlyUsage.get(month) || 0;
    stats.monthlyUsage.set(month, monthlyCost + cost);

    stats.lastUsed = new Date();

    this.emit('usage_tracked', { id, stats });
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private updateUsageStats(id: string, metrics: ProviderMetrics): void {
    const stats = this.usageStats.get(id);
    if (!stats) return;

    // Update from provider metrics
    stats.totalRequests = metrics.totalRequests;
    stats.successfulRequests = metrics.successfulRequests;
    stats.failedRequests = metrics.failedRequests;
    stats.totalTokensUsed = metrics.totalTokensUsed;
    stats.totalCost = metrics.totalCost;
    stats.averageResponseTime = metrics.averageResponseTime;
  }

  /**
   * Encrypt credentials using AES-256-GCM
   */
  private encryptCredentials(credentials: ProviderCredentials): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const plaintext = JSON.stringify(credentials);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt credentials
   */
  private decryptCredentials(encrypted: string): ProviderCredentials {
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Persist encrypted credentials to disk
   */
  private async persistCredentials(id: string, encrypted: string): Promise<void> {
    const filePath = join(this.credentialsPath, `${id}.enc`);

    await fs.mkdir(this.credentialsPath, { recursive: true });
    await fs.writeFile(filePath, encrypted, { mode: 0o600 }); // Read/write owner only

    logger.debug(`Credentials persisted: ${id}`);
  }

  /**
   * Load encrypted credentials from disk
   */
  private async loadCredentials(id: string): Promise<ProviderCredentials | null> {
    const filePath = join(this.credentialsPath, `${id}.enc`);

    try {
      const encrypted = await fs.readFile(filePath, 'utf8');
      return this.decryptCredentials(encrypted);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }
}