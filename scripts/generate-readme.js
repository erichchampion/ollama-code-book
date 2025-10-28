#!/usr/bin/env node
/**
 * README Generation Script
 * 
 * Generates a comprehensive README.md from:
 * - Package.json metadata
 * - Command definitions
 * - Existing documentation
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Generate README content
 */
function generateREADME() {
  try {
    // Read package.json
    const packagePath = join(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // Read existing documentation for additional context
    let claudeContent = '';
    try {
      claudeContent = readFileSync(join(projectRoot, 'CLAUDE.md'), 'utf8');
    } catch (error) {
      logWarning('Could not read CLAUDE.md');
    }
    
    let specContent = '';
    try {
      specContent = readFileSync(join(projectRoot, 'specify.md'), 'utf8');
    } catch (error) {
      logWarning('Could not read specify.md');
    }
    
    // Extract command information from specify.md
    const commandSections = specContent.match(/#### (\w+)\n- \*\*Purpose\*\*: ([^\n]+)/g) || [];
    const commands = commandSections.map(section => {
      const match = section.match(/#### (\w+)\n- \*\*Purpose\*\*: ([^\n]+)/);
      return match ? { name: match[1], purpose: match[2] } : null;
    }).filter(Boolean);
    
    // Generate README content
    let readme = `# ${pkg.name}\n\n`;
    readme += `${pkg.description}\n\n`;
    
    // Badges
    readme += `[![Node.js](https://img.shields.io/badge/Node.js-18.0.0+-green.svg)](https://nodejs.org/)\n`;
    readme += `[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)\n`;
    readme += `[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)\n\n`;
    
    // Table of Contents
    readme += `## Table of Contents\n\n`;
    readme += `- [Installation](#installation)\n`;
    readme += `- [Quick Start](#quick-start)\n`;
    readme += `- [Features](#features)\n`;
    readme += `- [Commands](#commands)\n`;
    readme += `- [Configuration](#configuration)\n`;
    readme += `- [Development](#development)\n`;
    readme += `- [Documentation](#documentation)\n`;
    readme += `- [Contributing](#contributing)\n`;
    readme += `- [License](#license)\n\n`;
    
    // Installation
    readme += `## Installation\n\n`;
    readme += `### Prerequisites\n\n`;
    readme += `- Node.js ${pkg.engines?.node || '18.0.0 or higher'}\n`;
    readme += `- npm or yarn package manager\n`;
    readme += `- [Ollama](https://ollama.ai/) installed and running locally\n\n`;
    
    readme += `### Install from Source\n\n`;
    readme += `\`\`\`bash\n`;
    readme += `# Clone the repository\n`;
    readme += `git clone https://github.com/erichchampion/ollama-code.git\n`;
    readme += `cd ollama-code/ollama-code\n\n`;
    readme += `# Install dependencies\n`;
    readme += `npm install\n\n`;
    readme += `# Build the project\n`;
    readme += `npm run build\n\n`;
    readme += `# Run the CLI\n`;
    readme += `npm start\n`;
    readme += `\`\`\`\n\n`;
    
    // Quick Start
    readme += `## Quick Start\n\n`;
    readme += `\`\`\`bash\n`;
    readme += `# Ask a question\n`;
    readme += `ollama-code ask "How do I implement a binary search in TypeScript?"\n\n`;
    readme += `# List available models\n`;
    readme += `ollama-code list-models\n\n`;
    readme += `# Download a model\n`;
    readme += `ollama-code pull-model llama3.2\n\n`;
    readme += `# Explain code\n`;
    readme += `ollama-code explain src/example.ts\n`;
    readme += `\`\`\`\n\n`;
    
    // Features
    readme += `## Features\n\n`;
    readme += `### 🤖 AI-Powered Code Assistance\n`;
    readme += `- Interactive Q&A with local AI models\n`;
    readme += `- Code explanation and analysis\n`;
    readme += `- Automated bug fixing and refactoring\n`;
    readme += `- AI-powered code generation\n\n`;
    
    readme += `### 🔧 Model Management\n`;
    readme += `- List and download Ollama models\n`;
    readme += `- Switch between different models\n`;
    readme += `- Model validation and testing\n\n`;
    
    readme += `### 🛠️ Development Tools\n`;
    readme += `- Configuration management\n`;
    readme += `- File operations and editing\n`;
    readme += `- Git integration\n`;
    readme += `- Codebase searching\n\n`;
    
    readme += `### 🔒 Privacy-Focused\n`;
    readme += `- All processing happens locally\n`;
    readme += `- No data sent to external services\n`;
    readme += `- Complete control over your data\n\n`;
    
    // Commands
    readme += `## Commands\n\n`;
    readme += `### AI Assistance\n\n`;
    const aiCommands = commands.filter(cmd => 
      ['ask', 'explain', 'fix', 'generate', 'refactor'].includes(cmd.name)
    );
    for (const cmd of aiCommands) {
      readme += `- **\`${cmd.name}\`** - ${cmd.purpose}\n`;
    }
    
    readme += `\n### Model Management\n\n`;
    const modelCommands = commands.filter(cmd => 
      ['list-models', 'pull-model', 'set-model'].includes(cmd.name)
    );
    for (const cmd of modelCommands) {
      readme += `- **\`${cmd.name}\`** - ${cmd.purpose}\n`;
    }
    
    readme += `\n### System Integration\n\n`;
    const systemCommands = commands.filter(cmd => 
      ['config', 'run', 'search', 'edit', 'git', 'theme'].includes(cmd.name)
    );
    for (const cmd of systemCommands) {
      readme += `- **\`${cmd.name}\`** - ${cmd.purpose}\n`;
    }
    
    readme += `\n### Session Management\n\n`;
    const sessionCommands = commands.filter(cmd => 
      ['login', 'logout', 'reset', 'clear', 'exit', 'quit'].includes(cmd.name)
    );
    for (const cmd of sessionCommands) {
      readme += `- **\`${cmd.name}\`** - ${cmd.purpose}\n`;
    }
    
    readme += `\n### Help & Feedback\n\n`;
    const helpCommands = commands.filter(cmd => 
      ['help', 'commands', 'bug', 'feedback'].includes(cmd.name)
    );
    for (const cmd of helpCommands) {
      readme += `- **\`${cmd.name}\`** - ${cmd.purpose}\n`;
    }
    
    readme += `\nFor detailed command usage, run:\n`;
    readme += `\`\`\`bash\n`;
    readme += `ollama-code help <command-name>\n`;
    readme += `\`\`\`\n\n`;
    
    // Configuration
    readme += `## Configuration\n\n`;
    readme += `The CLI uses a configuration system with the following key areas:\n\n`;
    readme += `- **API Configuration** - Ollama server settings\n`;
    readme += `- **AI Configuration** - Model preferences and behavior\n`;
    readme += `- **Terminal Configuration** - UI and display settings\n`;
    readme += `- **Code Analysis** - Code analysis and processing options\n`;
    readme += `- **Git Configuration** - Version control integration\n\n`;
    
    readme += `View and modify configuration:\n`;
    readme += `\`\`\`bash\n`;
    readme += `# View current configuration\n`;
    readme += `ollama-code config\n\n`;
    readme += `# Set a configuration value\n`;
    readme += `ollama-code config api.baseUrl http://localhost:11434\n`;
    readme += `\`\`\`\n\n`;
    
    // Development
    readme += `## Development\n\n`;
    readme += `### Setup\n\n`;
    readme += `\`\`\`bash\n`;
    readme += `# Install dependencies\n`;
    readme += `npm install\n\n`;
    readme += `# Run in development mode\n`;
    readme += `npm run dev\n\n`;
    readme += `# Build the project\n`;
    readme += `npm run build\n\n`;
    readme += `# Run tests\n`;
    readme += `npm test\n\n`;
    readme += `# Lint code\n`;
    readme += `npm run lint\n`;
    readme += `\`\`\`\n\n`;
    
    readme += `### Project Structure\n\n`;
    readme += `\`\`\n`;
    readme += `src/\n`;
    readme += `├── ai/           # AI integration and Ollama client\n`;
    readme += `├── auth/          # Authentication and connection management\n`;
    readme += `├── commands/      # Command system and registration\n`;
    readme += `├── config/        # Configuration management\n`;
    readme += `├── errors/        # Error handling and messaging\n`;
    readme += `├── terminal/      # Terminal interface and formatting\n`;
    readme += `├── utils/         # Shared utilities\n`;
    readme += `├── cli.ts         # Full-featured CLI entry point\n`;
    readme += `└── simple-cli.ts  # Simplified CLI entry point\n`;
    readme += `\`\`\`\n\n`;
    
    // Documentation
    readme += `## Documentation\n\n`;
    readme += `- [Technical Specification](TECHNICAL_SPECIFICATION.md) - Complete technical stack documentation\n`;
    readme += `- [Command Reference](specify.md) - Detailed command documentation\n`;
    readme += `- [Codebase Analysis](CODEBASE_ANALYSIS.md) - Current codebase structure and analysis\n`;
    readme += `- [Claude Code Guide](CLAUDE.md) - Development guidance for Claude Code\n\n`;
    
    readme += `### Generated Documentation\n\n`;
    readme += `Run the documentation generation script to create up-to-date API references:\n`;
    readme += `\`\`\`bash\n`;
    readme += `npm run docs:generate\n`;
    readme += `\`\`\`\n\n`;
    
    // Contributing
    readme += `## Contributing\n\n`;
    readme += `Contributions are welcome! Please feel free to submit a Pull Request.\n\n`;
    readme += `### Development Guidelines\n\n`;
    readme += `1. Follow the existing code style and patterns\n`;
    readme += `2. Add tests for new features\n`;
    readme += `3. Update documentation as needed\n`;
    readme += `4. Ensure all tests pass before submitting\n\n`;
    
    readme += `### Reporting Issues\n\n`;
    readme += `Use the built-in bug reporting command:\n`;
    readme += `\`\`\`bash\n`;
    readme += `ollama-code bug "Description of the issue"\n`;
    readme += `\`\`\`\n\n`;
    
    // License
    readme += `## License\n\n`;
    readme += `This project is licensed under the ${pkg.license} License - see the [LICENSE.md](LICENSE.md) file for details.\n\n`;
    
    // Footer
    readme += `---\n\n`;
    readme += `**Ollama Code CLI** - Your local AI coding assistant in the terminal.\n`;
    readme += `Built with ❤️ using TypeScript and Node.js.\n`;
    
    return readme;
  } catch (error) {
    logError(`Failed to generate README: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  log(`${colors.bold}README Generation${colors.reset}`);
  log('='.repeat(50));
  
  logInfo('Generating README.md...');
  
  const readmeContent = generateREADME();
  if (readmeContent) {
    const readmePath = join(projectRoot, 'README.md');
    writeFileSync(readmePath, readmeContent);
    logSuccess(`Generated README.md`);
  } else {
    logError('Failed to generate README.md');
    process.exit(1);
  }
  
  log('\n' + '='.repeat(50));
  logSuccess('README generation completed!');
}

// Run the generation
main().catch(error => {
  logError(`Generation failed: ${error.message}`);
  process.exit(1);
});
