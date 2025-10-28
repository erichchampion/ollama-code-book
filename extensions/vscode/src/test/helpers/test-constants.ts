/**
 * VS Code Extension Test Constants
 * Centralized configuration values for extension testing
 */

/**
 * Extension identification constants
 */
export const EXTENSION_TEST_CONSTANTS = {
  /** Default extension ID */
  EXTENSION_ID: 'ollama-code.ollama-code-vscode',
  /** Default timeout for extension activation */
  ACTIVATION_TIMEOUT: 10000,
  /** Default timeout for command execution */
  COMMAND_TIMEOUT: 5000,
  /** Default polling interval for async checks */
  POLLING_INTERVAL: 100,
} as const;

/**
 * WebSocket test constants
 */
export const WEBSOCKET_TEST_CONSTANTS = {
  /** Default WebSocket connection timeout */
  CONNECTION_TIMEOUT: 5000,
  /** Default message wait timeout */
  MESSAGE_TIMEOUT: 5000,
  /** Default polling interval for message checks */
  MESSAGE_POLL_INTERVAL: 50,
  /** Default test port for mock WebSocket server */
  DEFAULT_TEST_PORT: 9876,
  /** Heartbeat test interval */
  HEARTBEAT_INTERVAL: 1000,
  /** Number of heartbeat iterations */
  HEARTBEAT_COUNT: 3,

  /** Port assignments for different test suites */
  PORTS: {
    /** Integration tests port */
    INTEGRATION_TESTS: 9876,
    /** Connection management tests port */
    CONNECTION_TESTS: 9877,
    /** Message processing tests port */
    MESSAGE_TESTS: 9878,
    /** MCP integration tests port */
    MCP_TESTS: 9879,
  },

  /** Authentication test tokens */
  AUTH: {
    /** Valid authentication token for tests */
    VALID_TOKEN: 'test-auth-token-12345',
    /** Invalid authentication token for tests */
    INVALID_TOKEN: 'invalid-token',
  },
} as const;

/**
 * MCP (Model Context Protocol) test constants
 */
export const MCP_TEST_CONSTANTS = {
  /** MCP protocol version */
  PROTOCOL_VERSION: '2024-11-05',
  /** Mock server name */
  SERVER_NAME: 'mock-mcp-server',
  /** Mock server version */
  SERVER_VERSION: '1.0.0',
  /** Default heartbeat interval for MCP server */
  DEFAULT_HEARTBEAT_INTERVAL: 30000,
} as const;

/**
 * JSON-RPC 2.0 error codes
 */
export const JSONRPC_ERROR_CODES = {
  /** Parse error - Invalid JSON */
  PARSE_ERROR: -32700,
  /** Invalid request - Not a valid JSON-RPC request */
  INVALID_REQUEST: -32600,
  /** Method not found */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameters */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error */
  INTERNAL_ERROR: -32603,
  /** Server error (reserved range -32000 to -32099) */
  SERVER_ERROR: -32000,
} as const;

/**
 * Test delay constants (in milliseconds)
 */
export const TEST_DELAYS = {
  /** Short cleanup wait */
  CLEANUP: 100,
  /** Disconnection detection wait */
  DISCONNECTION: 200,
  /** Server restart wait */
  SERVER_RESTART: 100,
  /** Stability test interval */
  STABILITY_INTERVAL: 500,
  /** Message processing wait */
  MESSAGE_PROCESSING: 100,
} as const;

/**
 * Expected command IDs registered by the extension
 */
export const EXPECTED_COMMANDS = [
  'ollama-code.ask',
  'ollama-code.explain',
  'ollama-code.refactor',
  'ollama-code.review',
  'ollama-code.test',
  'ollama-code.document',
  'ollama-code.fix',
  'ollama-code.optimize',
  'ollama-code.security',
  'ollama-code.analyze',
  'ollama-code.chat',
  'ollama-code.codeAction',
  'ollama-code.inlineCompletion',
  'ollama-code.selectModel',
  'ollama-code.startServer',
  'ollama-code.stopServer',
  'ollama-code.restartServer',
  'ollama-code.showStatus',
  'ollama-code.clearCache',
  'ollama-code.openSettings',
  'ollama-code.showLogs',
  'ollama-code.showHelp',
] as const;

/**
 * Expected configuration keys
 */
export const EXPECTED_CONFIG_KEYS = [
  'serverPort',
  'autoStart',
  'modelName',
  'maxTokens',
  'temperature',
  'timeout',
  'logLevel',
  'enableTelemetry',
] as const;

/**
 * Provider test timeout constants (in milliseconds)
 * Centralized timeout values for VS Code provider tests
 */
export const PROVIDER_TEST_TIMEOUTS = {
  /** Setup/teardown timeout */
  SETUP: 10000,
  /** Standard test timeout */
  STANDARD_TEST: 5000,
  /** Timeout-specific test timeout */
  TIMEOUT_TEST: 8000,
  /** AI request test timeout */
  AI_REQUEST: 3000,
  /** Simulated slow AI response (triggers timeout) */
  SIMULATED_SLOW_AI: 10000,
  /** Simulated slow hover response (triggers timeout) */
  SIMULATED_SLOW_HOVER: 5000,
  /** Extended test timeout for performance tests */
  EXTENDED_TEST: 180000, // 3 minutes
} as const;

/**
 * Git Hooks test constants
 * Centralized configuration values for Git hooks management testing
 */
export const GIT_HOOKS_TEST_CONSTANTS = {
  /** Default analysis timeout for hooks */
  DEFAULT_ANALYSIS_TIMEOUT: 30000,
  /** Maximum hook execution time for performance tests */
  MAX_HOOK_EXECUTION_TIME: 5000,
  /** Test Git repositories base directory */
  TEST_REPOS_DIR: '.test-git-repos',
  /** Test workspaces base directory */
  TEST_WORKSPACES_DIR: '.test-workspaces',
  /** Hook marker comment */
  HOOK_MARKER: '# ollama-code generated hook',
  /** Backup file extension */
  BACKUP_EXTENSION: '.backup',
  /** Test Git user email */
  TEST_GIT_EMAIL: 'test@example.com',
  /** Test Git user name */
  TEST_GIT_NAME: 'Test User',
} as const;

/**
 * Git Hooks file permission constants
 */
export const GIT_HOOKS_FILE_PERMISSIONS = {
  /** Executable permission (rwxr-xr-x) */
  EXECUTABLE: 0o755,
  /** Execute bit mask for checking executability */
  EXECUTE_BIT: 0o111,
} as const;

/**
 * Git hook types
 */
export const GIT_HOOK_TYPES = ['pre-commit', 'commit-msg', 'pre-push', 'post-merge'] as const;
export type GitHookType = (typeof GIT_HOOK_TYPES)[number];

/**
 * Commit message generation test constants
 * Centralized configuration values for commit message generation testing
 */
export const COMMIT_MESSAGE_TEST_CONSTANTS = {
  /** Default commit message max length (conventional standard) */
  DEFAULT_MAX_LENGTH: 72,
  /** Extended max length for longer messages */
  EXTENDED_MAX_LENGTH: 100,
  /** Short max length for testing constraints */
  SHORT_MAX_LENGTH: 50,
  /** Default confidence score for generated messages */
  DEFAULT_CONFIDENCE: 0.85,
  /** Default impact level for changes */
  DEFAULT_IMPACT_LEVEL: 'minor' as const,
  /** Default scope for testing */
  DEFAULT_SCOPE: 'core',
  /** Number of alternative messages to generate */
  ALTERNATIVE_MESSAGE_COUNT: 2,
  /** Default body text for mock messages */
  DEFAULT_BODY: 'Detailed description of changes',
  /** Default footer text for mock messages */
  DEFAULT_FOOTER: 'BREAKING CHANGE: API changes',
} as const;

/**
 * Commit type emoji mapping
 * Maps conventional commit types to their emoji equivalents
 */
export const COMMIT_EMOJI_MAP: Record<string, string> = {
  feat: '✨',
  fix: '🐛',
  docs: '📝',
  style: '💄',
  refactor: '♻️',
  perf: '⚡️',
  test: '✅',
  build: '🏗️',
  ci: '👷',
  chore: '🔧',
  revert: '⏪',
  wip: '🚧',
} as const;

/**
 * Commit message subject templates for testing
 */
export const COMMIT_SUBJECT_TEMPLATES = {
  FEAT: 'Add new functionality',
  FIX: 'Fix critical bug',
  TEST: 'Add test coverage',
  DEFAULT: 'Update code',
} as const;

/**
 * Pull Request Review Automation Test Constants
 * Centralized configuration values for PR review automation testing
 */
export const PR_REVIEW_TEST_CONSTANTS = {
  /** Default GitHub repository URL for testing */
  DEFAULT_GITHUB_REPO: 'https://github.com/test/repo',
  /** Default GitLab repository URL for testing */
  DEFAULT_GITLAB_REPO: 'https://gitlab.com/test/repo',
  /** Default Bitbucket repository URL for testing */
  DEFAULT_BITBUCKET_REPO: 'https://bitbucket.org/test/repo',
  /** Default API token for testing */
  DEFAULT_API_TOKEN: 'test-token',
  /** Invalid API token for error testing */
  INVALID_API_TOKEN: 'invalid-token',
  /** Bot author name for automated comments */
  BOT_AUTHOR_NAME: 'ollama-code-bot',
  /** Default PR ID for testing */
  DEFAULT_PR_ID: 123,
  /** Test user name */
  TEST_USER_NAME: 'test-user',
  /** Default target branch */
  DEFAULT_TARGET_BRANCH: 'main',
  /** Mock PR title */
  MOCK_PR_TITLE: 'feat: Add new feature',
  /** Mock PR description */
  MOCK_PR_DESCRIPTION: 'This PR adds a new feature to the codebase',
  /** Mock source branch */
  MOCK_SOURCE_BRANCH: 'feat/new-feature',
  /** Mock file path */
  MOCK_FILE_PATH: 'src/feature.ts',
  /** Mock patch content */
  MOCK_PATCH: '+ new code\n- old code',
} as const;

