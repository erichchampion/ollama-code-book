/**
 * Universal CI/CD API
 *
 * Provides a unified interface for CI/CD pipeline integration across
 * multiple platforms with intelligent detection and platform-specific
 * optimizations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../utils/logger.js';
import { CIPipelineIntegrator, CIPipelineConfig } from './ci-pipeline-integrator.js';

export interface UniversalCIConfig {
  repositoryPath: string;
  platform?: CI_PLATFORM;
  autoDetect?: boolean;
  enableSecurityAnalysis?: boolean;
  enablePerformanceAnalysis?: boolean;
  enableArchitecturalAnalysis?: boolean;
  enableRegressionAnalysis?: boolean;
  qualityGates?: {
    minQualityScore?: number;
    maxCriticalIssues?: number;
    maxSecurityIssues?: number;
    maxPerformanceIssues?: number;
    minTestCoverage?: number;
    regressionThreshold?: 'low' | 'medium' | 'high';
  };
  reportFormat?: 'json' | 'markdown' | 'junit' | 'sarif' | 'html';
  outputPath?: string;
  notifications?: {
    enableComments?: boolean;
    enableSlack?: boolean;
    enableEmail?: boolean;
    webhookUrls?: string[];
  };
}

export type CI_PLATFORM =
  | 'github'
  | 'gitlab'
  | 'azure'
  | 'bitbucket'
  | 'circleci'
  | 'jenkins'
  | 'travis'
  | 'appveyor'
  | 'custom';

export interface PlatformCapabilities {
  supportsComments: boolean;
  supportsArtifacts: boolean;
  supportsSARIF: boolean;
  supportsQualityGates: boolean;
  supportsParallelExecution: boolean;
  supportsSecrets: boolean;
  supportsEnvironments: boolean;
  maxConcurrentJobs: number;
  timeoutLimits: {
    perJob: number;
    total: number;
  };
}

export interface ConfigurationTemplate {
  filename: string;
  content: string;
  description: string;
  requiredSecrets?: string[];
  optionalSecrets?: string[];
  prerequisites?: string[];
}

/**
 * Platform detection patterns and configurations
 */
const PLATFORM_DETECTION = {
  github: {
    indicators: ['.github/workflows', '.github/actions', 'GITHUB_'],
    configFiles: ['.github/workflows/*.yml', '.github/workflows/*.yaml'],
    environmentVars: ['GITHUB_ACTIONS', 'GITHUB_WORKSPACE', 'GITHUB_TOKEN']
  },
  gitlab: {
    indicators: ['.gitlab-ci.yml', '.gitlab-ci.yaml', 'GITLAB_'],
    configFiles: ['.gitlab-ci.yml', '.gitlab-ci.yaml'],
    environmentVars: ['GITLAB_CI', 'CI_PROJECT_PATH', 'GITLAB_API_TOKEN']
  },
  azure: {
    indicators: ['azure-pipelines.yml', 'azure-pipelines.yaml', 'AZURE_'],
    configFiles: ['azure-pipelines.yml', 'azure-pipelines.yaml', '.azure/pipelines/*.yml'],
    environmentVars: ['AZURE_HTTP_USER_AGENT', 'BUILD_SOURCESDIRECTORY', 'SYSTEM_TEAMFOUNDATIONCOLLECTIONURI']
  },
  bitbucket: {
    indicators: ['bitbucket-pipelines.yml', 'BITBUCKET_'],
    configFiles: ['bitbucket-pipelines.yml'],
    environmentVars: ['BITBUCKET_BUILD_NUMBER', 'BITBUCKET_WORKSPACE', 'BITBUCKET_REPO_SLUG']
  },
  circleci: {
    indicators: ['.circleci/config.yml', 'CIRCLE_'],
    configFiles: ['.circleci/config.yml', '.circleci/config.yaml'],
    environmentVars: ['CIRCLECI', 'CIRCLE_PROJECT_REPONAME', 'CIRCLE_API_TOKEN']
  },
  jenkins: {
    indicators: ['Jenkinsfile', 'JENKINS_'],
    configFiles: ['Jenkinsfile', 'jenkins.yml', '.jenkins/*.groovy'],
    environmentVars: ['JENKINS_URL', 'BUILD_NUMBER', 'JOB_NAME']
  }
} as const;

/**
 * Platform capabilities matrix
 */
