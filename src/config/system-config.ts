/**
 * System Configuration Management
 *
 * Centralizes all configuration values to eliminate hardcoded constants
 * throughout the system and provide consistent configuration management.
 */

import { AI_CONSTANTS, TIMEOUT_CONSTANTS } from './constants.js';

export interface AIConfiguration {
  commandConfidenceThreshold: number;
  taskConfidenceThreshold: number;
  healthCheckInterval: number;
  temperature: number;
  maxTokens: number;
  requestTimeout: number;
}

export interface VCSConfiguration {
  cacheExpiry: number;
  analysisDepth: number;
  riskThresholds: {
    taskCountHigh: number;
    taskCountMedium: number;
    durationHigh: number;
    durationMedium: number;
    changeCountCritical: number;
    changeCountHigh: number;
    authorCountMultiple: number;
    riskMultiplierSingle: number;
    riskMultiplierMultiple: number;
    riskMultiplierHigh: number;
  };
  qualityThresholds: {
    testCoverageGood: number;
    duplicationHigh: number;
    fileSizeThresholds: {
      large: number;
      medium: number;
      small: number;
    };
    lineChangeThresholds: {
      small: number;
      large: number;
    };
    complexityPenalties: {
      high: number;
      medium: number;
      low: number;
    };
  };
  patternAnalysis: {
    monthsForEstimate: number;
    changeFrequencyMultiplier: number;
    bugPronenessMultiplier: number;
    stabilityMultiplier: number;
  };
  timeConstants: {
    dayInMs: number;
    weekInMs: number;
    monthInMs: number;
    trendAnalysisDays: number;
  };
}

export interface IntentAnalysisConfiguration {
  complexityThresholds: {
    shortMessageLength: number;
    longMessageLength: number;
  };
  entityCountThresholds: {
    fileCountHigh: number;
    functionCountHigh: number;
    conceptCountHigh: number;
  };
  durationEstimates: {
    simple: number;
    moderate: number;
    complex: number;
    expert: number;
  };
  confidenceThresholds: {
    highConfidence: number;
    mediumConfidence: number;
  };
  contextLimits: {
    maxProjectFiles: number;
    maxConversationHistory: number;
    maxRecentFiles: number;
  };
}

export interface SessionConfiguration {
  maxConversationHistory: number;
  autoSaveConversations: boolean;
  cacheExpiry: number;
  maxFileSize: number;
  maxOutputSize: number;
}

export interface TaskPlanConfiguration {
  executionThresholds: {
    lowRiskTaskCount: number;
    lowRiskDuration: number;
    highRiskTaskCount: number;
    highRiskDuration: number;
  };
  fileDiscoveryLimits: {
    maxFiles: number;
    maxFileSize: number;
  };
  promptLimits: {
    maxPromptFiles: number;
    maxContextFiles: number;
  };
}

export interface PerformanceConfiguration {
  timeouts: {
    aiAnalysis: number;
    commandExecution: number;
    fileOperation: number;
  };
  cacheTTL: {
    analysis: number;
    diagnostics: number;
    metrics: number;
  };
  limits: {
    maxFileAnalysisSize: number;
    maxConcurrentOperations: number;
    maxMemoryUsage: number;
  };
}

export interface SystemConfiguration {
  ai: AIConfiguration;
  vcs: VCSConfiguration;
  intentAnalysis: IntentAnalysisConfiguration;
  session: SessionConfiguration;
  taskPlan: TaskPlanConfiguration;
  performance: PerformanceConfiguration;
}

/**
 * Default system configuration
 */
export const DEFAULT_SYSTEM_CONFIG: SystemConfiguration = {
  ai: {
    commandConfidenceThreshold: 0.7,
    taskConfidenceThreshold: 0.6,
    healthCheckInterval: 2000,
    temperature: AI_CONSTANTS.CREATIVE_TEMPERATURE,
    maxTokens: 500,
    requestTimeout: TIMEOUT_CONSTANTS.MEDIUM
  },
  vcs: {
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    analysisDepth: 100,
    riskThresholds: {
      taskCountHigh: 5,
      taskCountMedium: 3,
      durationHigh: 15,
      durationMedium: 5,
      changeCountCritical: 5,
      changeCountHigh: 3,
      authorCountMultiple: 5,
      riskMultiplierSingle: 1.5,
      riskMultiplierMultiple: 1.2,
      riskMultiplierHigh: 1.0
    },
    qualityThresholds: {
      testCoverageGood: 75,
      duplicationHigh: 15,
      fileSizeThresholds: {
        large: 500,
        medium: 100,
        small: 20
      },
      lineChangeThresholds: {
        small: 20,
        large: 50
      },
      complexityPenalties: {
        high: 25,
        medium: 15,
        low: 5
      }
    },
    patternAnalysis: {
      monthsForEstimate: 12,
      changeFrequencyMultiplier: 2,
      bugPronenessMultiplier: 2,
      stabilityMultiplier: 3
    },
    timeConstants: {
      dayInMs: 24 * 60 * 60 * 1000,
      weekInMs: 7 * 24 * 60 * 60 * 1000,
      monthInMs: 30 * 24 * 60 * 60 * 1000,
      trendAnalysisDays: 30
    }
  },
  intentAnalysis: {
    complexityThresholds: {
      shortMessageLength: 20,
      longMessageLength: 200
    },
    entityCountThresholds: {
      fileCountHigh: 3,
      functionCountHigh: 2,
      conceptCountHigh: 5
    },
    durationEstimates: {
      simple: 2,
      moderate: 10,
      complex: 30,
      expert: 60
    },
    confidenceThresholds: {
      highConfidence: 0.7,
      mediumConfidence: 0.5
    },
    contextLimits: {
      maxProjectFiles: 20,
      maxConversationHistory: 5,
      maxRecentFiles: 20
    }
  },
  session: {
    maxConversationHistory: 50,
    autoSaveConversations: true,
    cacheExpiry: 30 * 60 * 1000, // 30 minutes
    maxFileSize: 1024 * 1024, // 1MB
    maxOutputSize: 512 * 1024 // 512KB
  },
  taskPlan: {
    executionThresholds: {
      lowRiskTaskCount: 3,
      lowRiskDuration: 5,
      highRiskTaskCount: 5,
      highRiskDuration: 15
    },
    fileDiscoveryLimits: {
      maxFiles: 50,
      maxFileSize: 1024 * 1024 // 1MB
    },
    promptLimits: {
      maxPromptFiles: 50,
      maxContextFiles: 20
    }
  },
  performance: {
    timeouts: {
      aiAnalysis: 10000, // 10 seconds
      commandExecution: 30000, // 30 seconds
      fileOperation: 5000 // 5 seconds
    },
    cacheTTL: {
      analysis: 30 * 60 * 1000, // 30 minutes
      diagnostics: 30 * 60 * 1000, // 30 minutes
      metrics: 60 * 60 * 1000 // 1 hour
    },
    limits: {
      maxFileAnalysisSize: 1024 * 1024, // 1MB
      maxConcurrentOperations: 10,
      maxMemoryUsage: 100 * 1024 * 1024 // 100MB
    }
  }
};

