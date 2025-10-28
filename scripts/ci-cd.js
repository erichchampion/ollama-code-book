#!/usr/bin/env node

/**
 * CI/CD Integration for Documentation
 * 
 * Integrates documentation updates into CI/CD pipeline for continuous deployment
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// CI/CD configuration
const CICD_CONFIG = {
  platforms: ['github', 'gitlab', 'azure', 'jenkins'],
  triggers: ['push', 'pull_request', 'schedule'],
  environments: ['development', 'staging', 'production'],
  notifications: ['email', 'slack', 'teams', 'webhook']
};

// CI/CD platform configurations
const PLATFORM_CONFIGS = {
  github: {
    workflowFile: '.github/workflows/docs.yml',
    triggers: ['push', 'pull_request'],
    steps: [
      'checkout',
      'setup-node',
      'install-deps',
      'generate-docs',
      'validate-docs',
      'deploy-docs'
    ]
  },
  gitlab: {
    configFile: '.gitlab-ci.yml',
    triggers: ['push', 'merge_request'],
    stages: ['build', 'test', 'deploy'],
    steps: [
      'checkout',
      'setup-node',
      'install-deps',
      'generate-docs',
      'validate-docs',
      'deploy-docs'
    ]
  },
  azure: {
    configFile: 'azure-pipelines.yml',
    triggers: ['push', 'pull_request'],
    stages: ['build', 'test', 'deploy'],
    steps: [
      'checkout',
      'setup-node',
      'install-deps',
      'generate-docs',
      'validate-docs',
      'deploy-docs'
    ]
  },
  jenkins: {
    configFile: 'Jenkinsfile',
    triggers: ['push', 'pull_request'],
    stages: ['build', 'test', 'deploy'],
    steps: [
      'checkout',
      'setup-node',
      'install-deps',
      'generate-docs',
      'validate-docs',
      'deploy-docs'
    ]
  }
};

// CI/CD integration class
class CICDIntegration {
  constructor(platform = 'github') {
    this.platform = platform;
    this.config = PLATFORM_CONFIGS[platform];
    if (!this.config) {
      throw new Error(`Unsupported CI/CD platform: ${platform}`);
    }
  }

  generateWorkflow() {
    console.log(`🔧 Generating ${this.platform} workflow configuration...`);
    
    switch (this.platform) {
      case 'github':
        this.generateGitHubWorkflow();
        break;
      case 'gitlab':
        this.generateGitLabConfig();
        break;
      case 'azure':
        this.generateAzurePipeline();
        break;
      case 'jenkins':
        this.generateJenkinsfile();
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  generateGitHubWorkflow() {
    const workflowContent = `name: Documentation CI/CD

on:
  push:
    branches: [ main, develop ]
    paths: [ 'src/**', 'docs/**', 'scripts/**', '*.md' ]
  pull_request:
    branches: [ main, develop ]
    paths: [ 'src/**', 'docs/**', 'scripts/**', '*.md' ]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  documentation:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Generate documentation
      run: npm run docs:generate
      
    - name: Validate documentation
      run: npm run docs:validate
      
    - name: Lint documentation
      run: npm run docs:lint
      
    - name: Check links
      run: npm run docs:check-links
      
    - name: Run documentation tests
      run: npm run test:docs
      
    - name: Maintain documentation
      run: npm run docs:maintain
      
    - name: Deploy documentation
      if: github.ref == 'refs/heads/main'
      run: npm run docs:deploy
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        
    - name: Upload documentation artifacts
      uses: actions/upload-artifact@v4
      with:
        name: documentation
        path: docs/
        retention-days: 30
`;

    const workflowPath = join(projectRoot, '.github', 'workflows', 'docs.yml');
    writeFileSync(workflowPath, workflowContent);
    console.log(`✅ GitHub workflow created: ${workflowPath}`);
  }

  generateGitLabConfig() {
    const configContent = `stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "18"

documentation:
  stage: build
  image: node:\${NODE_VERSION}
  before_script:
    - npm ci
  script:
    - npm run docs:generate
    - npm run docs:validate
    - npm run docs:lint
    - npm run docs:check-links
    - npm run test:docs
    - npm run docs:maintain
  artifacts:
    paths:
      - docs/
    expire_in: 30 days
  only:
    - main
    - develop
    - merge_requests

deploy_documentation:
  stage: deploy
  image: node:\${NODE_VERSION}
  script:
    - npm run docs:deploy
  only:
    - main
  when: manual
`;

    const configPath = join(projectRoot, '.gitlab-ci.yml');
    writeFileSync(configPath, configContent);
    console.log(`✅ GitLab CI configuration created: ${configPath}`);
  }

  generateAzurePipeline() {
    const pipelineContent = `trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - src/**
      - docs/**
      - scripts/**
      - *.md

pr:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - src/**
      - docs/**
      - scripts/**
      - *.md

schedules:
  - cron: "0 2 * * 1"
    displayName: Weekly documentation update
    branches:
      include:
        - main

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Build
  displayName: Build and Test
  jobs:
  - job: Documentation
    displayName: Generate and Validate Documentation
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
      displayName: 'Install Node.js'
      
    - script: |
        npm ci
      displayName: 'Install dependencies'
      
    - script: |
        npm run docs:generate
      displayName: 'Generate documentation'
      
    - script: |
        npm run docs:validate
      displayName: 'Validate documentation'
      
    - script: |
        npm run docs:lint
      displayName: 'Lint documentation'
      
    - script: |
        npm run docs:check-links
      displayName: 'Check links'
      
    - script: |
        npm run test:docs
      displayName: 'Run documentation tests'
      
    - script: |
        npm run docs:maintain
      displayName: 'Maintain documentation'
      
    - task: PublishBuildArtifacts@1
      inputs:
        pathToPublish: 'docs'
        artifactName: 'documentation'
      displayName: 'Publish documentation artifacts'

- stage: Deploy
  displayName: Deploy Documentation
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - job: Deploy
    displayName: Deploy to hosting platform
    steps:
    - script: |
        npm run docs:deploy
      displayName: 'Deploy documentation'
      env:
        AZURE_DEVOPS_EXT_PAT: \$(AZURE_DEVOPS_EXT_PAT)
`;

    const pipelinePath = join(projectRoot, 'azure-pipelines.yml');
    writeFileSync(pipelinePath, pipelineContent);
    console.log(`✅ Azure Pipeline created: ${pipelinePath}`);
  }

  generateJenkinsfile() {
    const jenkinsfileContent = `pipeline {
    agent any
    
    triggers {
        githubPush()
        cron('0 2 * * 1') // Weekly on Monday at 2 AM
    }
    
    environment {
        NODE_VERSION = '18'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'npm ci'
            }
        }
        
        stage('Generate Documentation') {
            steps {
                sh 'npm run docs:generate'
            }
        }
        
        stage('Validate Documentation') {
            steps {
                sh 'npm run docs:validate'
                sh 'npm run docs:lint'
                sh 'npm run docs:check-links'
            }
        }
        
        stage('Test Documentation') {
            steps {
                sh 'npm run test:docs'
            }
        }
        
        stage('Maintain Documentation') {
            steps {
                sh 'npm run docs:maintain'
            }
        }
        
        stage('Deploy Documentation') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm run docs:deploy'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'docs/**', fingerprint: true
        }
        success {
            emailext (
                subject: "Documentation CI/CD: SUCCESS - \${env.JOB_NAME} - \${env.BUILD_NUMBER}",
                body: "Documentation build and deployment completed successfully.",
                to: "\${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
        failure {
            emailext (
                subject: "Documentation CI/CD: FAILURE - \${env.JOB_NAME} - \${env.BUILD_NUMBER}",
                body: "Documentation build or deployment failed. Please check the logs.",
                to: "\${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}`;

    const jenkinsfilePath = join(projectRoot, 'Jenkinsfile');
    writeFileSync(jenkinsfilePath, jenkinsfileContent);
    console.log(`✅ Jenkinsfile created: ${jenkinsfilePath}`);
  }

  generatePackageScripts() {
    console.log('📦 Adding CI/CD scripts to package.json...');
    
    const packagePath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // Add CI/CD scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'ci:docs': 'npm run docs:generate && npm run docs:validate && npm run docs:lint && npm run docs:check-links && npm run test:docs && npm run docs:maintain',
      'ci:docs:deploy': 'npm run ci:docs && npm run docs:deploy',
      'ci:docs:test': 'npm run test:docs',
      'ci:docs:validate': 'npm run docs:validate && npm run docs:lint && npm run docs:check-links'
    };
    
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ CI/CD scripts added to package.json');
  }

  generateDockerfile() {
    console.log('🐳 Generating Dockerfile for documentation...');
    
    const dockerfileContent = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run docs:generate

EXPOSE 3000

CMD ["npm", "run", "docs:serve"]
`;

    const dockerfilePath = join(projectRoot, 'Dockerfile.docs');
    writeFileSync(dockerfilePath, dockerfileContent);
    console.log(`✅ Dockerfile created: ${dockerfilePath}`);
  }

  generateDockerCompose() {
    console.log('🐳 Generating docker-compose.yml for documentation...');
    
    const composeContent = `version: '3.8'

services:
  docs:
    build:
      context: .
      dockerfile: Dockerfile.docs
    ports:
      - "3000:3000"
    volumes:
      - ./docs:/app/docs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
`;

    const composePath = join(projectRoot, 'docker-compose.docs.yml');
    writeFileSync(composePath, composeContent);
    console.log(`✅ Docker Compose file created: ${composePath}`);
  }

  generateGitHooks() {
    console.log('🪝 Generating Git hooks for documentation...');
    
    const preCommitHook = `#!/bin/sh
# Pre-commit hook for documentation

echo "🔍 Running documentation pre-commit checks..."

# Generate documentation
npm run docs:generate

# Validate documentation
npm run docs:validate

# Lint documentation
npm run docs:lint

# Check links
npm run docs:check-links

echo "✅ Documentation pre-commit checks passed!"
`;

    const preCommitPath = join(projectRoot, '.git', 'hooks', 'pre-commit');
    writeFileSync(preCommitPath, preCommitHook);
    execSync(`chmod +x ${preCommitPath}`);
    console.log('✅ Pre-commit hook created');
  }

  generateGitHubActions() {
    console.log('⚡ Generating additional GitHub Actions...');
    
    // Documentation preview action
    const previewAction = `name: Documentation Preview

on:
  pull_request:
    paths: [ 'src/**', 'docs/**', 'scripts/**', '*.md' ]

jobs:
  preview:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Generate documentation
      run: npm run docs:generate
      
    - name: Deploy preview
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
        destination_dir: preview/\${{ github.head_ref }}
`;

    const previewPath = join(projectRoot, '.github', 'workflows', 'docs-preview.yml');
    writeFileSync(previewPath, previewAction);
    console.log(`✅ Documentation preview action created: ${previewPath}`);
  }

  generateAll() {
    console.log('🚀 Generating complete CI/CD integration...');
    
    this.generateWorkflow();
    this.generatePackageScripts();
    this.generateDockerfile();
    this.generateDockerCompose();
    this.generateGitHooks();
    this.generateGitHubActions();
    
    console.log('');
    console.log('✅ CI/CD integration complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Review the generated configuration files');
    console.log('2. Customize the workflow for your needs');
    console.log('3. Set up environment variables and secrets');
    console.log('4. Test the pipeline in a development branch');
    console.log('5. Enable the pipeline in your CI/CD platform');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const platform = process.argv[2] || 'github';
  const integration = new CICDIntegration(platform);
  integration.generateAll();
}

export default CICDIntegration;

