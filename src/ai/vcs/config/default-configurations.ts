/**
 * Default Configuration Constants for VCS Integration
 *
 * Centralized configuration to eliminate hardcoded values and DRY violations
 * across VCS intelligence components.
 */

import * as path from 'path';

export interface QualityThresholds {
  maxComplexity: number;
  minTestCoverage: number;
  maxFileSize: number;
  maxLinesChanged: number;
  minOverallScore: number;
  maxCriticalIssues: number;
  maxSecurityIssues: number;
  maxTechnicalDebt: number;
  minMaintainability: number;
}

export interface RiskThresholds {
  fileSize: number;
  linesChanged: number;
  filesChanged: number;
  complexity: number;
  hotspotFrequency: number;
  authorExperience: number;
}

export interface AlertThresholds {
  qualityDegradation: number;
  securityIssueIncrease: number;
  complexityIncrease: number;
  testCoverageDecrease: number;
  technicalDebtIncrease: number;
}

export interface PathPatterns {
  criticalFiles: string[];
  criticalPaths: string[];
  testPatterns: string[];
  buildPatterns: string[];
  excludePatterns: string[];
}

export interface AnalysisDefaults {
  analysisDepth: number;
  retentionPeriod: number;
  timeoutMs: number;
  maxConcurrentAnalyses: number;
}

export interface CommitDefaults {
  style: 'conventional' | 'descriptive' | 'minimal';
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  includeFooter: boolean;
}

/**
 * Default quality thresholds used across all VCS components
 */
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  maxComplexity: 10,
  minTestCoverage: 80,
  maxFileSize: 500,
  maxLinesChanged: 500,
  minOverallScore: 80,
  maxCriticalIssues: 0,
  maxSecurityIssues: 5,
  maxTechnicalDebt: 40,
  minMaintainability: 70
};

/**
 * Default risk assessment thresholds
 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  fileSize: 500,
  linesChanged: 300,
  filesChanged: 10,
  complexity: 15,
  hotspotFrequency: 5,
  authorExperience: 6
};

/**
 * Default alert thresholds for quality degradation
 */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  qualityDegradation: 10,
  securityIssueIncrease: 3,
  complexityIncrease: 20,
  testCoverageDecrease: 10,
  technicalDebtIncrease: 8
};

/**
 * Default file and path patterns
 */
export const DEFAULT_PATH_PATTERNS: PathPatterns = {
  criticalFiles: ['src/core/**', 'src/security/**', 'src/auth/**'],
  criticalPaths: ['src/core/**', 'src/security/**'],
  testPatterns: ['**/*.test.*', '**/*.spec.*', '**/tests/**'],
  buildPatterns: ['**/package.json', '**/Dockerfile', '**/*.yml', '**/*.yaml'],
  excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**']
};

/**
 * Default analysis configuration
 */
export const DEFAULT_ANALYSIS: AnalysisDefaults = {
  analysisDepth: 30,
  retentionPeriod: 90,
  timeoutMs: 300000, // 5 minutes
  maxConcurrentAnalyses: 3
};

/**
 * Default commit message configuration
 */
export const DEFAULT_COMMIT: CommitDefaults = {
  style: 'conventional',
  maxLength: 72,
  includeScope: true,
  includeBody: true,
  includeFooter: false
};

/**
 * Default branch names
 */
export const DEFAULT_BRANCHES = {
  main: 'main',
  develop: 'develop',
  staging: 'staging'
};

/**
 * Default storage paths (relative to repository root)
 */
export const DEFAULT_STORAGE_PATHS = {
  qualityTracking: '.ollama-code/quality-tracking',
  reports: '.ollama-code/reports',
  backups: '.ollama-code/backups',
  hooks: '.git/hooks'
};

/**
 * Git hook types supported by the system
 */
export const SUPPORTED_HOOK_TYPES = [
  'pre-commit',
  'commit-msg',
  'pre-push',
  'post-merge'
] as const;

/**
 * CI/CD platform configurations
 */
