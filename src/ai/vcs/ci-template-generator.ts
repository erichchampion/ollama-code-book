/**
 * CI/CD Template Generator
 *
 * Generates platform-specific CI/CD configurations from shared templates
 * to eliminate code duplication and ensure consistency across platforms.
 */

import { CI_CONFIG } from './config/ci-cd-defaults.js';
import * as yaml from 'js-yaml';

export interface CITemplateConfig {
  platform: 'github' | 'gitlab' | 'azure' | 'bitbucket' | 'circleci' | 'jenkins';
  branches?: string[];
  enableParallel?: boolean;
  enableCaching?: boolean;
  enableArtifacts?: boolean;
  enableSchedule?: boolean;
  customConfig?: Record<string, any>;
}

/**
 * Base template structure shared across all platforms
 */
interface BaseTemplate {
  installDependencies: string[];
  buildProject: string[];
  runAnalysis: string[];
  validateQualityGates: string[];
  generateReports: string[];
  checkDeploymentReadiness: string[];
}

/**
 * Platform-specific template generators
 */
export class CITemplateGenerator {
  private config: CITemplateConfig;
  private baseTemplate: BaseTemplate;

  constructor(config: CITemplateConfig) {
    this.config = config;
    this.baseTemplate = this.createBaseTemplate();
  }

  /**
   * Create base template with shared commands
   */
  private createBaseTemplate(): BaseTemplate {
    const { build, messages, qualityGates } = CI_CONFIG;

    return {
      installDependencies: [
        `echo "${messages.installDependencies}"`,
        build.installCommand
      ],
      buildProject: [
        `echo "${messages.buildProject}"`,
        build.buildCommand
      ],
      runAnalysis: [
        `echo "${messages.runAnalysis}"`,
        CI_CONFIG.getAnalysisCommand(this.config.platform)
      ],
      validateQualityGates: [
        'if [ -f "reports/ollama-code-report.json" ]; then',
        '  QUALITY_GATES=$(jq -r \'.qualityGatePassed\' reports/ollama-code-report.json)',
        '  QUALITY_SCORE=$(jq -r \'.overallScore\' reports/ollama-code-report.json)',
        `  echo "Quality Score: \${QUALITY_SCORE}/100"`,
        '  if [ "$QUALITY_GATES" = "true" ]; then',
        `    echo "${messages.qualityPassed}"`,
        '  else',
        `    echo "${messages.qualityFailed}"`,
        '    exit 1',
        '  fi',
        'else',
        '  echo "Analysis report not found"',
        '  exit 1',
        'fi'
      ],
      generateReports: [
        `echo "${messages.generateReports}"`,
        'if [ -f "reports/ollama-code-report.json" ]; then',
        '  QUALITY_SCORE=$(jq -r \'.overallScore\' reports/ollama-code-report.json)',
        '  SECURITY_ISSUES=$(jq -r \'.results.security.totalVulnerabilities // 0\' reports/ollama-code-report.json)',
        '  PERFORMANCE_ISSUES=$(jq -r \'.results.performance.totalIssues // 0\' reports/ollama-code-report.json)',
        '  REGRESSION_RISK=$(jq -r \'.results.regression.overallRisk // "unknown"\' reports/ollama-code-report.json)',
        '  # Generate summary',
        '  cat > reports/summary.md <<EOL',
        '## 🤖 Ollama Code Analysis Results',
        '',
        '### 📊 Overall Quality Score: ${QUALITY_SCORE}/100',
        '',
        '#### 📈 Key Metrics:',
        '- 🛡️ Security Issues: ${SECURITY_ISSUES}',
        '- ⚡ Performance Issues: ${PERFORMANCE_ISSUES}',
        '- ⚠️ Regression Risk: ${REGRESSION_RISK}',
        'EOL',
        'fi'
      ],
      checkDeploymentReadiness: [
        `echo "${messages.deploymentCheck}"`,
        'if [ -f "reports/ollama-code-report.json" ]; then',
        '  QUALITY_GATES=$(jq -r \'.qualityGatePassed\' reports/ollama-code-report.json)',
        '  if [ "$QUALITY_GATES" = "true" ]; then',
        `    echo "${messages.deploymentReady}"`,
        '  else',
        `    echo "${messages.deploymentBlocked}"`,
        '    exit 1',
        '  fi',
        'fi'
      ]
    };
  }

