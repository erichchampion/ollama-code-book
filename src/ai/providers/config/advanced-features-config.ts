/**
 * Advanced AI Provider Features Configuration
 *
 * Centralizes all configuration values for fine-tuning, deployment, and fusion
 * to eliminate hardcoded values and provide environment-specific defaults.
 */

import { AI_CONSTANTS } from '../../../config/constants.js';

export interface FineTuningDefaultConfig {
  qualityThresholds: {
    lowSampleCount: number;
    mediumSampleCount: number;
  };
  defaultConfig: {
    epochs: number;
    learningRate: number;
    batchSize: number;
    validationSplit: number;
    maxSequenceLength: number;
    temperature: number;
    dropout: number;
    gradientClipping: number;
    weightDecay: number;
    warmupSteps: number;
    saveSteps: number;
    evaluationSteps: number;
    earlyStopping: {
      enabled: boolean;
      patience: number;
      minDelta: number;
    };
    quantization: {
      enabled: boolean;
      type: 'int8' | 'int4' | 'float16';
    };
    lora: {
      enabled: boolean;
      rank: number;
      alpha: number;
      dropout: number;
    };
  };
  simulation: {
    durationMs: number;
    updateIntervalMs: number;
    outputModelSizeMB: number;
    serverStartupDelayMs: number;
  };
  providers: {
    contextWindow: number;
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
    mockResponse: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  processing: {
    contextLines: number;
    chunkSize: number;
    streamingDelayMs: number;
    complexityThresholds: {
      moderateLines: number;
      complexLines: number;
    };
    qualityThresholds: {
      minCommentLength: number;
      maxTopImports: number;
    };
    mockMetrics: {
      baseAccuracy: number;
      accuracyVariance: number;
      basePerplexity: number;
      perplexityVariance: number;
      defaultQualityScore: number;
    };
  };
}

export interface DeploymentDefaultConfig {
  ports: {
    minPort: number;
    maxPort: number;
    defaultRangeSize: number;
  };
  resources: {
    maxMemoryMB: number;
    maxCpuCores: number;
    diskSpaceGB: number;
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetConcurrency: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
  networking: {
    host: string;
    ssl: {
      enabled: boolean;
    };
    cors: {
      enabled: boolean;
    };
  };
  health: {
    checkIntervalMs: number;
    timeoutMs: number;
    retries: number;
    warmupTimeMs: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
  };
  simulation: {
    serverStartupDelayMs: number;
    healthCheckStatusCode: number;
  };
}

export interface FusionDefaultConfig {
  timeouts: {
    defaultTimeoutMs: number;
    requestTimeoutMs: number;
  };
  quality: {
    contentLengthMin: number;
    contentLengthMax: number;
    lengthBonusThreshold: number;
    lengthBonusValue: number;
  };
  response: {
    maxResponseLength: number;
  };
  validation: {
    minConfidenceThreshold: number;
    baseQualityScore: number;
    fastResponseThresholdMs: number;
    validConfidenceFloor: number;
    invalidConfidenceScore: number;
    varianceThreshold: number;
  };
  diversity: {
    lengthWeight: number;
    vocabularyWeight: number;
    providerWeight: number;
  };
  caching: {
    enabled: boolean;
    defaultTTLMs: number;
  };
  strategies: {
    consensus_voting: {
      minProviders: number;
      maxProviders: number;
      weightingScheme: 'quality_based';
      validationRequired: boolean;
      synthesisMethod: 'voting';
    };
    expert_ensemble: {
      minProviders: number;
      maxProviders: number;
      weightingScheme: 'expert_based';
      validationRequired: boolean;
      synthesisMethod: 'weighted_average';
    };
    diverse_perspectives: {
      minProviders: number;
      maxProviders: number;
      weightingScheme: 'equal';
      validationRequired: boolean;
      synthesisMethod: 'merging';
    };
    quality_ranking: {
      minProviders: number;
      maxProviders: number;
      weightingScheme: 'quality_based';
      validationRequired: boolean;
      synthesisMethod: 'ranking';
    };
    llm_synthesis: {
      minProviders: number;
      maxProviders: number;
      weightingScheme: 'dynamic';
      validationRequired: boolean;
      synthesisMethod: 'llm_synthesis';
    };
  };
}

/**
 * Default configuration for fine-tuning features
 */
export const FINE_TUNING_CONFIG: FineTuningDefaultConfig = {
  qualityThresholds: {
    lowSampleCount: 100,
    mediumSampleCount: 1000
  },
  defaultConfig: {
    epochs: 3,
    learningRate: 0.0001,
    batchSize: 4,
    validationSplit: 0.1,
    maxSequenceLength: 2048,
    temperature: AI_CONSTANTS.CREATIVE_TEMPERATURE,
    dropout: 0.1,
    gradientClipping: 1.0,
    weightDecay: 0.01,
    warmupSteps: 100,
    saveSteps: 500,
    evaluationSteps: 100,
    earlyStopping: {
      enabled: true,
      patience: 3,
      minDelta: 0.001
    },
    quantization: {
      enabled: false,
      type: 'int8'
    },
    lora: {
      enabled: true,
      rank: 16,
      alpha: 32,
      dropout: 0.1
    }
  },
  simulation: {
    durationMs: 60000, // 1 minute simulation
    updateIntervalMs: 5000, // Update every 5 seconds
    outputModelSizeMB: 500, // 500MB
    serverStartupDelayMs: 2000
  },
  providers: {
    contextWindow: 4096,
    rateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 100000
    },
    mockResponse: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150
    }
  },
  processing: {
    contextLines: 5,
    chunkSize: 10,
    streamingDelayMs: 50,
    complexityThresholds: {
      moderateLines: 20,
      complexLines: 50
    },
    qualityThresholds: {
      minCommentLength: 50,
      maxTopImports: 5
    },
    mockMetrics: {
      baseAccuracy: 0.85,
      accuracyVariance: 0.1,
      basePerplexity: 50,
      perplexityVariance: 20,
      defaultQualityScore: 0.8
    }
  }
};

