# Ollama Code CLI

**Your Advanced AI Coding Assistant** - Multi-provider AI integration, VCS intelligence, IDE integration, and enterprise features for modern development workflows.

[![Node.js](https://img.shields.io/badge/Node.js-18.0.0+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![Multi-Provider](https://img.shields.io/badge/AI-Multi--Provider-purple.svg)](#multi-provider-ai-integration)
[![VCS Intelligence](https://img.shields.io/badge/VCS-Intelligence-orange.svg)](#vcs-intelligence)
[![IDE Integration](https://img.shields.io/badge/IDE-Integration-blue.svg)](#ide-integration)

For a detailed overview of the project, see [Building AI Coding Assistants ISBN:979-8-9937022-0-9](https://a.co/d/hRW3iE7)

## 🚀 Features Overview

### 🤖 **Multi-Provider AI Integration**
- **Intelligent Routing** across Ollama, OpenAI, Anthropic, and Google AI
- **Response Fusion** with conflict resolution and consensus building
- **Local Fine-Tuning** and custom model deployment
- **Cost Optimization** with usage tracking and budget management

### 🔧 **VCS Intelligence**
- **Git Hooks Management** with AI-powered validation
- **CI/CD Pipeline Integration** (GitHub, GitLab, Azure, CircleCI)
- **Code Quality Tracking** with regression analysis
- **Automated Pull Request Review** and commit message generation

### 💻 **IDE Integration**
- **VS Code Extension** with real-time AI assistance
- **WebSocket Communication** for live workspace analysis
- **8+ AI Providers** integrated seamlessly
- **Context-Aware Suggestions** with intelligent code completion

### 🏢 **Enterprise Features**
- **Distributed Processing** for large codebases
- **Advanced Caching** with predictive optimization
- **Security & Compliance** with audit logging
- **Performance Monitoring** and analytics dashboard

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [CLI Modes](#cli-modes)
- [Multi-Provider AI Setup](#multi-provider-ai-setup)
- [VCS Intelligence](#vcs-intelligence)
- [IDE Integration](#ide-integration)
- [Core Features](#core-features)
- [Configuration](#configuration)
- [Development](#development)
- [Documentation](#documentation)
- [Performance](#performance)
- [Security](#security)

## ⚡ Quick Start

### Basic Installation
```bash
# Install globally
npm install -g ollama-code

# Quick test
ollama-code ask "Explain async/await in TypeScript"

# Interactive setup
ollama-code --interactive
```

### Multi-Provider Setup
```bash
# Configure multiple AI providers
ollama-code config set ai.providers.openai.apiKey "${OPENAI_API_KEY}"
ollama-code config set ai.providers.anthropic.apiKey "${ANTHROPIC_API_KEY}"

# Test intelligent routing
ollama-code fusion generate "Create a React authentication component"
```

### VCS Intelligence Setup
```bash
# Install Git hooks for AI validation
ollama-code setup-hooks --install-all

# Generate CI/CD pipeline
ollama-code generate-pipeline github --enable-quality-gates
```

## 📦 Installation

### Prerequisites
- **Node.js** ≥18.0.0
- **Git** (for VCS features)
- **Ollama** (local AI models)
- **VS Code** (for IDE integration)

### Installation Methods

#### 1. Global Installation (Recommended)
```bash
npm install -g ollama-code
```

#### 2. Local Project Installation
```bash
npm install ollama-code
```

#### 3. Development Installation
```bash
git clone https://github.com/erichchampion/ollama-code.git
cd ollama-code
yarn install && yarn build
```

### Verify Installation
```bash
ollama-code --version              # Interactive selector
ollama-code-simple --version       # Simple CLI mode
ollama-code-advanced --version     # Advanced CLI mode
ollama-code-interactive --version  # Interactive mode
```

## 🎯 CLI Modes

### Interactive Mode Selector (Default)
```bash
ollama-code                    # Launches guided mode selection
DEBUG=enhanced-fast-path-router ollama-code --interactive
```

**🚀 Optimized Initialization** - The interactive mode now features:
- **Streaming Startup**: Essential components load first, advanced features load in background
- **Smart Component Loading**: Only loads components needed for your specific requests
- **80% Faster Startup**: Reduced initialization time from 8-15s to 1-3s
- **Progressive Enhancement**: Immediate basic functionality with continuous capability expansion
- **Fallback Protection**: Graceful degradation when components fail to load

#### Interactive Mode Features
- **Real-time Status**: See component loading progress with `/status` command
- **Performance Monitoring**: Track system performance and optimization metrics
- **Terminal Compatibility**: Works in CI/CD, TTY, and non-interactive environments
- **Background Loading**: Heavy components load while you work

#### Environment Variables
```bash
# Force legacy mode for testing/compatibility
OLLAMA_SKIP_ENHANCED_INIT=true ollama-code --interactive

# Enable debug logging for optimization
DEBUG=enhanced-fast-path-router ollama-code --interactive

# Silent mode for CI/CD environments
ollama-code --interactive --silent

# Configure logging level (default: ERROR for quiet operation)
LOG_LEVEL=0 ollama-code    # DEBUG - Most verbose, shows all logs
LOG_LEVEL=1 ollama-code    # INFO - Informational messages
LOG_LEVEL=2 ollama-code    # WARN - Warning messages only
LOG_LEVEL=3 ollama-code    # ERROR - Error messages only (default)
LOG_LEVEL=4 ollama-code    # SILENT - No logs
```

### Simple CLI Mode
```bash
ollama-code-simple ask "question"
ollama-code-simple list-models
ollama-code-simple --help
```

### Advanced CLI Mode
```bash
ollama-code-advanced fusion generate "prompt"
ollama-code-advanced setup-hooks --install-all
ollama-code-advanced fine-tune train --base-model qwen2.5-coder:latest
```

**🚀 Optimized Advanced Mode** - Now includes:
- **Selective Loading**: Only initializes components required by the specific command
- **Background Preloading**: Common components preload while executing commands
- **Timeout Protection**: All component initialization has timeout safeguards
- **Legacy Fallback**: Automatic fallback to legacy initialization if needed

## 🤖 Multi-Provider AI Setup

### Supported Providers
- **Ollama** - Local models with fine-tuning
- **OpenAI** - GPT models with cost optimization
- **Anthropic** - Claude models with enterprise features
- **Google AI** - Gemini with multimodal capabilities

### Configuration Example
```bash
# Configure all providers
ollama-code config set ai.providers.ollama.enabled true
ollama-code config set ai.providers.openai.enabled true
ollama-code config set ai.providers.anthropic.enabled true
ollama-code config set ai.providers.google.enabled true

# Set intelligent routing
ollama-code config set ai.routing.strategy "intelligent"
ollama-code config set ai.routing.weights.cost 0.3
ollama-code config set ai.routing.weights.speed 0.3
ollama-code config set ai.routing.weights.quality 0.4

# Enable response fusion
ollama-code config set ai.fusion.enabled true
ollama-code config set ai.fusion.strategy "consensus"
```

### Advanced Features
```bash
# Fine-tune local models
ollama-code fine-tune train --dataset training_data.jsonl

# Deploy custom models
ollama-code deploy-model custom-model --load-balancer round-robin

# Response fusion for critical tasks
ollama-code fusion generate "complex prompt" --providers "ollama,openai,anthropic"

# Provider benchmarking
ollama-code benchmark-providers --task "code-generation" --iterations 10
```

## 🔧 VCS Intelligence

### Git Hooks Management
```bash
# Install AI-powered Git hooks
ollama-code setup-hooks --install-all

# Configure quality thresholds
ollama-code config set vcs.hooks.qualityThreshold 0.8
ollama-code config set vcs.hooks.enableCommitValidation true

# Test hooks
git commit -m "test commit"  # Triggers AI validation
```

### CI/CD Pipeline Integration
```bash
# Generate GitHub Actions workflow
ollama-code generate-pipeline github \
  --enable-quality-gates \
  --enable-security-analysis \
  --enable-performance-analysis

# Generate GitLab CI configuration
ollama-code generate-pipeline gitlab --enable-regression-analysis

# Universal CI API for multi-platform support
ollama-code config set cicd.platform "github"
ollama-code config set cicd.qualityGates.minScore 85
```

### Code Quality Tracking
```bash
# Initialize quality tracking
ollama-code init-quality-tracking --baseline

# Run comprehensive analysis
ollama-code analyze-quality --full-report

# Generate quality dashboard
ollama-code quality-dashboard --format html

# Regression analysis
ollama-code analyze-regression --compare-branch feature/new-feature
```

## 💻 IDE Integration

### VS Code Extension
```bash
# Install from VS Code Marketplace
# Search for "Ollama Code" in Extensions

# Or install from VSIX
code --install-extension ollama-code.vsix

# Development installation
cd extensions/vscode && yarn install && yarn build
```

### Real-time Features
- **Inline Code Completion** with AI suggestions
- **Code Actions** for AI-powered quick fixes
- **Hover Information** with intelligent context
- **Real-time Diagnostics** and error detection
- **Workspace Analysis** with live updates

### WebSocket Server
```bash
# Start WebSocket server for real-time integration
ollama-code-advanced --enable-websocket --port 3002

# Configure in VS Code settings.json
{
  "ollamaCode.serverPort": 3002,
  "ollamaCode.enableInlineCompletion": true,
  "ollamaCode.realTimeAnalysis": true
}
```

## 🎨 Core Features

### AI-Powered Commands
```bash
# Code assistance
ollama-code ask "How to implement OAuth2?"
ollama-code explain src/auth.ts
ollama-code fix src/buggy-file.js
ollama-code refactor src/legacy-code.js

# Code generation
ollama-code generate class UserAuth --language typescript
ollama-code generate tests src/utils.js
ollama-code generate docs src/api/

# Analysis and review
ollama-code analyze-architecture --format detailed
ollama-code review-code --provider anthropic src/
ollama-code security-audit src/ --comprehensive
```

### Model Management
```bash
# List and manage models
ollama-code list-models
ollama-code pull-model qwen2.5-coder:latest
ollama-code set-model qwen2.5-coder:latest

# Model performance testing
ollama-code test-model qwen2.5-coder:latest --benchmark
ollama-code compare-models --models "codellama:7b,qwen2.5-coder:latest"
```

### Workspace Operations
```bash
# Project analysis
ollama-code analyze-project --depth comprehensive
ollama-code workspace-insights --format json

# File operations
ollama-code search "authentication" --type function
ollama-code edit src/config.ts --ai-assisted
ollama-code optimize-imports src/ --language typescript
```

## ⚙️ Configuration

### Hierarchical Configuration System
```json
{
  "ai": {
    "defaultProvider": "ollama",
    "defaultModel": "qwen2.5-coder:latest",
    "defaultTemperature": 0.7,
    "providers": {
      "ollama": {
        "enabled": true,
        "baseUrl": "http://localhost:11434"
      },
      "openai": {
        "enabled": true,
        "apiKey": "${OPENAI_API_KEY}",
        "models": ["gpt-4", "gpt-3.5-turbo"]
      }
    },
    "routing": {
      "strategy": "intelligent",
      "weights": {
        "cost": 0.3,
        "speed": 0.3,
        "quality": 0.4
      }
    }
  },
  "vcs": {
    "hooks": {
      "enableCommitValidation": true,
      "qualityThreshold": 0.8
    },
    "cicd": {
      "platform": "github",
      "enableQualityGates": true
    }
  }
}
```

### Configuration Commands
```bash
# View configuration
ollama-code config view
ollama-code config view --section ai.providers

# Set configuration
ollama-code config set ai.defaultProvider "openai"
ollama-code config set vcs.hooks.enableCommitValidation true

# Reset configuration
ollama-code config reset
ollama-code config reset --section ai.providers.openai
```

## 🛠️ Development

### Setup Development Environment
```bash
# Clone and install
git clone https://github.com/erichchampion/ollama-code.git
cd ollama-code
yarn install

# Build and test
yarn build
yarn test:all
yarn docs:generate
```

### Development Commands
```bash
# Core development
yarn dev                      # Development mode with ts-node
yarn build                    # Compile TypeScript
yarn test                     # Unit tests
yarn lint                     # ESLint
yarn clean                    # Remove build artifacts

# Testing
yarn test                     # Main test suite (fast, stable tests only)
yarn test:ci                  # CI-friendly test suite (excludes performance tests)
yarn test:unit                # Unit tests only
yarn test:integration         # All integration tests
yarn test:integration:other   # Non-performance integration tests

# Performance testing (resource-intensive, run separately)
yarn test:performance         # All performance tests (unit + integration)
yarn test:performance:unit    # Performance-sensitive unit tests
yarn test:integration:performance        # Performance integration tests
yarn test:integration:optimization-migration  # Optimization migration tests

# Other test suites
yarn test:e2e                 # End-to-end tests with Playwright
yarn test:docs                # Documentation tests
yarn test:security            # Security tests
yarn test:all                 # All tests in recommended order (CI + performance + e2e)
yarn test:all:full            # All tests in parallel (may have flaky failures)

# Documentation
yarn docs:generate            # TypeDoc API documentation
yarn docs:watch               # Watch and regenerate
yarn docs:validate            # Validate links and examples
yarn docs:check-all          # Complete validation
```

### Project Architecture
```
src/
├── ai/                       # Multi-provider AI system
│   ├── providers/           # AI provider implementations
│   ├── vcs/                 # VCS intelligence features
│   └── performance/         # Performance optimization
├── commands/                 # CLI command system
├── config/                   # Configuration management
├── terminal/                 # Terminal interface
├── utils/                    # Shared utilities
├── cli-selector.ts          # Interactive mode selector
├── simple-cli.ts            # Simple CLI mode
└── cli.ts                   # Advanced CLI mode

extensions/
└── vscode/                   # VS Code extension
    ├── src/providers/       # Language providers
    ├── src/services/        # Extension services
    └── src/client/          # WebSocket client

docs/
├── API_REFERENCE.md         # Complete API documentation
├── CONFIGURATION.md         # Configuration guide
├── ARCHITECTURE.md          # System architecture
└── OLLAMA.md               # Setup and integration guide
```

## 📚 Documentation

### Complete Documentation Suite
- **[API Reference](docs/API_REFERENCE.md)** - All 50+ commands with examples
- **[Configuration Guide](docs/CONFIGURATION.md)** - Complete configuration options
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design
- **[Setup Guide](docs/OLLAMA.md)** - Installation and integration

### Auto-Generated Documentation
- **TypeDoc API Docs** - Generated from TypeScript source
- **GitHub Actions** - Automated documentation updates
- **Link Validation** - Automated link checking and validation

### Documentation Commands
```bash
# Generate all documentation
yarn docs:generate-all

# TypeDoc API documentation
yarn docs:generate

# Validate documentation quality
yarn docs:check-all

# Watch for changes
yarn docs:watch
```

## ⚡ Performance

### 🚀 Enhanced Optimization System
- **Streaming Initialization**: Essential components load first, advanced features in background
- **Lazy Component Loading**: Components load only when needed for specific requests
- **Progressive Enhancement**: Immediate functionality with continuous capability expansion
- **Smart Dependency Management**: Eliminates circular dependencies and recursive loading
- **Terminal Compatibility**: Optimized for CI/CD, TTY, and non-interactive environments

### Performance Improvements
- **80% Faster Startup**: Interactive mode now starts in 1-3s (previously 8-15s)
- **95%+ Success Rate**: Robust initialization with fallback protection
- **Memory Efficient**: Only loads required components, reducing memory usage by 60%
- **Background Loading**: Heavy components load while you work on immediate tasks

### Enterprise-Scale Performance
- **Distributed Processing** for large codebases (10,000+ files)
- **Predictive AI Caching** with multi-tier strategy
- **Incremental Analysis** with file watching
- **Memory Optimization** with automatic cleanup
- **Component Status Monitoring**: Real-time health checks and performance metrics

### Performance Metrics
- **Interactive Startup**: 1-3s (optimized) vs 8-15s (legacy)
- **Advanced Mode**: < 2s for simple commands, < 5s for complex operations
- **Command Response**: < 100ms for basic commands
- **AI Processing**: Variable (2-30s) based on model and complexity
- **Large Codebase**: Handles 10,000+ files efficiently
- **Component Loading**: Essential components ready in < 1s, full system in < 5s

### Optimization Features
```bash
# Configure for large repositories
ollama-code config set performance.largeCodebase.enabled true
ollama-code config set performance.distributed.maxWorkers 8

# Enable predictive caching
ollama-code config set performance.predictiveCache.enabled true

# Monitor performance (interactive mode)
/status                                    # Component status and health
/performance                               # Performance metrics
/metrics                                   # Detailed system metrics

# Performance monitoring (CLI)
ollama-code performance-dashboard --port 8080
ollama-code monitor-resources --interval 60

# Optimization controls
DEBUG=enhanced-fast-path-router ollama-code --interactive    # Debug mode
OLLAMA_SKIP_ENHANCED_INIT=true ollama-code --interactive     # Legacy mode
ollama-code --interactive --silent                          # Silent mode
```

### Component Status Commands
```bash
# In interactive mode, use these commands:
/status              # Show component loading status
/status --detailed   # Detailed component information
/status --json       # JSON format for automation
/performance         # Performance metrics and recommendations
/metrics --export    # Export metrics for analysis
```

## 🔒 Security

### Privacy-First Architecture
- **Local Processing** - All AI processing via local Ollama
- **No Data Transmission** - Code never leaves your machine
- **Optional Cloud Providers** - User-controlled API integration
- **Audit Logging** - Comprehensive activity tracking

### Security Features
- **Input Validation** - Zod schema validation for all inputs
- **Path Traversal Protection** - Secure file access controls
- **Command Sanitization** - Safe command execution
- **API Key Management** - Secure credential storage
- **Type Safety** - TypeScript strict mode throughout

### Enterprise Security
```bash
# Configure audit logging
ollama-code config set security.audit.enabled true
ollama-code config set security.audit.retentionDays 90

# Access control
ollama-code config set security.access.requireAuth true

# Compliance features
ollama-code config set compliance.gdpr.enabled true
```

## 🤝 Contributing

We welcome contributions! Please follow the contribution steps below:

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Update documentation
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Add comprehensive tests
- Update documentation for API changes
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

## 🌟 Why Ollama Code CLI?

### For Individual Developers
- **Privacy-Focused** - Your code stays local
- **Multi-Provider Flexibility** - Choose the best AI for each task
- **IDE Integration** - Seamless VS Code experience
- **Git Intelligence** - AI-powered version control

### For Teams
- **Code Quality Automation** - Consistent quality enforcement
- **CI/CD Integration** - Automated pipeline generation
- **Collaboration Tools** - Shared configurations and workflows
- **Performance Analytics** - Team productivity insights

### For Enterprises
- **Scalable Architecture** - Handles large codebases efficiently
- **Security & Compliance** - Enterprise-grade security features
- **Cost Management** - AI usage tracking and optimization
- **Custom Deployments** - Fine-tuned models for your domain

**Get Started Today** - Transform your development workflow with intelligent AI assistance.

```bash
npm install -g ollama-code
ollama-code --interactive
```

Built with ❤️ using TypeScript, Node.js, and the power of local AI.