const PLATFORM_CAPABILITIES: Record<CI_PLATFORM, PlatformCapabilities> = {
  github: {
    supportsComments: true,
    supportsArtifacts: true,
    supportsSARIF: true,
    supportsQualityGates: true,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: true,
    maxConcurrentJobs: 20,
    timeoutLimits: { perJob: 360, total: 1440 }
  },
  gitlab: {
    supportsComments: true,
    supportsArtifacts: true,
    supportsSARIF: false,
    supportsQualityGates: true,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: true,
    maxConcurrentJobs: 50,
    timeoutLimits: { perJob: 180, total: 480 }
  },
  azure: {
    supportsComments: false,
    supportsArtifacts: true,
    supportsSARIF: true,
    supportsQualityGates: true,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: true,
    maxConcurrentJobs: 10,
    timeoutLimits: { perJob: 360, total: 1440 }
  },
  bitbucket: {
    supportsComments: true,
    supportsArtifacts: true,
    supportsSARIF: false,
    supportsQualityGates: false,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: false,
    maxConcurrentJobs: 10,
    timeoutLimits: { perJob: 120, total: 240 }
  },
  circleci: {
    supportsComments: false,
    supportsArtifacts: true,
    supportsSARIF: false,
    supportsQualityGates: false,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: false,
    maxConcurrentJobs: 30,
    timeoutLimits: { perJob: 180, total: 300 }
  },
  jenkins: {
    supportsComments: false,
    supportsArtifacts: true,
    supportsSARIF: true,
    supportsQualityGates: true,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: false,
    maxConcurrentJobs: 100,
    timeoutLimits: { perJob: 480, total: 1440 }
  },
  travis: {
    supportsComments: false,
    supportsArtifacts: false,
    supportsSARIF: false,
    supportsQualityGates: false,
    supportsParallelExecution: true,
    supportsSecrets: true,
    supportsEnvironments: false,
    maxConcurrentJobs: 5,
    timeoutLimits: { perJob: 50, total: 50 }
  },
  appveyor: {
    supportsComments: false,
    supportsArtifacts: true,
    supportsSARIF: false,
    supportsQualityGates: false,
    supportsParallelExecution: false,
    supportsSecrets: true,
    supportsEnvironments: false,
    maxConcurrentJobs: 1,
    timeoutLimits: { perJob: 60, total: 60 }
  },
  custom: {
    supportsComments: false,
    supportsArtifacts: false,
    supportsSARIF: false,
    supportsQualityGates: false,
    supportsParallelExecution: false,
    supportsSecrets: false,
    supportsEnvironments: false,
    maxConcurrentJobs: 1,
    timeoutLimits: { perJob: 60, total: 60 }
  }
};

export class UniversalCIAPI {
  private config: UniversalCIConfig;
  private detectedPlatform?: CI_PLATFORM;
  private capabilities?: PlatformCapabilities;

  constructor(config: UniversalCIConfig) {
    this.config = {
      autoDetect: true,
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
      enableArchitecturalAnalysis: true,
      enableRegressionAnalysis: true,
      reportFormat: 'json',
      outputPath: './reports',
      ...config
    };
  }

  /**
   * Initialize the API and detect platform if enabled
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Universal CI/CD API');

    if (this.config.autoDetect && !this.config.platform) {
      this.detectedPlatform = await this.detectPlatform();
      logger.info(`Detected CI/CD platform: ${this.detectedPlatform}`);
    } else if (this.config.platform) {
      this.detectedPlatform = this.config.platform;
    } else {
      this.detectedPlatform = 'custom';
    }

    this.capabilities = PLATFORM_CAPABILITIES[this.detectedPlatform];
    logger.info(`Platform capabilities: ${JSON.stringify(this.capabilities, null, 2)}`);
  }

  /**
   * Auto-detect the CI/CD platform based on environment and files
   */
  async detectPlatform(): Promise<CI_PLATFORM> {
    // Validate repository path first
    if (!this.config.repositoryPath) {
      logger.error('Repository path not configured for platform detection');
      return 'custom';
    }

    // Check environment variables first (most reliable in CI)
    try {
      for (const [platform, config] of Object.entries(PLATFORM_DETECTION)) {
        for (const envVar of config.environmentVars) {
          if (process.env[envVar]) {
            logger.info(`Platform detected via environment variable: ${envVar}`);
            return platform as CI_PLATFORM;
          }
        }
      }
    } catch (error) {
      logger.error('Error checking environment variables for platform detection', error);
    }

    // Check for configuration files with proper error handling
    const detectedViaFile = await this.detectPlatformViaFiles();
    if (detectedViaFile !== 'custom') {
      return detectedViaFile;
    }

    // Check for directory indicators with proper error handling
    const detectedViaIndicators = await this.detectPlatformViaIndicators();
    if (detectedViaIndicators !== 'custom') {
      return detectedViaIndicators;
    }

    logger.warn('Unable to detect CI/CD platform, using custom configuration');
    return 'custom';
  }