/**
 * PR Security Scoring Constants
 * Weights and thresholds for security vulnerability scoring
 */
export const PR_SECURITY_SCORING = {
  /** Weight for critical severity vulnerabilities */
  CRITICAL_WEIGHT: 40,
  /** Weight for high severity vulnerabilities */
  HIGH_WEIGHT: 20,
  /** Weight for medium severity vulnerabilities */
  MEDIUM_WEIGHT: 10,
  /** Weight for low severity vulnerabilities */
  LOW_WEIGHT: 5,
  /** Maximum security score */
  MAX_SCORE: 100,
  /** Minimum security score */
  MIN_SCORE: 0,
} as const;

/**
 * PR Quality Metric Weights
 * Weights for calculating overall quality score
 * NOTE: All weights must sum to 1.0
 */
export const PR_QUALITY_SCORING = {
  /** Weight for maintainability metric (30%) */
  MAINTAINABILITY_WEIGHT: 0.3,
  /** Weight for test coverage metric (30%) */
  TEST_COVERAGE_WEIGHT: 0.3,
  /** Weight for documentation coverage metric (20%) */
  DOCUMENTATION_WEIGHT: 0.2,
  /** Weight for complexity metric (20%) */
  COMPLEXITY_WEIGHT: 0.2,
  /** Mock test coverage value for testing */
  MOCK_TEST_COVERAGE: 80,
  /** Mock documentation coverage value for testing */
  MOCK_DOCUMENTATION_COVERAGE: 70,
} as const;

/**
 * PR Metric Calculation Divisors
 * Constants used in metric calculations
 */
export const PR_METRIC_DIVISORS = {
  /** Divisor for calculating complexity from changes */
  COMPLEXITY_FROM_CHANGES: 5,
  /** Divisor for calculating code smells from changes */
  CODE_SMELLS_FROM_CHANGES: 20,
  /** Divisor for complexity change calculation */
  COMPLEXITY_CHANGE_DIVISOR: 10,
  /** Divisor for risk score calculation */
  RISK_SCORE_DIVISOR: 5,
  /** Multiplier for deletion ratio in risk calculation */
  DELETION_RATIO_MULTIPLIER: 100,
  /** Length for patch preview in vulnerability reports */
  PATCH_PREVIEW_LENGTH: 100,
  /** Range for random comment ID generation */
  COMMENT_ID_RANGE: 10000,
  /** Default line number for vulnerabilities */
  DEFAULT_VULNERABILITY_LINE: 10,
  /** Divisor for maintainability calculation */
  MAINTAINABILITY_DIVISOR: 2,
} as const;

/**
 * PR Approval Thresholds
 * Minimum scores required for auto-approval
 */
export const PR_APPROVAL_THRESHOLDS = {
  /** Minimum security score for auto-approval */
  MINIMUM_SECURITY_SCORE: 80,
  /** Default minimum quality score for auto-approval */
  DEFAULT_MINIMUM_QUALITY_SCORE: 70,
  /** Maximum high-severity issues before blocking */
  HIGH_SEVERITY_BLOCK_COUNT: 0,
} as const;

/**
 * PR Mock File Metadata
 * Default values for mock file changes
 */
export const PR_MOCK_FILE_METADATA = {
  /** Mock file additions count */
  MOCK_ADDITIONS: 50,
  /** Mock file deletions count */
  MOCK_DELETIONS: 10,
  /** Mock file changes count */
  MOCK_CHANGES: 60,
} as const;

/**
 * PR Security Templates
 * Template strings for security vulnerability reporting
 */
export const PR_SECURITY_TEMPLATES = {
  /** XSS vulnerability category */
  XSS_CATEGORY: 'XSS',
  /** XSS vulnerability description */
  XSS_DESCRIPTION: 'Potential XSS vulnerability detected',
  /** XSS sanitization recommendation */
  XSS_RECOMMENDATION: 'Sanitize user input before rendering',
  /** XSS CWE identifier */
  XSS_CWE_ID: 'CWE-79',
} as const;

/**
 * PR Review Recommendation Templates
 * Template strings for review recommendations
 */
export const PR_REVIEW_RECOMMENDATIONS = {
  /** Recommendation when critical security issues detected */
  CRITICAL_SECURITY_ISSUES: (count: number) =>
    `Critical security issues detected. Please address ${count} critical vulnerabilities before merging.`,
  /** Recommendation when all checks pass */
  ALL_CHECKS_PASSED: 'All checks passed. PR approved automatically.',
  /** Recommendation when high severity issues found */
  HIGH_SEVERITY_ISSUES: (highCount: number, qualityScore: number) =>
    `Please address ${highCount} high-severity issues and improve code quality (current score: ${qualityScore}/100).`,
  /** Recommendation for minor improvements */
  MINOR_IMPROVEMENTS: 'Review completed. Minor improvements suggested.',
} as const;

/**
 * Feature Implementation Workflow Test Constants
 * Centralized configuration values for autonomous feature development testing
 */
export const FEATURE_IMPLEMENTATION_CONSTANTS = {
  /** Default maximum number of phases in implementation plan */
  DEFAULT_MAX_PHASES: 4,
  /** Default team size */
  DEFAULT_TEAM_SIZE: 5,
  /** Minimum requirement text length to be considered valid */
  MIN_REQUIREMENT_LENGTH: 10,
  /** Backend effort ratio (percentage of total time) */
  BACKEND_EFFORT_RATIO: 0.4,
  /** Frontend effort ratio (percentage of total time) */
  FRONTEND_EFFORT_RATIO: 0.3,
  /** Database effort ratio (percentage of total time) */
  DATABASE_EFFORT_RATIO: 0.15,
  /** Infrastructure effort ratio (percentage of total time) */
  INFRA_EFFORT_RATIO: 0.1,
  /** QA effort ratio (percentage of total time) */
  QA_EFFORT_RATIO: 0.25,
  /** Simple feature text specification */
  SIMPLE_SPEC_TEXT: 'Add a login button to the homepage',
  /** Moderate feature text specification */
  MODERATE_SPEC_TEXT: 'Implement user authentication with email and password. Users should be able to register, login, logout, and reset their password.',
  /** Complex feature text specification */
  COMPLEX_SPEC_TEXT: 'Build a real-time collaborative document editing system with version control, conflict resolution, user presence indicators, and comment threads. Must scale to 10000 concurrent users.',
} as const;

/**
 * Feature Complexity Scoring Weights
 * Constants for calculating feature complexity scores
 */
export const FEATURE_COMPLEXITY_WEIGHTS = {
  /** Weight for component count in complexity score */
  COMPONENT_WEIGHT: 5,
  /** Weight for dependency count in complexity score */
  DEPENDENCY_WEIGHT: 8,
  /** Weight for technical challenges in complexity score */
  CHALLENGE_WEIGHT: 10,
  /** Component score multiplier in final calculation */
  COMPONENT_MULTIPLIER: 0.3,
  /** Dependency score multiplier in final calculation */
  DEPENDENCY_MULTIPLIER: 0.3,
  /** Challenge score multiplier in final calculation */
  CHALLENGE_MULTIPLIER: 0.4,
  /** Maximum complexity score */
  MAX_SCORE: 100,
  /** Threshold for simple complexity (<25) */
  SIMPLE_THRESHOLD: 25,
  /** Threshold for moderate complexity (<50) */
  MODERATE_THRESHOLD: 50,
  /** Threshold for complex complexity (<75) */
  COMPLEX_THRESHOLD: 75,
} as const;

/**
 * Feature Time Estimation Constants
 * Constants for estimating implementation time
 */
export const FEATURE_TIME_ESTIMATES = {
  /** Base hours by complexity level */
  BASE_HOURS: {
    simple: 8,
    moderate: 40,
    complex: 120,
    very_complex: 320,
  },
  /** Additional hours per requirement */
  HOURS_PER_REQUIREMENT: 4,
  /** Additional hours per technical challenge */
  HOURS_PER_CHALLENGE: 16,
  /** Hours per working day */
  HOURS_PER_DAY: 8,
  /** Minimum confidence percentage */
  MIN_CONFIDENCE: 20,
  /** Maximum confidence percentage */
  MAX_CONFIDENCE: 90,
  /** Phase distribution percentages (must sum to 1.0) */
  PHASE_DISTRIBUTION: {
    DESIGN: 0.20,        // 20% design
    IMPLEMENTATION: 0.50, // 50% implementation
    TESTING: 0.20,       // 20% testing
    REVIEW: 0.10,        // 10% review
  },
} as const;

/**
 * Feature Specification Text Matching Keywords
 * Keywords for analyzing requirement text and determining classifications
 */
