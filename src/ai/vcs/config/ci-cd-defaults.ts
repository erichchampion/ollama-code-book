/**
 * Centralized CI/CD Configuration Defaults
 *
 * Single source of truth for all CI/CD platform configurations
 * to eliminate hardcoded values and DRY violations across pipeline definitions.
 */

import * as path from 'path';

/**
 * Default quality gate thresholds for all CI/CD platforms
 */
export const CI_QUALITY_GATES = {
  minQualityScore: 80,
  maxCriticalIssues: 0,
  maxSecurityIssues: 5,
  maxPerformanceIssues: 3,
  minTestCoverage: 80,
  maxComplexityIncrease: 20,
  maxTechnicalDebtIncrease: 10,
  regressionThreshold: 'medium' as 'low' | 'medium' | 'high'
} as const;

/**
 * Analysis configuration defaults
 */
export const CI_ANALYSIS_CONFIG = {
  enableSecurity: true,
  enablePerformance: true,
  enableArchitecture: true,
  enableRegression: true,
  enableQualityGates: true,
  analysisTimeoutSeconds: 300,
  analysisTimeoutMs: 300000,
  reportFormat: 'json' as 'json' | 'junit' | 'sarif' | 'markdown' | 'html',
  outputPath: './reports',
  deepAnalysis: false
} as const;

/**
 * Build and runtime configuration
 */
export const CI_BUILD_CONFIG = {
  nodeVersion: '20',
  nodeImage: 'node:20',
  nodeImageAlpine: 'node:20-alpine',
  nodeVersionSpec: '20.x',
  yarnLockfile: 'yarn.lock',
  buildCommand: 'yarn build',
  installCommand: 'yarn install --frozen-lockfile',
  testCommand: 'yarn test',
  distPath: 'dist',
  reportsPath: 'reports',
  nodeModulesPath: 'node_modules'
} as const;

/**
 * Artifact and caching configuration
 */
export const CI_ARTIFACT_CONFIG = {
  retentionDays: 30,
  retentionDaysNightly: 90,
  retentionDaysRelease: 365,
  artifactPaths: {
    dist: 'dist/**',
    reports: 'reports/**',
    coverage: 'coverage/**',
    nodeModules: 'node_modules/**'
  },
  cachePaths: {
    nodeModules: 'node_modules',
    yarn: '~/.cache/yarn',
    ollamaCode: '.ollama-code/cache'
  }
} as const;

/**
 * Security analysis configuration
 */
export const CI_SECURITY_CONFIG = {
  analysisCommand: 'Perform comprehensive security analysis for OWASP Top 10 vulnerabilities',
  outputFile: 'security-analysis.json',
  criticalThreshold: 0,
  highThreshold: 5,
  mediumThreshold: 10,
  lowThreshold: 20
} as const;

/**
 * Performance analysis configuration
 */
export const CI_PERFORMANCE_CONFIG = {
  analysisTypes: ['memory', 'cpu', 'io', 'network'] as const,
  analysisCommand: (type: string) =>
    `Analyze ${type} performance bottlenecks and optimization opportunities`,
  outputFilePattern: 'performance-{type}.json',
  parallelism: 4
} as const;

/**
 * Regression analysis configuration
 */
export const CI_REGRESSION_CONFIG = {
  analysisCommand: (baseBranch: string) =>
    `Assess regression risk for changes in this branch compared to ${baseBranch}`,
  outputFile: 'regression-risk.json',
  criticalRiskThreshold: 'critical' as const,
  highRiskThreshold: 'high' as const,
  acceptableRiskThreshold: 'medium' as const
} as const;

/**
 * Branch configuration
 */
export const CI_BRANCH_CONFIG = {
  defaultBranch: 'main',
  defaultBranches: ['main', 'master'],
  developBranches: ['develop', 'development', 'dev'],
  releaseBranches: ['release/*', 'releases/*'],
  featureBranches: ['feature/*', 'features/*'],
  hotfixBranches: ['hotfix/*', 'hotfixes/*'],
  ignoreBranches: ['gh-pages', 'docs']
} as const;

/**
 * Notification messages
 */
export const CI_MESSAGES = {
  startAnalysis: '🚀 Starting Ollama Code Analysis',
  installDependencies: '📦 Installing dependencies...',
  buildProject: '🔨 Building project...',
  runAnalysis: '🔍 Running Ollama Code Analysis...',
  securityAnalysis: '🛡️ Running security vulnerability analysis...',
  performanceAnalysis: '⚡ Running performance analysis...',
  regressionAnalysis: '⚠️ Analyzing regression risk...',
  generateReports: '📊 Generating consolidated reports...',
  deploymentCheck: '🚀 Checking deployment readiness...',
  qualityPassed: '✅ All quality gates passed',
  qualityFailed: '❌ Quality gates failed - review required',
  securityPassed: '✅ Security analysis passed',
  securityFailed: '❌ Security vulnerabilities detected',
  deploymentReady: '✅ Ready for deployment',
  deploymentBlocked: '❌ Not ready for deployment - quality gates failed'
} as const;

/**
 * Platform-specific overrides
 */