  /**
   * Detect platform via configuration files
   */
  private async detectPlatformViaFiles(): Promise<CI_PLATFORM> {
    try {
      for (const [platform, config] of Object.entries(PLATFORM_DETECTION)) {
        for (const configFile of config.configFiles) {
          // Skip glob patterns for direct file checks
          if (configFile.includes('*')) continue;

          const fullPath = path.join(this.config.repositoryPath, configFile);
          try {
            await fs.access(fullPath, fs.constants.F_OK);
            logger.info(`Platform detected via config file: ${configFile}`);
            return platform as CI_PLATFORM;
          } catch (error: any) {
            // File doesn't exist or not accessible
            if (error.code !== 'ENOENT') {
              logger.debug(`Error accessing ${fullPath}: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Error checking configuration files for platform detection', error);
    }
    return 'custom';
  }

  /**
   * Detect platform via directory indicators
   */
  private async detectPlatformViaIndicators(): Promise<CI_PLATFORM> {
    try {
      for (const [platform, config] of Object.entries(PLATFORM_DETECTION)) {
        for (const indicator of config.indicators) {
          // Skip environment variable indicators
          if (indicator.includes('_')) continue;

          const fullPath = path.join(this.config.repositoryPath, indicator);
          try {
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory() || stat.isFile()) {
              logger.info(`Platform detected via indicator: ${indicator}`);
              return platform as CI_PLATFORM;
            }
          } catch (error: any) {
            // Path doesn't exist or not accessible
            if (error.code !== 'ENOENT') {
              logger.debug(`Error checking indicator ${fullPath}: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Error checking indicators for platform detection', error);
    }
    return 'custom';
  }

  /**
   * Get platform capabilities
   */
  getPlatformCapabilities(): PlatformCapabilities | undefined {
    return this.capabilities;
  }

  /**
   * Get detected or configured platform
   */
  getPlatform(): CI_PLATFORM | undefined {
    return this.detectedPlatform;
  }

  /**
   * Execute analysis using the appropriate CI pipeline integrator
   */
  async executeAnalysis(): Promise<any> {
    if (!this.detectedPlatform) {
      await this.initialize();
    }

    const config = this.createCIPipelineConfig();
    const integrator = new CIPipelineIntegrator(config);

    // Add timeout protection
    const timeoutMs = config.analysisTimeout || 300000; // 5 minutes default
    const analysisPromise = integrator.executeAnalysis();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Analysis timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      return result;
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        logger.error(`Analysis timed out after ${timeoutMs}ms`);
        throw new Error(`CI/CD analysis exceeded timeout limit of ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate platform-specific configuration template
   */
  async generateConfigurationTemplate(): Promise<ConfigurationTemplate> {
    if (!this.detectedPlatform) {
      await this.initialize();
    }

    switch (this.detectedPlatform) {
      case 'github':
        return this.generateGitHubTemplate();
      case 'gitlab':
        return this.generateGitLabTemplate();
      case 'azure':
        return this.generateAzureTemplate();
      case 'bitbucket':
        return this.generateBitbucketTemplate();
      case 'circleci':
        return this.generateCircleCITemplate();
      case 'jenkins':
        return this.generateJenkinsTemplate();
      default:
        return this.generateCustomTemplate();
    }
  }

  /**
   * Optimize configuration for the detected platform
   */
  optimizeForPlatform(): UniversalCIConfig {
    if (!this.capabilities) {
      return this.config;
    }

    const optimized = { ...this.config };

    // Adjust based on platform capabilities
    if (!this.capabilities.supportsComments && optimized.notifications?.enableComments) {
      optimized.notifications.enableComments = false;
      logger.info('Disabled PR comments - not supported on this platform');
    }

    if (!this.capabilities.supportsSARIF && optimized.reportFormat === 'sarif') {
      optimized.reportFormat = 'json';
      logger.info('Changed report format from SARIF to JSON - SARIF not supported');
    }

    if (!this.capabilities.supportsParallelExecution) {
      logger.info('Platform does not support parallel execution - analysis will run sequentially');
    }

    return optimized;
  }

  /**
   * Validate configuration against platform capabilities
   */
  validateConfiguration(): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!this.capabilities) {
      errors.push('Platform capabilities not initialized');
      return { valid: false, warnings, errors };
    }

    // Check timeout limits
    const analysisTimeout = 300; // 5 minutes default
    if (analysisTimeout > this.capabilities.timeoutLimits.perJob * 60) {
      warnings.push(`Analysis timeout (${analysisTimeout}s) exceeds platform limit (${this.capabilities.timeoutLimits.perJob}m)`);
    }

    // Check feature compatibility
    if (this.config.notifications?.enableComments && !this.capabilities.supportsComments) {
      warnings.push('PR comments requested but not supported on this platform');
    }

    if (this.config.reportFormat === 'sarif' && !this.capabilities.supportsSARIF) {
      warnings.push('SARIF format requested but not supported on this platform');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Create CI pipeline configuration from universal config
   */
  private createCIPipelineConfig(): CIPipelineConfig {
    const optimized = this.optimizeForPlatform();

    return {
      repositoryPath: optimized.repositoryPath,
      platform: (this.detectedPlatform === 'custom' ? 'github' : this.detectedPlatform) as 'github' | 'gitlab' | 'azure' | 'bitbucket' | 'circleci' | 'jenkins',
      enableSecurityAnalysis: optimized.enableSecurityAnalysis || false,
      enablePerformanceAnalysis: optimized.enablePerformanceAnalysis || false,
      enableArchitecturalAnalysis: optimized.enableArchitecturalAnalysis || false,
      enableRegressionAnalysis: optimized.enableRegressionAnalysis || false,
      enableQualityGates: true,
      analysisTimeout: 300000,
      reportFormat: (optimized.reportFormat || 'json') as 'json' | 'junit' | 'sarif' | 'markdown' | 'html',
      outputPath: optimized.outputPath || './reports',
      qualityGates: {
        minQualityScore: optimized.qualityGates?.minQualityScore || 80,
        maxCriticalIssues: optimized.qualityGates?.maxCriticalIssues || 0,
        maxSecurityIssues: optimized.qualityGates?.maxSecurityIssues || 5,
        maxPerformanceIssues: optimized.qualityGates?.maxPerformanceIssues || 3,
        minTestCoverage: optimized.qualityGates?.minTestCoverage || 80,
        maxComplexityIncrease: 20,
        maxTechnicalDebtIncrease: 10,
        regressionThreshold: optimized.qualityGates?.regressionThreshold || 'medium',
        blockOnFailure: true
      },
      notifications: {
        enableSlack: optimized.notifications?.enableSlack || false,
        enableEmail: optimized.notifications?.enableEmail || false,
        enableGitHubComments: this.detectedPlatform === 'github' && (optimized.notifications?.enableComments || false),
        enableMergeRequestComments: this.detectedPlatform === 'gitlab' && (optimized.notifications?.enableComments || false),
        webhookUrls: optimized.notifications?.webhookUrls || [],
        emailRecipients: []
      }
    };
  }

  /**
   * Generate GitHub Actions template
   */
  private generateGitHubTemplate(): ConfigurationTemplate {
    return {
      filename: '.github/workflows/ollama-code-analysis.yml',
      content: `# Generated by Ollama Code Universal CI/CD API
name: Ollama Code Analysis

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/ollama-code-analysis
        with:
          enable-security: 'true'
          enable-performance: 'true'
          min-quality-score: '${this.config.qualityGates?.minQualityScore || 80}'
          max-critical-issues: '${this.config.qualityGates?.maxCriticalIssues || 0}'
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`,
      description: 'GitHub Actions workflow for Ollama Code analysis',
      requiredSecrets: ['GITHUB_TOKEN'],
      prerequisites: ['Ollama Code GitHub Action installed']
    };
  }

  /**
   * Generate GitLab CI template
   */
  private generateGitLabTemplate(): ConfigurationTemplate {
    return {
      filename: '.gitlab-ci.yml',
      content: `# Generated by Ollama Code Universal CI/CD API
stages:
  - analyze

ollama-code-analysis:
  stage: analyze
  image: node:20
  script:
    - yarn install
    - yarn build
    - node dist/src/ai/vcs/ci-pipeline-integrator.js --platform gitlab
  artifacts:
    reports:
      codequality: reports/ollama-code-quality.json
    paths:
      - reports/
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
`,
      description: 'GitLab CI configuration for Ollama Code analysis',
      optionalSecrets: ['GITLAB_API_TOKEN']
    };
  }

  /**
   * Generate Azure DevOps template
   */
  private generateAzureTemplate(): ConfigurationTemplate {
    return {
      filename: 'azure-pipelines.yml',
      content: `# Generated by Ollama Code Universal CI/CD API
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      yarn install
      yarn build
      node dist/src/ai/vcs/ci-pipeline-integrator.js --platform azure
    displayName: 'Ollama Code Analysis'
  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'reports/ollama-code-junit.xml'
`,
      description: 'Azure DevOps pipeline for Ollama Code analysis'
    };
  }

  /**
   * Generate Bitbucket Pipelines template
   */
  private generateBitbucketTemplate(): ConfigurationTemplate {
    return {
      filename: 'bitbucket-pipelines.yml',
      content: `# Generated by Ollama Code Universal CI/CD API
image: node:20

pipelines:
  default:
    - step:
        name: Ollama Code Analysis
        script:
          - yarn install
          - yarn build
          - node dist/src/ai/vcs/ci-pipeline-integrator.js --platform bitbucket
        artifacts:
          - reports/**
  pull-requests:
    '**':
      - step:
          name: Ollama Code PR Analysis
          script:
            - yarn install
            - yarn build
            - node dist/src/ai/vcs/ci-pipeline-integrator.js --platform bitbucket --enable-regression true
          artifacts:
            - reports/**
`,
      description: 'Bitbucket Pipelines configuration for Ollama Code analysis'
    };
  }

  /**
   * Generate CircleCI template
   */
  private generateCircleCITemplate(): ConfigurationTemplate {
    return {
      filename: '.circleci/config.yml',
      content: `# Generated by Ollama Code Universal CI/CD API
version: 2.1

jobs:
  analyze:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: yarn install
      - run: yarn build
      - run: node dist/src/ai/vcs/ci-pipeline-integrator.js --platform circleci
      - store_artifacts:
          path: reports

workflows:
  version: 2
  analyze_and_report:
    jobs:
      - analyze
`,
      description: 'CircleCI configuration for Ollama Code analysis'
    };
  }

  /**
   * Generate Jenkins template
   */
  private generateJenkinsTemplate(): ConfigurationTemplate {
    return {
      filename: 'Jenkinsfile',
      content: `// Generated by Ollama Code Universal CI/CD API
pipeline {
    agent any

    stages {
        stage('Install') {
            steps {
                sh 'yarn install'
            }
        }

        stage('Build') {
            steps {
                sh 'yarn build'
            }
        }

        stage('Analyze') {
            steps {
                sh 'node dist/src/ai/vcs/ci-pipeline-integrator.js --platform jenkins'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'reports/**', fingerprint: true
        }
    }
}
`,
      description: 'Jenkins pipeline for Ollama Code analysis'
    };
  }

  /**
   * Generate custom template
   */
  private generateCustomTemplate(): ConfigurationTemplate {
    return {
      filename: 'ollama-code-ci.sh',
      content: `#!/bin/bash
# Generated by Ollama Code Universal CI/CD API
# Custom CI/CD script for Ollama Code analysis

set -e

echo "🚀 Starting Ollama Code Analysis"

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build project
echo "🔨 Building project..."
yarn build

# Run analysis
echo "🔍 Running analysis..."
node dist/src/ai/vcs/ci-pipeline-integrator.js --platform custom \\
  --enable-security true \\
  --enable-performance true \\
  --min-quality-score ${this.config.qualityGates?.minQualityScore || 80} \\
  --output-path ./reports

echo "✅ Analysis completed"
echo "📊 Check reports in ./reports directory"
`,
      description: 'Custom shell script for Ollama Code analysis'
    };
  }

  /**
   * Get platform-specific documentation
   */
  getPlatformDocumentation(): string {
    if (!this.detectedPlatform) {
      return 'Platform not detected. Please run initialize() first.';
    }

    const docs = {
      github: 'https://docs.github.com/en/actions',
      gitlab: 'https://docs.gitlab.com/ee/ci/',
      azure: 'https://docs.microsoft.com/en-us/azure/devops/pipelines/',
      bitbucket: 'https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/',
      circleci: 'https://circleci.com/docs/',
      jenkins: 'https://www.jenkins.io/doc/book/pipeline/',
      travis: 'https://docs.travis-ci.com/',
      appveyor: 'https://www.appveyor.com/docs/',
      custom: 'No specific documentation available for custom platforms'
    };

    return docs[this.detectedPlatform];
  }
}

export default UniversalCIAPI;