export const FEATURE_SPEC_KEYWORDS = {
  /** Priority detection keywords */
  PRIORITY: {
    CRITICAL: ['critical', 'must'],
    HIGH: ['important', 'should'],
    LOW: ['nice', 'could'],
  },
  /** Category detection keywords */
  CATEGORY: {
    BUG_FIX: ['fix', 'bug'],
    ENHANCEMENT: ['improve', 'enhance'],
    REFACTORING: ['refactor'],
  },
  /** Backend requirement keywords */
  BACKEND: ['api', 'backend', 'server', 'database', 'endpoint'],
  /** Frontend requirement keywords */
  FRONTEND: ['ui', 'frontend', 'user interface', 'component', 'page'],
  /** Database requirement keywords */
  DATABASE: ['database', 'storage', 'persist', 'query', 'schema'],
  /** Infrastructure requirement keywords */
  INFRASTRUCTURE: ['deploy', 'infrastructure', 'container', 'kubernetes', 'scaling'],
  /** Technical challenge detection keywords */
  CHALLENGES: {
    REALTIME: ['real-time', 'realtime'],
    PERFORMANCE: ['scale', 'performance'],
    SECURITY: ['security', 'encryption'],
    INTEGRATION: ['integration', 'api'],
  },
  /** External dependency detection keywords */
  DEPENDENCIES: {
    PAYMENT: ['stripe', 'payment'],
    AUTH: ['auth', 'oauth'],
    EMAIL: ['email'],
  },
  /** Infrastructure type detection keywords */
  INFRASTRUCTURE_TYPES: {
    DATABASE: ['database'],
    CACHE: ['cache', 'redis'],
    QUEUE: ['queue', 'message'],
  },
  /** Acceptance criteria generation keywords */
  ACCEPTANCE_CRITERIA: {
    USER: ['user'],
    TEST: ['test'],
  },
  /** Technical constraint detection keywords */
  TECHNICAL_CONSTRAINTS: {
    PERFORMANCE: ['performance'],
    SCALE: ['scale'],
  },
} as const;

/**
 * Feature Implementation Magic Numbers
 * Numeric constants for feature implementation workflow
 */
export const FEATURE_IMPLEMENTATION_NUMBERS = {
  /** Starting requirement ID */
  INITIAL_REQ_ID: 1,
  /** Requirement ID padding width */
  REQ_ID_PADDING: 3,
  /** Task ID padding width */
  TASK_ID_PADDING: 3,
  /** Description truncation length for task names */
  TASK_NAME_MAX_LENGTH: 30,
  /** Number of design tasks */
  DESIGN_TASK_COUNT: 3,
  /** Number of testing tasks */
  TESTING_TASK_COUNT: 2,
  /** Number of review tasks */
  REVIEW_TASK_COUNT: 2,
  /** Component count multiplier per requirement */
  COMPONENT_MULTIPLIER: 1.5,
  /** Dependency count multiplier per requirement */
  DEPENDENCY_MULTIPLIER: 0.5,
  /** Complexity score confidence divisor */
  CONFIDENCE_DIVISOR: 2,
  /** Concurrent users threshold for scale constraint */
  CONCURRENT_USERS_THRESHOLD: 10000,
  /** Phase 1 number */
  PHASE_DESIGN: 1,
  /** Phase 2 number */
  PHASE_IMPLEMENTATION: 2,
  /** Phase 3 number */
  PHASE_TESTING: 3,
  /** Phase 4 number */
  PHASE_REVIEW: 4,
} as const;

/**
 * Risk Assessment Thresholds and Values
 * Constants for risk identification and scoring
 */
export const RISK_ASSESSMENT_CONSTANTS = {
  /** Threshold for technical challenge count to trigger risk */
  CHALLENGE_COUNT_THRESHOLD: 2,
  /** Threshold for dependency count to trigger risk */
  DEPENDENCY_COUNT_THRESHOLD: 3,
  /** High complexity risk configuration */
  HIGH_COMPLEXITY_RISK: {
    ID: 'RISK-001',
    DESCRIPTION: 'High complexity may lead to timeline delays',
    LEVEL: 'high' as const,
    PROBABILITY: 70,
    IMPACT: 80,
    OWNER: 'backend' as const,
  },
  /** Multiple challenges risk configuration */
  TECHNICAL_CHALLENGES_RISK: {
    ID: 'RISK-002',
    DESCRIPTION: 'Multiple technical challenges may require research and prototyping',
    LEVEL: 'medium' as const,
    PROBABILITY: 60,
    IMPACT: 70,
    OWNER: 'backend' as const,
  },
  /** Multiple dependencies risk configuration */
  DEPENDENCY_RISK: {
    ID: 'RISK-003',
    DESCRIPTION: 'Multiple dependencies may cause integration issues',
    LEVEL: 'medium' as const,
    PROBABILITY: 50,
    IMPACT: 60,
    OWNER: 'backend' as const,
  },
} as const;

/**
 * Implementation Phase Templates
 * Template data for standard implementation phases
 */
export const PHASE_TEMPLATES = {
  DESIGN: {
    NAME: 'Design & Architecture',
    DESCRIPTION: 'Design system architecture and create technical specifications',
    MILESTONE: 'Architecture Review Complete',
  },
  IMPLEMENTATION: {
    NAME: 'Implementation',
    DESCRIPTION: 'Implement features according to specifications',
    MILESTONE: 'Feature Implementation Complete',
  },
  TESTING: {
    NAME: 'Testing & QA',
    DESCRIPTION: 'Comprehensive testing and quality assurance',
    MILESTONE: 'All Tests Passing',
  },
  REVIEW: {
    NAME: 'Review & Deployment',
    DESCRIPTION: 'Code review and production deployment',
    MILESTONE: 'Production Deployment Complete',
  },
} as const;

/**
 * Task Templates for Each Phase
 * Predefined task configurations for standard phases
 */
export const TASK_TEMPLATES = {
  DESIGN: [
    {
      NAME: 'Create System Architecture',
      DESCRIPTION: 'Design overall system architecture and component interactions',
      PRIORITY: 'critical' as const,
      ROLE: 'backend' as const,
      RISK: 'medium' as const,
    },
    {
      NAME: 'Design Database Schema',
      DESCRIPTION: 'Design database schema and data models',
      PRIORITY: 'high' as const,
      ROLE: 'database' as const,
      RISK: 'low' as const,
    },
    {
      NAME: 'Create API Specifications',
      DESCRIPTION: 'Define API endpoints and contracts',
      PRIORITY: 'high' as const,
      ROLE: 'backend' as const,
      RISK: 'low' as const,
    },
  ],
  TESTING: [
    {
      NAME: 'Write Unit Tests',
      DESCRIPTION: 'Write comprehensive unit tests for all components',
      PRIORITY: 'critical' as const,
      ROLE: 'qa' as const,
      RISK: 'low' as const,
    },
    {
      NAME: 'Write Integration Tests',
      DESCRIPTION: 'Write integration tests for component interactions',
      PRIORITY: 'high' as const,
      ROLE: 'qa' as const,
      RISK: 'low' as const,
    },
  ],
  REVIEW: [
    {
      NAME: 'Code Review',
      DESCRIPTION: 'Comprehensive code review of all changes',
      PRIORITY: 'critical' as const,
      ROLE: 'backend' as const,
      RISK: 'low' as const,
    },
    {
      NAME: 'Deploy to Production',
      DESCRIPTION: 'Deploy feature to production environment',
      PRIORITY: 'critical' as const,
      ROLE: 'infrastructure' as const,
      RISK: 'medium' as const,
    },
  ],
} as const;

/**
 * Acceptance Criteria and Constraint Templates
 * Template strings for generating acceptance criteria and constraints
 */
export const SPEC_TEMPLATES = {
  /** Standard acceptance criteria templates */
  ACCEPTANCE_CRITERIA: {
    USER_SUCCESS: 'User can successfully use the feature',
    TEST_COVERAGE: 'Feature has comprehensive test coverage',
    PERFORMANCE: 'Feature meets performance requirements',
  },
  /** Technical constraint templates */
  TECHNICAL_CONSTRAINTS: {
    RESPONSE_TIME: 'Must maintain sub-second response time',
    CONCURRENT_USERS: (count: number) => `Must handle ${count}+ concurrent users`,
  },
  /** Technical challenge description templates */
  TECHNICAL_CHALLENGES: {
    REALTIME: 'Real-time data synchronization',
    PERFORMANCE: 'High-performance architecture',
    SECURITY: 'Security and encryption implementation',
    INTEGRATION: 'Third-party API integration',
  },
  /** External dependency description templates */
  EXTERNAL_DEPENDENCIES: {
    PAYMENT: 'Stripe Payment API',
    AUTH: 'OAuth Provider',
    EMAIL: 'Email Service Provider',
  },
  /** Infrastructure description templates */
  INFRASTRUCTURE: {
    DATABASE: 'PostgreSQL Database',
    CACHE: 'Redis Cache',
    QUEUE: 'Message Queue',
  },
} as const;

/**
 * Risk Mitigation Strategy Templates
 * Predefined mitigation strategies for common risks
 */
export const RISK_MITIGATION_STRATEGIES = {
  HIGH_COMPLEXITY: [
    'Break down into smaller deliverables',
    'Add buffer time to estimates',
    'Increase team size if needed',
  ],
  TECHNICAL_CHALLENGES: [
    'Allocate time for spike research',
    'Create proof-of-concept prototypes',
    'Consult with technical experts',
  ],
  MULTIPLE_DEPENDENCIES: [
    'Create integration test plan early',
    'Use feature flags for gradual rollout',
    'Maintain backward compatibility',
  ],
} as const;

/**
 * Debugging & Issue Resolution Constants
 * Configuration values for autonomous debugging workflow
 */
export const DEBUGGING_CONSTANTS = {
  DEFAULT_MAX_SOLUTIONS: 3,
  BASE_CONFIDENCE: 50,
  MAX_CONFIDENCE: 95,
  CONFIDENCE_BOOST_STACK: 15,
  CONFIDENCE_BOOST_CONTEXT: 10,
  CONFIDENCE_BOOST_PATTERN: 20,
  MIN_CONTEXT_LENGTH: 50,
  DEEP_STACK_THRESHOLD: 10,
  MAX_RELATED_LOCATIONS: 5,
  BASE_FIX_TIME: 2.0, // hours
  COMPLEXITY_MULTIPLIER: 1.5,
  EFFICIENCY_MULTIPLIER: 0.8,
  COMPLEX_LOCATION_THRESHOLD: 3,
  HIGH_RISK_LOCATION_THRESHOLD: 5,
  MEDIUM_RISK_FACTOR_THRESHOLD: 2,
  LOW_CONFIDENCE_THRESHOLD: 60,
  HIGH_EFFECTIVENESS_THRESHOLD: 80,
} as const;