/**
 * Default configuration for deployment features
 */
export const DEPLOYMENT_CONFIG: DeploymentDefaultConfig = {
  ports: {
    minPort: 8000,
    maxPort: 9000,
    defaultRangeSize: 1000
  },
  resources: {
    maxMemoryMB: 2048,
    maxCpuCores: 2,
    diskSpaceGB: 10
  },
  scaling: {
    minInstances: 1,
    maxInstances: 5,
    targetConcurrency: 10,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.2
  },
  networking: {
    host: 'localhost',
    ssl: {
      enabled: false
    },
    cors: {
      enabled: true
    }
  },
  health: {
    checkIntervalMs: 30000, // Check every 30 seconds
    timeoutMs: 5000,
    retries: 3,
    warmupTimeMs: 30000
  },
  monitoring: {
    metricsEnabled: true,
    loggingLevel: 'info',
    retentionDays: 7
  },
  simulation: {
    serverStartupDelayMs: 2000, // Wait for server to start
    healthCheckStatusCode: 200
  }
};

/**
 * Default configuration for response fusion features
 */
export const FUSION_CONFIG: FusionDefaultConfig = {
  timeouts: {
    defaultTimeoutMs: 30000,
    requestTimeoutMs: 30000
  },
  quality: {
    contentLengthMin: 50,
    contentLengthMax: 2000,
    lengthBonusThreshold: 100,
    lengthBonusValue: 0.1
  },
  response: {
    maxResponseLength: 2000
  },
  validation: {
    minConfidenceThreshold: 0.5,
    baseQualityScore: 0.5,
    fastResponseThresholdMs: 2000,
    validConfidenceFloor: 0.5,
    invalidConfidenceScore: 0.3,
    varianceThreshold: 0.5
  },
  diversity: {
    lengthWeight: 0.3,
    vocabularyWeight: 0.5,
    providerWeight: 0.2
  },
  caching: {
    enabled: true,
    defaultTTLMs: 300000 // 5 minutes
  },
  strategies: {
    consensus_voting: {
      minProviders: 3,
      maxProviders: 5,
      weightingScheme: 'quality_based',
      validationRequired: true,
      synthesisMethod: 'voting'
    },
    expert_ensemble: {
      minProviders: 2,
      maxProviders: 4,
      weightingScheme: 'expert_based',
      validationRequired: true,
      synthesisMethod: 'weighted_average'
    },
    diverse_perspectives: {
      minProviders: 3,
      maxProviders: 6,
      weightingScheme: 'equal',
      validationRequired: false,
      synthesisMethod: 'merging'
    },
    quality_ranking: {
      minProviders: 2,
      maxProviders: 5,
      weightingScheme: 'quality_based',
      validationRequired: true,
      synthesisMethod: 'ranking'
    },
    llm_synthesis: {
      minProviders: 2,
      maxProviders: 4,
      weightingScheme: 'dynamic',
      validationRequired: true,
      synthesisMethod: 'llm_synthesis'
    }
  }
};

/**
 * Expert weights for different providers in fusion scenarios
 */
export const PROVIDER_EXPERT_WEIGHTS: Record<string, number> = {
  'ollama': 0.8,
  'openai': 0.9,
  'anthropic': 0.95,
  'google': 0.85,
  'custom-local': 0.6
};

/**
 * Get environment-specific configuration overrides
 */
export function getEnvironmentConfig(): Partial<FineTuningDefaultConfig & DeploymentDefaultConfig & FusionDefaultConfig> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Reduce timeouts in development for faster feedback
    timeouts: {
      defaultTimeoutMs: isDevelopment ? 15000 : 30000,
      requestTimeoutMs: isDevelopment ? 15000 : 30000
    },
    // More aggressive scaling in production
    scaling: isProduction ? {
      minInstances: 2,
      maxInstances: 10,
      targetConcurrency: 20,
      scaleUpThreshold: 0.7,
      scaleDownThreshold: 0.3
    } : undefined,
    // Enable more detailed logging in development
    monitoring: {
      metricsEnabled: true,
      loggingLevel: isDevelopment ? 'debug' : 'info',
      retentionDays: isProduction ? 30 : 7
    }
  };
}

/**
 * Merge configuration with environment overrides
 */
export function getMergedConfig<T>(baseConfig: T): T {
  const envConfig = getEnvironmentConfig();
  return { ...baseConfig, ...envConfig };
}