  /**
   * Generate configuration for specific platform
   */
  generate(): string {
    switch (this.config.platform) {
      case 'github':
        return this.generateGitHubActions();
      case 'gitlab':
        return this.generateGitLabCI();
      case 'azure':
        return this.generateAzureDevOps();
      case 'bitbucket':
        return this.generateBitbucketPipelines();
      case 'circleci':
        return this.generateCircleCI();
      case 'jenkins':
        return this.generateJenkins();
      default:
        throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  /**
   * Generate GitHub Actions workflow
   */
  private generateGitHubActions(): string {
    const { build, artifacts, branches } = CI_CONFIG;

    const workflow = {
      name: 'Ollama Code Analysis',
      on: {
        push: {
          branches: this.config.branches || branches.defaultBranches
        },
        pull_request: {
          branches: this.config.branches || branches.defaultBranches
        }
      },
      jobs: {
        analysis: {
          'runs-on': 'ubuntu-latest',
          steps: [
            {
              name: 'Checkout',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': build.nodeVersion,
                cache: 'yarn'
              }
            },
            {
              name: 'Install Dependencies',
              run: this.baseTemplate.installDependencies.join('\n')
            },
            {
              name: 'Build Project',
              run: this.baseTemplate.buildProject.join('\n')
            },
            {
              name: 'Run Analysis',
              run: this.baseTemplate.runAnalysis.join('\n')
            },
            {
              name: 'Validate Quality Gates',
              run: this.baseTemplate.validateQualityGates.join('\n')
            },
            {
              name: 'Upload Reports',
              uses: 'actions/upload-artifact@v4',
              if: 'always()',
              with: {
                name: 'analysis-reports',
                path: 'reports/',
                'retention-days': artifacts.retentionDays
              }
            }
          ]
        }
      }
    };

    return yaml.dump(workflow);
  }

  /**
   * Generate GitLab CI configuration
   */
  private generateGitLabCI(): string {
    const { build, artifacts, messages } = CI_CONFIG;

    const config = {
      image: build.nodeImageAlpine,
      stages: ['prepare', 'analyze', 'report'],
      variables: this.getEnvironmentVariables(),
      cache: {
        key: '${CI_COMMIT_REF_SLUG}',
        paths: [
          'node_modules/',
          '.yarn/cache/'
        ]
      },
      'install:dependencies': {
        stage: 'prepare',
        script: this.baseTemplate.installDependencies.concat(
          this.baseTemplate.buildProject
        ),
        artifacts: {
          paths: ['node_modules/', 'dist/'],
          expire_in: '1 hour'
        }
      },
      'ollama:code:analysis': {
        stage: 'analyze',
        needs: ['install:dependencies'],
        script: this.baseTemplate.runAnalysis.concat(
          this.baseTemplate.validateQualityGates
        ),
        artifacts: {
          reports: {
            codequality: 'reports/ollama-code-quality.json'
          },
          paths: ['reports/'],
          expire_in: `${artifacts.retentionDays} days`
        }
      },
      'generate:reports': {
        stage: 'report',
        needs: ['ollama:code:analysis'],
        script: this.baseTemplate.generateReports,
        artifacts: {
          paths: ['reports/'],
          expire_in: `${artifacts.retentionDays} days`
        }
      }
    };

    return yaml.dump(config);
  }

  /**
   * Generate Azure DevOps pipeline
   */
  private generateAzureDevOps(): string {
    const { build, branches } = CI_CONFIG;
    const overrides = CI_CONFIG.platformOverrides.azure;

    const pipeline = {
      trigger: {
        branches: {
          include: this.config.branches || branches.defaultBranches
        }
      },
      pool: {
        vmImage: overrides.vmImage
      },
      variables: this.getEnvironmentVariables(),
      stages: [
        {
          stage: 'Analysis',
          displayName: 'Code Analysis',
          jobs: [
            {
              job: 'RunAnalysis',
              displayName: 'Run Ollama Code Analysis',
              steps: [
                {
                  task: 'NodeTool@0',
                  displayName: 'Install Node.js',
                  inputs: {
                    versionSpec: overrides.nodeVersionSpec
                  }
                },
                {
                  script: this.baseTemplate.installDependencies.join('\n'),
                  displayName: 'Install Dependencies'
                },
                {
                  script: this.baseTemplate.buildProject.join('\n'),
                  displayName: 'Build Project'
                },
                {
                  script: this.baseTemplate.runAnalysis.join('\n'),
                  displayName: 'Run Analysis'
                },
                {
                  script: this.baseTemplate.validateQualityGates.join('\n'),
                  displayName: 'Validate Quality Gates'
                },
                {
                  task: 'PublishBuildArtifacts@1',
                  displayName: 'Publish Reports',
                  inputs: {
                    pathToPublish: 'reports',
                    artifactName: 'analysis-reports'
                  },
                  condition: 'always()'
                }
              ]
            }
          ]
        }
      ]
    };

    return yaml.dump(pipeline);
  }

  /**
   * Generate BitBucket Pipelines configuration
   */
  private generateBitbucketPipelines(): string {
    const { build, artifacts } = CI_CONFIG;
    const overrides = CI_CONFIG.platformOverrides.bitbucket;

    const config = {
      image: overrides.nodeImage,
      definitions: {
        caches: {
          nodemodules: 'node_modules',
          yarn: '~/.cache/yarn'
        },
        steps: [
          {
            step: {
              name: 'Analysis',
              caches: ['nodemodules', 'yarn'],
              script: [
                ...this.baseTemplate.installDependencies,
                ...this.baseTemplate.buildProject,
                ...this.baseTemplate.runAnalysis,
                ...this.baseTemplate.validateQualityGates
              ],
              artifacts: ['reports/**']
            }
          }
        ]
      },
      pipelines: {
        default: [
          {
            step: {
              name: 'Code Analysis',
              script: [
                ...this.baseTemplate.installDependencies,
                ...this.baseTemplate.buildProject,
                ...this.baseTemplate.runAnalysis,
                ...this.baseTemplate.validateQualityGates,
                ...this.baseTemplate.generateReports
              ],
              artifacts: ['reports/**']
            }
          }
        ]
      }
    };

    return yaml.dump(config);
  }

  /**
   * Generate CircleCI configuration
   */
  private generateCircleCI(): string {
    const overrides = CI_CONFIG.platformOverrides.circleci;

    const config = {
      version: 2.1,
      executors: {
        'node-executor': {
          docker: [{ image: overrides.nodeImage }],
          'working_directory': overrides.workingDirectory
        }
      },
      jobs: {
        analyze: {
          executor: 'node-executor',
          steps: [
            'checkout',
            {
              run: {
                name: 'Install Dependencies',
                command: this.baseTemplate.installDependencies.join('\n')
              }
            },
            {
              run: {
                name: 'Build Project',
                command: this.baseTemplate.buildProject.join('\n')
              }
            },
            {
              run: {
                name: 'Run Analysis',
                command: this.baseTemplate.runAnalysis.join('\n')
              }
            },
            {
              run: {
                name: 'Validate Quality Gates',
                command: this.baseTemplate.validateQualityGates.join('\n')
              }
            },
            {
              store_artifacts: {
                path: 'reports'
              }
            }
          ]
        }
      },
      workflows: {
        version: 2,
        'analyze-and-report': {
          jobs: ['analyze']
        }
      }
    };

    return yaml.dump(config);
  }

  /**
   * Generate Jenkins pipeline
   */
  private generateJenkins(): string {
    const stages = [
      `stage('Checkout') {
        steps {
          checkout scm
        }
      }`,
      `stage('Install') {
        steps {
          sh '${this.baseTemplate.installDependencies.join(' && ')}'
        }
      }`,
      `stage('Build') {
        steps {
          sh '${this.baseTemplate.buildProject.join(' && ')}'
        }
      }`,
      `stage('Analyze') {
        steps {
          sh '${this.baseTemplate.runAnalysis.join(' && ')}'
        }
      }`,
      `stage('Validate') {
        steps {
          sh '''
            ${this.baseTemplate.validateQualityGates.join('\n            ')}
          '''
        }
      }`
    ];

    return `pipeline {
    agent any

    environment {
${Object.entries(this.getEnvironmentVariables())
  .map(([key, value]) => `        ${key} = '${value}'`)
  .join('\n')}
    }

    stages {
        ${stages.join('\n        ')}
    }

    post {
        always {
            archiveArtifacts artifacts: 'reports/**', fingerprint: true
        }
    }
}`;
  }

  /**
   * Get environment variables for CI configuration
   */
  private getEnvironmentVariables(): Record<string, string | number> {
    const { qualityGates, analysis } = CI_CONFIG;

    return {
      MIN_QUALITY_SCORE: qualityGates.minQualityScore.toString(),
      MAX_CRITICAL_ISSUES: qualityGates.maxCriticalIssues.toString(),
      MAX_SECURITY_ISSUES: qualityGates.maxSecurityIssues.toString(),
      MAX_PERFORMANCE_ISSUES: qualityGates.maxPerformanceIssues.toString(),
      MIN_TEST_COVERAGE: qualityGates.minTestCoverage.toString(),
      REGRESSION_THRESHOLD: qualityGates.regressionThreshold,
      ANALYSIS_TIMEOUT: analysis.analysisTimeoutSeconds.toString()
    };
  }
}

/**
 * Generate CI configuration for a specific platform
 */
export function generateCIConfig(platform: CITemplateConfig['platform'], options?: Partial<CITemplateConfig>): string {
  const generator = new CITemplateGenerator({
    platform,
    ...options
  });

  return generator.generate();
}

export default CITemplateGenerator;