/**
 * Error Categorization Keywords
 * Keywords used to categorize errors into specific types
 */
export const ERROR_CATEGORIZATION_KEYWORDS = {
  NULL_POINTER: {
    MESSAGE: ['null', 'undefined'],
    ERROR_TYPE: ['typeerror'],
  },
  TYPE_ERROR: {
    MESSAGE: ['not a function', 'not defined'],
    ERROR_TYPE: ['typeerror'],
  },
  ASYNC_ERROR: {
    MESSAGE: ['promise', 'async', 'await'],
    ERROR_TYPE: [],
  },
  MEMORY_LEAK: {
    MESSAGE: ['memory', 'heap'],
    ERROR_TYPE: [],
  },
  CONFIGURATION_ERROR: {
    MESSAGE: ['config', 'environment'],
    ERROR_TYPE: [],
  },
  LOGIC_ERROR: {
    MESSAGE: [],
    ERROR_TYPE: [],
  },
} as const;

/**
 * Error Pattern Database
 * Known error patterns and their root causes
 */
export const ERROR_PATTERNS = {
  NULL_POINTER: [
    { keyword: 'cannot read property', cause: 'Attempted to access property on null or undefined value' },
    { keyword: 'undefined is not an object', cause: 'Variable not initialized before use' },
    { keyword: 'null reference', cause: 'Null pointer dereference' },
  ],
  TYPE_ERROR: [
    { keyword: 'not a function', cause: 'Variable is not a function but was called as one' },
    { keyword: 'not defined', cause: 'Variable or function not declared in scope' },
    { keyword: 'cannot convert', cause: 'Type conversion failed' },
  ],
  ASYNC_ERROR: [
    { keyword: 'unhandled promise rejection', cause: 'Promise rejection not caught' },
    { keyword: 'await outside async', cause: 'await used outside async function' },
    { keyword: 'race condition', cause: 'Concurrent access to shared resource' },
  ],
  MEMORY_LEAK: [
    { keyword: 'out of memory', cause: 'Memory allocation exceeded available heap' },
    { keyword: 'heap overflow', cause: 'Memory leak causing heap exhaustion' },
    { keyword: 'garbage collection', cause: 'Excessive memory retention preventing GC' },
  ],
  LOGIC_ERROR: [
    { keyword: 'unexpected result', cause: 'Logic error in algorithm implementation' },
    { keyword: 'infinite loop', cause: 'Loop termination condition never met' },
  ],
  CONFIGURATION_ERROR: [
    { keyword: 'environment variable', cause: 'Missing or invalid environment configuration' },
    { keyword: 'config not found', cause: 'Configuration file missing or invalid' },
  ],
} as const;

/**
 * Solution Strategies by Error Category
 * Recommended approaches for different error types
 */
export const SOLUTION_STRATEGIES = {
  null_pointer: {
    description: 'Add null/undefined checks before property access',
    safetyRating: 85,
    effectivenessRating: 90,
    validationCriteria: [
      'Verify all null checks are in place',
      'Test with null and undefined inputs',
      'Check for related null pointer issues',
    ],
    suggestedTests: [
      'Test with null input',
      'Test with undefined input',
      'Test with valid input',
    ],
  },
  type_error: {
    description: 'Add type checking and validation',
    safetyRating: 80,
    effectivenessRating: 85,
    validationCriteria: [
      'Verify type guards are correct',
      'Test with various input types',
      'Check TypeScript type definitions',
    ],
    suggestedTests: [
      'Test with correct type',
      'Test with incorrect type',
      'Test with edge case types',
    ],
  },
  async_error: {
    description: 'Add proper async/await handling and error catching',
    safetyRating: 75,
    effectivenessRating: 88,
    validationCriteria: [
      'Verify all promises are awaited or handled',
      'Test error propagation',
      'Check for race conditions',
    ],
    suggestedTests: [
      'Test successful async operation',
      'Test failed async operation',
      'Test concurrent operations',
    ],
  },
  memory_leak: {
    description: 'Fix memory leaks by removing dangling references',
    safetyRating: 70,
    effectivenessRating: 80,
    validationCriteria: [
      'Monitor memory usage over time',
      'Verify cleanup functions are called',
      'Check for circular references',
    ],
    suggestedTests: [
      'Memory profiling test',
      'Stress test with high load',
      'Cleanup verification test',
    ],
  },
  logic_error: {
    description: 'Correct algorithm logic and conditions',
    safetyRating: 90,
    effectivenessRating: 85,
    validationCriteria: [
      'Verify algorithm correctness',
      'Test with boundary conditions',
      'Validate expected outputs',
    ],
    suggestedTests: [
      'Test with typical inputs',
      'Test with edge cases',
      'Test with invalid inputs',
    ],
  },
  configuration_error: {
    description: 'Fix configuration settings and environment variables',
    safetyRating: 95,
    effectivenessRating: 92,
    validationCriteria: [
      'Verify configuration is loaded',
      'Test with different environments',
      'Validate configuration schema',
    ],
    suggestedTests: [
      'Test with valid configuration',
      'Test with missing configuration',
      'Test with invalid configuration',
    ],
  },
} as const;

/**
 * Multi-Step Execution Constants
 * Configuration values for multi-step workflow execution
 */
export const MULTI_STEP_CONSTANTS = {
  /** Default maximum execution time in seconds */
  DEFAULT_MAX_EXECUTION_TIME: 3600,
  /** Default step delay in milliseconds */
  DEFAULT_STEP_DELAY: 0,
  /** Mock execution delay multiplier */
  MOCK_EXECUTION_MULTIPLIER: 100,
  /** Mock approval delay in milliseconds */
  MOCK_APPROVAL_DELAY: 10,
  /** Mock rollback delay in milliseconds */
  MOCK_ROLLBACK_DELAY: 10,
} as const;

/**
 * Multi-Step Workflow Templates
 * Predefined workflow templates for testing
 */
export const WORKFLOW_TEMPLATES = {
  CREATE_REACT_APP: {
    NAME: 'Create React App',
    STEPS: [
      { id: 'step-1', name: 'Initialize project', type: 'command' as const, duration: 5 },
      { id: 'step-2', name: 'Install dependencies', type: 'command' as const, duration: 30 },
      { id: 'step-3', name: 'Create component files', type: 'file_operation' as const, duration: 2 },
      { id: 'step-4', name: 'Configure build', type: 'file_operation' as const, duration: 3 },
      { id: 'step-5', name: 'Run tests', type: 'validation' as const, duration: 10 },
    ],
  },
  SETUP_AUTHENTICATION: {
    NAME: 'Set up Authentication',
    STEPS: [
      { id: 'auth-1', name: 'Install auth packages', type: 'command' as const, duration: 15 },
      { id: 'auth-2', name: 'Create auth middleware', type: 'file_operation' as const, duration: 5 },
      { id: 'auth-3', name: 'Configure environment', type: 'file_operation' as const, duration: 2 },
      { id: 'auth-4', name: 'Run security tests', type: 'validation' as const, duration: 8 },
    ],
  },
  ADD_TESTING_FRAMEWORK: {
    NAME: 'Add Testing Framework',
    STEPS: [
      { id: 'test-1', name: 'Install test packages', type: 'command' as const, duration: 20 },
      { id: 'test-2', name: 'Create test config', type: 'file_operation' as const, duration: 3 },
      { id: 'test-3', name: 'Run sample tests', type: 'validation' as const, duration: 5 },
    ],
  },
  DEPLOY_TO_PRODUCTION: {
    NAME: 'Deploy to Production',
    STEPS: [
      { id: 'deploy-1', name: 'Build production bundle', type: 'command' as const, duration: 60 },
      { id: 'deploy-2', name: 'Run pre-deploy tests', type: 'validation' as const, duration: 30 },
      { id: 'deploy-3', name: 'Upload to server', type: 'command' as const, duration: 45 },
      { id: 'deploy-4', name: 'User approval', type: 'user_confirmation' as const, duration: 0, requiresApproval: true },
      { id: 'deploy-5', name: 'Restart services', type: 'command' as const, duration: 10 },
      { id: 'deploy-6', name: 'Verify deployment', type: 'validation' as const, duration: 15 },
    ],
  },
} as const;

/**
 * Time Conversion Constants
 * Conversion factors for time calculations
 */
export const TIME_CONVERSION = {
  /** Milliseconds to seconds divisor */
  MS_TO_SECONDS: 1000,
  /** Seconds to milliseconds multiplier */
  SECONDS_TO_MS: 1000,
} as const;

/**
 * Mock Failure Keywords
 * Keywords that trigger failures in mock implementations
 */
export const MOCK_FAILURE_KEYWORDS = {
  /** Keyword in command to trigger failure */
  COMMAND_FAILURE: 'fail',
  /** Keyword in description to trigger validation failure */
  VALIDATION_FAILURE: 'invalid',
  /** Keyword in step name to trigger approval rejection */
  APPROVAL_REJECTION: 'reject',
} as const;

/**
 * Workflow Status Messages
 * Template functions for workflow status and summary messages
 */
