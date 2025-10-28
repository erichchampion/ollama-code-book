/**
 * Challenges in testing AI systems
 */
export enum AITestingChallenge {
  /** Outputs vary between runs */
  NON_DETERMINISTIC = 'non_deterministic',

  /** No single "correct" answer */
  SUBJECTIVE_QUALITY = 'subjective_quality',

  /** Models update, behavior changes */
  MODEL_DRIFT = 'model_drift',

  /** Slow, expensive API calls */
  SLOW_EXPENSIVE = 'slow_expensive',

  /** Hard to test edge cases */
  EDGE_CASE_COVERAGE = 'edge_case_coverage',

  /** Difficult to isolate failures */
  DEBUGGING = 'debugging'
}

/**
 * Solutions to AI testing challenges
 */
export const AI_TESTING_SOLUTIONS = {
  [AITestingChallenge.NON_DETERMINISTIC]: [
    'Use quality-based assertions instead of exact matching',
    'Test properties and patterns, not exact output',
    'Use semantic similarity for comparison'
  ],

  [AITestingChallenge.SUBJECTIVE_QUALITY]: [
    'Define measurable quality criteria',
    'Use automated quality checks (linting, parsing)',
    'Create rubrics for evaluation'
  ],

  [AITestingChallenge.MODEL_DRIFT]: [
    'Version lock models in tests',
    'Monitor quality metrics over time',
    'Use regression test suites'
  ],

  [AITestingChallenge.SLOW_EXPENSIVE]: [
    'Mock AI providers for unit tests',
    'Cache responses for deterministic tests',
    'Use smaller/faster models for testing'
  ],

  [AITestingChallenge.EDGE_CASE_COVERAGE]: [
    'Generate synthetic test cases',
    'Use property-based testing',
    'Collect real failure cases'
  ],

  [AITestingChallenge.DEBUGGING]: [
    'Log full context (prompt, response, metadata)',
    'Capture intermediate steps',
    'Use replay testing'
  ]
};