/**
 * Secure default configuration
 */
export class SecureConfiguration {
  /**
   * Get production-ready security configuration
   */
  static getProductionConfig(): SecurityConfig {
    return {
      // Sandbox configuration
      sandbox: {
        ...DEFAULT_SANDBOX_CONFIG,
        readOnly: false,
        allowNetwork: false,
        maxExecutionTime: 30000
      },

      // Credential configuration
      credentials: {
        storePath: path.join(os.homedir(), '.ollama-code', 'credentials.enc'),
        encryptionAlgorithm: 'aes-256-gcm',
        keyDerivationIterations: 100000
      },

      // Rate limiting
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },

      // Budget limits
      budget: {
        hourlyLimit: 1.00, // $1/hour
        dailyLimit: 10.00, // $10/day
        monthlyLimit: 100.00 // $100/month
      },

      // Privacy
      privacy: {
        filterSensitiveData: true,
        useLocalForSensitive: true,
        anonymizeCode: false, // Optional
        redactLogs: true
      },

      // Audit logging
      audit: {
        enabled: true,
        logPath: path.join(os.homedir(), '.ollama-code', 'audit.log'),
        rotateSize: 10 * 1024 * 1024, // 10 MB
        maxFiles: 10
      },

      // Approval requirements
      approval: {
        requireForWrite: true,
        requireForDelete: true,
        requireForExecute: true,
        requireFor2FA: ['delete', 'execute_dangerous']
      }
    };
  }

  /**
   * Get development configuration (more permissive)
   */
  static getDevelopmentConfig(): SecurityConfig {
    const prod = this.getProductionConfig();

    return {
      ...prod,
      sandbox: {
        ...prod.sandbox,
        allowNetwork: true,
        maxExecutionTime: 60000
      },
      approval: {
        ...prod.approval,
        requireForWrite: false,
        requireForExecute: false
      }
    };
  }
}

export interface SecurityConfig {
  sandbox: SandboxConfig;
  credentials: CredentialConfig;
  rateLimits: RateLimitConfig;
  budget: BudgetLimits;
  privacy: PrivacyConfig;
  audit: AuditConfig;
  approval: ApprovalConfig;
}

interface CredentialConfig {
  storePath: string;
  encryptionAlgorithm: string;
  keyDerivationIterations: number;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

interface PrivacyConfig {
  filterSensitiveData: boolean;
  useLocalForSensitive: boolean;
  anonymizeCode: boolean;
  redactLogs: boolean;
}

interface AuditConfig {
  enabled: boolean;
  logPath: string;
  rotateSize: number;
  maxFiles: number;
}

interface ApprovalConfig {
  requireForWrite: boolean;
  requireForDelete: boolean;
  requireForExecute: boolean;
  requireFor2FA: string[];
}