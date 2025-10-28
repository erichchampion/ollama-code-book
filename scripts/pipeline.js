#!/usr/bin/env node

/**
 * Documentation Pipeline
 * 
 * Automated documentation generation, validation, and deployment pipeline
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Pipeline configuration
const PIPELINE_CONFIG = {
  steps: [
    'generate',
    'validate',
    'lint',
    'check-links',
    'maintain',
    'deploy'
  ],
  timeout: 300000, // 5 minutes
  retries: 3,
  parallel: false
};

// Pipeline step definitions
const PIPELINE_STEPS = {
  generate: {
    command: 'npm run docs:generate',
    description: 'Generate documentation from source code',
    timeout: 60000,
    retries: 2
  },
  validate: {
    command: 'npm run docs:validate',
    description: 'Validate documentation content and structure',
    timeout: 30000,
    retries: 2
  },
  lint: {
    command: 'npm run docs:lint',
    description: 'Lint markdown syntax and formatting',
    timeout: 15000,
    retries: 2
  },
  'check-links': {
    command: 'npm run docs:check-links',
    description: 'Check internal and external links',
    timeout: 60000,
    retries: 2
  },
  maintain: {
    command: 'npm run docs:maintain',
    description: 'Maintain documentation consistency and quality',
    timeout: 45000,
    retries: 2
  },
  deploy: {
    command: 'npm run docs:deploy',
    description: 'Deploy documentation to hosting platform',
    timeout: 120000,
    retries: 3
  }
};

// Pipeline execution
class DocumentationPipeline {
  constructor(config = PIPELINE_CONFIG) {
    this.config = config;
    this.results = {};
    this.startTime = Date.now();
  }

  async execute() {
    console.log('🚀 Starting documentation pipeline...');
    console.log(`📋 Steps: ${this.config.steps.join(' → ')}`);
    console.log(`⏱️  Timeout: ${this.config.timeout}ms`);
    console.log(`🔄 Retries: ${this.config.retries}`);
    console.log('');

    for (const step of this.config.steps) {
      await this.executeStep(step);
    }

    this.generateReport();
    console.log('✅ Pipeline completed successfully!');
  }

  async executeStep(stepName) {
    const step = PIPELINE_STEPS[stepName];
    if (!step) {
      throw new Error(`Unknown pipeline step: ${stepName}`);
    }

    console.log(`🔄 Executing: ${step.description}`);
    const stepStart = Date.now();

    for (let attempt = 1; attempt <= step.retries; attempt++) {
      try {
        execSync(step.command, {
          cwd: projectRoot,
          stdio: 'pipe',
          timeout: step.timeout
        });

        const stepTime = Date.now() - stepStart;
        this.results[stepName] = {
          status: 'success',
          time: stepTime,
          attempts: attempt
        };

        console.log(`✅ ${step.description} completed in ${stepTime}ms`);
        return;

      } catch (error) {
        if (attempt === step.retries) {
          const stepTime = Date.now() - stepStart;
          this.results[stepName] = {
            status: 'failed',
            time: stepTime,
            attempts: attempt,
            error: error.message
          };

          console.log(`❌ ${step.description} failed after ${attempt} attempts`);
          throw new Error(`Pipeline step failed: ${stepName}`);
        } else {
          console.log(`⚠️  ${step.description} failed (attempt ${attempt}/${step.retries}), retrying...`);
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      totalTime,
      steps: this.results,
      summary: {
        total: this.config.steps.length,
        successful: Object.values(this.results).filter(r => r.status === 'success').length,
        failed: Object.values(this.results).filter(r => r.status === 'failed').length
      }
    };

    const reportPath = join(projectRoot, 'pipeline-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('');
    console.log('📊 Pipeline Report:');
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Steps: ${report.summary.successful}/${report.summary.total} successful`);
    console.log(`   Report saved: ${reportPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const pipeline = new DocumentationPipeline();
  pipeline.execute().catch(error => {
    console.error('❌ Pipeline failed:', error.message);
    process.exit(1);
  });
}

export default DocumentationPipeline;