export const CI_PLATFORM_OVERRIDES = {
  gitlab: {
    nodeImage: 'node:20-alpine',
    cacheKey: '${CI_COMMIT_REF_SLUG}',
    artifactFormat: 'codequality'
  },
  azure: {
    nodeVersionSpec: '20.x',
    vmImage: 'ubuntu-latest',
    buildConfiguration: 'Release'
  },
  circleci: {
    nodeImage: 'cimg/node:20.0',
    workingDirectory: '~/ollama-code',
    parallelism: 4
  },
  bitbucket: {
    nodeImage: 'node:20',
    maxArtifactSize: '1GB',
    pipelineMemory: 2048
  },
  github: {
    runsOn: 'ubuntu-latest',
    checkoutVersion: 'v4',
    nodeActionVersion: 'v4'
  }
} as const;

/**
 * Get CLI command for running analysis
 */
export function getAnalysisCommand(platform: string, config?: Partial<typeof CI_ANALYSIS_CONFIG>): string {
  const merged = { ...CI_ANALYSIS_CONFIG, ...config };
  const qualityGates = CI_QUALITY_GATES;

  return [
    'node dist/src/ai/vcs/ci-pipeline-integrator.js',
    `--platform ${platform}`,
    `--repository-path .`,
    `--enable-security ${merged.enableSecurity}`,
    `--enable-performance ${merged.enablePerformance}`,
    `--enable-architecture ${merged.enableArchitecture}`,
    `--enable-regression ${merged.enableRegression}`,
    `--min-quality-score ${qualityGates.minQualityScore}`,
    `--max-critical-issues ${qualityGates.maxCriticalIssues}`,
    `--max-security-issues ${qualityGates.maxSecurityIssues}`,
    `--max-performance-issues ${qualityGates.maxPerformanceIssues}`,
    `--min-test-coverage ${qualityGates.minTestCoverage}`,
    `--regression-threshold ${qualityGates.regressionThreshold}`,
    `--report-format ${merged.reportFormat}`,
    `--output-path ${merged.outputPath}`
  ].join(' ');
}

/**
 * Sanitize shell variables to prevent injection
 */
export function sanitizeShellVariable(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  // Remove any shell metacharacters that could cause command injection
  // Allow only alphanumeric, dash, underscore, dot, and forward slash
  let sanitized = value.replace(/[^a-zA-Z0-9\-_\.\/]/g, '');

  // Remove trailing slashes to avoid path injection issues
  sanitized = sanitized.replace(/\/+$/, '');

  // If sanitization removed everything, use fallback
  return sanitized.length > 0 ? sanitized : fallback;
}

/**
 * Validate quality gate result
 */
export function validateQualityGate(result: any): {
  passed: boolean;
  score: number;
  message: string;
} {
  if (!result || typeof result !== 'object' || !result.overallScore) {
    return {
      passed: false,
      score: 0,
      message: 'Invalid analysis result'
    };
  }

  const score = parseInt(result.overallScore) || 0;
  const gatesPassed = result.qualityGatePassed === true || result.qualityGatePassed === 'true';

  if (!gatesPassed) {
    return {
      passed: false,
      score,
      message: `Quality gates failed with score ${score}/${CI_QUALITY_GATES.minQualityScore}`
    };
  }

  return {
    passed: true,
    score,
    message: `Quality gates passed with score ${score}/100`
  };
}

/**
 * Generate quality report summary
 */
export function generateQualitySummary(result: any): string {
  const score = result.overallScore || 0;
  const gatesPassed = result.qualityGatePassed;
  const securityIssues = result.results?.security?.totalVulnerabilities || 0;
  const performanceIssues = result.results?.performance?.totalIssues || 0;
  const regressionRisk = result.results?.regression?.overallRisk || 'unknown';

  // Limit recommendations to top 5
  const recommendations = (result.recommendations || []).slice(0, 5);
  const recommendationsText = recommendations.length > 0
    ? recommendations.map((r: string) => `- ${r}`).join('\n')
    : '';

  return `
## 🤖 Ollama Code Analysis Results

### 📊 Overall Quality Score: ${score}/100

${gatesPassed ? CI_MESSAGES.qualityPassed : CI_MESSAGES.qualityFailed}

#### 📈 Key Metrics:
• 🛡️ Security Issues: ${securityIssues}
• ⚡ Performance Issues: ${performanceIssues}
• ⚠️ Regression Risk: ${regressionRisk}

#### 💡 Top Recommendations:
${recommendationsText}
`;
}

/**
 * Export all configurations as a single object for convenience
 */
export const CI_CONFIG = {
  qualityGates: CI_QUALITY_GATES,
  analysis: CI_ANALYSIS_CONFIG,
  build: CI_BUILD_CONFIG,
  artifacts: CI_ARTIFACT_CONFIG,
  security: CI_SECURITY_CONFIG,
  performance: CI_PERFORMANCE_CONFIG,
  regression: CI_REGRESSION_CONFIG,
  branches: CI_BRANCH_CONFIG,
  messages: CI_MESSAGES,
  platformOverrides: CI_PLATFORM_OVERRIDES,
  getAnalysisCommand,
  sanitizeShellVariable,
  validateQualityGate,
  generateQualitySummary
} as const;

export default CI_CONFIG;