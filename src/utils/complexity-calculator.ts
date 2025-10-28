/**
 * Centralized Complexity Calculator
 *
 * Provides standardized cyclomatic complexity calculation to eliminate DRY violations.
 * Uses consistent algorithms and configurable thresholds.
 */

export interface ComplexityResult {
  cyclomaticComplexity: number;
  rating: 'Low' | 'Moderate' | 'High' | 'Very High';
  description: string;
}

export interface ComplexityConfig {
  thresholds: {
    low: number;
    moderate: number;
    high: number;
  };
}

/**
 * Calculate cyclomatic complexity using McCabe's method
 */
export function calculateCyclomaticComplexity(
  content: string,
  config?: ComplexityConfig
): ComplexityResult {
  // Standardized complexity patterns based on McCabe's cyclomatic complexity
  const complexityPatterns = [
    /\b(if|while|for|case|catch|else\s+if|elif|unless)\b/g,  // Decision points
    /(\|\||&&|\band\b|\bor\b)/g,  // Logical operators
    /\?\s*[^:\n]*:/g  // Ternary operators (standardized pattern)
  ];

  let complexity = 1; // Base complexity for the main execution path

  for (const pattern of complexityPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return {
    cyclomaticComplexity: complexity,
    rating: categorizeComplexity(complexity, config?.thresholds),
    description: getComplexityDescription(complexity)
  };
}

function categorizeComplexity(
  complexity: number,
  thresholds = { low: 5, moderate: 10, high: 20 }
): 'Low' | 'Moderate' | 'High' | 'Very High' {
  if (complexity <= thresholds.low) return 'Low';
  if (complexity <= thresholds.moderate) return 'Moderate';
  if (complexity <= thresholds.high) return 'High';
  return 'Very High';
}

function getComplexityDescription(complexity: number): string {
  if (complexity <= 5) return 'Simple, easy to understand and maintain';
  if (complexity <= 10) return 'More complex, but still manageable';
  if (complexity <= 20) return 'Complex, consider refactoring';
  return 'Very complex, high risk for bugs';
}

/**
 * Calculate average complexity for multiple files
 */
export function calculateAverageComplexity(
  files: Array<{ content: string; path: string }>,
  config?: ComplexityConfig
): {
  averageComplexity: number;
  totalComplexity: number;
  fileCount: number;
  distribution: Record<string, number>;
} {
  let totalComplexity = 0;
  let fileCount = 0;
  const distribution: Record<string, number> = {
    'Low': 0,
    'Moderate': 0,
    'High': 0,
    'Very High': 0
  };

  for (const file of files) {
    const result = calculateCyclomaticComplexity(file.content, config);
    if (result.cyclomaticComplexity > 0) {
      totalComplexity += result.cyclomaticComplexity;
      fileCount++;
      distribution[result.rating]++;
    }
  }

  return {
    averageComplexity: fileCount > 0 ? Math.round(totalComplexity / fileCount) : 0,
    totalComplexity,
    fileCount,
    distribution
  };
}