export const WORKFLOW_MESSAGES = {
  /** Workflow cancelled at specific step */
  CANCELLED_AT_STEP: (step: number, total: number) => `Workflow cancelled at step ${step}/${total}`,
  /** Workflow timed out */
  TIMED_OUT: (elapsed: number, max: number) =>
    `Workflow timed out after ${elapsed.toFixed(1)}s (max: ${max}s)`,
  /** Dependencies not met message */
  DEPENDENCIES_NOT_MET: 'Dependencies not met',
  /** User did not approve step */
  USER_DID_NOT_APPROVE: 'User did not approve step',
  /** User cancelled at specific step */
  USER_CANCELLED_AT: (stepName: string) => `User cancelled workflow at step: ${stepName}`,
  /** Step failed with rollback */
  FAILED_WITH_ROLLBACK: (stepName: string, rollbackCount: number) =>
    `Step "${stepName}" failed. Rolled back ${rollbackCount} steps.`,
  /** Step failed with error */
  FAILED_WITH_ERROR: (stepName: string, error: string) =>
    `Step "${stepName}" failed. Error: ${error}`,
  /** Workflow completed with some failures */
  COMPLETED_WITH_FAILURES: (failedCount: number) =>
    `Workflow completed with ${failedCount} failed steps`,
  /** Workflow completed successfully */
  COMPLETED_SUCCESSFULLY: (duration: number) =>
    `Workflow completed successfully in ${duration.toFixed(1)}s`,
  /** Workflow partially completed */
  PARTIALLY_COMPLETED: (completed: number, total: number) =>
    `Workflow partially completed: ${completed}/${total} steps`,
} as const;

/**
 * Workflow Error Messages
 * Error messages for workflow execution failures
 */
export const WORKFLOW_ERROR_MESSAGES = {
  /** Unknown step type error */
  UNKNOWN_STEP_TYPE: (type: string) => `Unknown step type: ${type}`,
  /** Command not specified error */
  COMMAND_NOT_SPECIFIED: 'Command not specified',
  /** Command execution failed */
  COMMAND_FAILED: (command: string) => `Command failed: ${command}`,
  /** File path not specified error */
  FILE_PATH_NOT_SPECIFIED: 'File path not specified',
  /** Validation failed error */
  VALIDATION_FAILED: 'Validation failed',
} as const;

/**
 * Step Output Templates
 * Template functions for step execution output messages
 */
export const STEP_OUTPUT_TEMPLATES = {
  /** Failed step output */
  FAILED: (error: string) => `Failed: ${error}`,
  /** Command executed successfully */
  COMMAND_EXECUTED: (command: string, outcome: string) =>
    `Executed command: ${command}\n${outcome}`,
  /** File operation completed */
  FILE_OPERATION: (filePath: string, outcome: string) =>
    `File operation on ${filePath}: ${outcome}`,
  /** Git operation completed */
  GIT_OPERATION: (outcome: string) => `Git operation completed: ${outcome}`,
  /** Validation passed */
  VALIDATION_PASSED: (outcome: string) => `Validation passed: ${outcome}`,
  /** User confirmed action */
  USER_CONFIRMED: (outcome: string) => `User confirmed: ${outcome}`,
} as const;

/**
 * Byte Conversion Constants
 * For converting between bytes, KB, and MB
 */
export const BYTE_CONVERSION = {
  /** Bytes to kilobytes */
  BYTES_TO_KB: 1024,
  /** Bytes to megabytes */
  BYTES_TO_MB: 1024 * 1024,
  /** Kilobytes to megabytes */
  KB_TO_MB: 1024,
} as const;

/**
 * Performance Test Constants
 * Configuration values for performance testing
 */
export const PERFORMANCE_TEST_CONSTANTS = {
  /** Number of files per directory in synthetic codebases */
  FILES_PER_DIRECTORY: 50,
  /** Memory monitoring interval in milliseconds */
  MEMORY_MONITOR_INTERVAL_MS: 100,
  /** Number of files for progress reporting tests */
  PROGRESS_TEST_FILE_COUNT: 500,
  /** Number of runs for consistency testing */
  CONSISTENCY_RUN_COUNT: 5,
} as const;

/**
 * Code Generation Constants
 * Configuration for synthetic codebase generation
 */
export const CODE_GENERATION_CONSTANTS = {
  /** Default number of methods in complex classes */
  DEFAULT_METHOD_COUNT: 10,
  /** Modulo for distributing file types */
  FILE_TYPE_DISTRIBUTION_MODULO: 3,
  /** File index remainder for class files */
  CLASS_FILE_REMAINDER: 0,
  /** File index remainder for component files */
  COMPONENT_FILE_REMAINDER: 1,
  /** File index remainder for function files */
  FUNCTION_FILE_REMAINDER: 2,
  /** Directory name prefix */
  MODULE_DIR_PREFIX: 'module',
  /** File name prefix */
  FILE_NAME_PREFIX: 'file',
  /** Function name prefix */
  FUNCTION_NAME_PREFIX: 'function',
  /** Class name prefix */
  CLASS_NAME_PREFIX: 'Class',
  /** Component name prefix */
  COMPONENT_NAME_PREFIX: 'Component',
} as const;

/**
 * Performance Expectations
 * Expected performance characteristics for validation
 */
export const PERFORMANCE_EXPECTATIONS = {
  /** Minimum speedup factor for incremental analysis vs full analysis */
  MIN_INCREMENTAL_SPEEDUP_FACTOR: 10,
  /** Maximum coefficient of variation for performance consistency (percentage) */
  MAX_COEFFICIENT_OF_VARIATION: 20,
  /** Minimum parallel speedup factor over sequential processing */
  MIN_PARALLEL_SPEEDUP: 1.5,
} as const;

/**
 * Task Processing Constants
 * Configuration for task processing simulation
 */
export const TASK_PROCESSING_CONSTANTS = {
  /** Divisor for converting file size to processing time (ms) */
  FILE_SIZE_TO_MS_DIVISOR: 1000,
  /** Maximum simulated processing time (ms) */
  MAX_PROCESSING_TIME_MS: 50,
  /** Default processing delay for generic tasks (ms) */
  DEFAULT_PROCESSING_DELAY_MS: 10,
  /** Polling interval for task queue (ms) */
  TASK_QUEUE_POLLING_INTERVAL_MS: 10,
} as const;

/**
 * Test Data Generation Constants
 * Constants for generating test data
 */
export const TEST_DATA_GENERATION = {
  /** Multiplier for test data values */
  VALUE_MULTIPLIER: 100,
} as const;

/**
 * Test File Counts
 * Standard file counts for different test scenarios
 */
export const TEST_FILE_COUNTS = {
  /** Small test file count */
  SMALL_TEST: 10,
  /** Worker recovery test file count */
  WORKER_RECOVERY_TEST: 20,
  /** Medium test file count */
  MEDIUM_TEST: 30,
  /** Large test file count */
  LARGE_TEST: 40,
  /** Result aggregation test file count */
  AGGREGATION_TEST: 50,
} as const;

/**
 * Worker Configuration
 * Constants for worker management
 */
export const WORKER_CONFIGURATION = {
  /** Number of workers for sequential processing */
  SEQUENTIAL_WORKER_COUNT: 1,
  /** Number of workers for parallel processing */
  PARALLEL_WORKER_COUNT: 4,
} as const;

/**
 * Worker Failure Rates
 * Failure rate configurations for testing
 */
export const WORKER_FAILURE_RATES = {
  /** No failures */
  NO_FAILURES: 0,
  /** Test failure rate (30%) */
  TEST_FAILURE_RATE: 0.3,
} as const;

/**
 * Task Priority Levels
 * Priority level definitions and thresholds
 */
export const TASK_PRIORITY_LEVELS = {
  /** High priority level */
  HIGH: 10,
  /** Medium priority level */
  MEDIUM: 5,
  /** Low priority level */
  LOW: 1,
  /** Threshold for high priority tasks */
  HIGH_TASK_THRESHOLD: 10,
  /** Threshold for medium priority tasks */
  MEDIUM_TASK_THRESHOLD: 20,
  /** Modulo for priority variation */
  PRIORITY_VARIATION_MODULO: 3,
} as const;

/**
 * Workload Expectations
 * Expected characteristics for workload distribution
 */
export const WORKLOAD_EXPECTATIONS = {
  /** Minimum acceptable workload balance percentage */
  MIN_BALANCE_PERCENTAGE: 70,
} as const;

/**
 * Distributed Processing Safety Limits
 * Limits to prevent infinite loops and resource exhaustion
 */
export const DISTRIBUTED_PROCESSING_LIMITS = {
  /** Maximum iterations in task processing loop */
  MAX_PROCESSING_ITERATIONS: 10000,
  /** Maximum execution time for task processing (ms) */
  MAX_EXECUTION_TIME_MS: 300000, // 5 minutes
} as const;

/**
 * File Watching Constants
 * Configuration for file system change detection and debouncing
 */
export const FILE_WATCHING_CONSTANTS = {
  /** Debounce delay for batch change handling (ms) */
  DEBOUNCE_DELAY_MS: 100,
  /** Wait time for file system events to propagate (ms) */
  FS_EVENT_PROPAGATION_MS: 200,
  /** Maximum wait time for watcher to detect changes (ms) */
  MAX_DETECTION_WAIT_MS: 2000,
  /** Batch change count for thrashing test */
  BATCH_CHANGE_COUNT: 50,
  /** Number of concurrent changes for conflict test */
  CONCURRENT_CHANGE_COUNT: 10,
  /** Polling interval for watcher detection (ms) */
  POLLING_INTERVAL_MS: 50,
} as const;

/**
 * Knowledge Graph Query Constants
 * Configuration for semantic queries and graph operations
 */
export const KNOWLEDGE_GRAPH_CONSTANTS = {
  /** Minimum semantic similarity score (0-1) */
  MIN_SEMANTIC_SCORE: 0.6,
  /** Maximum results to return from queries */
  MAX_RESULTS: 50,
  /** Default query timeout (ms) */
  QUERY_TIMEOUT_MS: 5000,
} as const;

/**
 * Semantic Scoring Constants
 * Score adjustments for semantic similarity algorithm
 */
export const SEMANTIC_SCORING = {
  /** Base minimum score threshold */
  MIN_SCORE: 0.6,
  /** Score boost for intent matching */
  INTENT_BOOST: 0.2,
  /** Score boost for exact name match */
  EXACT_MATCH_BOOST: 0.3,
  /** Maximum possible score */
  MAX_SCORE: 1.0,
} as const;

