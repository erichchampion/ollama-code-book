/**
 * Performance Optimization Configuration
 *
 * Centralizes all performance-related configuration options for Phase 6 components.
 * Provides environment-specific defaults and validation.
 */

import { cpus, totalmem } from 'os';
import { THRESHOLD_CONSTANTS } from './constants.js';

export interface DistributedAnalysisConfig {
  maxWorkers: number;
  chunkSizeTarget: number;
  memoryLimitPerWorkerMB: number;
  timeoutPerChunkSeconds: number;
  retryAttempts: number;
  enableAdaptiveChunking: boolean;
  loadBalancingStrategy: 'round_robin' | 'priority' | 'adaptive';
  dependencyLimit: number;
  complexityThresholds: {
    high: number;
    medium: number;
  };
  simulationDelayMs: number;
}

export interface CacheConfig {
  maxMemoryMB: number;
  maxDiskMB: number;
  defaultTTLMs: number;
  compressionThresholdBytes: number;
  evictionRatio: number;
  warmupEnabled: boolean;
  memoryPressureThreshold: number;
  diskCacheDir?: string;
}

export interface FileComplexityConfig {
  typeMultipliers: Record<string, number>;
  baseSizeWeight: number;
  priorityPatterns: {
    high: string[];
    medium: string[];
  };
}

export interface IndexingConfig {
  btreeOrder: number;
  fullTextSearchDefaultLimit: number;
  spatialIndexMaxEntries: number;
}

export interface StorageConfig {
  cacheMaxSizeBytes: number;
  partitionMaxSizeBytes: number;
  compressionThresholdBytes: number;
  memoryMapThresholdBytes: number;
  cleanupIntervalMs: number;
  compressionLevel: number;
}

export interface MonitoringConfig {
  metricsCollectionIntervalMs: number;
  trendAnalysisIntervalMs: number;
  alertCheckIntervalMs: number;
  recommendationIntervalMs: number;
  dataRetentionDays: number;
}

export interface PerformanceThresholds {
  responseTime: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  cpuUsage: { warning: number; critical: number };
  startupTime: { warning: number; critical: number };
  cacheHitRate: { warning: number; critical: number };
}

export interface FilePatterns {
  excludePatterns: string[];
  includePatterns: string[];
  highPriorityPatterns: string[];
  mediumPriorityPatterns: string[];
}

export interface CodeAnalysisConfig {
  architectural: {
    confidenceThreshold: number;
    godClassMethodLimit: number;
    godClassLineLimit: number;
    longMethodLineLimit: number;
    contextWindowSize: number;
    duplicateBlockMinLines: number;
    similarityThreshold: number;
  };
  quality: {
    criticalPenalty: number;
    warningPenalty: number;
    infoPenalty: number;
    complexityThresholds: {
      high: number;
      medium: number;
    };
    maintainabilityThresholds: {
      good: number;
      fair: number;
    };
    technicalDebtLimits: {
      high: number;
      medium: number;
    };
  };
  security: {
    maxVulnerabilitiesLow: number;
    maxVulnerabilitiesMedium: number;
    patterns: {
      sqlInjection: boolean;
      xss: boolean;
      hardcodedCredentials: boolean;
      eval: boolean;
      cryptoWeak: boolean;
    };
  };
  performance: {
    maxFileLines: number;
    maxFunctionLines: number;
    complexMethodThreshold: number;
    nestedLoopPenalty: number;
    largeFileThreshold: number;
  };
  refactoring: {
    extractMethodMinLines: number;
    duplicateMinOccurrences: number;
    namingMinLength: number;
    maxParameterCount: number;
    safetyChecksEnabled: boolean;
  };
  testing: {
    coverageTarget: number;
    maxTestRuntime: number;
    mockGenerationEnabled: boolean;
    propertyTestingEnabled: boolean;
    frameworkPreference: 'jest' | 'mocha' | 'vitest' | 'auto';
  };
}

export interface PerformanceConfig {
  distributedAnalysis: DistributedAnalysisConfig;
  cache: CacheConfig;
  fileComplexity: FileComplexityConfig;
  indexing: IndexingConfig;
  storage: StorageConfig;
  monitoring: MonitoringConfig;
  thresholds: PerformanceThresholds;
  filePatterns: FilePatterns;
  codeAnalysis: CodeAnalysisConfig;
}

/**
 * Get performance configuration based on environment
 */
