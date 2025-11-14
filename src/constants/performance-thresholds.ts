/**
 * Performance Threshold Constants
 *
 * Centralized performance analysis thresholds to replace hardcoded values.
 * All thresholds can be overridden via environment variables.
 */

/**
 * Get numeric threshold from environment variable or use default
 * @param envVar - Environment variable name
 * @param defaultValue - Default value if env var not set
 * @returns Threshold value
 */
function getEnvNumber(envVar: string, defaultValue: number): number {
  const envValue = process.env[envVar];
  if (envValue) {
    const parsed = parseFloat(envValue);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Code Complexity Thresholds
 * Environment variable overrides: PERF_COMPLEXITY_HIGH, PERF_COMPLEXITY_MODERATE, etc.
 */
export const COMPLEXITY_THRESHOLDS = {
  /** High complexity threshold (cyclomatic complexity) - override with PERF_COMPLEXITY_HIGH */
  HIGH: getEnvNumber('PERF_COMPLEXITY_HIGH', 15),

  /** Moderate complexity threshold - override with PERF_COMPLEXITY_MODERATE */
  MODERATE: getEnvNumber('PERF_COMPLEXITY_MODERATE', 10),

  /** Low complexity threshold - override with PERF_COMPLEXITY_LOW */
  LOW: getEnvNumber('PERF_COMPLEXITY_LOW', 5)
} as const;

/**
 * Memory Usage Thresholds (percentage or score-based)
 * Environment variable overrides: PERF_MEMORY_HIGH, PERF_MEMORY_WARNING, etc.
 */
export const MEMORY_THRESHOLDS = {
  /** High memory usage score threshold - override with PERF_MEMORY_HIGH */
  HIGH: getEnvNumber('PERF_MEMORY_HIGH', 70),

  /** Warning memory usage score threshold - override with PERF_MEMORY_WARNING */
  WARNING: getEnvNumber('PERF_MEMORY_WARNING', 50),

  /** Large array size threshold (elements) - override with PERF_MEMORY_LARGE_ARRAY */
  LARGE_ARRAY_SIZE: getEnvNumber('PERF_MEMORY_LARGE_ARRAY', 10000)
} as const;

/**
 * Pattern Detection Thresholds
 * Environment variable overrides: PERF_PATTERN_STRING_CONCAT, etc.
 */
export const PATTERN_THRESHOLDS = {
  /** String concatenation count threshold - override with PERF_PATTERN_STRING_CONCAT */
  STRING_CONCATENATION_COUNT: getEnvNumber('PERF_PATTERN_STRING_CONCAT', 5),

  /** Nested loop depth threshold - override with PERF_PATTERN_NESTED_LOOPS */
  NESTED_LOOP_DEPTH: getEnvNumber('PERF_PATTERN_NESTED_LOOPS', 2)
} as const;

/**
 * Score Calculation Multipliers
 * Used for estimating resource usage impact
 */
export const SCORE_MULTIPLIERS = {
  /** Memory score multipliers - override with PERF_SCORE_MEMORY_* */
  MEMORY: {
    /** Array allocation multiplier - override with PERF_SCORE_MEMORY_ARRAY */
    ARRAY_ALLOCATION: getEnvNumber('PERF_SCORE_MEMORY_ARRAY', 10),

    /** Buffer allocation multiplier - override with PERF_SCORE_MEMORY_BUFFER */
    BUFFER_ALLOCATION: getEnvNumber('PERF_SCORE_MEMORY_BUFFER', 15),

    /** Map operation multiplier - override with PERF_SCORE_MEMORY_MAP */
    MAP_OPERATION: getEnvNumber('PERF_SCORE_MEMORY_MAP', 2),

    /** Filter operation multiplier - override with PERF_SCORE_MEMORY_FILTER */
    FILTER_OPERATION: getEnvNumber('PERF_SCORE_MEMORY_FILTER', 2),

    /** Maximum memory score cap - override with PERF_SCORE_MEMORY_MAX */
    MAX_SCORE: getEnvNumber('PERF_SCORE_MEMORY_MAX', 100)
  },

  /** CPU score multipliers - override with PERF_SCORE_CPU_* */
  CPU: {
    /** For loop multiplier - override with PERF_SCORE_CPU_FOR_LOOP */
    FOR_LOOP: getEnvNumber('PERF_SCORE_CPU_FOR_LOOP', 2),

    /** While loop multiplier - override with PERF_SCORE_CPU_WHILE_LOOP */
    WHILE_LOOP: getEnvNumber('PERF_SCORE_CPU_WHILE_LOOP', 3),

    /** Sort operation multiplier - override with PERF_SCORE_CPU_SORT */
    SORT_OPERATION: getEnvNumber('PERF_SCORE_CPU_SORT', 5),

    /** JSON operation multiplier - override with PERF_SCORE_CPU_JSON */
    JSON_OPERATION: getEnvNumber('PERF_SCORE_CPU_JSON', 3),

    /** Complexity multiplier - override with PERF_SCORE_CPU_COMPLEXITY */
    COMPLEXITY_MULTIPLIER: getEnvNumber('PERF_SCORE_CPU_COMPLEXITY', 2),

    /** Maximum CPU score cap - override with PERF_SCORE_CPU_MAX */
    MAX_SCORE: getEnvNumber('PERF_SCORE_CPU_MAX', 100)
  },

  /** I/O score multipliers - override with PERF_SCORE_IO_* */
  IO: {
    /** File system operation multiplier - override with PERF_SCORE_IO_FS */
    FS_OPERATION: getEnvNumber('PERF_SCORE_IO_FS', 5),

    /** Read/write file multiplier - override with PERF_SCORE_IO_FILE_RW */
    FILE_READ_WRITE: getEnvNumber('PERF_SCORE_IO_FILE_RW', 8),

    /** Network request multiplier - override with PERF_SCORE_IO_NETWORK */
    NETWORK_REQUEST: getEnvNumber('PERF_SCORE_IO_NETWORK', 10),

    /** Maximum I/O score cap - override with PERF_SCORE_IO_MAX */
    MAX_SCORE: getEnvNumber('PERF_SCORE_IO_MAX', 100)
  }
} as const;

/**
 * Performance Score Calculation Weights
 * Used for calculating overall performance scores
 */
export const PERFORMANCE_WEIGHTS = {
  /** Critical issue weight (deduction from overall score) - override with PERF_WEIGHT_CRITICAL */
  CRITICAL_ISSUE: getEnvNumber('PERF_WEIGHT_CRITICAL', 20),

  /** Major issue weight (deduction from overall score) - override with PERF_WEIGHT_MAJOR */
  MAJOR_ISSUE: getEnvNumber('PERF_WEIGHT_MAJOR', 10),

  /** Moderate issue weight (deduction from overall score) - override with PERF_WEIGHT_MODERATE */
  MODERATE_ISSUE: getEnvNumber('PERF_WEIGHT_MODERATE', 5),

  /** Bottleneck weight (deduction per bottleneck) - override with PERF_WEIGHT_BOTTLENECK */
  BOTTLENECK: getEnvNumber('PERF_WEIGHT_BOTTLENECK', 5),

  /** Base performance score - override with PERF_WEIGHT_BASE_SCORE */
  BASE_SCORE: getEnvNumber('PERF_WEIGHT_BASE_SCORE', 100)
} as const;

/**
 * Pattern Impact Estimates (milliseconds)
 * Used for estimating execution time impact of detected patterns
 */
export const PATTERN_IMPACT_ESTIMATES = {
  /** Nested loops impact (ms) - override with PERF_IMPACT_NESTED_LOOPS */
  NESTED_LOOPS: getEnvNumber('PERF_IMPACT_NESTED_LOOPS', 500),

  /** Synchronous I/O impact (ms) - override with PERF_IMPACT_SYNC_IO */
  SYNC_IO: getEnvNumber('PERF_IMPACT_SYNC_IO', 200),

  /** Large array impact (ms) - override with PERF_IMPACT_LARGE_ARRAY */
  LARGE_ARRAY: getEnvNumber('PERF_IMPACT_LARGE_ARRAY', 100),

  /** String concatenation impact (ms) - override with PERF_IMPACT_STRING_CONCAT */
  STRING_CONCATENATION: getEnvNumber('PERF_IMPACT_STRING_CONCAT', 50),

  /** N+1 query impact (ms) - override with PERF_IMPACT_N_PLUS_ONE */
  N_PLUS_ONE: getEnvNumber('PERF_IMPACT_N_PLUS_ONE', 1000)
} as const;

/**
 * Hotspot Impact Estimates (milliseconds)
 * Used for estimating execution time impact of code hotspots
 */
export const HOTSPOT_IMPACT_ESTIMATES = {
  /** Regex complexity impact (ms) - override with PERF_HOTSPOT_REGEX */
  REGEX_COMPLEXITY: getEnvNumber('PERF_HOTSPOT_REGEX', 100),

  /** Sync in async impact (ms) - override with PERF_HOTSPOT_SYNC_IN_ASYNC */
  SYNC_IN_ASYNC: getEnvNumber('PERF_HOTSPOT_SYNC_IN_ASYNC', 150),

  /** JSON operations impact (ms) - override with PERF_HOTSPOT_JSON */
  JSON_OPERATIONS: getEnvNumber('PERF_HOTSPOT_JSON', 80),

  /** Default hotspot impact (ms) - override with PERF_HOTSPOT_DEFAULT */
  DEFAULT: getEnvNumber('PERF_HOTSPOT_DEFAULT', 50)
} as const;

/**
 * Memory Impact Estimates (bytes)
 * Used for estimating memory consumption of patterns
 */
export const MEMORY_IMPACT_ESTIMATES = {
  /** Large array memory impact (bytes) - override with PERF_MEM_IMPACT_LARGE_ARRAY */
  LARGE_ARRAY: getEnvNumber('PERF_MEM_IMPACT_LARGE_ARRAY', 10000000), // 10MB

  /** String concatenation memory impact (bytes) - override with PERF_MEM_IMPACT_STRING_CONCAT */
  STRING_CONCATENATION: getEnvNumber('PERF_MEM_IMPACT_STRING_CONCAT', 1000000) // 1MB
} as const;

/**
 * CPU Impact Estimates (percentage)
 * Used for estimating CPU usage of patterns
 */
export const CPU_IMPACT_ESTIMATES = {
  /** Nested loops CPU impact (%) - override with PERF_CPU_IMPACT_NESTED_LOOPS */
  NESTED_LOOPS: getEnvNumber('PERF_CPU_IMPACT_NESTED_LOOPS', 80),

  /** String concatenation CPU impact (%) - override with PERF_CPU_IMPACT_STRING_CONCAT */
  STRING_CONCATENATION: getEnvNumber('PERF_CPU_IMPACT_STRING_CONCAT', 30),

  /** Sync I/O CPU impact (%) - override with PERF_CPU_IMPACT_SYNC_IO */
  SYNC_IO: getEnvNumber('PERF_CPU_IMPACT_SYNC_IO', 10),

  /** Large array CPU impact (%) - override with PERF_CPU_IMPACT_LARGE_ARRAY */
  LARGE_ARRAY: getEnvNumber('PERF_CPU_IMPACT_LARGE_ARRAY', 20),

  /** N+1 query CPU impact (%) - override with PERF_CPU_IMPACT_N_PLUS_ONE */
  N_PLUS_ONE: getEnvNumber('PERF_CPU_IMPACT_N_PLUS_ONE', 50),

  /** Default CPU impact (%) - override with PERF_CPU_IMPACT_DEFAULT */
  DEFAULT: getEnvNumber('PERF_CPU_IMPACT_DEFAULT', 20)
} as const;

/**
 * Helper function to get a performance threshold by name with fallback
 * @param thresholds - Object containing thresholds
 * @param key - Threshold key to retrieve
 * @param fallback - Fallback value if key doesn't exist
 * @returns Threshold value
 */
export function getPerformanceThreshold(
  thresholds: Record<string, number>,
  key: string,
  fallback: number = 0
): number {
  return thresholds[key] ?? fallback;
}
