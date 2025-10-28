/**
 * Analysis Command Registration
 *
 * Registers commands for code analysis and quality assessment.
 */

import { commandRegistry, ArgType, CommandDef } from './index.js';
import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { formatErrorForDisplay, createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { createSpinner } from '../utils/spinner.js';

/**
 * Register all analysis commands
 */
export function registerAnalysisCommands(): void {
  registerAnalyzeCommand();
}

/**
 * Register analyze command
 */
function registerAnalyzeCommand(): void {
  const command: CommandDef = {
    name: 'analyze',
    description: 'Analyze code structure, quality, and metrics for a project or file',
    category: 'Analysis',
    handler: async (args) => {
      try {
        // Determine operation type from flags
        let operation = 'analyze'; // default
        if (args.security) {
          operation = 'security';
        } else if (args.performance) {
          operation = 'performance';
        } else if (args.quality) {
          operation = 'quality';
        } else if (args.metrics) {
          operation = 'metrics';
        } else if (args.dependencies) {
          operation = 'architectural';
        }

        // Get target (file/directory or current directory)
        const target = args.target || args.files?.[0] || process.cwd();

        logger.info(`Running ${operation} analysis on: ${target}`);

        const spinner = createSpinner(`Analyzing ${target}...`);
        spinner.start();

        try {
          // Dynamically import the tool to avoid circular dependencies
          const { AdvancedCodeAnalysisTool } = await import('../tools/advanced-code-analysis-tool.js');
          const analysisTool = new AdvancedCodeAnalysisTool();

          // Prepare analysis options
          const options: any = {
            includeMetrics: args.metrics || operation === 'metrics',
            includeSecurity: args.security || operation === 'security',
            includePerformance: args.performance || operation === 'performance',
            depth: args.deep ? 'deep' : 'shallow',
            format: args.json ? 'json' : 'text'
          };

          // Execute the analysis
          const result = await analysisTool.execute(
            {
              operation,
              target,
              options
            },
            {
              projectRoot: process.cwd(),
              workingDirectory: process.cwd(),
              environment: process.env as Record<string, string>,
              timeout: 120000 // 2 minutes
            }
          );

          spinner.succeed('Analysis complete');

          if (result.success) {
            // Format and display the result
            if (args.json) {
              console.log(JSON.stringify(result.data, null, 2));
            } else {
              // Display formatted text output
              console.log('\n' + '='.repeat(60));
              console.log(`Code Analysis Results: ${target}`);
              console.log('='.repeat(60));

              if (typeof result.data === 'object' && result.data.analysis) {
                const analysis = result.data.analysis;

                // Display overview
                if (analysis.overview) {
                  console.log('\nOverview:');
                  console.log(`  Total Files: ${analysis.overview.totalFiles || 'N/A'}`);
                  if (analysis.overview.fileTypes) {
                    console.log('  File Types:');
                    Object.entries(analysis.overview.fileTypes)
                      .slice(0, 10) // Show top 10
                      .forEach(([ext, count]) => {
                        console.log(`    ${ext}: ${count}`);
                      });
                  }
                }

                // Display complexity metrics
                if (analysis.complexity || result.data.complexity) {
                  const complexity = analysis.complexity || result.data.complexity;
                  console.log('\nComplexity:');
                  console.log(`  Average Complexity: ${complexity.averageComplexity || 'N/A'}`);
                  console.log(`  Distribution: ${complexity.complexityDistribution || 'N/A'}`);
                }

                // Display maintainability
                if (analysis.maintainability || result.data.maintainability) {
                  const maint = analysis.maintainability || result.data.maintainability;
                  console.log('\nMaintainability:');
                  console.log(`  Score: ${maint.score || 'N/A'}/100`);
                  if (maint.issues && maint.issues.length > 0) {
                    console.log('  Issues:');
                    maint.issues.slice(0, 5).forEach((issue: string) => {
                      console.log(`    - ${issue}`);
                    });
                  }
                }

                // Display security findings
                if (analysis.security || result.data.security) {
                  const security = analysis.security || result.data.security;
                  console.log('\nSecurity:');
                  if (security.vulnerabilities) {
                    console.log(`  Vulnerabilities: ${security.vulnerabilities.length || 0}`);
                  }
                  if (security.score !== undefined) {
                    console.log(`  Security Score: ${security.score}/100`);
                  }
                }
              } else {
                // Fallback: display raw data
                console.log('\n' + JSON.stringify(result.data, null, 2));
              }

              console.log('\n' + '='.repeat(60));
            }
          } else {
            spinner.fail('Analysis failed');
            console.error('Analysis error:', result.error || 'Unknown error');
          }
        } catch (error) {
          spinner.fail('Analysis failed');
          throw error;
        }
      } catch (error) {
        logger.error('Analyze command failed:', error);
        console.error('Error analyzing code:', formatErrorForDisplay(error));
        throw error;
      }
    },
    args: [
      {
        name: 'target',
        description: 'File or directory to analyze (defaults to current directory)',
        type: ArgType.STRING,
        position: 0,
        required: false
      },
      {
        name: 'security',
        description: 'Perform security analysis',
        type: ArgType.BOOLEAN,
        shortFlag: 's',
        default: false
      },
      {
        name: 'performance',
        description: 'Perform performance analysis',
        type: ArgType.BOOLEAN,
        shortFlag: 'p',
        default: false
      },
      {
        name: 'quality',
        description: 'Perform code quality analysis',
        type: ArgType.BOOLEAN,
        shortFlag: 'q',
        default: false
      },
      {
        name: 'metrics',
        description: 'Get code metrics and complexity',
        type: ArgType.BOOLEAN,
        shortFlag: 'm',
        default: false
      },
      {
        name: 'dependencies',
        description: 'Analyze dependencies and architecture',
        type: ArgType.BOOLEAN,
        shortFlag: 'd',
        default: false
      },
      {
        name: 'files',
        description: 'Specific files to analyze (comma-separated)',
        type: ArgType.STRING,
        shortFlag: 'f'
      },
      {
        name: 'deep',
        description: 'Perform deep analysis (slower but more thorough)',
        type: ArgType.BOOLEAN,
        default: false
      },
      {
        name: 'json',
        description: 'Output results in JSON format',
        type: ArgType.BOOLEAN,
        shortFlag: 'j',
        default: false
      }
    ],
    examples: [
      'analyze',
      'analyze src/',
      'analyze --security',
      'analyze --performance --files src/app.ts',
      'analyze --quality --json',
      'analyze --metrics --deep'
    ]
  };

  commandRegistry.register(command);
}