/**
 * Graph Traversal Constants
 * Configuration for graph traversal operations
 */
export const TRAVERSAL_CONSTANTS = {
  /** Maximum traversal depth */
  MAX_DEPTH: 10,
  /** Maximum nodes to visit */
  MAX_NODES: 1000,
  /** Traversal timeout (ms) */
  TIMEOUT_MS: 5000,
  /** Maximum stalls before error (for stall detection) */
  MAX_STALLS: 100,
} as const;

/**
 * Pattern Detection Constants
 * Configuration for architecture pattern detection scoring
 */
export const PATTERN_DETECTION_SCORING = {
  /** Confidence weight for each required node matched */
  NODE_MATCH_WEIGHT: 0.3,
  /** Confidence weight for method matches (as fraction of total methods) */
  METHOD_MATCH_WEIGHT: 0.4,
  /** Minimum confidence threshold for pattern detection */
  MIN_CONFIDENCE: 0.3,
  /** Maximum confidence score */
  MAX_CONFIDENCE: 1.0,
} as const;

/**
 * Pattern Type Display Names
 * Human-readable names for pattern types
 */
export const PATTERN_TYPE_NAMES = {
  MVC: 'Model-View-Controller',
  REPOSITORY: 'Repository',
  SINGLETON: 'Singleton',
  FACTORY: 'Factory',
  OBSERVER: 'Observer',
  STRATEGY: 'Strategy',
  DECORATOR: 'Decorator',
  ADAPTER: 'Adapter',
} as const;

/**
 * Pattern Detection Test Data
 * File paths and line numbers for test pattern nodes
 */
export const PATTERN_TEST_DATA = {
  /** MVC Pattern test data */
  MVC: {
    CONTROLLER: {
      DIR: 'controllers',
      FILE: 'UserController.ts',
      LINE_NUMBER: 10,
      METHODS: ['index', 'show', 'create', 'update', 'delete'],
    },
    MODEL: {
      DIR: 'models',
      FILE: 'UserModel.ts',
      LINE_NUMBER: 5,
      METHODS: ['validate', 'save', 'toJSON'],
    },
    VIEW: {
      DIR: 'views',
      FILE: 'UserView.ts',
      LINE_NUMBER: 8,
      METHODS: ['render', 'update'],
    },
  },

  /** Repository Pattern test data */
  REPOSITORY: {
    INTERFACE: {
      DIR: 'repositories',
      FILE: 'IUserRepository.ts',
      LINE_NUMBER: 3,
      METHODS: ['findById', 'findAll', 'save', 'delete', 'update'],
    },
    CLASS: {
      DIR: 'repositories',
      FILE: 'UserRepository.ts',
      LINE_NUMBER: 10,
      METHODS: ['findById', 'findAll', 'save', 'delete', 'update'],
    },
  },

  /** Singleton Pattern test data */
  SINGLETON: {
    DIR: 'database',
    FILE: 'DatabaseConnection.ts',
    LINE_NUMBER: 5,
    METHODS: ['getInstance', 'connect', 'disconnect'],
    DESCRIPTION: 'Private constructor with getInstance method',
  },

  /** Factory Pattern test data */
  FACTORY: {
    DIR: 'factories',
    FILE: 'UserFactory.ts',
    LINE_NUMBER: 5,
    METHODS: ['create', 'createFromData', 'make'],
  },

  /** Observer Pattern test data */
  OBSERVER: {
    SUBJECT: {
      DIR: 'observers',
      FILE: 'EventSubject.ts',
      LINE_NUMBER: 5,
      METHODS: ['subscribe', 'unsubscribe', 'notify'],
    },
    OBSERVER: {
      DIR: 'observers',
      FILE: 'EventObserver.ts',
      LINE_NUMBER: 15,
      METHODS: ['update'],
    },
  },

  /** Strategy Pattern test data */
  STRATEGY: {
    INTERFACE: {
      DIR: 'strategies',
      FILE: 'PaymentStrategy.ts',
      LINE_NUMBER: 3,
      METHODS: ['execute', 'validate'],
    },
    CLASS: {
      DIR: 'strategies',
      FILE: 'CreditCardStrategy.ts',
      LINE_NUMBER: 10,
      METHODS: ['execute', 'validate'],
    },
  },

  /** Decorator Pattern test data */
  DECORATOR: {
    DIR: 'decorators',
    FILE: 'LoggerDecorator.ts',
    LINE_NUMBER: 5,
    METHODS: ['decorate', 'wrap'],
  },

  /** Adapter Pattern test data */
  ADAPTER: {
    DIR: 'adapters',
    FILE: 'LegacySystemAdapter.ts',
    LINE_NUMBER: 8,
    METHODS: ['adapt', 'convert', 'transform'],
  },
} as const;

/**
 * Anti-Pattern Detection Thresholds
 * Configurable thresholds for anti-pattern detection
 */
export const ANTI_PATTERN_THRESHOLDS = {
  /** God Object thresholds */
  GOD_OBJECT: {
    METHOD_COUNT: 20,
    DEPENDENCY_COUNT: 10,
    CRITICAL_METHODS: 40,
    CRITICAL_DEPENDENCIES: 20,
    HIGH_METHODS: 30,
    HIGH_DEPENDENCIES: 15,
  },
  /** Spaghetti Code thresholds */
  SPAGHETTI_CODE: {
    COMPLEXITY: 15,
    CRITICAL_COMPLEXITY: 30,
    HIGH_COMPLEXITY: 20,
  },
  /** Circular Dependency thresholds */
  CIRCULAR_DEPENDENCY: {
    LONG_CYCLE_LENGTH: 4,
    CONFIDENCE: 1.0,
  },
  /** Feature Envy thresholds */
  FEATURE_ENVY: {
    CALL_THRESHOLD: 5,
    HIGH_CALL_COUNT: 10,
  },
  /** Shotgun Surgery thresholds */
  SHOTGUN_SURGERY: {
    FILE_THRESHOLD: 5,
    HIGH_FILE_COUNT: 10,
  },
  /** Long Parameter List thresholds */
  LONG_PARAMETER_LIST: {
    PARAM_THRESHOLD: 5,
    HIGH_PARAM_COUNT: 8,
  },
  /** Data Clumps thresholds */
  DATA_CLUMPS: {
    MIN_PARAM_GROUP_SIZE: 3,
    MIN_OCCURRENCES: 3,
    HIGH_OCCURRENCES: 5,
  },
} as const;

/**
 * Anti-Pattern Recommendation Messages
 * Standard recommendations for each anti-pattern type
 */
export const ANTI_PATTERN_RECOMMENDATIONS = {
  GOD_OBJECT: 'Split class into smaller, focused classes following Single Responsibility Principle',
  SPAGHETTI_CODE: 'Refactor into smaller functions, extract conditional logic, reduce nesting',
  CIRCULAR_DEPENDENCY: 'Break circular dependencies using dependency inversion or extracting shared interfaces',
  FEATURE_ENVY: 'Move method to the class it envies, or extract a new class if appropriate',
  SHOTGUN_SURGERY: 'Consolidate related functionality into cohesive modules',
  LONG_PARAMETER_LIST: 'Introduce parameter object or builder pattern to reduce parameter count',
  DATA_CLUMPS: 'Extract data clump into a class or data structure',
} as const;

/**
 * Anti-Pattern Test Data
 * Test-specific data for anti-pattern detection tests
 */
export const ANTI_PATTERN_TEST_DATA = {
  /** God Object test data */
  GOD_OBJECT: {
    METHOD_COUNT: 25,
    DEPENDENCY_COUNT: 12,
    CLASS_NAME: 'UserManager',
    FILE_NAME: 'UserManager.ts',
    LINE_NUMBER: 1,
  },
  /** Spaghetti Code test data */
  SPAGHETTI_CODE: {
    COMPLEXITY: 18,
    LINE_COUNT: 150,
    FUNCTION_NAME: 'processData',
    FILE_NAME: 'processor.ts',
    LINE_NUMBER: 10,
  },
  /** Circular Dependency test data */
  CIRCULAR_DEPENDENCY: {
    MODULE_NAMES: ['ModuleA', 'ModuleB', 'ModuleC'],
    FILE_NAMES: ['moduleA.ts', 'moduleB.ts', 'moduleC.ts'],
    LINE_NUMBER: 1,
  },
  /** Feature Envy test data */
  FEATURE_ENVY: {
    CALL_COUNT: 6,
    FUNCTION_NAME: 'calculateTotal',
    FILE_NAME: 'calculator.ts',
    TARGET_CLASS: 'Product',
    TARGET_FILE: 'Product.ts',
    LINE_NUMBER: 5,
    TARGET_LINE_NUMBER: 10,
  },
  /** Shotgun Surgery test data */
  SHOTGUN_SURGERY: {
    FILE_COUNT: 6,
    FEATURE_NAME: 'authentication',
    LINE_NUMBER: 1,
  },
  /** Long Parameter List test data */
  LONG_PARAMETER_LIST: {
    PARAM_COUNT: 8,
    FUNCTION_NAME: 'createUser',
    FILE_NAME: 'user.ts',
    LINE_NUMBER: 15,
    PARAMETERS: ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country'],
  },
  /** Data Clumps test data */
  DATA_CLUMPS: {
    FUNCTION_COUNT: 4,
    COMMON_PARAMS: ['x', 'y', 'z'],
    LINE_NUMBER: 10,
  },
} as const;

/**
 * Common constants for anti-pattern detection
 */
export const ANTI_PATTERN_COMMON = {
  UNKNOWN_VALUE: 'unknown',
  MAX_CONFIDENCE: 1.0,
  CONFIDENCE_DIVISOR: 2,
} as const;