/**
 * Configuration Manager
 */
export class SystemConfigManager {
  private static instance: SystemConfigManager;
  private config: SystemConfiguration;

  private constructor(config: SystemConfiguration = DEFAULT_SYSTEM_CONFIG) {
    this.config = { ...config };
  }

  static getInstance(): SystemConfigManager {
    if (!SystemConfigManager.instance) {
      SystemConfigManager.instance = new SystemConfigManager();
    }
    return SystemConfigManager.instance;
  }

  /**
   * Get the complete configuration
   */
  getConfig(): SystemConfiguration {
    return { ...this.config };
  }

  /**
   * Get AI configuration
   */
  getAIConfig(): AIConfiguration {
    return { ...this.config.ai };
  }

  /**
   * Get VCS configuration
   */
  getVCSConfig(): VCSConfiguration {
    return { ...this.config.vcs };
  }

  /**
   * Get intent analysis configuration
   */
  getIntentAnalysisConfig(): IntentAnalysisConfiguration {
    return { ...this.config.intentAnalysis };
  }

  /**
   * Get session configuration
   */
  getSessionConfig(): SessionConfiguration {
    return { ...this.config.session };
  }

  /**
   * Get task plan configuration
   */
  getTaskPlanConfig(): TaskPlanConfiguration {
    return { ...this.config.taskPlan };
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig(): PerformanceConfiguration {
    return { ...this.config.performance };
  }

  /**
   * Update configuration section
   */
  updateConfig<K extends keyof SystemConfiguration>(
    section: K,
    updates: Partial<SystemConfiguration[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_SYSTEM_CONFIG };
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): void {
    // AI Configuration
    if (process.env.AI_COMMAND_CONFIDENCE_THRESHOLD) {
      this.config.ai.commandConfidenceThreshold = parseFloat(process.env.AI_COMMAND_CONFIDENCE_THRESHOLD);
    }
    if (process.env.AI_TASK_CONFIDENCE_THRESHOLD) {
      this.config.ai.taskConfidenceThreshold = parseFloat(process.env.AI_TASK_CONFIDENCE_THRESHOLD);
    }
    if (process.env.AI_HEALTH_CHECK_INTERVAL) {
      this.config.ai.healthCheckInterval = parseInt(process.env.AI_HEALTH_CHECK_INTERVAL);
    }

    // VCS Configuration
    if (process.env.VCS_CACHE_EXPIRY) {
      this.config.vcs.cacheExpiry = parseInt(process.env.VCS_CACHE_EXPIRY);
    }
    if (process.env.VCS_ANALYSIS_DEPTH) {
      this.config.vcs.analysisDepth = parseInt(process.env.VCS_ANALYSIS_DEPTH);
    }

    // Performance Configuration
    if (process.env.PERF_AI_ANALYSIS_TIMEOUT) {
      this.config.performance.timeouts.aiAnalysis = parseInt(process.env.PERF_AI_ANALYSIS_TIMEOUT);
    }
    if (process.env.PERF_MAX_FILE_SIZE) {
      this.config.performance.limits.maxFileAnalysisSize = parseInt(process.env.PERF_MAX_FILE_SIZE);
    }
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate AI configuration
    if (this.config.ai.commandConfidenceThreshold < 0 || this.config.ai.commandConfidenceThreshold > 1) {
      errors.push('AI command confidence threshold must be between 0 and 1');
    }
    if (this.config.ai.taskConfidenceThreshold < 0 || this.config.ai.taskConfidenceThreshold > 1) {
      errors.push('AI task confidence threshold must be between 0 and 1');
    }

    // Validate timeouts are positive
    if (this.config.performance.timeouts.aiAnalysis <= 0) {
      errors.push('AI analysis timeout must be positive');
    }
    if (this.config.performance.timeouts.commandExecution <= 0) {
      errors.push('Command execution timeout must be positive');
    }

    // Validate cache expiry values
    if (this.config.vcs.cacheExpiry <= 0) {
      errors.push('VCS cache expiry must be positive');
    }
    if (this.config.session.cacheExpiry <= 0) {
      errors.push('Session cache expiry must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Convenience function to get configuration manager instance
 */
export function getSystemConfig(): SystemConfigManager {
  return SystemConfigManager.getInstance();
}