export function getPerformanceConfig(): PerformanceConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Scale configuration based on available resources
  const cpuCount = cpus().length;
  const totalMemoryMB = Math.floor(totalmem() / 1024 / 1024);

  return {
    distributedAnalysis: {
      maxWorkers: parseInt(process.env.OLLAMA_MAX_WORKERS || '') || Math.min(cpuCount, isProduction ? 16 : 8),
      chunkSizeTarget: parseInt(process.env.OLLAMA_CHUNK_SIZE || '') || (isProduction ? 100 : 50),
      memoryLimitPerWorkerMB: parseInt(process.env.OLLAMA_WORKER_MEMORY || '') || (isProduction ? 1024 : 512),
      timeoutPerChunkSeconds: parseInt(process.env.OLLAMA_CHUNK_TIMEOUT || '') || (isProduction ? 600 : 300),
      retryAttempts: parseInt(process.env.OLLAMA_RETRY_ATTEMPTS || '') || 2,
      enableAdaptiveChunking: process.env.OLLAMA_ADAPTIVE_CHUNKING !== 'false',
      loadBalancingStrategy: (process.env.OLLAMA_LOAD_BALANCE as any) || 'adaptive',
      dependencyLimit: parseInt(process.env.OLLAMA_DEPENDENCY_LIMIT || '') || (isProduction ? 5 : 3),
      complexityThresholds: {
        high: parseInt(process.env.OLLAMA_COMPLEXITY_HIGH || '') || (isProduction ? 15 : 10),
        medium: parseInt(process.env.OLLAMA_COMPLEXITY_MEDIUM || '') || (isProduction ? 8 : 5)
      },
      simulationDelayMs: isDevelopment ? 10 : 0 // No simulation delay in production
    },

    cache: {
      maxMemoryMB: parseInt(process.env.OLLAMA_CACHE_MEMORY || '') || Math.min(totalMemoryMB * 0.1, isProduction ? 512 : 256),
      maxDiskMB: parseInt(process.env.OLLAMA_CACHE_DISK || '') || (isProduction ? 4096 : 2048),
      defaultTTLMs: parseInt(process.env.OLLAMA_CACHE_TTL || '') || (isProduction ? 7200000 : 3600000), // 2h prod, 1h dev
      compressionThresholdBytes: parseInt(process.env.OLLAMA_COMPRESSION_THRESHOLD || '') || 1024,
      evictionRatio: parseFloat(process.env.OLLAMA_EVICTION_RATIO || '') || 0.3,
      warmupEnabled: process.env.OLLAMA_CACHE_WARMUP !== 'false',
      memoryPressureThreshold: parseFloat(process.env.OLLAMA_MEMORY_THRESHOLD || '') || (isProduction ? 0.85 : 0.8),
      diskCacheDir: process.env.OLLAMA_CACHE_DIR
    },

    fileComplexity: {
      typeMultipliers: {
        '.ts': parseFloat(process.env.OLLAMA_TS_COMPLEXITY || '') || 1.5,
        '.js': parseFloat(process.env.OLLAMA_JS_COMPLEXITY || '') || 1.0,
        '.jsx': parseFloat(process.env.OLLAMA_JSX_COMPLEXITY || '') || 1.2,
        '.tsx': parseFloat(process.env.OLLAMA_TSX_COMPLEXITY || '') || 1.7,
        '.vue': parseFloat(process.env.OLLAMA_VUE_COMPLEXITY || '') || 1.3,
        '.py': parseFloat(process.env.OLLAMA_PY_COMPLEXITY || '') || 1.1,
        '.java': parseFloat(process.env.OLLAMA_JAVA_COMPLEXITY || '') || 1.4,
        '.cpp': parseFloat(process.env.OLLAMA_CPP_COMPLEXITY || '') || 1.6,
        '.c': parseFloat(process.env.OLLAMA_C_COMPLEXITY || '') || 1.3
      },
      baseSizeWeight: parseFloat(process.env.OLLAMA_SIZE_WEIGHT || '') || 0.1,
      priorityPatterns: {
        high: (process.env.OLLAMA_HIGH_PRIORITY_PATTERNS || 'index.,main.,app.,server.,api.,core.').split(','),
        medium: (process.env.OLLAMA_MEDIUM_PRIORITY_PATTERNS || 'config,package.json,tsconfig,webpack,babel').split(',')
      }
    },

    indexing: {
      btreeOrder: parseInt(process.env.OLLAMA_BTREE_ORDER || '') || 50,
      fullTextSearchDefaultLimit: parseInt(process.env.OLLAMA_FULLTEXT_LIMIT || '') || 10,
      spatialIndexMaxEntries: parseInt(process.env.OLLAMA_SPATIAL_MAX_ENTRIES || '') || 16
    },

    storage: {
      cacheMaxSizeBytes: parseInt(process.env.OLLAMA_STORAGE_CACHE_SIZE || '') || (1024 * 1024 * 1024), // 1GB
      partitionMaxSizeBytes: parseInt(process.env.OLLAMA_PARTITION_MAX_SIZE || '') || (50 * 1024 * 1024), // 50MB
      compressionThresholdBytes: parseInt(process.env.OLLAMA_STORAGE_COMPRESSION_THRESHOLD || '') || (5 * 1024 * 1024), // 5MB
      memoryMapThresholdBytes: parseInt(process.env.OLLAMA_MEMORY_MAP_THRESHOLD || '') || (100 * 1024 * 1024), // 100MB
      cleanupIntervalMs: parseInt(process.env.OLLAMA_CLEANUP_INTERVAL || '') || (15 * 60 * 1000), // 15 minutes
      compressionLevel: parseInt(process.env.OLLAMA_COMPRESSION_LEVEL || '') || 6
    },

    monitoring: {
      metricsCollectionIntervalMs: parseInt(process.env.OLLAMA_METRICS_INTERVAL || '') || 5000, // 5 seconds
      trendAnalysisIntervalMs: parseInt(process.env.OLLAMA_TREND_INTERVAL || '') || 60000, // 1 minute
      alertCheckIntervalMs: parseInt(process.env.OLLAMA_ALERT_INTERVAL || '') || 10000, // 10 seconds
      recommendationIntervalMs: parseInt(process.env.OLLAMA_RECOMMENDATION_INTERVAL || '') || 300000, // 5 minutes
      dataRetentionDays: parseInt(process.env.OLLAMA_DATA_RETENTION_DAYS || '') || (isProduction ? 30 : 7)
    },

    thresholds: {
      responseTime: {
        warning: parseInt(process.env.OLLAMA_RESPONSE_TIME_WARNING || '') || 1000, // 1s
        critical: parseInt(process.env.OLLAMA_RESPONSE_TIME_CRITICAL || '') || 5000 // 5s
      },
      memoryUsage: {
        warning: parseFloat(process.env.OLLAMA_MEMORY_WARNING || '') || 0.75, // 75%
        critical: parseFloat(process.env.OLLAMA_MEMORY_CRITICAL || '') || 0.90 // 90%
      },
      cpuUsage: {
        warning: parseFloat(process.env.OLLAMA_CPU_WARNING || '') || 0.70, // 70%
        critical: parseFloat(process.env.OLLAMA_CPU_CRITICAL || '') || 0.85 // 85%
      },
      startupTime: {
        warning: parseInt(process.env.OLLAMA_STARTUP_WARNING || '') || 3000, // 3s
        critical: parseInt(process.env.OLLAMA_STARTUP_CRITICAL || '') || 5000 // 5s
      },
      cacheHitRate: {
        warning: parseFloat(process.env.OLLAMA_CACHE_HIT_WARNING || '') || 0.70, // 70%
        critical: parseFloat(process.env.OLLAMA_CACHE_HIT_CRITICAL || '') || 0.50 // 50%
      }
    },

    filePatterns: {
      excludePatterns: (process.env.OLLAMA_EXCLUDE_PATTERNS || 'node_modules/**,dist/**,build/**,.git/**,**/*.log,**/*.tmp').split(','),
      includePatterns: (process.env.OLLAMA_INCLUDE_PATTERNS || '**/*.ts,**/*.js,**/*.tsx,**/*.jsx,**/*.py,**/*.java,**/*.cpp,**/*.c').split(','),
      highPriorityPatterns: (process.env.OLLAMA_HIGH_PRIORITY_PATTERNS || 'index.,main.,app.,server.,api.,core.').split(','),
      mediumPriorityPatterns: (process.env.OLLAMA_MEDIUM_PRIORITY_PATTERNS || 'config,package.json,tsconfig,webpack,babel').split(',')
    },

    codeAnalysis: {
      architectural: {
        confidenceThreshold: parseFloat(process.env.OLLAMA_ARCH_CONFIDENCE || '') || 0.3,
        godClassMethodLimit: parseInt(process.env.OLLAMA_GOD_CLASS_METHODS || '') || 20,
        godClassLineLimit: parseInt(process.env.OLLAMA_GOD_CLASS_LINES || '') || 500,
        longMethodLineLimit: parseInt(process.env.OLLAMA_LONG_METHOD_LINES || '') || 50,
        contextWindowSize: parseInt(process.env.OLLAMA_CONTEXT_WINDOW || '') || 200,
        duplicateBlockMinLines: parseInt(process.env.OLLAMA_DUPLICATE_MIN_LINES || '') || 5,
        similarityThreshold: parseFloat(process.env.OLLAMA_SIMILARITY_THRESHOLD || '') || 0.8
      },
      quality: {
        criticalPenalty: parseInt(process.env.OLLAMA_CRITICAL_PENALTY || '') || 15,
        warningPenalty: parseInt(process.env.OLLAMA_WARNING_PENALTY || '') || 5,
        infoPenalty: parseInt(process.env.OLLAMA_INFO_PENALTY || '') || 1,
        complexityThresholds: {
          high: parseInt(process.env.OLLAMA_COMPLEXITY_HIGH_THRESHOLD || '') || 15,
          medium: parseInt(process.env.OLLAMA_COMPLEXITY_MEDIUM_THRESHOLD || '') || 8
        },
        maintainabilityThresholds: {
          good: parseInt(process.env.OLLAMA_MAINTAINABILITY_GOOD || '') || 75,
          fair: parseInt(process.env.OLLAMA_MAINTAINABILITY_FAIR || '') || 60
        },
        technicalDebtLimits: {
          high: parseInt(process.env.OLLAMA_TECH_DEBT_HIGH || '') || 50,
          medium: parseInt(process.env.OLLAMA_TECH_DEBT_MEDIUM || '') || 25
        }
      },
      security: {
        maxVulnerabilitiesLow: parseInt(process.env.OLLAMA_SECURITY_LOW_MAX || '') || 0,
        maxVulnerabilitiesMedium: parseInt(process.env.OLLAMA_SECURITY_MEDIUM_MAX || '') || 5,
        patterns: {
          sqlInjection: process.env.OLLAMA_CHECK_SQL_INJECTION !== 'false',
          xss: process.env.OLLAMA_CHECK_XSS !== 'false',
          hardcodedCredentials: process.env.OLLAMA_CHECK_HARDCODED_CREDS !== 'false',
          eval: process.env.OLLAMA_CHECK_EVAL !== 'false',
          cryptoWeak: process.env.OLLAMA_CHECK_WEAK_CRYPTO !== 'false'
        }
      },
      performance: {
        maxFileLines: parseInt(process.env.OLLAMA_MAX_FILE_LINES || '') || 1000,
        maxFunctionLines: parseInt(process.env.OLLAMA_MAX_FUNCTION_LINES || '') || 100,
        complexMethodThreshold: parseInt(process.env.OLLAMA_COMPLEX_METHOD_THRESHOLD || '') || 10,
        nestedLoopPenalty: parseInt(process.env.OLLAMA_NESTED_LOOP_PENALTY || '') || 5,
        largeFileThreshold: parseInt(process.env.OLLAMA_LARGE_FILE_THRESHOLD || '') || 500
      },
      refactoring: {
        extractMethodMinLines: parseInt(process.env.OLLAMA_EXTRACT_METHOD_MIN_LINES || '') || 30,
        duplicateMinOccurrences: parseInt(process.env.OLLAMA_DUPLICATE_MIN_OCCURRENCES || '') || 2,
        namingMinLength: parseInt(process.env.OLLAMA_NAMING_MIN_LENGTH || '') || 3,
        maxParameterCount: parseInt(process.env.OLLAMA_MAX_PARAMETER_COUNT || '') || 5,
        safetyChecksEnabled: process.env.OLLAMA_SAFETY_CHECKS_ENABLED !== 'false'
      },
      testing: {
        coverageTarget: parseInt(process.env.OLLAMA_COVERAGE_TARGET || '') || 80,
        maxTestRuntime: parseInt(process.env.OLLAMA_MAX_TEST_RUNTIME || '') || 10000,
        mockGenerationEnabled: process.env.OLLAMA_MOCK_GENERATION !== 'false',
        propertyTestingEnabled: process.env.OLLAMA_PROPERTY_TESTING !== 'false',
        frameworkPreference: (process.env.OLLAMA_TEST_FRAMEWORK as 'jest' | 'mocha' | 'vitest' | 'auto') || 'auto'
      }
    }
  };
}