/**
 * Best Practices Thresholds
 * Threshold values for recommendation generation
 */
export const BEST_PRACTICES_THRESHOLDS = {
  EFFORT_CALCULATION: {
    HIGH_MULTIPLIER: 2,
    MEDIUM_MULTIPLIER: 1.5,
  },
  LARGE_FUNCTION: {
    LINE_COUNT_THRESHOLD: 100,
    HIGH_PRIORITY_LINES: 200,
  },
  SECURITY_PATTERNS: {
    AUTH_KEYWORDS: ['auth', 'login', 'authenticate', 'signin'] as const,
    QUERY_KEYWORDS: ['query', 'sql', 'execute'] as const,
    VALIDATION_KEYWORDS: ['validate', 'sanitize', 'check'] as const,
  },
} as const;

/**
 * Best Practices Actionable Steps
 * Pre-defined actionable steps for each recommendation type
 */
export const BEST_PRACTICES_ACTIONABLE_STEPS = {
  GOD_OBJECT: [
    'Identify cohesive method groups within the class',
    'Extract each group into a separate class with a single responsibility',
    'Use dependency injection to manage relationships',
    'Update all references to use the new classes',
    'Add unit tests for each new class',
  ] as const,
  SPAGHETTI_CODE: [
    'Extract conditional logic into separate functions',
    'Use early returns to reduce nesting',
    'Apply the Strategy pattern for complex conditionals',
    'Create helper functions for repeated logic',
    'Add unit tests for each extracted function',
  ] as const,
  LONG_PARAMETER_LIST: [
    'Group related parameters into a configuration object',
    'Create an interface for the parameter object',
    'Update function signature to accept the object',
    'Update all call sites to use the new signature',
    'Add JSDoc documentation for the parameter object',
  ] as const,
  LARGE_FUNCTION: [
    'Profile the function to identify performance bottlenecks',
    'Extract hot paths into separate optimized functions',
    'Consider memoization for expensive calculations',
    'Use lazy evaluation where applicable',
    'Add performance tests to track improvements',
  ] as const,
  CIRCULAR_DEPENDENCY: [
    'Identify the shared functionality causing the cycle',
    'Extract shared code into a separate module',
    'Use dependency inversion to break the cycle',
    'Consider using interfaces to decouple dependencies',
    'Update module imports to use the new structure',
  ] as const,
  AUTH_VALIDATION: [
    'Add input validation for all user-provided data',
    'Implement rate limiting to prevent brute force attacks',
    'Use parameterized queries to prevent SQL injection',
    'Sanitize inputs to prevent XSS attacks',
    'Add security-focused unit tests',
  ] as const,
  SQL_PREPARED_STATEMENTS: [
    'Replace string concatenation with parameterized queries',
    'Use an ORM or query builder with built-in SQL injection protection',
    'Validate and sanitize all user inputs',
    'Implement input whitelisting where applicable',
    'Add penetration tests for SQL injection',
  ] as const,
} as const;

/**
 * Best Practices Titles
 * Template functions for recommendation titles
 */
export const BEST_PRACTICES_TITLES = {
  GOD_OBJECT: (name: string) => `Split God Object: ${name}`,
  SPAGHETTI_CODE: (name: string) => `Reduce Complexity: ${name}`,
  LONG_PARAMETER_LIST: (name: string) => `Introduce Parameter Object: ${name}`,
  LARGE_FUNCTION: (name: string) => `Optimize Large Function: ${name}`,
  CIRCULAR_DEPENDENCY: () => `Break Circular Dependency`,
  AUTH_VALIDATION: (name: string) => `Add Input Validation: ${name}`,
  SQL_PREPARED_STATEMENTS: (name: string) => `Use Prepared Statements: ${name}`,
} as const;

/**
 * Best Practices Descriptions
 * Template functions for recommendation descriptions
 */
export const BEST_PRACTICES_DESCRIPTIONS = {
  GOD_OBJECT: (name: string, methodCount: number, dependencies: number) =>
    `Class '${name}' has ${methodCount} methods and ${dependencies} dependencies, violating Single Responsibility Principle. Consider splitting into multiple focused classes.`,

  SPAGHETTI_CODE: (name: string, complexity: number) =>
    `Function '${name}' has cyclomatic complexity of ${complexity}, making it hard to maintain and test. Consider breaking it down into smaller functions.`,

  LONG_PARAMETER_LIST: (name: string, paramCount: number) =>
    `Function '${name}' has ${paramCount} parameters. Consider grouping related parameters into a configuration object.`,

  LARGE_FUNCTION: (name: string, lineCount: number) =>
    `Function '${name}' is ${lineCount} lines long. Large functions are harder to optimize and maintain.`,

  CIRCULAR_DEPENDENCY: (path: string[]) =>
    `Circular dependency detected: ${path.join(' → ')}. This can cause module loading issues and performance degradation.`,

  AUTH_VALIDATION: (name: string) =>
    `Authentication function '${name}' may be missing input validation. Always validate and sanitize user inputs.`,

  SQL_PREPARED_STATEMENTS: (name: string) =>
    `Database function '${name}' should use prepared statements to prevent SQL injection vulnerabilities.`,
} as const;

/**
 * Best Practices Code Examples
 * Before/after code examples for recommendations
 */
export const BEST_PRACTICES_CODE_EXAMPLES = {
  GOD_OBJECT: (name: string, methodCount: number) => ({
    before: `class ${name} {\n  // ${methodCount} methods\n  // Too many responsibilities\n}`,
    after: `class UserAuthentication { ... }\nclass UserProfile { ... }\nclass UserPermissions { ... }`,
  }),

  LONG_PARAMETER_LIST: (name: string, params: string[]) => ({
    before: `function ${name}(${params.join(', ')}) { ... }`,
    after: `interface ${name}Config {\n  ${params.map(p => `${p}: any`).join(';\n  ')}\n}\nfunction ${name}(config: ${name}Config) { ... }`,
  }),

  SQL_PREPARED_STATEMENTS: () => ({
    before: `db.query(\`SELECT * FROM users WHERE id = \${userId}\`)`,
    after: `db.query('SELECT * FROM users WHERE id = ?', [userId])`,
  }),
} as const;

/**
 * Best Practices Scoring
 * Fixed scores for actionability, impact, and effort
 */
export const BEST_PRACTICES_SCORING = {
  ACTIONABILITY: {
    GOD_OBJECT: 0.7,
    SPAGHETTI_CODE: 0.8,
    LONG_PARAMETER_LIST: 0.9,
    LARGE_FUNCTION: 0.7,
    CIRCULAR_DEPENDENCY: 0.6,
    AUTH_VALIDATION: 0.9,
    SQL_PREPARED_STATEMENTS: 0.95,
  },
  EXPECTED_IMPACT: {
    GOD_OBJECT: 'high' as const,
    SPAGHETTI_CODE: 'high' as const,
    LONG_PARAMETER_LIST: 'medium' as const,
    LARGE_FUNCTION: 'medium' as const,
    CIRCULAR_DEPENDENCY: 'high' as const,
    AUTH_VALIDATION: 'high' as const,
    SQL_PREPARED_STATEMENTS: 'high' as const,
  },
  ESTIMATED_EFFORT: {
    SPAGHETTI_CODE: 'medium' as const,
    LONG_PARAMETER_LIST: 'low' as const,
    LARGE_FUNCTION: 'medium' as const,
    CIRCULAR_DEPENDENCY: 'high' as const,
    AUTH_VALIDATION: 'medium' as const,
    SQL_PREPARED_STATEMENTS: 'low' as const,
  },
} as const;

/**
 * Best Practices Priority Order
 * Mapping of priority levels to numeric values for sorting
 */
export const BEST_PRACTICES_PRIORITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

// ============================================================================
// Multi-Provider AI Integration Constants
// ============================================================================

/**
 * Provider Capabilities and Profiles
 * Realistic profiles for each AI provider including costs, latency, and supported query types
 */
export const PROVIDER_CAPABILITIES = {
  OLLAMA: {
    COST_PER_1K_TOKENS: 0,
    AVG_LATENCY_MS: 2000,
    MAX_TOKENS: 4096,
    RELIABILITY: 0.95,
    QUERY_TYPES: ['code_generation', 'code_review', 'explanation', 'refactoring', 'debug'] as const,
  },
  OPENAI: {
    COST_PER_1K_TOKENS: 0.002, // GPT-4 pricing
    AVG_LATENCY_MS: 800,
    MAX_TOKENS: 8192,
    RELIABILITY: 0.99,
    QUERY_TYPES: ['code_generation', 'code_review', 'explanation', 'refactoring', 'debug', 'translation'] as const,
  },
  ANTHROPIC: {
    COST_PER_1K_TOKENS: 0.003, // Claude pricing
    AVG_LATENCY_MS: 600,
    MAX_TOKENS: 100000,
    RELIABILITY: 0.98,
    QUERY_TYPES: ['code_generation', 'code_review', 'explanation', 'refactoring', 'debug'] as const,
  },
  GEMINI: {
    COST_PER_1K_TOKENS: 0.001, // Gemini pricing
    AVG_LATENCY_MS: 1000,
    MAX_TOKENS: 30000,
    RELIABILITY: 0.97,
    QUERY_TYPES: ['code_generation', 'explanation', 'translation'] as const,
  },
} as const;

/**
 * Routing Strategy Weights
 * Weights for different factors in routing decisions
 */
export const ROUTING_WEIGHTS = {
  BALANCED: {
    COST: 0.3,
    LATENCY: 0.4,
    RELIABILITY: 0.3,
  },
} as const;

/**
 * Routing Test Data
 * Standard test values for routing tests
 */