export const CI_PLATFORMS = {
  github: {
    name: 'GitHub Actions',
    configFile: '.github/workflows',
    artifactPath: 'reports/',
    commentSupported: true
  },
  gitlab: {
    name: 'GitLab CI',
    configFile: '.gitlab-ci.yml',
    artifactPath: 'reports/',
    commentSupported: true
  },
  azure: {
    name: 'Azure DevOps',
    configFile: 'azure-pipelines.yml',
    artifactPath: 'reports/',
    commentSupported: false
  },
  bitbucket: {
    name: 'Bitbucket Pipelines',
    configFile: 'bitbucket-pipelines.yml',
    artifactPath: 'reports/',
    commentSupported: false
  },
  circleci: {
    name: 'CircleCI',
    configFile: '.circleci/config.yml',
    artifactPath: 'reports/',
    commentSupported: false
  },
  jenkins: {
    name: 'Jenkins',
    configFile: 'Jenkinsfile',
    artifactPath: 'reports/',
    commentSupported: false
  }
} as const;

/**
 * Create a complete VCS configuration with sensible defaults
 */
export function createDefaultVCSConfig(repositoryPath: string, overrides?: Partial<{
  qualityThresholds: Partial<QualityThresholds>;
  riskThresholds: Partial<RiskThresholds>;
  alertThresholds: Partial<AlertThresholds>;
  pathPatterns: Partial<PathPatterns>;
  analysisDefaults: Partial<AnalysisDefaults>;
  commitDefaults: Partial<CommitDefaults>;
}>) {
  return {
    repositoryPath,
    defaultBranch: DEFAULT_BRANCHES.main,
    enableAutoAnalysis: true,
    qualityThresholds: {
      ...DEFAULT_QUALITY_THRESHOLDS,
      ...overrides?.qualityThresholds
    },
    riskThresholds: {
      ...DEFAULT_RISK_THRESHOLDS,
      ...overrides?.riskThresholds
    },
    alertThresholds: {
      ...DEFAULT_ALERT_THRESHOLDS,
      ...overrides?.alertThresholds
    },
    pathPatterns: {
      ...DEFAULT_PATH_PATTERNS,
      ...overrides?.pathPatterns
    },
    analysis: {
      ...DEFAULT_ANALYSIS,
      ...overrides?.analysisDefaults
    },
    commit: {
      ...DEFAULT_COMMIT,
      ...overrides?.commitDefaults
    },
    storagePaths: DEFAULT_STORAGE_PATHS
  };
}

/**
 * Validate configuration values to prevent runtime errors
 */
export function validateConfiguration(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate numeric thresholds
  if (config.qualityThresholds) {
    const qt = config.qualityThresholds;
    if (qt.maxComplexity < 1 || qt.maxComplexity > 100) {
      errors.push('maxComplexity must be between 1 and 100');
    }
    if (qt.minTestCoverage < 0 || qt.minTestCoverage > 100) {
      errors.push('minTestCoverage must be between 0 and 100');
    }
    if (qt.maxFileSize < 1) {
      errors.push('maxFileSize must be greater than 0');
    }
  }

  // Validate paths
  if (config.repositoryPath && typeof config.repositoryPath !== 'string') {
    errors.push('repositoryPath must be a string');
  }

  // Validate timeout
  if (config.analysis?.timeoutMs && (config.analysis.timeoutMs < 1000 || config.analysis.timeoutMs > 3600000)) {
    errors.push('timeoutMs must be between 1000ms (1s) and 3600000ms (1h)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Safe integer parsing with fallback
 */
export function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe enum parsing with type checking
 */
export function safeParseEnum<T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
  fallback: T
): T {
  if (!value || !allowedValues.includes(value as T)) {
    return fallback;
  }
  return value as T;
}

/**
 * Validate and sanitize repository path to prevent directory traversal
 */
export function validateRepositoryPath(repositoryPath: string): { valid: boolean; sanitized: string; error?: string } {
  if (!repositoryPath || typeof repositoryPath !== 'string') {
    return { valid: false, sanitized: '', error: 'Repository path must be a non-empty string' };
  }

  // Remove any potential directory traversal attempts
  const sanitized = repositoryPath.replace(/\.\./g, '').replace(/\/+/g, '/');

  // Check for absolute path requirements
  if (!path.isAbsolute(sanitized)) {
    return { valid: false, sanitized, error: 'Repository path must be absolute' };
  }

  // Additional security checks
  const forbiddenPaths = ['/etc', '/usr', '/bin', '/sbin', '/root', '/home'];
  const isSystemPath = forbiddenPaths.some(forbidden => sanitized.startsWith(forbidden));

  if (isSystemPath) {
    return { valid: false, sanitized, error: 'Repository path cannot be a system directory' };
  }

  return { valid: true, sanitized };
}