/**
 * Validate configuration values
 */
export function validatePerformanceConfig(config: PerformanceConfig): string[] {
  const errors: string[] = [];

  if (config.distributedAnalysis.maxWorkers < 1 || config.distributedAnalysis.maxWorkers > 32) {
    errors.push('maxWorkers must be between 1 and 32');
  }

  if (config.cache.maxMemoryMB < 64) {
    errors.push('maxMemoryMB must be at least 64MB');
  }

  if (config.cache.evictionRatio < THRESHOLD_CONSTANTS.MEMORY.MIN_EVICTION_RATIO || config.cache.evictionRatio > THRESHOLD_CONSTANTS.MEMORY.MAX_EVICTION_RATIO) {
    errors.push(`evictionRatio must be between ${THRESHOLD_CONSTANTS.MEMORY.MIN_EVICTION_RATIO} and ${THRESHOLD_CONSTANTS.MEMORY.MAX_EVICTION_RATIO}`);
  }

  if (config.cache.memoryPressureThreshold < 0.5 || config.cache.memoryPressureThreshold > THRESHOLD_CONSTANTS.MEMORY.PRESSURE_THRESHOLD) {
    errors.push(`memoryPressureThreshold must be between 0.5 and ${THRESHOLD_CONSTANTS.MEMORY.PRESSURE_THRESHOLD}`);
  }

  return errors;
}