export const ROUTING_TEST_DATA = {
  TOKEN_ESTIMATES: {
    SMALL: 500,
    MEDIUM: 1000,
    LARGE: 2000,
    XLARGE: 3000,
    XXLARGE: 5000,
    XXXLARGE: 10000,
  },
  COST_CONSTRAINTS: {
    VERY_LOW: 0.005, // 0.5 cents
    LOW: 0.015,      // 1.5 cents
  },
  LATENCY_CONSTRAINTS: {
    VERY_LOW: 500,   // 500ms
    LOW: 900,        // 900ms
  },
} as const;

/**
 * Response Fusion Thresholds
 * Thresholds for similarity detection, conflict resolution, and quality validation
 */
export const RESPONSE_FUSION_THRESHOLDS = {
  SIMILARITY: {
    CONFLICT_DETECTION: 0.7,      // Below this = conflict
    CLUSTERING: 0.7,              // Above this = same cluster
    HIGH_CONSENSUS: 0.8,          // Above this = consensus strategy
  },
  CONFIDENCE: {
    SIGNIFICANT_DIFFERENCE: 0.15, // Confidence diff to prefer one provider
    HIGH_CONFIDENCE_DIFF: 0.2,    // Use highest confidence strategy
  },
  QUALITY: {
    DEFAULT_THRESHOLD: 0.6,       // Default minimum quality
    STRICT_THRESHOLD: 0.7,        // Strict quality validation
    HIGH_THRESHOLD: 0.8,          // High quality threshold
  },
} as const;

/**
 * Response Fusion Weights
 * Weights for quality score calculation
 */
export const RESPONSE_FUSION_WEIGHTS = {
  QUALITY_SCORE: {
    LENGTH: 0.3,
    CONSENSUS: 0.7,
  },
  PENALTIES: {
    CONFLICT_PER_COUNT: 0.1,
  },
} as const;

/**
 * Response Fusion Parameters
 * General parameters for response fusion algorithms
 */
export const RESPONSE_FUSION_PARAMS = {
  OPTIMAL_RESPONSE_LENGTH: 100,      // Character count for length score normalization
  CONSENSUS_CONFIDENCE_BOOST: 0.2,   // Confidence boost for high consensus
} as const;

/**
 * Response Fusion Test Data
 * Standard test values for response fusion tests
 */
export const RESPONSE_FUSION_TEST_DATA = {
  CONFIDENCE_VALUES: {
    VERY_HIGH: 0.95,
    HIGH: 0.92,
    MEDIUM_HIGH: 0.90,
    MEDIUM: 0.88,
    MEDIUM_STANDARD: 0.85,
    MEDIUM_LOW: 0.70,
    LOW: 0.65,
    VERY_LOW: 0.60,
    EXTREMELY_LOW: 0.58,
  },
  RESPONSE_TIMES: {
    FAST: 200,
    MEDIUM: 300,
    SLOW: 500,
  },
  TOKEN_COUNTS: {
    TINY: 2,
    SMALL: 3,
    SMALL_MEDIUM: 6,
    MEDIUM_SMALL: 7,
    MEDIUM: 8,
    MEDIUM_LARGE: 9,
    LARGE: 10,
    XLARGE: 11,
    XXLARGE: 12,
    XXXLARGE: 14,
  },
} as const;

/**
 * Contradiction Keywords
 * Keywords that indicate contradictory statements in responses
 */
export const CONTRADICTION_KEYWORDS = [
  'not',
  'never',
  'no',
  'incorrect',
  'wrong',
  'avoid',
] as const;

/**
 * Report Generation Constants
 * Constants for HTML, Markdown, and JSON report generation
 */
export const REPORT_GENERATION_CONSTANTS = {
  HTML_STYLES: {
    COLORS: {
      PRIMARY: '#007acc',
      TEXT_DARK: '#333',
      TEXT_MEDIUM: '#555',
      BACKGROUND_LIGHT: '#f5f5f5',
      BACKGROUND_INFO: '#e3f2fd',
      BORDER_DEFAULT: '#ccc',
      SEVERITY_CRITICAL: '#d32f2f',
      SEVERITY_HIGH: '#f57c00',
      SEVERITY_MEDIUM: '#fbc02d',
      SEVERITY_LOW: '#388e3c',
      SEVERITY_INFO: '#1976d2',
    },
    DIMENSIONS: {
      MAX_WIDTH: '1200px',
      PADDING_LARGE: '20px',
      PADDING_MEDIUM: '15px',
      PADDING_SMALL: '10px',
      MARGIN_TOP: '30px',
      MARGIN_VERTICAL: '15px 0',
      BORDER_WIDTH: '2px',
      BORDER_LEFT_WIDTH: '4px',
      BORDER_RADIUS: '5px',
      BORDER_RADIUS_SMALL: '3px',
      PADDING_BOTTOM: '10px',
    },
    FONT_FAMILY: 'Arial, sans-serif',
  },

  REPORT_TITLES: {
    GENERAL: 'General Analysis Report',
    CODE_REVIEW: 'Code Review Report',
    SECURITY_SCAN: 'Security Scan Report',
    PERFORMANCE_ANALYSIS: 'Performance Analysis Report',
    DEFAULT: 'Analysis Report',
  } as const,

  SEVERITY_ORDER: ['critical', 'high', 'medium', 'low', 'info'] as const,

  HTML_ENTITIES: {
    AMPERSAND: '&amp;',
    LESS_THAN: '&lt;',
    GREATER_THAN: '&gt;',
    DOUBLE_QUOTE: '&quot;',
    SINGLE_QUOTE: '&#039;',
  } as const,

  MARKDOWN: {
    CODE_FENCE: '```',
    HORIZONTAL_RULE: '---',
    CHECKMARK: '✅',
    CROSS: '❌',
  } as const,

  JSON: {
    INDENT_SPACES: 2,
  } as const,
} as const;

/**
 * Report Test Data
 * Standard test data for report generation tests
 */
export const REPORT_TEST_DATA = {
  METADATA: {
    TOOL_VERSION: '1.0.0',
    SAMPLE_FILES: {
      SINGLE: ['src/app.ts'],
      PAIR: ['src/utils.ts', 'src/helpers.ts'],
      TRIPLE: ['src/main.ts', 'src/app.ts', 'src/utils.ts'],
      SECURITY: ['src/db.ts', 'src/auth.ts'],
      PERFORMANCE: ['src/queries.ts'],
      COMPLEX: ['src/complex.ts'],
    },
  },

  DURATIONS: {
    VERY_SHORT: 100,
    SHORT: 500,
    MEDIUM: 1000,
    LONG: 2000,
    VERY_LONG: 3000,
    EXTENDED: 4000,
    MAXIMUM: 5000,
  },

  TIMESTAMPS: {
    FIXED_TEST: 1234567890,
  },

  QUALITY_SCORES: {
    EXCELLENT: 90,
    VERY_GOOD: 88,
    GOOD: 85,
    AVERAGE: 78,
    BELOW_AVERAGE: 70,
    POOR: 65,
  },

  CATEGORY_SCORES: {
    EXCELLENT: {
      maintainability: 90,
      reliability: 85,
      security: 92,
      performance: 85,
    },
    GOOD: {
      maintainability: 85,
      reliability: 70,
      security: 90,
      performance: 65,
    },
  },

  PERFORMANCE_METRICS: {
    FAST: {
      avgResponseTime: 150,
      memoryUsage: 64,
      cpuUsage: 30,
    },
    MODERATE: {
      avgResponseTime: 250,
      memoryUsage: 128,
      cpuUsage: 45,
    },
  },

  VULNERABILITY_COUNTS: {
    CRITICAL: {
      critical: 1,
      high: 2,
      medium: 2,
      low: 0,
    },
    CLEAN: {
      critical: 0,
      high: 0,
      medium: 1,
      low: 2,
    },
  },

  COMPLIANCE_STATUS: {
    COMPLIANT: {
      owasp: true,
      cwe: true,
    },
    NON_COMPLIANT: {
      owasp: false,
      cwe: true,
    },
  },

  SAMPLE_FINDINGS: {
    PERFORMANCE_ISSUE: {
      severity: 'high' as const,
      title: 'Performance issue detected',
      description: 'Function has O(n²) complexity',
      file: 'src/utils.ts',
      line: 42,
    },
    CODE_SMELL: {
      severity: 'medium' as const,
      title: 'Code smell detected',
      description: 'Large function should be split',
      recommendation: 'Extract helper functions',
    },
    COMPLEX_FUNCTION: {
      severity: 'medium' as const,
      title: 'Complex function',
      description: 'Cyclomatic complexity is 15 (threshold: 10)',
      file: 'src/complex.ts',
      line: 10,
      recommendation: 'Refactor into smaller functions',
    },
    SQL_INJECTION: {
      severity: 'critical' as const,
      title: 'SQL Injection',
      description: 'Unsanitized user input in SQL query',
      file: 'src/db.ts',
      line: 55,
      recommendation: 'Use parameterized queries',
      codeSnippet: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
    },
    SLOW_QUERY: {
      severity: 'high' as const,
      title: 'Slow database query',
      description: 'Query takes 500ms on average',
      file: 'src/queries.ts',
      line: 20,
      recommendation: 'Add index on user_id column',
    },
  },

  SUMMARIES: {
    SUCCESS: 'Analysis completed successfully',
    WITH_WARNINGS: 'Analysis completed with warnings',
    COMPLETED: 'Analysis completed',
    CODE_REVIEW: 'Code review found 3 issues',
    GOOD_QUALITY: 'Overall code quality is good',
    SECURITY: 'Found 5 security vulnerabilities',
    SECURITY_COMPLETED: 'Security scan completed',
    PERFORMANCE: 'Performance analysis identified 2 bottlenecks',
    ACCEPTABLE: 'System performance is acceptable',
    TEST: 'Test report',
    MULTI_FORMAT: 'Multi-format test',
  },
} as const;
