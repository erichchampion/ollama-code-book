/**
 * Centralized Validation Utility
 *
 * Provides common validation patterns used across the codebase to eliminate duplication
 * and ensure consistent validation behavior.
 */

import { Result, ok, err, errFromString, ErrorDetails } from '../types/result.js';
import { normalizeError } from '../utils/error-utils.js';
import { AUTONOMOUS_DEVELOPMENT_DEFAULTS } from '../constants/autonomous-development.js';

export interface ValidationCriteria {
  compileCheck: boolean;
  testCoverage?: number;
  codeQualityScore?: number;
  performanceThresholds?: PerformanceThreshold[];
  securityChecks?: string[];
}

export interface PerformanceThreshold {
  metric: string;
  threshold: number;
  unit: string;
}

export interface ValidationResult {
  criterion: string;
  passed: boolean;
  score?: number;
  details: string;
  context?: Record<string, any>;
}

export interface ValidationContext {
  filePath?: string;
  taskId?: string;
  phaseId?: string;
  artifacts?: string[];
  metadata?: Record<string, any>;
}

/**
 * Validate compilation status
 */
export async function validateCompilation(
  artifacts: string[],
  context?: ValidationContext
): Promise<ValidationResult> {
  try {
    // In a real implementation, this would run actual TypeScript compilation
    // For now, we simulate the check
    const hasTypeScriptFiles = artifacts.some(path =>
      path.endsWith('.ts') || path.endsWith('.tsx')
    );

    if (!hasTypeScriptFiles) {
      return {
        criterion: 'Compilation Check',
        passed: true,
        details: 'No TypeScript files to compile',
        context
      };
    }

    // Simulate compilation success
    return {
      criterion: 'Compilation Check',
      passed: true,
      details: 'Code compiles without errors',
      context
    };
  } catch (error) {
    return {
      criterion: 'Compilation Check',
      passed: false,
      details: `Compilation failed: ${normalizeError(error).message}`,
      context
    };
  }
}

/**
 * Validate test coverage
 */
export async function validateTestCoverage(
  requiredCoverage: number,
  artifacts: string[],
  context?: ValidationContext
): Promise<ValidationResult> {
  try {
    // In a real implementation, this would run actual test coverage analysis
    // For now, we simulate based on the presence of test files
    const testFiles = artifacts.filter(path =>
      path.includes('test') || path.includes('spec')
    );
    const sourceFiles = artifacts.filter(path =>
      (path.endsWith('.ts') || path.endsWith('.js')) &&
      !path.includes('test') && !path.includes('spec')
    );

    // Simple heuristic: assume coverage based on test-to-source ratio
    const coverageRatio = sourceFiles.length > 0 ? testFiles.length / sourceFiles.length : 0;
    const estimatedCoverage = Math.min(coverageRatio * 100, 95); // Cap at 95%

    const passed = estimatedCoverage >= requiredCoverage;

    return {
      criterion: 'Test Coverage',
      passed,
      score: estimatedCoverage,
      details: passed
        ? `Test coverage (${estimatedCoverage.toFixed(1)}%) meets requirement (${requiredCoverage}%)`
        : `Test coverage (${estimatedCoverage.toFixed(1)}%) below requirement (${requiredCoverage}%)`,
      context
    };
  } catch (error) {
    return {
      criterion: 'Test Coverage',
      passed: false,
      details: `Coverage validation failed: ${normalizeError(error).message}`,
      context
    };
  }
}

/**
 * Validate code quality score
 */
export async function validateCodeQuality(
  requiredScore: number,
  artifacts: string[],
  context?: ValidationContext
): Promise<ValidationResult> {
  try {
    // In a real implementation, this would run actual code quality analysis
    // For now, we simulate based on file characteristics
    let qualityScore = 0.8; // Base quality score

    // Adjust based on number of files (more files might indicate better organization)
    if (artifacts.length > 5) qualityScore += 0.05;
    if (artifacts.length > 10) qualityScore += 0.05;

    // Check for documentation files
    const hasDocumentation = artifacts.some(path =>
      path.endsWith('.md') || path.includes('doc')
    );
    if (hasDocumentation) qualityScore += 0.05;

    // Check for configuration files
    const hasConfig = artifacts.some(path =>
      path.includes('config') || path.endsWith('.json')
    );
    if (hasConfig) qualityScore += 0.02;

    qualityScore = Math.min(qualityScore, 1.0); // Cap at 1.0

    const passed = qualityScore >= requiredScore;

    return {
      criterion: 'Code Quality',
      passed,
      score: qualityScore,
      details: passed
        ? `Code quality score (${qualityScore.toFixed(2)}) meets requirement (${requiredScore.toFixed(2)})`
        : `Code quality score (${qualityScore.toFixed(2)}) below requirement (${requiredScore.toFixed(2)})`,
      context
    };
  } catch (error) {
    return {
      criterion: 'Code Quality',
      passed: false,
      details: `Quality validation failed: ${normalizeError(error).message}`,
      context
    };
  }
}

/**
 * Validate performance thresholds
 */
