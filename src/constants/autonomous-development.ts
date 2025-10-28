/**
 * Autonomous Development Constants
 *
 * Centralized configuration constants for autonomous development features
 * to eliminate hardcoded values and provide consistent defaults.
 */

export const AUTONOMOUS_DEVELOPMENT_DEFAULTS = {
  // File Processing Limits
  MAX_CODEBASE_FILES: 50,
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_PROCESSING_TIME_MS: 30000, // 30 seconds

  // Test Coverage Thresholds
  TEST_COVERAGE: {
    MINIMUM: 70,
    RECOMMENDED: 80,
    EXCELLENT: 90,
    COMPREHENSIVE: 95
  },

  // Code Quality Thresholds
  CODE_QUALITY: {
    MINIMUM_SCORE: 0.6,
    RECOMMENDED_SCORE: 0.8,
    EXCELLENT_SCORE: 0.9
  },

  // Complexity Thresholds
  COMPLEXITY: {
    SIMPLE_MAX: 0.3,
    MODERATE_MAX: 0.7,
    COMPLEX_MIN: 0.7
  },

  // Time Estimation Multipliers
  TIME_MULTIPLIERS: {
    SIMPLE: 1.0,
    MODERATE: 1.5,
    COMPLEX: 2.5,
    INTEGRATION_FACTOR: 1.2,
    TESTING_FACTOR: 1.4
  },

  // Resource Calculation Constants
  RESOURCE_CALCULATION: {
    BASE_HOURS_PER_REQUIREMENT: 2,
    MEMORY_MB_PER_TASK: 50,
    DISK_MB_PER_TASK: 10
  },

  // Risk Assessment
  RISK_ASSESSMENT: {
    LOW_THRESHOLD: 0.3,
    MEDIUM_THRESHOLD: 0.7,
    HIGH_PROBABILITY_COMPLEX: 0.7,
    INTEGRATION_RISK_PROBABILITY: 0.6,
    DEFAULT_MITIGATION_COST: 0.2, // 20% additional time
    DEFAULT_MITIGATION_EFFECTIVENESS: 0.8
  },

  // Validation Criteria
  VALIDATION: {
    MIN_COMPLETION_RATE_SUCCESS: 1.0,
    MIN_COMPLETION_RATE_PARTIAL: 0.5,
    DEFAULT_COMPILE_CHECK: true,
    DEFAULT_TEST_REQUIRED: true
  },

  // Implementation Metrics
  METRICS: {
    DEFAULT_CODE_QUALITY: 0.85,
    DEFAULT_TEST_COVERAGE: 82,
    DEFAULT_PERFORMANCE_SCORE: 0.78,
    MIN_SUCCESS_RATE_RECOMMENDATION: 0.8,
    MIN_TEST_COVERAGE_RECOMMENDATION: 80,
    HIGH_SEVERITY_ISSUE_THRESHOLD: 1
  },

  // Phase Configuration
  PHASES: {
    ANALYSIS: {
      REQUIREMENTS_ANALYSIS_HOURS: 2,
      ARCHITECTURE_DESIGN_HOURS: 3,
      RISK_LEVEL: 'low' as const
    },
    INTEGRATION: {
      SYSTEM_INTEGRATION_HOURS: 3,
      COMPREHENSIVE_TESTING_HOURS: 4,
      RISK_LEVEL: 'medium' as const
    }
  },

  // File Processing
  KEY_ARCHITECTURAL_FILES: [
    'src/index.ts',
    'src/app.ts',
    'src/main.ts',
    'package.json',
    'tsconfig.json'
  ],

  // Development Tools
  DEFAULT_DEVELOPMENT_TOOLS: [
    'typescript',
    'jest',
    'eslint'
  ]
} as const;

export type AutonomousDevelopmentConfig = typeof AUTONOMOUS_DEVELOPMENT_DEFAULTS;

/**
 * Get test coverage threshold by quality level
 */
export function getTestCoverageThreshold(level: 'minimum' | 'recommended' | 'excellent' | 'comprehensive'): number {
  switch (level) {
    case 'minimum': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TEST_COVERAGE.MINIMUM;
    case 'recommended': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TEST_COVERAGE.RECOMMENDED;
    case 'excellent': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TEST_COVERAGE.EXCELLENT;
    case 'comprehensive': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TEST_COVERAGE.COMPREHENSIVE;
    default: return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TEST_COVERAGE.RECOMMENDED;
  }
}

/**
 * Get complexity multiplier by complexity level
 */
export function getComplexityMultiplier(complexity: 'simple' | 'moderate' | 'complex'): number {
  switch (complexity) {
    case 'simple': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TIME_MULTIPLIERS.SIMPLE;
    case 'moderate': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TIME_MULTIPLIERS.MODERATE;
    case 'complex': return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TIME_MULTIPLIERS.COMPLEX;
    default: return AUTONOMOUS_DEVELOPMENT_DEFAULTS.TIME_MULTIPLIERS.MODERATE;
  }
}

/**
 * Calculate estimated hours with configuration
 */
export function calculateEstimatedHours(
  requirementsCount: number,
  complexity: 'simple' | 'moderate' | 'complex',
  includeIntegration = true,
  includeTesting = true
): number {
  let baseHours = requirementsCount * AUTONOMOUS_DEVELOPMENT_DEFAULTS.RESOURCE_CALCULATION.BASE_HOURS_PER_REQUIREMENT;
  baseHours *= getComplexityMultiplier(complexity);

  if (includeIntegration) {
    baseHours *= AUTONOMOUS_DEVELOPMENT_DEFAULTS.TIME_MULTIPLIERS.INTEGRATION_FACTOR;
  }

  if (includeTesting) {
    baseHours *= AUTONOMOUS_DEVELOPMENT_DEFAULTS.TIME_MULTIPLIERS.TESTING_FACTOR;
  }

  return Math.ceil(baseHours);
}

/**
 * Get risk level based on probability
 */
export function getRiskLevel(probability: number): 'low' | 'medium' | 'high' {
  if (probability < AUTONOMOUS_DEVELOPMENT_DEFAULTS.RISK_ASSESSMENT.LOW_THRESHOLD) return 'low';
  if (probability < AUTONOMOUS_DEVELOPMENT_DEFAULTS.RISK_ASSESSMENT.MEDIUM_THRESHOLD) return 'medium';
  return 'high';
}

/**
 * Calculate resource requirements
 */
export function calculateResourceRequirements(taskCount: number) {
  return {
    memoryRequirements: taskCount * AUTONOMOUS_DEVELOPMENT_DEFAULTS.RESOURCE_CALCULATION.MEMORY_MB_PER_TASK,
    diskSpace: taskCount * AUTONOMOUS_DEVELOPMENT_DEFAULTS.RESOURCE_CALCULATION.DISK_MB_PER_TASK
  };
}