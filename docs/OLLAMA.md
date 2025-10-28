# Ollama Code CLI - Complete Setup and Integration Guide

This comprehensive guide covers installation, configuration, and integration of all Ollama Code CLI features, including multi-provider AI, VCS intelligence, IDE integration, and enterprise capabilities.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Basic Configuration](#basic-configuration)
- [Multi-Provider AI Setup](#multi-provider-ai-setup)
- [VCS Intelligence Configuration](#vcs-intelligence-configuration)
- [IDE Integration Setup](#ide-integration-setup)
- [Documentation Generation Setup](#documentation-generation-setup)
- [Enterprise Features Configuration](#enterprise-features-configuration)
- [CLI Modes and Entry Points](#cli-modes-and-entry-points)
- [Development Workflow](#development-workflow)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Quick Start

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **Ollama**: Latest version installed and running
- **Git**: For VCS intelligence features
- **VS Code**: For IDE integration (optional)

### Basic Installation
```bash
# Install Ollama Code CLI
npm install -g ollama-code

# Verify installation
ollama-code --version

# Run interactive setup
ollama-code --interactive

# Quick test with simple mode
ollama-code-simple ask "Hello, how are you?"
```

## Installation

### Core Installation
```bash
# Option 1: Global installation
npm install -g ollama-code

# Option 2: Local project installation
npm install ollama-code

# Option 3: Development installation
git clone https://github.com/erichchampion/ollama-code.git
cd ollama-code
yarn install
yarn build
```

### Verify Installation
```bash
# Check all CLI entry points
ollama-code --version              # Interactive selector
ollama-code-simple --version       # Simple CLI mode
ollama-code-advanced --version     # Advanced CLI mode
ollama-code-interactive --version  # Interactive mode (alias)
```

### Ollama Server Setup
```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull recommended models
ollama pull qwen2.5-coder:latest
ollama pull codellama:7b

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

## Basic Configuration

### Initial Configuration
```bash
# Run guided configuration setup
ollama-code config setup

# Set basic preferences
ollama-code config set ai.providers.ollama.baseUrl "http://localhost:11434"
ollama-code config set ai.defaultModel "qwen2.5-coder:latest"
ollama-code config set ai.defaultProvider "ollama"
ollama-code config set logging.level "info"

# View current configuration
ollama-code config view
```

### Configuration File Location
```bash
# Configuration files are stored in:
~/.ollama-code/config.json           # Main configuration
~/.ollama-code/providers.json        # Provider configurations
~/.ollama-code/vcs-config.json       # VCS intelligence settings
~/.ollama-code/ide-config.json       # IDE integration settings
```

### Basic Configuration Example
```json
{
  "ai": {
    "defaultProvider": "ollama",
    "defaultModel": "qwen2.5-coder:latest",
    "defaultTemperature": 0.7,
    "providers": {
      "ollama": {
        "enabled": true,
        "baseUrl": "http://localhost:11434",
        "timeout": 30000,
        "retryAttempts": 3
      }
    }
  },
  "logging": {
    "level": "info",
    "enableFileLogging": true,
    "logPath": "~/.ollama-code/logs"
  },
  "workspace": {
    "defaultPath": "./",
    "autoDetectProject": true,
    "respectGitignore": true
  }
}
```

## Multi-Provider AI Setup

### Provider Installation and Configuration

#### 1. OpenAI Integration
```bash
# Configure OpenAI provider
ollama-code config set ai.providers.openai.enabled true
ollama-code config set ai.providers.openai.apiKey "${OPENAI_API_KEY}"
ollama-code config set ai.providers.openai.models '["gpt-4", "gpt-3.5-turbo"]'

# Test OpenAI connection
ollama-code provider test openai

# Use OpenAI for specific requests
ollama-code ask "Explain async/await" --provider openai
```

#### 2. Anthropic (Claude) Integration
```bash
# Configure Anthropic provider
ollama-code config set ai.providers.anthropic.enabled true
ollama-code config set ai.providers.anthropic.apiKey "${ANTHROPIC_API_KEY}"
ollama-code config set ai.providers.anthropic.models '["claude-3-sonnet", "claude-3-haiku"]'

# Test Anthropic connection
ollama-code provider test anthropic

# Use Claude for code review
ollama-code review-code --provider anthropic src/main.js
```

#### 3. Google AI Integration
```bash
# Configure Google AI provider
ollama-code config set ai.providers.google.enabled true
ollama-code config set ai.providers.google.apiKey "${GOOGLE_AI_API_KEY}"
ollama-code config set ai.providers.google.models '["gemini-pro", "gemini-pro-vision"]'

# Test Google AI connection
ollama-code provider test google

# Use Gemini for multimodal analysis
ollama-code analyze-image diagram.png --provider google
```

### Intelligent Provider Routing
```bash
# Configure routing strategy
ollama-code config set ai.routing.strategy "intelligent"
ollama-code config set ai.routing.weights.cost 0.3
ollama-code config set ai.routing.weights.speed 0.3
ollama-code config set ai.routing.weights.quality 0.4

# Enable response fusion for critical tasks
ollama-code config set ai.fusion.enabled true
ollama-code config set ai.fusion.strategy "consensus"
ollama-code config set ai.fusion.providers '["ollama", "openai", "anthropic"]'

# Test intelligent routing
ollama-code fusion generate "Write a TypeScript class for user authentication"
```

### Fine-Tuning and Model Deployment
```bash
# Prepare training dataset
ollama-code prepare-dataset --input training_data.jsonl --output processed_dataset.jsonl

# Fine-tune local model
ollama-code fine-tune train \
  --base-model qwen2.5-coder:latest \
  --dataset processed_dataset.jsonl \
  --output-model custom-code-model \
  --epochs 3 \
  --learning-rate 0.0001

# Deploy fine-tuned model
ollama-code deploy-model custom-code-model --load-balancer round-robin

# Test custom model
ollama-code ask "Generate a React component" --model custom-code-model
```

## VCS Intelligence Configuration

### Git Hooks Setup
```bash
# Install Git hooks for AI-powered validation
ollama-code setup-hooks --install-all

# Configure specific hooks
ollama-code setup-hooks --pre-commit --post-commit --pre-push

# Configure hook behavior
ollama-code config set vcs.hooks.enableCommitValidation true
ollama-code config set vcs.hooks.enableCodeQuality true
ollama-code config set vcs.hooks.qualityThreshold 0.8

# Test hook installation
git commit -m "test commit message"  # Triggers AI validation
```

### CI/CD Pipeline Integration
```bash
# Generate GitHub Actions workflow
ollama-code generate-pipeline github \
  --enable-quality-gates \
  --enable-security-analysis \
  --enable-performance-analysis \
  --output .github/workflows/ollama-code-ci.yml

# Generate GitLab CI configuration
ollama-code generate-pipeline gitlab \
  --enable-regression-analysis \
  --output .gitlab-ci.yml

# Configure universal CI settings
ollama-code config set cicd.platform "github"
ollama-code config set cicd.qualityGates.minScore 85
ollama-code config set cicd.qualityGates.maxCriticalIssues 0
ollama-code config set cicd.enableSecurityAnalysis true
```

### Code Quality Tracking
```bash
# Initialize quality tracking
ollama-code init-quality-tracking --baseline

# Configure quality metrics
ollama-code config set quality.metrics.complexity.threshold 10
ollama-code config set quality.metrics.coverage.minimum 80
ollama-code config set quality.metrics.maintainability.minimum 70

# Run quality analysis
ollama-code analyze-quality --full-report

# Generate quality dashboard
ollama-code quality-dashboard --format html --output quality-report.html
```

### Regression Analysis
```bash
# Configure regression analysis
ollama-code config set regression.enabled true
ollama-code config set regression.baselineBranch "main"
ollama-code config set regression.analysisDepth 10

# Analyze potential regressions
ollama-code analyze-regression --compare-branch feature/new-feature

# Generate regression report
ollama-code regression-report --format markdown --output regression-analysis.md
```

## IDE Integration Setup

### VS Code Extension Installation
```bash
# Install VS Code extension (multiple methods)

# Method 1: From VS Code Marketplace
# Search for "Ollama Code" and install

# Method 2: From VSIX file
code --install-extension ollama-code.vsix

# Method 3: Development installation
cd extensions/vscode
yarn install
yarn build
code --install-extension ./ollama-code-0.1.0.vsix
```

### VS Code Extension Configuration
```json
// settings.json
{
  "ollamaCode.serverPort": 3002,
  "ollamaCode.autoStart": true,
  "ollamaCode.connectionTimeout": 10000,
  "ollamaCode.logLevel": "info",
  "ollamaCode.enableInlineCompletion": true,
  "ollamaCode.enableCodeActions": true,
  "ollamaCode.enableHoverInformation": true,
  "ollamaCode.enableDiagnostics": true,
  "ollamaCode.realTimeAnalysis": true,
  "ollamaCode.defaultProvider": "ollama",
  "ollamaCode.providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434"
    },
    "openai": {
      "enabled": true,
      "apiKey": "${OPENAI_API_KEY}"
    }
  }
}
```

### WebSocket Server for Real-time Integration
```bash
# Start advanced CLI mode with WebSocket support
ollama-code-advanced --enable-websocket --port 3002

# Configure WebSocket settings
ollama-code config set ide.websocket.port 3002
ollama-code config set ide.websocket.enableHeartbeat true
ollama-code config set ide.websocket.maxConnections 10

# Test WebSocket connection
ollama-code test-websocket --port 3002
```

### Workspace Analysis Configuration
```bash
# Configure workspace analysis
ollama-code config set workspace.analysis.enabled true
ollama-code config set workspace.analysis.realTimeUpdates true
ollama-code config set workspace.analysis.fileWatching true
ollama-code config set workspace.analysis.maxFileSize 1048576  # 1MB

# Start workspace analysis service
ollama-code start-workspace-analysis --path ./src

# Generate workspace insights
ollama-code workspace-insights --format json --output workspace-analysis.json
```

## Documentation Generation Setup

### TypeDoc Integration
```bash
# Install TypeDoc (if not already installed)
yarn add -D typedoc @typedoc/plugin-markdown

# Configure TypeDoc
ollama-code docs:configure-typedoc

# Generate API documentation
ollama-code docs:generate

# Watch for changes and auto-regenerate
ollama-code docs:watch

# Validate generated documentation
ollama-code docs:validate
```

### GitHub Actions Documentation Workflow
```bash
# Setup automatic documentation workflow
ollama-code setup-docs-workflow

# This creates .github/workflows/update-documentation.yml with:
# - Automatic TypeDoc generation on code changes
# - Documentation validation and link checking
# - Automatic commits and PR comments
# - Artifact uploads for documentation previews
```

### Documentation Configuration
```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "json": "docs/api/api.json",
  "pretty": true,
  "theme": "default",
  "includeVersion": true,
  "excludeExternals": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "hideGenerator": false,
  "disableSources": false,
  "sourceLinkTemplate": "https://github.com/erichchampion/ollama-code/blob/{gitRevision}/{path}#L{line}"
}
```

## Enterprise Features Configuration

### Performance Optimization
```bash
# Configure distributed processing
ollama-code config set performance.distributed.enabled true
ollama-code config set performance.distributed.maxWorkers 4
ollama-code config set performance.distributed.queueSize 100

# Configure advanced caching
ollama-code config set performance.cache.strategy "multi-tier"
ollama-code config set performance.cache.l1Size 100
ollama-code config set performance.cache.l2Size 1000
ollama-code config set performance.cache.ttl 3600

# Enable predictive caching
ollama-code config set performance.predictiveCache.enabled true
ollama-code config set performance.predictiveCache.learningRate 0.1

# Configure memory optimization
ollama-code config set performance.memory.autoCleanup true
ollama-code config set performance.memory.maxHeapSize "2G"
```

### Enterprise Security
```bash
# Configure audit logging
ollama-code config set security.audit.enabled true
ollama-code config set security.audit.logPath "~/.ollama-code/audit.log"
ollama-code config set security.audit.retentionDays 90

# Configure access control
ollama-code config set security.access.requireAuth true
ollama-code config set security.access.allowedUsers '["user1", "user2"]'

# Configure API key rotation
ollama-code config set security.keyRotation.enabled true
ollama-code config set security.keyRotation.intervalDays 30

# Enable compliance features
ollama-code config set compliance.gdpr.enabled true
ollama-code config set compliance.dataRetention.days 365
```

### Monitoring and Analytics
```bash
# Enable performance monitoring
ollama-code config set monitoring.performance.enabled true
ollama-code config set monitoring.performance.metricsInterval 60

# Start performance dashboard
ollama-code performance-dashboard --port 8080

# Configure analytics
ollama-code config set analytics.enabled true
ollama-code config set analytics.anonymize true
ollama-code config set analytics.reportInterval "weekly"

# Generate usage reports
ollama-code generate-usage-report --period "last-30-days" --format pdf
```

## CLI Modes and Entry Points

### Understanding CLI Modes
```bash
# Interactive Mode Selector (default)
ollama-code                    # Launches interactive mode selector
ollama-code --interactive      # Explicit interactive mode

# Simple CLI Mode (basic commands only)
ollama-code-simple ask "question"
ollama-code-simple --help

# Advanced CLI Mode (full feature set)
ollama-code-advanced fusion generate "prompt"
ollama-code-advanced setup-hooks --install-all

# Interactive Mode (explicit)
ollama-code-interactive

# Debug Mode with Enhanced Logging
DEBUG=enhanced-fast-path-router ollama-code --interactive
```

### Mode Selection and Configuration
```bash
# Set default mode
ollama-code config set cli.defaultMode "advanced"

# Configure mode preferences
ollama-code config set cli.modes.simple.fastStartup true
ollama-code config set cli.modes.advanced.enableAllFeatures true
ollama-code config set cli.modes.interactive.showFeatureDiscovery true

# Mode-specific configurations
ollama-code config set cli.modes.interactive.guidedSetup true
ollama-code config set cli.modes.interactive.featureDiscovery true
```

## Development Workflow

### Project Setup for Development
```bash
# Clone and setup development environment
git clone https://github.com/erichchampion/ollama-code.git
cd ollama-code

# Install dependencies
yarn install

# Build the project
yarn build

# Run in development mode
yarn dev

# Run tests
yarn test:all

# Generate documentation
yarn docs:generate

# Validate all systems
yarn validate:all
```

### Development Commands
```bash
# Core development commands
yarn build                    # Compile TypeScript to JavaScript
yarn dev                      # Run in development mode with ts-node
yarn start                    # Run compiled CLI
yarn lint                     # Run ESLint
yarn test                     # Run Jest unit tests
yarn clean                    # Remove build artifacts

# Advanced development commands
yarn test:integration         # Run integration tests
yarn test:e2e                 # Run end-to-end tests
yarn test:performance         # Run performance tests
yarn test:docs                # Validate documentation

# Documentation commands
yarn docs:generate            # Generate TypeDoc documentation
yarn docs:watch               # Watch and regenerate docs
yarn docs:validate            # Validate documentation links
yarn docs:check-all          # Complete documentation validation

# Quality assurance
yarn validate:all            # Run all validation checks
yarn fix:lint                # Auto-fix linting issues
yarn fix:formatting          # Auto-fix code formatting
```

### Code Quality and Testing
```bash
# Run comprehensive testing suite
yarn test:all

# Run specific test categories
yarn test:unit                # Unit tests only
yarn test:ai                  # AI provider tests
yarn test:vcs                 # VCS intelligence tests
yarn test:ide                 # IDE integration tests

# Performance testing
yarn test:performance         # Performance benchmarks
yarn test:load               # Load testing
yarn test:memory             # Memory usage tests

# Code coverage
yarn test:coverage           # Generate coverage report
yarn test:coverage:view      # Open coverage report in browser
```

## Performance Optimization

### Large Codebase Optimization
```bash
# Configure for large repositories
ollama-code config set performance.largeCodebase.enabled true
ollama-code config set performance.largeCodebase.maxFiles 10000
ollama-code config set performance.largeCodebase.partitionSize 1000

# Enable distributed processing
ollama-code config set performance.distributed.enabled true
ollama-code config set performance.distributed.maxWorkers 8

# Configure incremental analysis
ollama-code config set performance.incremental.enabled true
ollama-code config set performance.incremental.watchFiles true

# Optimize startup time
ollama-code optimize-startup --enable-lazy-loading --preload-cache
```

### Memory and Resource Management
```bash
# Configure memory limits
ollama-code config set performance.memory.maxHeapSize "4G"
ollama-code config set performance.memory.enableGC true
ollama-code config set performance.memory.gcInterval 300

# Configure resource pooling
ollama-code config set performance.resources.connectionPool.size 10
ollama-code config set performance.resources.connectionPool.timeout 30

# Monitor resource usage
ollama-code monitor-resources --interval 60 --output resources.log
```

### Network and API Optimization
```bash
# Configure connection pooling
ollama-code config set network.connectionPool.maxConnections 20
ollama-code config set network.connectionPool.keepAlive true

# Configure request batching
ollama-code config set network.batching.enabled true
ollama-code config set network.batching.maxBatchSize 10

# Configure retry policies
ollama-code config set network.retry.maxAttempts 3
ollama-code config set network.retry.backoffStrategy "exponential"
```

## Troubleshooting

### Common Installation Issues
```bash
# Fix permission issues
sudo chown -R $(whoami) ~/.ollama-code/
chmod 755 ~/.ollama-code/

# Clear cache and reinstall
ollama-code cache clear
npm uninstall -g ollama-code
npm install -g ollama-code

# Verify all dependencies
ollama-code doctor --check-all
```

### Provider Connection Issues
```bash
# Test all provider connections
ollama-code provider test-all

# Debug specific provider
ollama-code provider debug ollama --verbose

# Reset provider configuration
ollama-code provider reset openai
ollama-code provider reconfigure openai

# Check provider status
ollama-code provider status --all
```

### Performance Issues
```bash
# Run performance diagnostics
ollama-code diagnose performance

# Check resource usage
ollama-code monitor-resources --duration 300

# Optimize configuration
ollama-code optimize-config --performance

# Clear performance bottlenecks
ollama-code clear-cache --all
ollama-code restart-services
```

### VCS Integration Issues
```bash
# Diagnose Git hooks
ollama-code diagnose git-hooks

# Reinstall hooks
ollama-code setup-hooks --reinstall --force

# Validate repository setup
ollama-code validate-repo --full-check

# Reset VCS configuration
ollama-code reset-vcs-config
```

### IDE Integration Issues
```bash
# Test WebSocket connection
ollama-code test-websocket --debug

# Restart IDE server
ollama-code restart-ide-server

# Check VS Code extension status
ollama-code diagnose vscode-extension

# Reset IDE configuration
ollama-code reset-ide-config
```

## Advanced Usage

### Custom Provider Development
```bash
# Generate provider template
ollama-code generate-provider custom-ai-provider

# Implement provider interface
# Edit src/ai/providers/custom-ai-provider.ts

# Register custom provider
ollama-code register-provider custom-ai-provider

# Test custom provider
ollama-code provider test custom-ai-provider
```

### Plugin Development
```bash
# Generate plugin template
ollama-code generate-plugin my-custom-plugin

# Implement plugin functionality
# Edit plugins/my-custom-plugin/

# Install plugin
ollama-code plugin install ./plugins/my-custom-plugin

# Test plugin
ollama-code plugin test my-custom-plugin
```

### Custom Workflow Automation
```bash
# Create custom workflow
ollama-code create-workflow code-review-automation

# Configure workflow triggers
ollama-code config set workflows.codeReview.triggers '["pre-commit", "pre-push"]'
ollama-code config set workflows.codeReview.actions '["analyze", "review", "suggest"]'

# Run custom workflow
ollama-code run-workflow code-review-automation
```

### Enterprise Deployment
```bash
# Generate enterprise configuration
ollama-code generate-enterprise-config --output enterprise-config.json

# Deploy to enterprise environment
ollama-code deploy-enterprise --config enterprise-config.json

# Configure load balancing
ollama-code configure-load-balancer --strategy round-robin --health-check

# Setup monitoring and alerting
ollama-code setup-monitoring --dashboard --alerts --metrics
```

This comprehensive setup guide provides everything needed to configure and use all features of the Ollama Code CLI system, from basic installation to advanced enterprise deployment.