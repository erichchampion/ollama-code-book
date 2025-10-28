# API Reference - Ollama Code CLI v0.7.1

This document provides comprehensive API documentation for the Ollama Code CLI, including all commands, CLI modes, parameters, and usage examples.

## Table of Contents

- [CLI Modes and Entry Points](#cli-modes-and-entry-points)
- [Core AI Assistance Commands](#core-ai-assistance-commands)
- [Multi-Provider AI Commands](#multi-provider-ai-commands)
- [VCS Intelligence Commands](#vcs-intelligence-commands)
- [IDE Integration Commands](#ide-integration-commands)
- [Model Management Commands](#model-management-commands)
- [Configuration Commands](#configuration-commands)
- [Development Tools Commands](#development-tools-commands)
- [Testing and Quality Commands](#testing-and-quality-commands)
- [Documentation Commands](#documentation-commands)
- [Performance and Analytics Commands](#performance-and-analytics-commands)
- [System Integration Commands](#system-integration-commands)
- [Session Management Commands](#session-management-commands)
- [Command Line Options](#command-line-options)
- [Error Codes](#error-codes)

---

## CLI Modes and Entry Points

The Ollama Code CLI offers multiple modes of operation to suit different use cases:

### Primary CLI Modes

#### Interactive Mode (Default)
```bash
# Start interactive mode with CLI selector
ollama-code
# or
ollama-code-interactive
```
- **Features**: Interactive command selection, context management, enhanced UI
- **Best for**: Development workflows, exploration, complex multi-step tasks

#### Simple Mode
```bash
# Lightweight CLI with core commands only
ollama-code-simple [command] [options]
```
- **Commands Available**: ask, list-models, pull-model, set-model
- **Best for**: Quick questions, CI/CD pipelines, minimal dependencies

#### Advanced Mode
```bash
# Full-featured CLI with complete command set
ollama-code-advanced [command] [options]
```
- **Features**: All commands, performance optimizations, enterprise features
- **Best for**: Power users, development teams, enterprise environments

### CLI Entry Point Scripts

```bash
# Available via package.json bin configuration
"ollama-code": "dist/src/cli-selector.js",           # Interactive mode
"ollama-code-simple": "dist/src/simple-cli.js",     # Simple mode
"ollama-code-advanced": "dist/src/cli.js",          # Advanced mode
"ollama-code-interactive": "dist/src/cli-selector.js" # Alias for interactive
```

### CLI Mode Selection Options

```bash
# Direct mode specification
ollama-code --mode simple
ollama-code --mode advanced
ollama-code --mode interactive

# Environment variable
export OLLAMA_CODE_MODE=advanced
ollama-code

# Configuration file
# In ollama-code.config.json:
{
  "cli": {
    "defaultMode": "advanced"
  }
}
```

---

## Core AI Assistance Commands

### `ask`

Ask AI questions about code or programming concepts with intelligent provider routing.

**Usage:**
```bash
ollama-code ask <question> [options]
```

**Parameters:**
- `question` (required): The question to ask the AI
- `--context <file>`: Additional context file to include
- `--model <name>`: Specific model to use
- `--provider <name>`: Force specific AI provider (ollama, openai, anthropic, google)
- `--temperature <float>`: Response creativity (0-2, default: 0.7)
- `--streaming`: Enable real-time streaming responses
- `--verbose`: Enable verbose output

**Examples:**
```bash
# Basic question with intelligent provider routing
ollama-code ask "How do I implement a binary search in TypeScript?"

# With context file for better understanding
ollama-code ask "How can I optimize this code?" --context src/utils.ts

# Using specific provider and model
ollama-code ask "Explain this algorithm" --provider openai --model gpt-4

# With streaming for real-time responses
ollama-code ask "Generate a React component" --streaming

# Complex question with temperature control
ollama-code ask "Design a microservices architecture" --temperature 0.9 --verbose
```

**Return Value:**
- Returns AI-generated response with provider attribution
- Supports streaming for real-time output
- Exits with code 0 on success, non-zero on error

### `explain`

Explain code files with detailed analysis using advanced AI capabilities.

**Usage:**
```bash
ollama-code explain <file> [options]
```

**Parameters:**
- `file` (required): Path to the file to explain
- `--detail <level>`: Detail level (basic, intermediate, detailed, expert)
- `--model <name>`: Specific model to use
- `--provider <name>`: AI provider preference
- `--output <file>`: Output file for explanation
- `--format <type>`: Output format (markdown, html, text, json)
- `--include-patterns`: Include architectural patterns analysis
- `--include-security`: Include security analysis

**Examples:**
```bash
# Basic explanation with smart provider selection
ollama-code explain src/utils.ts

# Detailed explanation with security analysis
ollama-code explain src/auth.ts --detail expert --include-security

# Save explanation to file in markdown format
ollama-code explain src/complex-algorithm.ts --output explanation.md --format markdown

# Multi-file explanation with patterns analysis
ollama-code explain src/services/ --include-patterns --detail detailed
```

### `fix`

Fix bugs and issues in code files with AI-powered debugging.

**Usage:**
```bash
ollama-code fix <file> [options]
```

**Parameters:**
- `file` (required): Path to the file to fix
- `--issue <description>`: Description of the issue to fix
- `--severity <level>`: Issue severity (low, medium, high, critical)
- `--backup`: Create backup before applying fixes
- `--dry-run`: Show proposed fixes without applying
- `--test-after`: Run tests after applying fixes
- `--provider <name>`: AI provider for fix generation

**Examples:**
```bash
# Fix with issue description
ollama-code fix src/utils.ts --issue "Memory leak in event listeners"

# Critical security fix with backup
ollama-code fix src/auth.ts --severity critical --backup

# Dry run to preview fixes
ollama-code fix src/buggy-code.ts --dry-run

# Fix and test automatically
ollama-code fix src/calculator.ts --test-after
```

### `generate`

Generate code, documentation, tests, and other development artifacts.

**Usage:**
```bash
ollama-code generate <type> <description> [options]
```

**Types:**
- `component`: Generate UI components
- `function`: Generate functions and methods
- `class`: Generate class structures
- `test`: Generate test files
- `docs`: Generate documentation
- `config`: Generate configuration files
- `api`: Generate API endpoints
- `schema`: Generate data schemas

**Parameters:**
- `type` (required): Type of artifact to generate
- `description` (required): Description of what to generate
- `--output <path>`: Output path for generated code
- `--framework <name>`: Target framework (react, vue, angular, etc.)
- `--language <name>`: Programming language
- `--style <name>`: Code style guide to follow
- `--include-tests`: Generate tests alongside code

**Examples:**
```bash
# Generate React component
ollama-code generate component "User profile card with avatar and details" --framework react --output src/components/

# Generate API endpoint with tests
ollama-code generate api "REST endpoint for user management" --include-tests --language typescript

# Generate test suite
ollama-code generate test "Unit tests for calculator functions" --output tests/

# Generate documentation
ollama-code generate docs "API documentation for authentication service" --format markdown
```

### `refactor`

Refactor code with AI-powered analysis and transformation.

**Usage:**
```bash
ollama-code refactor <file> [options]
```

**Parameters:**
- `file` (required): File or directory to refactor
- `--type <refactoring>`: Type of refactoring (extract-method, rename, move, optimize)
- `--target <pattern>`: Specific code pattern to refactor
- `--safe-mode`: Apply only safe refactorings
- `--preserve-behavior`: Ensure behavior preservation
- `--generate-tests`: Generate tests for refactored code

**Examples:**
```bash
# Extract method refactoring
ollama-code refactor src/large-function.ts --type extract-method

# Optimize performance
ollama-code refactor src/slow-code.ts --type optimize --preserve-behavior

# Safe refactoring with test generation
ollama-code refactor src/legacy-code.ts --safe-mode --generate-tests
```

---

## Multi-Provider AI Commands

### `provider`

Manage AI providers and intelligent routing.

**Usage:**
```bash
ollama-code provider <subcommand> [options]
```

**Subcommands:**

#### `list`
List available AI providers and their status.
```bash
ollama-code provider list [--detailed]
```

#### `benchmark`
Benchmark provider performance for specific tasks.
```bash
ollama-code provider benchmark [--task-type <type>] [--duration <seconds>]
```

#### `configure`
Configure provider settings and preferences.
```bash
ollama-code provider configure <provider> [--api-key <key>] [--model <model>]
```

#### `route`
Configure intelligent routing preferences.
```bash
ollama-code provider route [--strategy <strategy>] [--fallback <provider>]
```

**Examples:**
```bash
# List all providers with health status
ollama-code provider list --detailed

# Benchmark providers for code generation
ollama-code provider benchmark --task-type code-generation --duration 60

# Configure OpenAI provider
ollama-code provider configure openai --api-key sk-... --model gpt-4

# Set routing strategy
ollama-code provider route --strategy cost-optimized --fallback ollama
```

### `fine-tune`

Local model fine-tuning and custom training.

**Usage:**
```bash
ollama-code fine-tune <subcommand> [options]
```

**Subcommands:**

#### `create-dataset`
Create training datasets from codebase.
```bash
ollama-code fine-tune create-dataset [--type <type>] [--output <path>] [--size <samples>]
```

#### `train`
Start fine-tuning process.
```bash
ollama-code fine-tune train <dataset> [--base-model <model>] [--epochs <count>]
```

#### `deploy`
Deploy fine-tuned model.
```bash
ollama-code fine-tune deploy <model> [--instances <count>] [--load-balancer <strategy>]
```

#### `monitor`
Monitor training progress and deployment health.
```bash
ollama-code fine-tune monitor [--job-id <id>] [--deployment-id <id>]
```

**Examples:**
```bash
# Create dataset for code completion
ollama-code fine-tune create-dataset --type code-completion --size 10000

# Train model with custom parameters
ollama-code fine-tune train ./dataset.jsonl --base-model codellama --epochs 3

# Deploy with load balancing
ollama-code fine-tune deploy my-model --instances 3 --load-balancer round-robin

# Monitor training job
ollama-code fine-tune monitor --job-id job-123
```

### `fusion`

Multi-provider response fusion and conflict resolution.

**Usage:**
```bash
ollama-code fusion <subcommand> [options]
```

**Subcommands:**

#### `generate`
Generate responses using multiple providers with fusion.
```bash
ollama-code fusion generate <prompt> [--providers <list>] [--strategy <method>]
```

#### `compare`
Compare responses from different providers.
```bash
ollama-code fusion compare <prompt> [--providers <list>] [--metrics <types>]
```

#### `resolve`
Resolve conflicts in multi-provider responses.
```bash
ollama-code fusion resolve <responses> [--method <algorithm>] [--confidence-threshold <float>]
```

**Examples:**
```bash
# Generate with consensus voting
ollama-code fusion generate "Explain async programming" --strategy consensus

# Compare providers for code review
ollama-code fusion compare "Review this function" --providers ollama,openai,anthropic

# Resolve conflicting recommendations
ollama-code fusion resolve responses.json --method weighted-average
```

---

## VCS Intelligence Commands

### `git-hooks`

Manage AI-powered Git hooks for code quality.

**Usage:**
```bash
ollama-code git-hooks <subcommand> [options]
```

**Subcommands:**

#### `install`
Install AI-powered Git hooks.
```bash
ollama-code git-hooks install [--hooks <types>] [--force]
```

#### `configure`
Configure hook behavior and thresholds.
```bash
ollama-code git-hooks configure [--quality-threshold <score>] [--security-level <level>]
```

#### `status`
Check hook installation and configuration status.
```bash
ollama-code git-hooks status [--detailed]
```

**Examples:**
```bash
# Install all AI hooks
ollama-code git-hooks install --hooks pre-commit,pre-push,commit-msg

# Configure quality thresholds
ollama-code git-hooks configure --quality-threshold 80 --security-level high

# Check hook status
ollama-code git-hooks status --detailed
```

### `commit-msg`

AI-powered commit message generation and enhancement.

**Usage:**
```bash
ollama-code commit-msg <subcommand> [options]
```

**Subcommands:**

#### `generate`
Generate commit messages from staged changes.
```bash
ollama-code commit-msg generate [--style <format>] [--include-scope]
```

#### `enhance`
Enhance existing commit messages.
```bash
ollama-code commit-msg enhance <message> [--style <format>]
```

#### `validate`
Validate commit message format and quality.
```bash
ollama-code commit-msg validate <message> [--strict]
```

**Styles:**
- `conventional`: Conventional Commits format
- `descriptive`: Detailed descriptive format
- `emoji`: Emoji-enhanced format
- `gitmoji`: Gitmoji standard format

**Examples:**
```bash
# Generate conventional commit message
ollama-code commit-msg generate --style conventional --include-scope

# Enhance existing message
ollama-code commit-msg enhance "fix bug" --style descriptive

# Validate commit message
ollama-code commit-msg validate "feat(api): add user authentication" --strict
```

### `pr-review`

Automated pull request review and analysis.

**Usage:**
```bash
ollama-code pr-review <subcommand> [options]
```

**Subcommands:**

#### `analyze`
Analyze pull request changes.
```bash
ollama-code pr-review analyze <pr-url> [--focus <areas>] [--severity <level>]
```

#### `security`
Security-focused PR analysis.
```bash
ollama-code pr-review security <pr-url> [--owasp-check] [--dependency-scan]
```

#### `performance`
Performance impact analysis.
```bash
ollama-code pr-review performance <pr-url> [--benchmark] [--memory-analysis]
```

**Examples:**
```bash
# Comprehensive PR analysis
ollama-code pr-review analyze https://github.com/repo/pull/123 --focus security,performance

# Security-focused review
ollama-code pr-review security https://github.com/repo/pull/123 --owasp-check

# Performance impact analysis
ollama-code pr-review performance https://github.com/repo/pull/123 --benchmark
```

### `regression`

Regression risk analysis and prediction.

**Usage:**
```bash
ollama-code regression <subcommand> [options]
```

**Subcommands:**

#### `analyze`
Analyze regression risk for changes.
```bash
ollama-code regression analyze [--commit <hash>] [--files <pattern>] [--threshold <score>]
```

#### `predict`
Predict regression probability using historical patterns.
```bash
ollama-code regression predict <changes> [--model <algorithm>] [--confidence <level>]
```

#### `report`
Generate regression analysis reports.
```bash
ollama-code regression report [--format <type>] [--period <timeframe>]
```

**Examples:**
```bash
# Analyze current changes
ollama-code regression analyze --threshold high

# Predict regression for specific files
ollama-code regression predict src/core/ --confidence 0.8

# Generate weekly regression report
ollama-code regression report --format html --period 7d
```

### `ci-pipeline`

CI/CD pipeline integration and generation.

**Usage:**
```bash
ollama-code ci-pipeline <subcommand> [options]
```

**Subcommands:**

#### `generate`
Generate CI/CD pipeline configurations.
```bash
ollama-code ci-pipeline generate <platform> [--template <type>] [--quality-gates]
```

#### `validate`
Validate existing pipeline configurations.
```bash
ollama-code ci-pipeline validate <config-file> [--platform <type>]
```

#### `optimize`
Optimize pipeline performance and efficiency.
```bash
ollama-code ci-pipeline optimize <config-file> [--focus <areas>]
```

**Platforms:**
- `github`: GitHub Actions
- `gitlab`: GitLab CI
- `azure`: Azure DevOps
- `bitbucket`: Bitbucket Pipelines
- `circleci`: CircleCI
- `jenkins`: Jenkins

**Examples:**
```bash
# Generate GitHub Actions workflow
ollama-code ci-pipeline generate github --template nodejs --quality-gates

# Validate GitLab CI configuration
ollama-code ci-pipeline validate .gitlab-ci.yml --platform gitlab

# Optimize pipeline for performance
ollama-code ci-pipeline optimize .github/workflows/ci.yml --focus speed
```

---

## IDE Integration Commands

### `ide-server`

WebSocket-based IDE integration server for real-time AI assistance.

**Usage:**
```bash
ollama-code ide-server <subcommand> [options]
```

**Subcommands:**

#### `start`
Start the IDE integration server.
```bash
ollama-code ide-server start [--port <number>] [--host <address>] [--auth <token>]
```

#### `stop`
Stop the running IDE server.
```bash
ollama-code ide-server stop [--force]
```

#### `status`
Check server status and connection health.
```bash
ollama-code ide-server status [--detailed] [--connections]
```

#### `configure`
Configure IDE server settings.
```bash
ollama-code ide-server configure [--auto-start] [--log-level <level>]
```

**Examples:**
```bash
# Start server on custom port
ollama-code ide-server start --port 3002 --auth secret-token

# Check server status with connection details
ollama-code ide-server status --detailed --connections

# Configure auto-start
ollama-code ide-server configure --auto-start true --log-level debug
```

### `workspace`

Workspace analysis and context intelligence.

**Usage:**
```bash
ollama-code workspace <subcommand> [options]
```

**Subcommands:**

#### `analyze`
Analyze workspace structure and dependencies.
```bash
ollama-code workspace analyze [--depth <level>] [--include-deps] [--output <format>]
```

#### `index`
Build workspace index for fast AI queries.
```bash
ollama-code workspace index [--incremental] [--background] [--exclude <patterns>]
```

#### `context`
Generate context for AI queries based on workspace.
```bash
ollama-code workspace context <query> [--files <pattern>] [--max-context <size>]
```

**Examples:**
```bash
# Comprehensive workspace analysis
ollama-code workspace analyze --depth 3 --include-deps --output json

# Incremental index update
ollama-code workspace index --incremental --exclude node_modules,dist

# Generate context for specific query
ollama-code workspace context "authentication system" --files "src/**/*.ts"
```

### `vscode`

VS Code extension integration and management.

**Usage:**
```bash
ollama-code vscode <subcommand> [options]
```

**Subcommands:**

#### `install`
Install or update VS Code extension.
```bash
ollama-code vscode install [--version <ver>] [--force]
```

#### `configure`
Configure extension settings.
```bash
ollama-code vscode configure [--auto-completion] [--diagnostics] [--chat-panel]
```

#### `status`
Check extension status and health.
```bash
ollama-code vscode status [--detailed]
```

**Examples:**
```bash
# Install latest extension
ollama-code vscode install --force

# Configure extension features
ollama-code vscode configure --auto-completion true --chat-panel true

# Check extension status
ollama-code vscode status --detailed
```

---

## Model Management Commands

### `list-models`

List available AI models across all providers.

**Usage:**
```bash
ollama-code list-models [options]
```

**Parameters:**
- `--provider <name>`: Filter by provider (ollama, openai, anthropic, google)
- `--capability <type>`: Filter by capability (code, chat, completion, analysis)
- `--size <range>`: Filter by model size
- `--detailed`: Show detailed model information
- `--available-only`: Show only available/downloaded models

**Examples:**
```bash
# List all models across providers
ollama-code list-models --detailed

# List only Ollama models
ollama-code list-models --provider ollama

# List code-capable models
ollama-code list-models --capability code --available-only
```

### `pull-model`

Download and install AI models.

**Usage:**
```bash
ollama-code pull-model <model> [options]
```

**Parameters:**
- `model` (required): Model name and tag
- `--provider <name>`: Provider to pull from
- `--force`: Force re-download if model exists
- `--background`: Download in background
- `--verify`: Verify model integrity after download

**Examples:**
```bash
# Pull latest CodeLlama model
ollama-code pull-model codellama:latest

# Pull specific model version
ollama-code pull-model qwen2.5-coder:14b --verify

# Background download
ollama-code pull-model mistral:7b --background
```

### `set-model`

Set default model for AI operations.

**Usage:**
```bash
ollama-code set-model <model> [options]
```

**Parameters:**
- `model` (required): Model name to set as default
- `--provider <name>`: Provider for the model
- `--global`: Set as global default (vs project-specific)
- `--temporary`: Set for current session only

**Examples:**
```bash
# Set global default model
ollama-code set-model qwen2.5-coder:latest --global

# Set project-specific model
ollama-code set-model codellama:7b

# Temporary session model
ollama-code set-model gpt-4 --provider openai --temporary
```

### `model-info`

Get detailed information about AI models.

**Usage:**
```bash
ollama-code model-info <model> [options]
```

**Parameters:**
- `model` (required): Model name to get information about
- `--provider <name>`: Specify provider
- `--capabilities`: Show model capabilities
- `--benchmarks`: Show performance benchmarks
- `--usage-stats`: Show usage statistics

**Examples:**
```bash
# Get comprehensive model information
ollama-code model-info qwen2.5-coder:latest --capabilities --benchmarks

# Check model usage stats
ollama-code model-info codellama:7b --usage-stats
```

---

## Configuration Commands

### `config`

Manage Ollama Code CLI configuration.

**Usage:**
```bash
ollama-code config <subcommand> [options]
```

**Subcommands:**

#### `get`
Get configuration values.
```bash
ollama-code config get [<key>] [--global] [--local]
```

#### `set`
Set configuration values.
```bash
ollama-code config set <key> <value> [--global] [--local]
```

#### `list`
List all configuration settings.
```bash
ollama-code config list [--show-defaults] [--show-sources]
```

#### `reset`
Reset configuration to defaults.
```bash
ollama-code config reset [--key <key>] [--confirm]
```

#### `validate`
Validate current configuration.
```bash
ollama-code config validate [--fix-issues] [--verbose]
```

#### `export`
Export configuration to file.
```bash
ollama-code config export <file> [--format <type>] [--include-secrets]
```

#### `import`
Import configuration from file.
```bash
ollama-code config import <file> [--merge] [--verify]
```

**Examples:**
```bash
# Get AI provider configuration
ollama-code config get ai.defaultProvider

# Set global temperature setting
ollama-code config set ai.defaultTemperature 0.8 --global

# List all settings with sources
ollama-code config list --show-sources

# Validate and fix configuration issues
ollama-code config validate --fix-issues

# Export configuration
ollama-code config export backup.json --format json
```

### `theme`

Manage CLI theme and appearance.

**Usage:**
```bash
ollama-code theme <theme-name> [options]
```

**Available Themes:**
- `dark`: Dark theme (default)
- `light`: Light theme
- `auto`: System-based theme
- `minimal`: Minimal theme with reduced colors
- `high-contrast`: High contrast theme

**Parameters:**
- `--preview`: Preview theme without applying
- `--global`: Set theme globally
- `--save`: Save theme preference

**Examples:**
```bash
# Set dark theme
ollama-code theme dark --save

# Preview light theme
ollama-code theme light --preview

# Auto-detect based on system
ollama-code theme auto --global
```

---

## Development Tools Commands

### `search`

Search through codebase with AI-enhanced understanding.

**Usage:**
```bash
ollama-code search <query> [options]
```

**Parameters:**
- `query` (required): Search query (natural language or code patterns)
- `--type <type>`: Search type (semantic, exact, regex, fuzzy)
- `--files <pattern>`: File pattern to search within
- `--context <lines>`: Lines of context around matches
- `--limit <number>`: Maximum number of results
- `--format <type>`: Output format (text, json, table)

**Examples:**
```bash
# Semantic search for authentication code
ollama-code search "user authentication and JWT validation" --type semantic

# Exact pattern search
ollama-code search "async function.*authenticate" --type regex --files "src/**/*.ts"

# Fuzzy search with context
ollama-code search "database connection" --type fuzzy --context 5 --limit 10
```

### `edit`

AI-assisted code editing with intelligent suggestions.

**Usage:**
```bash
ollama-code edit <file> [options]
```

**Parameters:**
- `file` (required): File to edit
- `--instruction <text>`: Natural language editing instruction
- `--line <number>`: Specific line to edit
- `--range <start:end>`: Line range to edit
- `--backup`: Create backup before editing
- `--interactive`: Interactive editing mode
- `--dry-run`: Show proposed changes without applying

**Examples:**
```bash
# Edit with natural language instruction
ollama-code edit src/auth.ts --instruction "add input validation for email"

# Edit specific line range
ollama-code edit src/utils.ts --range 45:60 --instruction "optimize this loop"

# Interactive editing with backup
ollama-code edit src/complex-file.ts --interactive --backup
```

### `run`

Execute code with AI assistance and debugging.

**Usage:**
```bash
ollama-code run <file-or-command> [options]
```

**Parameters:**
- `file-or-command` (required): File to run or command to execute
- `--debug`: Enable debugging mode
- `--profile`: Enable performance profiling
- `--watch`: Watch for changes and re-run
- `--args <arguments>`: Arguments to pass to the program
- `--env <variables>`: Environment variables to set

**Examples:**
```bash
# Run TypeScript file with debugging
ollama-code run src/main.ts --debug

# Run with profiling
ollama-code run ./script.js --profile --args "--verbose"

# Watch mode for development
ollama-code run src/server.ts --watch --env NODE_ENV=development
```

---

## Testing and Quality Commands

### `test`

AI-powered testing and test generation.

**Usage:**
```bash
ollama-code test <subcommand> [options]
```

**Subcommands:**

#### `generate`
Generate test files for existing code.
```bash
ollama-code test generate <file> [--framework <name>] [--coverage-target <percent>]
```

#### `run`
Run tests with AI analysis of failures.
```bash
ollama-code test run [--pattern <glob>] [--analyze-failures] [--suggest-fixes]
```

#### `coverage`
Analyze test coverage and suggest improvements.
```bash
ollama-code test coverage [--target <percent>] [--report-format <type>]
```

**Examples:**
```bash
# Generate tests for a module
ollama-code test generate src/utils/math.ts --framework jest --coverage-target 90

# Run tests with failure analysis
ollama-code test run --pattern "**/*.test.ts" --analyze-failures --suggest-fixes

# Check coverage and get improvement suggestions
ollama-code test coverage --target 80 --report-format html
```

### `quality`

Code quality analysis and improvement.

**Usage:**
```bash
ollama-code quality <subcommand> [options]
```

**Subcommands:**

#### `analyze`
Analyze code quality metrics.
```bash
ollama-code quality analyze [<path>] [--metrics <types>] [--threshold <score>]
```

#### `improve`
Get AI suggestions for quality improvements.
```bash
ollama-code quality improve <file> [--focus <areas>] [--priority <level>]
```

#### `track`
Track quality trends over time.
```bash
ollama-code quality track [--period <timeframe>] [--report <format>]
```

**Examples:**
```bash
# Analyze code quality
ollama-code quality analyze src/ --metrics complexity,maintainability --threshold 80

# Get improvement suggestions
ollama-code quality improve src/legacy-code.ts --focus performance,readability

# Track quality trends
ollama-code quality track --period 30d --report json
```

---

## Documentation Commands

### `docs`

Documentation generation and management using TypeDoc.

**Usage:**
```bash
ollama-code docs <subcommand> [options]
```

**Subcommands:**

#### `generate`
Generate API documentation from TypeScript comments.
```bash
ollama-code docs generate [--output <path>] [--format <type>] [--watch]
```

#### `validate`
Validate documentation completeness and quality.
```bash
ollama-code docs validate [--coverage-threshold <percent>] [--check-links]
```

#### `serve`
Start documentation server for development.
```bash
ollama-code docs serve [--port <number>] [--open]
```

#### `deploy`
Deploy documentation to hosting platform.
```bash
ollama-code docs deploy <platform> [--branch <name>] [--domain <url>]
```

**Examples:**
```bash
# Generate documentation with watch mode
ollama-code docs generate --output docs/api --format markdown --watch

# Validate documentation coverage
ollama-code docs validate --coverage-threshold 90 --check-links

# Serve documentation locally
ollama-code docs serve --port 8080 --open

# Deploy to GitHub Pages
ollama-code docs deploy github-pages --branch gh-pages
```

---

## Performance and Analytics Commands

*Phase 6 Implementation: Comprehensive Performance Dashboard and Analytics*

### `performance-dashboard`

Real-time performance monitoring dashboard with system health scoring.

**Usage:**
```bash
ollama-code performance-dashboard [options]
```

**Options:**
- `--format <type>` - Output format: summary (default), detailed, json
- `--watch` - Enable live monitoring mode with automatic refresh
- `--interval <ms>` - Refresh interval in milliseconds for watch mode (default: 5000)

**Examples:**
```bash
# Show current performance snapshot
ollama-code performance-dashboard

# Detailed dashboard with component health scores
ollama-code performance-dashboard --format detailed

# Live monitoring mode (press Ctrl+C to exit)
ollama-code performance-dashboard --watch

# Custom refresh interval
ollama-code performance-dashboard --watch --interval 3000

# JSON output for monitoring integration
ollama-code performance-dashboard --format json
```

### `performance-alerts`

Performance alerts and recommendations management.

**Usage:**
```bash
ollama-code performance-alerts [options]
```

**Options:**
- `--severity <level>` - Filter by severity: all (default), warning, critical
- `--acknowledge` - Acknowledge an alert
- `--alert-id <id>` - Specific alert ID to acknowledge

**Examples:**
```bash
# Show all active performance alerts
ollama-code performance-alerts

# Show only critical alerts
ollama-code performance-alerts --severity critical

# Acknowledge a specific alert
ollama-code performance-alerts --acknowledge --alert-id cpu_cpu_usage
```

### `performance-report`

Generate comprehensive performance optimization reports.

**Usage:**
```bash
ollama-code performance-report [options]
```

**Options:**
- `--export` - Export report to timestamped file
- `--format <type>` - Output format: text (default), json

**Examples:**
```bash
# Generate performance report
ollama-code performance-report

# Export report to file
ollama-code performance-report --export

# Generate JSON report for automation
ollama-code performance-report --format json --export
```

### `analytics-show`

Display usage analytics and statistics.

**Usage:**
```bash
ollama-code analytics-show [options]
```

**Options:**
- `--days <number>` - Number of days to analyze (1-365, default: 30)
- `--detailed` - Show detailed analytics breakdown

**Examples:**
```bash
# Show 30-day analytics summary
ollama-code analytics-show

# Show detailed 7-day analytics
ollama-code analytics-show --days 7 --detailed
```

### `cache`

Cache management and optimization.

**Usage:**
```bash
ollama-code cache <subcommand> [options]
```

**Subcommands:**

#### `status`
Show cache status and statistics.
```bash
ollama-code cache status [--detailed] [--by-provider]
```

#### `clear`
Clear cache entries.
```bash
ollama-code cache clear [--provider <name>] [--older-than <duration>] [--confirm]
```

#### `optimize`
Optimize cache performance.
```bash
ollama-code cache optimize [--compress] [--rebuild-index]
```

**Examples:**
```bash
# Check cache status
ollama-code cache status --detailed --by-provider

# Clear old cache entries
ollama-code cache clear --older-than 7d --confirm

# Optimize cache performance
ollama-code cache optimize --compress --rebuild-index
```

---

## System Integration Commands

### `mcp`

Model Context Protocol server and client management.

**Usage:**
```bash
ollama-code mcp <subcommand> [options]
```

**Subcommands:**

#### `server`
Manage MCP server.
```bash
ollama-code mcp server <action> [--port <number>] [--config <file>]
```

#### `client`
Manage MCP client connections.
```bash
ollama-code mcp client <action> [--server <url>] [--auth <token>]
```

#### `tools`
List and manage available tools.
```bash
ollama-code mcp tools [--server <name>] [--category <type>]
```

**Examples:**
```bash
# Start MCP server
ollama-code mcp server start --port 3001 --config mcp.json

# Connect MCP client
ollama-code mcp client connect --server ws://localhost:3001 --auth token123

# List available tools
ollama-code mcp tools --category code-analysis
```

### `git`

Enhanced Git integration with AI assistance.

**Usage:**
```bash
ollama-code git <subcommand> [options]
```

**Subcommands:**

#### `status`
Enhanced git status with AI insights.
```bash
ollama-code git status [--analyze-changes] [--suggest-commits]
```

#### `diff`
AI-enhanced diff analysis.
```bash
ollama-code git diff [<ref>] [--semantic] [--suggest-improvements]
```

#### `log`
Intelligent git log analysis.
```bash
ollama-code git log [--analyze-patterns] [--suggest-workflows]
```

**Examples:**
```bash
# Enhanced status with change analysis
ollama-code git status --analyze-changes --suggest-commits

# Semantic diff analysis
ollama-code git diff --semantic --suggest-improvements

# Pattern analysis of commit history
ollama-code git log --analyze-patterns --suggest-workflows
```

---

## Session Management Commands

### `reset`

Reset AI session and context.

**Usage:**
```bash
ollama-code reset [options]
```

**Parameters:**
- `--hard`: Complete reset including model cache
- `--keep-config`: Preserve configuration settings
- `--confirm`: Skip confirmation prompt

**Examples:**
```bash
# Soft reset (clear conversation context)
ollama-code reset

# Hard reset with confirmation
ollama-code reset --hard --confirm

# Reset but keep configuration
ollama-code reset --hard --keep-config
```

### `clear`

Clear terminal and conversation history.

**Usage:**
```bash
ollama-code clear [options]
```

**Parameters:**
- `--history`: Clear conversation history
- `--cache`: Clear response cache
- `--all`: Clear everything

**Examples:**
```bash
# Clear terminal only
ollama-code clear

# Clear conversation history
ollama-code clear --history

# Clear everything
ollama-code clear --all
```

### `history`

View and manage conversation history.

**Usage:**
```bash
ollama-code history [options]
```

**Parameters:**
- `--limit <number>`: Number of entries to show
- `--search <query>`: Search conversation history
- `--export <file>`: Export history to file
- `--clear`: Clear history

**Examples:**
```bash
# Show recent conversation history
ollama-code history --limit 20

# Search history
ollama-code history --search "authentication"

# Export history
ollama-code history --export conversation-backup.json
```

### `exit` / `quit`

Exit the CLI application.

**Usage:**
```bash
ollama-code exit
ollama-code quit
```

These commands gracefully shut down the application, cleaning up resources and saving session state.

---

## Command Line Options

### Global Options

These options are available for all commands:

#### `--help` / `-h`
Show help information for any command.
```bash
ollama-code --help
ollama-code ask --help
```

#### `--version` / `-v`
Show version information.
```bash
ollama-code --version
```

#### `--verbose`
Enable verbose output for debugging.
```bash
ollama-code ask "question" --verbose
```

#### `--quiet` / `-q`
Suppress non-essential output.
```bash
ollama-code generate component "Button" --quiet
```

#### `--config <file>`
Use specific configuration file.
```bash
ollama-code --config ./custom-config.json ask "question"
```

#### `--no-color`
Disable colored output.
```bash
ollama-code --no-color list-models
```

#### `--format <type>`
Set output format (text, json, yaml, table).
```bash
ollama-code list-models --format json
```

#### `--timeout <seconds>`
Set operation timeout.
```bash
ollama-code ask "complex question" --timeout 300
```

### Interactive Mode Options

#### `--mode <type>`
Specify CLI mode (simple, advanced, interactive).
```bash
ollama-code --mode advanced
```

#### `--auto-save`
Automatically save conversation history.
```bash
ollama-code --auto-save
```

#### `--context-size <number>`
Set maximum context size for conversations.
```bash
ollama-code --context-size 4096
```

---

## Error Codes

The Ollama Code CLI uses standard exit codes to indicate success or failure:

### Standard Exit Codes

| Code | Description | Details |
|------|-------------|---------|
| `0` | Success | Command completed successfully |
| `1` | General Error | Generic error condition |
| `2` | Misuse of Command | Invalid command usage or arguments |
| `3` | Configuration Error | Configuration file issues or invalid settings |
| `4` | Network Error | Network connectivity or API issues |
| `5` | Authentication Error | API key or authentication failures |
| `6` | Model Error | AI model not found or unavailable |
| `7` | File System Error | File or directory access issues |
| `8` | Timeout Error | Operation timeout exceeded |
| `9` | Resource Error | Insufficient system resources |
| `10` | Validation Error | Input validation or constraint failures |

### Provider-Specific Error Codes

| Code | Description | Provider Context |
|------|-------------|------------------|
| `20` | Ollama Server Error | Ollama server not running or unreachable |
| `21` | OpenAI API Error | OpenAI service issues or quota exceeded |
| `22` | Anthropic API Error | Claude API issues or rate limiting |
| `23` | Google API Error | Gemini/PaLM API issues |
| `24` | Provider Routing Error | Intelligent routing failures |

### Feature-Specific Error Codes

| Code | Description | Feature Context |
|------|-------------|-----------------|
| `30` | VCS Error | Git or version control issues |
| `31` | IDE Integration Error | VS Code extension or server issues |
| `32` | Documentation Error | TypeDoc or doc generation failures |
| `33` | Testing Error | Test execution or generation failures |
| `34` | Quality Analysis Error | Code quality analysis issues |

### Error Handling Examples

```bash
# Check exit code in scripts
ollama-code ask "question"
if [ $? -eq 0 ]; then
    echo "Success"
else
    echo "Failed with code $?"
fi

# Handle specific error types
ollama-code pull-model codellama:latest
case $? in
    0) echo "Model downloaded successfully" ;;
    6) echo "Model not found" ;;
    4) echo "Network error - check connection" ;;
    *) echo "Unknown error occurred" ;;
esac
```

---

## Advanced Usage Patterns

### Chaining Commands

```bash
# Chain multiple operations
ollama-code pull-model qwen2.5-coder:latest && \
ollama-code set-model qwen2.5-coder:latest && \
ollama-code ask "Explain TypeScript interfaces"
```

### Using with Shell Scripts

```bash
#!/bin/bash
# Automated code review script
ollama-code git status --analyze-changes > changes.txt
ollama-code pr-review analyze --focus security > security-review.txt
ollama-code quality analyze src/ --threshold 80 > quality-report.txt
```

### Configuration Profiles

```bash
# Development profile
ollama-code config set ai.defaultProvider ollama
ollama-code config set ai.defaultModel qwen2.5-coder:latest

# Production profile
ollama-code config set ai.defaultProvider openai
ollama-code config set ai.defaultModel gpt-4
```

### Batch Operations

```bash
# Batch documentation generation
find src -name "*.ts" -exec ollama-code explain {} --output docs/{}.md \;

# Batch test generation
find src -name "*.ts" -not -path "*/test/*" -exec ollama-code test generate {} \;
```

---

This comprehensive API reference covers all available commands, options, and usage patterns in the Ollama Code CLI v0.7.0. For specific implementation details and advanced configuration options, refer to the [Configuration Guide](CONFIGURATION.md) and [Architecture Documentation](ARCHITECTURE.md).