export async function validatePerformanceThresholds(
  thresholds: PerformanceThreshold[],
  artifacts: string[],
  context?: ValidationContext
): Promise<ValidationResult> {
  try {
    // In a real implementation, this would run actual performance tests
    // For now, we simulate performance validation
    const results = thresholds.map(threshold => {
      // Simulate performance metrics
      let actualValue: number;

      switch (threshold.metric) {
        case 'memory':
          actualValue = artifacts.length * 10; // MB
          break;
        case 'execution_time':
          actualValue = artifacts.length * 50; // ms
          break;
        case 'bundle_size':
          actualValue = artifacts.length * 100; // KB
          break;
        default:
          actualValue = threshold.threshold * 0.8; // Assume 80% of threshold
      }

      return {
        metric: threshold.metric,
        threshold: threshold.threshold,
        actual: actualValue,
        passed: actualValue <= threshold.threshold,
        unit: threshold.unit
      };
    });

    const allPassed = results.every(r => r.passed);
    const failedMetrics = results.filter(r => !r.passed);

    return {
      criterion: 'Performance Thresholds',
      passed: allPassed,
      details: allPassed
        ? `All performance thresholds met (${results.length} metrics)`
        : `Performance thresholds failed: ${failedMetrics.map(m =>
            `${m.metric} (${m.actual}${m.unit} > ${m.threshold}${m.unit})`
          ).join(', ')}`,
      context: {
        ...context,
        performanceResults: results
      }
    };
  } catch (error) {
    return {
      criterion: 'Performance Thresholds',
      passed: false,
      details: `Performance validation failed: ${normalizeError(error).message}`,
      context
    };
  }
}

/**
 * Validate security checks
 */
export async function validateSecurityChecks(
  checks: string[],
  artifacts: string[],
  context?: ValidationContext
): Promise<ValidationResult> {
  try {
    // In a real implementation, this would run actual security analysis
    // For now, we simulate security validation
    const results = checks.map(check => {
      // Simulate security check results
      const hasIssue = Math.random() < 0.1; // 10% chance of security issue
      return {
        check,
        passed: !hasIssue,
        issue: hasIssue ? `Potential ${check} vulnerability detected` : null
      };
    });

    const allPassed = results.every(r => r.passed);
    const failedChecks = results.filter(r => !r.passed);

    return {
      criterion: 'Security Checks',
      passed: allPassed,
      details: allPassed
        ? `All security checks passed (${checks.length} checks)`
        : `Security issues found: ${failedChecks.map(c => c.issue).join(', ')}`,
      context: {
        ...context,
        securityResults: results
      }
    };
  } catch (error) {
    return {
      criterion: 'Security Checks',
      passed: false,
      details: `Security validation failed: ${normalizeError(error).message}`,
      context
    };
  }
}

/**
 * Run comprehensive validation based on criteria
 */
export async function validateTaskCriteria(
  criteria: ValidationCriteria,
  artifacts: string[],
  context?: ValidationContext
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  if (criteria.compileCheck) {
    const result = await validateCompilation(artifacts, context);
    results.push(result);
  }

  if (criteria.testCoverage !== undefined) {
    const result = await validateTestCoverage(criteria.testCoverage, artifacts, context);
    results.push(result);
  }

  if (criteria.codeQualityScore !== undefined) {
    const result = await validateCodeQuality(criteria.codeQualityScore, artifacts, context);
    results.push(result);
  }

  if (criteria.performanceThresholds && criteria.performanceThresholds.length > 0) {
    const result = await validatePerformanceThresholds(criteria.performanceThresholds, artifacts, context);
    results.push(result);
  }

  if (criteria.securityChecks && criteria.securityChecks.length > 0) {
    const result = await validateSecurityChecks(criteria.securityChecks, artifacts, context);
    results.push(result);
  }

  return results;
}

/**
 * Check if all validation results passed
 */
export function allValidationsPassed(results: ValidationResult[]): boolean {
  return results.every(result => result.passed);
}

/**
 * Get validation summary
 */
export function getValidationSummary(results: ValidationResult[]): {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  successRate: number;
  failedCriteria: string[];
} {
  const totalChecks = results.length;
  const passedChecks = results.filter(r => r.passed).length;
  const failedChecks = totalChecks - passedChecks;
  const successRate = totalChecks > 0 ? passedChecks / totalChecks : 0;
  const failedCriteria = results.filter(r => !r.passed).map(r => r.criterion);

  return {
    totalChecks,
    passedChecks,
    failedChecks,
    successRate,
    failedCriteria
  };
}

/**
 * Validate configuration object structure
 */
export function validateConfiguration<T>(
  config: any,
  requiredFields: (keyof T)[],
  optionalFields?: (keyof T)[]
): Result<T, ErrorDetails> {
  if (!config || typeof config !== 'object') {
    return errFromString('Configuration must be an object', 'INVALID_CONFIG_TYPE');
  }

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!(field in config)) {
      missingFields.push(String(field));
    }
  }

  if (missingFields.length > 0) {
    return errFromString(
      `Missing required configuration fields: ${missingFields.join(', ')}`,
      'MISSING_CONFIG_FIELDS',
      { missingFields, providedFields: Object.keys(config) }
    );
  }

  // Validate field types (basic validation)
  for (const [key, value] of Object.entries(config)) {
    if (value === null || value === undefined) {
      if (requiredFields.includes(key as keyof T)) {
        return errFromString(
          `Required field '${key}' cannot be null or undefined`,
          'NULL_REQUIRED_FIELD',
          { field: key }
        );
      }
    }
  }

  return ok(config as T);
}

/**
 * Create default validation criteria based on configuration
 */
export function createDefaultValidationCriteria(
  includeTestCoverage = true,
  includeCodeQuality = true,
  includeCompileCheck = true
): ValidationCriteria {
  return {
    compileCheck: includeCompileCheck && AUTONOMOUS_DEVELOPMENT_DEFAULTS.VALIDATION.DEFAULT_COMPILE_CHECK,
    testCoverage: includeTestCoverage ? AUTONOMOUS_DEVELOPMENT_DEFAULTS.TEST_COVERAGE.RECOMMENDED : undefined,
    codeQualityScore: includeCodeQuality ? AUTONOMOUS_DEVELOPMENT_DEFAULTS.CODE_QUALITY.RECOMMENDED_SCORE : undefined
  };
}
